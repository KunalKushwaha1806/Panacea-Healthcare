import bcrypt from 'bcryptjs';
import prisma from '../config/database';
import { CreateDoctorInput, UpdateDoctorInput } from '../validators/admin.validator';
import { Role, AppointmentStatus } from '@prisma/client';
import { calendarService } from './calendar.service';

const SALT_ROUNDS = 12;

export class AdminService {
  /**
   * Create a new doctor user + doctor profile.
   */
  async createDoctor(input: CreateDoctorInput) {
    const existingUser = await prisma.user.findUnique({
      where: { email: input.email },
    });

    if (existingUser) {
      throw new Error('USER_EXISTS');
    }

    const passwordHash = await bcrypt.hash(input.password, SALT_ROUNDS);

    const user = await prisma.user.create({
      data: {
        email: input.email,
        passwordHash,
        name: input.name,
        phone: input.phone,
        role: Role.DOCTOR,
        doctorProfile: {
          create: {
            specialisation: input.specialisation,
            slotDuration: input.slotDuration,
            workingHours: input.workingHours,
            bio: input.bio,
          },
        },
      },
      include: {
        doctorProfile: true,
      },
    });

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      doctorProfile: user.doctorProfile,
    };
  }

  /**
   * Update a doctor profile.
   */
  async updateDoctor(doctorProfileId: string, input: UpdateDoctorInput) {
    const profile = await prisma.doctorProfile.findUnique({
      where: { id: doctorProfileId },
    });

    if (!profile) {
      throw new Error('DOCTOR_NOT_FOUND');
    }

    const updated = await prisma.doctorProfile.update({
      where: { id: doctorProfileId },
      data: {
        ...(input.specialisation && { specialisation: input.specialisation }),
        ...(input.slotDuration && { slotDuration: input.slotDuration }),
        ...(input.bio !== undefined && { bio: input.bio }),
        ...(input.workingHours && { workingHours: input.workingHours }),
      },
      include: {
        user: {
          select: { id: true, email: true, name: true },
        },
      },
    });

    return updated;
  }

  /**
   * Delete a doctor profile and user.
   */
  async deleteDoctor(doctorProfileId: string) {
    const profile = await prisma.doctorProfile.findUnique({
      where: { id: doctorProfileId },
      select: { userId: true },
    });

    if (!profile) {
      throw new Error('DOCTOR_NOT_FOUND');
    }

    // Delete user (cascades to doctor profile)
    await prisma.user.delete({
      where: { id: profile.userId },
    });

    return { deleted: true };
  }

  /**
   * Get all doctors with profiles.
   */
  async getAllDoctors() {
    const doctors = await prisma.user.findMany({
      where: { role: Role.DOCTOR },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        doctorProfile: true,
      },
      orderBy: { name: 'asc' },
    });

    return doctors;
  }

  /**
   * Get a single doctor by profile ID.
   */
  async getDoctorById(doctorProfileId: string) {
    const profile = await prisma.doctorProfile.findUnique({
      where: { id: doctorProfileId },
      include: {
        user: {
          select: { id: true, email: true, name: true, phone: true },
        },
      },
    });

    if (!profile) {
      throw new Error('DOCTOR_NOT_FOUND');
    }

    return profile;
  }

  /**
   * Mark leave days for a doctor.
   * Detects and cancels conflicting booked appointments.
   * Returns cancelled appointments so caller can trigger notifications.
   */
  async markLeave(doctorProfileId: string, dates: Date[]) {
    const profile = await prisma.doctorProfile.findUnique({
      where: { id: doctorProfileId },
    });

    if (!profile) {
      throw new Error('DOCTOR_NOT_FOUND');
    }

    // Merge new leave days with existing, avoiding duplicates
    const existingLeaves = (profile.leaveDays || []).map((d: Date) => d.toISOString().split('T')[0]);
    const newDates = dates.map(d => new Date(d));
    const newDateStrings = newDates.map(d => d.toISOString().split('T')[0]);
    const allLeaveStrings = [...new Set([...existingLeaves, ...newDateStrings])];
    const allLeaveDates = allLeaveStrings.map(s => new Date(s));

    // Find conflicting appointments (booked on any of the new leave dates)
    const conflictingAppointments = await prisma.appointment.findMany({
      where: {
        doctorProfileId,
        status: AppointmentStatus.BOOKED,
        slotStart: {
          gte: new Date(Math.min(...newDates.map(d => {
            const start = new Date(d);
            start.setHours(0, 0, 0, 0);
            return start.getTime();
          }))),
          lte: new Date(Math.max(...newDates.map(d => {
            const end = new Date(d);
            end.setHours(23, 59, 59, 999);
            return end.getTime();
          }))),
        },
      },
      include: {
        patient: {
          select: { id: true, email: true, name: true },
        },
      },
    });

    // Filter to only those that fall on actual leave dates
    const actualConflicts = conflictingAppointments.filter(apt => {
      const aptDate = apt.slotStart.toISOString().split('T')[0];
      return newDateStrings.includes(aptDate);
    });

    // Update leave days and cancel conflicting appointments in a transaction
    await prisma.$transaction(async (tx) => {
      // Update leave days
      await tx.doctorProfile.update({
        where: { id: doctorProfileId },
        data: { leaveDays: allLeaveDates },
      });

      // Cancel conflicting appointments
      if (actualConflicts.length > 0) {
        await tx.appointment.updateMany({
          where: {
            id: { in: actualConflicts.map(a => a.id) },
          },
          data: {
            status: AppointmentStatus.CANCELLED,
            cancelReason: 'Doctor on leave',
          },
        });

        // Log notifications for each cancelled appointment
        await tx.notificationLog.createMany({
          data: actualConflicts.map(apt => ({
            userId: apt.patientId,
            type: 'EMAIL',
            subject: 'Appointment Cancelled — Doctor on Leave',
            payload: {
              appointmentId: apt.id,
              doctorProfileId,
              slotStart: apt.slotStart,
              reason: 'Doctor on leave',
            },
            status: 'PENDING',
          })),
        });
      }
    });

    // Delete calendar events for actual conflicts
    for (const apt of actualConflicts) {
      if (apt.googleEventId) {
        await calendarService.deleteEvent(apt.patientId, apt.googleEventId);
      }
    }

    return {
      leaveDays: allLeaveDates,
      cancelledAppointments: actualConflicts.map(a => ({
        id: a.id,
        slotStart: a.slotStart,
        patient: a.patient,
      })),
    };
  }
}

export const adminService = new AdminService();
