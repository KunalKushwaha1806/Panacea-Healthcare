import { z } from 'zod';

export const postVisitNotesSchema = z.object({
  clinicalNotes: z.string().min(5, 'Clinical notes are required'),
  diagnosis: z.string().optional(),
  prescriptions: z.array(z.object({
    medication: z.string().min(1),
    dosage: z.string().min(1),
    frequency: z.string().min(1),
    duration: z.string().min(1),
    instructions: z.string().optional(),
  })).optional().default([]),
});

export const approvePostVisitSummarySchema = z.object({
  approved: z.boolean(),
});

export type PostVisitNotesInput = z.infer<typeof postVisitNotesSchema>;
