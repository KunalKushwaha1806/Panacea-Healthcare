import { z } from 'zod';

export const searchSlotsSchema = z.object({
  doctorId: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD format'),
});

export const holdSlotSchema = z.object({
  doctorProfileId: z.string().uuid(),
  slotStart: z.string().datetime(),
});

export const confirmBookingSchema = z.object({
  appointmentId: z.string().uuid(),
});

export const cancelBookingSchema = z.object({
  reason: z.string().optional(),
});

export const rescheduleBookingSchema = z.object({
  newSlotStart: z.string().datetime(),
});

export const symptomFormSchema = z.object({
  symptoms: z.string().min(5, 'Please describe your symptoms'),
  duration: z.string().optional(),
  severity: z.enum(['mild', 'moderate', 'severe']).optional(),
});

export type SearchSlotsInput = z.infer<typeof searchSlotsSchema>;
export type HoldSlotInput = z.infer<typeof holdSlotSchema>;
export type SymptomFormInput = z.infer<typeof symptomFormSchema>;
