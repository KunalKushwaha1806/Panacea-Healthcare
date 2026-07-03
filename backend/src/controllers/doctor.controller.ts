import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { postVisitNotesSchema, approvePostVisitSummarySchema } from '../validators/doctor.validator';
import { sendSuccess, sendCreated, sendError, sendNotFound } from '../utils/apiResponse';
import { llmService } from '../services/llm.service';
import prisma from '../config/database';
import { AppointmentStatus } from '@prisma/client';

function parseFrequencyToDates(frequency: string, durationStr: string): Date[] {
  const dates: Date[] = [];
  let timesPerDay = 1;
  const f = frequency.toLowerCase();
  if (f.includes('twice') || f.includes('2')) timesPerDay = 2;
  else if (f.includes('thrice') || f.includes('3')) timesPerDay = 3;
  else if (f.includes('four') || f.includes('4')) timesPerDay = 4;

  let days = 1;
  const dMatch = durationStr.match(/(\d+)/);
  if (dMatch) days = parseInt(dMatch[1], 10);

  const now = new Date();
  for (let i = 0; i < days; i++) {
    for (let j = 0; j < timesPerDay; j++) {
      const scheduled = new Date(now);
      scheduled.setDate(now.getDate() + i);
      if (timesPerDay === 1) scheduled.setHours(9, 0, 0, 0);
      else if (timesPerDay === 2 && j === 0) scheduled.setHours(9, 0, 0, 0);
      else if (timesPerDay === 2 && j === 1) scheduled.setHours(20, 0, 0, 0);
      else scheduled.setHours(9 + j * Math.floor(12 / timesPerDay), 0, 0, 0);
      
      if (scheduled.getTime() > now.getTime()) {
        dates.push(scheduled);
      }
    }
  }
  return dates;
}

export class DoctorController {
  /**
   * POST /api/doctor/appointments/:id/notes — Submit post-visit notes + prescription
   */
  async submitPostVisitNotes(req: AuthRequest, res: Response): Promise<void> {
    try {
      const input = postVisitNotesSchema.parse(req.body);
      const appointmentId = req.params.id as string;

      // Verify the appointment belongs to this doctor
      const doctorProfile = await prisma.doctorProfile.findUnique({
        where: { userId: req.user!.userId },
      });

      if (!doctorProfile) {
        sendError(res, 'Doctor profile not found', 404);
        return;
      }

      const appointment = await prisma.appointment.findUnique({
        where: { id: appointmentId },
      });

      if (!appointment) {
        sendNotFound(res, 'Appointment not found');
        return;
      }

      if (appointment.doctorProfileId !== doctorProfile.id) {
        sendError(res, 'Not your appointment', 403);
        return;
      }

      // Save clinical notes
      const notes = await prisma.postVisitNotes.upsert({
        where: { appointmentId },
        create: {
          appointmentId,
          clinicalNotes: input.clinicalNotes,
          diagnosis: input.diagnosis,
        },
        update: {
          clinicalNotes: input.clinicalNotes,
          diagnosis: input.diagnosis,
        },
      });

      // Save prescriptions
      if (input.prescriptions.length > 0) {
        // Delete old prescriptions for this appointment
        await prisma.prescription.deleteMany({ where: { appointmentId } });
        
        const createdPrescriptions = await prisma.$transaction(
          input.prescriptions.map(p => prisma.prescription.create({
            data: {
              appointmentId,
              medication: p.medication,
              dosage: p.dosage,
              frequency: p.frequency,
              duration: p.duration,
              instructions: p.instructions,
            }
          }))
        );

        // Schedule medication reminders
        for (const p of createdPrescriptions) {
          const reminderDates = parseFrequencyToDates(p.frequency, p.duration);
          if (reminderDates.length > 0) {
            await prisma.medicationReminder.createMany({
              data: reminderDates.map(date => ({
                prescriptionId: p.id,
                scheduledAt: date,
              })),
            });
          }
        }
      }

      // Mark appointment as completed
      await prisma.appointment.update({
        where: { id: appointmentId },
        data: { status: AppointmentStatus.COMPLETED },
      });

      // Generate post-visit summary via LLM (async, non-blocking)
      llmService.generatePostVisitSummary(
        appointmentId,
        input.clinicalNotes,
        input.diagnosis || null,
        input.prescriptions
      ).catch(err => console.error('Post-visit summary generation error:', err));

      const updatedAppointment = await prisma.appointment.findUnique({
        where: { id: appointmentId },
        include: {
          postVisitNotes: true,
          postVisitSummary: true,
          prescriptions: true,
        },
      });

      sendCreated(res, updatedAppointment, 'Post-visit notes submitted. AI summary is being generated.');
    } catch (err: any) {
      if (err.name === 'ZodError') {
        sendError(res, 'Validation error', 422, JSON.stringify(err.errors));
        return;
      }
      sendError(res, 'Failed to submit post-visit notes', 500, err.message);
    }
  }

  /**
   * POST /api/doctor/appointments/:id/approve-summary — Approve post-visit summary
   */
  async approvePostVisitSummary(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { approved } = approvePostVisitSummarySchema.parse(req.body);
      const appointmentId = req.params.id as string;

      const summary = await prisma.postVisitSummary.findUnique({
        where: { appointmentId },
      });

      if (!summary) {
        sendNotFound(res, 'Post-visit summary not found');
        return;
      }

      const updated = await prisma.postVisitSummary.update({
        where: { appointmentId },
        data: { approvedByDoctor: approved },
      });

      sendSuccess(res, updated, approved ? 'Summary approved and sent to patient' : 'Summary rejected');
    } catch (err: any) {
      sendError(res, 'Failed to update summary', 500, err.message);
    }
  }

  /**
   * GET /api/doctor/appointments/:id/summary — Get post-visit summary
   */
  async getPostVisitSummary(req: AuthRequest, res: Response): Promise<void> {
    try {
      const summary = await prisma.postVisitSummary.findUnique({
        where: { appointmentId: req.params.id as string },
      });

      if (!summary) {
        sendNotFound(res, 'Summary not found or still being generated');
        return;
      }

      sendSuccess(res, summary);
    } catch (err: any) {
      sendError(res, 'Failed to fetch summary', 500, err.message);
    }
  }
}

export const doctorController = new DoctorController();
