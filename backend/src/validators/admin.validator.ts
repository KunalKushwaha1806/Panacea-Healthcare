import { z } from 'zod';

const workingHourSlotSchema = z.object({
  start: z.string().regex(/^\d{2}:\d{2}$/, 'Format must be HH:MM'),
  end: z.string().regex(/^\d{2}:\d{2}$/, 'Format must be HH:MM'),
});

export const createDoctorSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(2),
  phone: z.string().optional(),
  specialisation: z.string().min(2),
  slotDuration: z.number().int().min(10).max(120).default(30),
  bio: z.string().optional(),
  workingHours: z.object({
    mon: workingHourSlotSchema.optional(),
    tue: workingHourSlotSchema.optional(),
    wed: workingHourSlotSchema.optional(),
    thu: workingHourSlotSchema.optional(),
    fri: workingHourSlotSchema.optional(),
    sat: workingHourSlotSchema.optional(),
    sun: workingHourSlotSchema.optional(),
  }),
});

export const updateDoctorSchema = z.object({
  specialisation: z.string().min(2).optional(),
  slotDuration: z.number().int().min(10).max(120).optional(),
  bio: z.string().optional(),
  workingHours: z.object({
    mon: workingHourSlotSchema.optional(),
    tue: workingHourSlotSchema.optional(),
    wed: workingHourSlotSchema.optional(),
    thu: workingHourSlotSchema.optional(),
    fri: workingHourSlotSchema.optional(),
    sat: workingHourSlotSchema.optional(),
    sun: workingHourSlotSchema.optional(),
  }).optional(),
});

export const markLeaveSchema = z.object({
  dates: z.array(z.string().datetime()).min(1, 'At least one date is required'),
});

export type CreateDoctorInput = z.infer<typeof createDoctorSchema>;
export type UpdateDoctorInput = z.infer<typeof updateDoctorSchema>;
export type MarkLeaveInput = z.infer<typeof markLeaveSchema>;
