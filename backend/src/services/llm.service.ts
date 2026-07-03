import { GoogleGenerativeAI } from '@google/generative-ai';
import { z } from 'zod';
import { env } from '../config/env';
import prisma from '../config/database';
import { PRE_VISIT_PROMPT } from '../prompts/preVisit.prompt';
import { POST_VISIT_PROMPT } from '../prompts/postVisit.prompt';

// ── Zod schemas for validating LLM output ────────────────

const preVisitSchema = z.object({
  urgencyLevel: z.enum(['Low', 'Medium', 'High']),
  chiefComplaint: z.string(),
  suggestedQuestions: z.array(z.string()).length(3),
});

const medicationItemSchema = z.object({
  name: z.string(),
  dosage: z.string(),
  frequency: z.string(),
  duration: z.string(),
  instructions: z.string().optional(),
});

const postVisitSchema = z.object({
  patientSummary: z.string(),
  medicationSchedule: z.array(medicationItemSchema),
  followUpSteps: z.array(z.string()),
});

export type PreVisitOutput = z.infer<typeof preVisitSchema>;
export type PostVisitOutput = z.infer<typeof postVisitSchema>;

// ── Timeout utility ──────────────────────────────────────

function timeout<T>(ms: number): Promise<T> {
  return new Promise((_, reject) =>
    setTimeout(() => reject(new Error('LLM_TIMEOUT')), ms)
  );
}

// ── LLM Service ──────────────────────────────────────────

export class LLMService {
  private genAI: GoogleGenerativeAI | null = null;

  constructor() {
    if (env.GEMINI_API_KEY) {
      this.genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY);
    }
  }

  /**
   * Generate pre-visit summary from patient symptoms.
   * Retries once on failure, falls back to FAILED status.
   */
  async generatePreVisitSummary(
    appointmentId: string,
    symptoms: string,
    duration?: string | null,
    severity?: string | null
  ): Promise<PreVisitOutput | null> {
    // Create a pending summary record
    await prisma.preVisitSummary.upsert({
      where: { appointmentId },
      create: { appointmentId, status: 'PENDING' },
      update: { status: 'PENDING', errorMessage: null },
    });

    const prompt = PRE_VISIT_PROMPT
      .replace('{{symptoms}}', symptoms)
      .replace('{{duration}}', duration || 'Not specified')
      .replace('{{severity}}', severity || 'Not specified');

    try {
      const result = await this.callWithRetry(prompt);
      const parsed = preVisitSchema.parse(result);

      await prisma.preVisitSummary.update({
        where: { appointmentId },
        data: {
          urgencyLevel: parsed.urgencyLevel,
          chiefComplaint: parsed.chiefComplaint,
          suggestedQuestions: parsed.suggestedQuestions,
          status: 'COMPLETED',
          rawResponse: JSON.stringify(result),
        },
      });

      return parsed;
    } catch (err: any) {
      console.error('❌ Pre-visit summary failed:', err.message);
      await this.handleFailure(appointmentId, 'pre-visit', err);
      return null;
    }
  }

  /**
   * Generate post-visit summary from clinical notes.
   * Retries once on failure, falls back to FAILED status.
   */
  async generatePostVisitSummary(
    appointmentId: string,
    clinicalNotes: string,
    diagnosis: string | null,
    prescriptions: Array<{ medication: string; dosage: string; frequency: string; duration: string }>
  ): Promise<PostVisitOutput | null> {
    await prisma.postVisitSummary.upsert({
      where: { appointmentId },
      create: { appointmentId, status: 'PENDING' },
      update: { status: 'PENDING', errorMessage: null },
    });

    const prescriptionText = prescriptions.length > 0
      ? prescriptions.map(p => `${p.medication} ${p.dosage} - ${p.frequency} for ${p.duration}`).join('; ')
      : 'No prescriptions';

    const prompt = POST_VISIT_PROMPT
      .replace('{{clinicalNotes}}', clinicalNotes)
      .replace('{{diagnosis}}', diagnosis || 'Not specified')
      .replace('{{prescriptions}}', prescriptionText);

    try {
      const result = await this.callWithRetry(prompt);
      const parsed = postVisitSchema.parse(result);

      await prisma.postVisitSummary.update({
        where: { appointmentId },
        data: {
          patientSummary: parsed.patientSummary,
          medicationSchedule: parsed.medicationSchedule,
          followUpSteps: parsed.followUpSteps,
          status: 'COMPLETED',
          rawResponse: JSON.stringify(result),
        },
      });

      return parsed;
    } catch (err: any) {
      console.error('❌ Post-visit summary failed:', err.message);
      await this.handleFailure(appointmentId, 'post-visit', err);
      return null;
    }
  }

  /**
   * Call LLM with retry (1 retry) and timeout (15s).
   */
  private async callWithRetry(prompt: string, retries = 1): Promise<unknown> {
    if (!this.genAI) {
      throw new Error('LLM_NOT_CONFIGURED');
    }

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const result = await Promise.race([
          this.callGemini(prompt),
          timeout<unknown>(15_000),
        ]);
        return result;
      } catch (err: any) {
        if (attempt === retries) {
          throw err;
        }
        console.warn(`⚠️ LLM attempt ${attempt + 1} failed, retrying...`);
        // Brief backoff before retry
        await new Promise(r => setTimeout(r, 1000));
      }
    }

    throw new Error('LLM_MAX_RETRIES');
  }

  /**
   * Call Google Gemini and parse JSON response.
   */
  private async callGemini(prompt: string): Promise<unknown> {
    const model = this.genAI!.getGenerativeModel({ model: 'gemini-2.0-flash' });

    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.3,
      },
    });

    const responseText = result.response.text();

    try {
      return JSON.parse(responseText);
    } catch {
      // Try extracting JSON from markdown code blocks
      const jsonMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[1]);
      }
      throw new Error('INVALID_JSON_RESPONSE');
    }
  }

  /**
   * Handle LLM failure — update summary status and log error.
   */
  private async handleFailure(appointmentId: string, type: string, err: any) {
    const errorMessage = err.message === 'LLM_NOT_CONFIGURED'
      ? 'AI service not configured. Summary pending — doctor will review manually.'
      : err.message === 'LLM_TIMEOUT'
      ? 'AI service timed out. Summary pending — doctor will review manually.'
      : `AI summary failed. Summary pending — doctor will review manually. Error: ${err.message}`;

    // Update summary status
    if (type === 'pre-visit') {
      await prisma.preVisitSummary.update({
        where: { appointmentId },
        data: { status: 'FAILED', errorMessage },
      }).catch(() => {});
    } else {
      await prisma.postVisitSummary.update({
        where: { appointmentId },
        data: { status: 'FAILED', errorMessage },
      }).catch(() => {});
    }

    // Log the failure to NotificationLog
    await prisma.notificationLog.create({
      data: {
        type: 'LLM_FAILURE',
        subject: `${type} summary generation failed`,
        payload: { appointmentId, error: err.message },
        status: 'FAILED',
        error: err.message,
      },
    }).catch(console.error);
  }
}

export const llmService = new LLMService();
