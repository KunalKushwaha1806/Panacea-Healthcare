import prisma from '../config/database';
import { AppointmentStatus, Prisma } from '@prisma/client';
import { slotService } from './slot.service';
import { calendarService } from './calendar.service';

const HOLD_DURATION_MINUTES = 5;

export class BookingService {
  /**
   * Hold a slot for 5 minutes.
   * Uses a serializable transaction + unique constraint to prevent double-booking.
   */
  async holdSlot(patientId: string, doctorProfileId: string, slotStartStr: string) {
    const slotStart = new Date(slotStartStr);
    const profile = await prisma.doctorProfile.findUnique({
      where: { id: doctorProfileId },
    });

    if (!profile) {
      throw new Error('DOCTOR_NOT_FOUND');
    }

    const slotEnd = new Date(slotStart.getTime() + profile.slotDuration * 60 * 1000);
    const holdExpiresAt = new Date(Date.now() + HOLD_DURATION_MINUTES * 60 * 1000);

    try {
      // Use interactive transaction with serializable isolation to prevent races
      const appointment = await prisma.$transaction(async (tx) => {
        // Check if slot is already taken (BOOKED or active HELD)
        const existing = await tx.appointment.findFirst({
          where: {
            doctorProfileId,
            slotStart,
            OR: [
              { status: AppointmentStatus.BOOKED },
              {
                status: AppointmentStatus.HELD,
                holdExpiresAt: { gt: new Date() },
              },
            ],
          },
        });

        if (existing) {
          throw new Error('SLOT_TAKEN');
        }

        // Create the held appointment
        return tx.appointment.create({
          data: {
            patientId,
            doctorProfileId,
            slotStart,
            slotEnd,
            status: AppointmentStatus.HELD,
            holdExpiresAt,
          },
          include: {
            doctorProfile: {
              include: {
                user: { select: { name: true, email: true } },
              },
            },
          },
        });
      }, {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      });

      return {
        appointment,
        holdExpiresAt,
        holdDurationMinutes: HOLD_DURATION_MINUTES,
      };
    } catch (err: any) {
      // Unique constraint violation — another request won the race
      if (err.code === 'P2002') {
        throw new Error('SLOT_TAKEN');
      }
      throw err;
    }
  }

  /**
   * Confirm a held booking.
   * Transitions HELD → BOOKED if hold hasn't expired.
   */
  async confirmBooking(appointmentId: string, patientId: string) {
    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: {
        doctorProfile: {
          include: {
            user: { select: { id: true, name: true, email: true } },
          },
        },
        patient: { select: { id: true, name: true, email: true } },
      },
    });

    if (!appointment) {
      throw new Error('APPOINTMENT_NOT_FOUND');
    }

    if (appointment.patientId !== patientId) {
      throw new Error('NOT_YOUR_APPOINTMENT');
    }

    if (appointment.status !== AppointmentStatus.HELD) {
      throw new Error('INVALID_STATUS');
    }

    if (appointment.holdExpiresAt && appointment.holdExpiresAt < new Date()) {
      // Hold expired — clean it up
      await prisma.appointment.delete({ where: { id: appointmentId } });
      throw new Error('HOLD_EXPIRED');
    }

    const confirmed = await prisma.appointment.update({
      where: { id: appointmentId },
      data: {
        status: AppointmentStatus.BOOKED,
        holdExpiresAt: null,
      },
      include: {
        doctorProfile: {
          include: {
            user: { select: { id: true, name: true, email: true } },
          },
        },
        patient: { select: { id: true, name: true, email: true } },
      },
    });

    // Log email notification (to be sent by background job)
    await prisma.notificationLog.createMany({
      data: [
        {
          userId: confirmed.patientId,
          type: 'EMAIL',
          subject: 'Appointment Confirmed',
          payload: {
            appointmentId: confirmed.id,
            slotStart: confirmed.slotStart,
            doctorName: confirmed.doctorProfile.user.name,
          },
          status: 'PENDING',
        },
        {
          userId: confirmed.doctorProfile.userId,
          type: 'EMAIL',
          subject: 'New Appointment Booked',
          payload: {
            appointmentId: confirmed.id,
            slotStart: confirmed.slotStart,
            patientName: confirmed.patient.name,
          },
          status: 'PENDING',
        },
      ],
    });

    const patientEventId = await calendarService.createEvent(
      confirmed.patientId, confirmed.id,
      `Appointment with Dr. ${confirmed.doctorProfile.user.name}`,
      `Clinic appointment`, confirmed.slotStart, confirmed.slotEnd
    );
    const doctorEventId = await calendarService.createEvent(
      confirmed.doctorProfile.userId, confirmed.id,
      `Appointment with ${confirmed.patient.name}`,
      `Patient visit`, confirmed.slotStart, confirmed.slotEnd
    );
    // Store at least one event ID for future updates/deletes
    if (patientEventId) {
      await prisma.appointment.update({ where: { id: confirmed.id }, data: { googleEventId: patientEventId } });
    }

    return confirmed;
  }

  /**
   * Cancel an appointment.
   */
  async cancelBooking(appointmentId: string, userId: string, reason?: string) {
    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: {
        doctorProfile: {
          include: { user: { select: { id: true, name: true, email: true } } },
        },
        patient: { select: { id: true, name: true, email: true } },
      },
    });

    if (!appointment) {
      throw new Error('APPOINTMENT_NOT_FOUND');
    }

    // Patient or doctor or admin can cancel
    if (appointment.patientId !== userId && appointment.doctorProfile.userId !== userId) {
      // Check if user is admin
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user || user.role !== 'ADMIN') {
        throw new Error('NOT_AUTHORIZED');
      }
    }

    if (appointment.status === AppointmentStatus.CANCELLED) {
      throw new Error('ALREADY_CANCELLED');
    }

    const cancelled = await prisma.appointment.update({
      where: { id: appointmentId },
      data: {
        status: AppointmentStatus.CANCELLED,
        cancelReason: reason || 'Cancelled by user',
      },
      include: {
        doctorProfile: {
          include: { user: { select: { id: true, name: true, email: true } } },
        },
        patient: { select: { id: true, name: true, email: true } },
      },
    });

    // Notify both parties
    await prisma.notificationLog.createMany({
      data: [
        {
          userId: cancelled.patientId,
          type: 'EMAIL',
          subject: 'Appointment Cancelled',
          payload: {
            appointmentId: cancelled.id,
            slotStart: cancelled.slotStart,
            reason: cancelled.cancelReason,
          },
          status: 'PENDING',
        },
        {
          userId: cancelled.doctorProfile.userId,
          type: 'EMAIL',
          subject: 'Appointment Cancelled',
          payload: {
            appointmentId: cancelled.id,
            slotStart: cancelled.slotStart,
            patientName: cancelled.patient.name,
            reason: cancelled.cancelReason,
          },
          status: 'PENDING',
        },
      ],
    });

    if (appointment.googleEventId) {
      await calendarService.deleteEvent(appointment.patientId, appointment.googleEventId);
    }

    return cancelled;
  }

  /**
   * Reschedule an appointment — cancels old + books new atomically.
   */
  async rescheduleBooking(appointmentId: string, patientId: string, newSlotStartStr: string) {
    const oldAppointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: {
        doctorProfile: {
          include: { user: { select: { id: true, name: true, email: true } } },
        },
      },
    });

    if (!oldAppointment) {
      throw new Error('APPOINTMENT_NOT_FOUND');
    }

    if (oldAppointment.patientId !== patientId) {
      throw new Error('NOT_YOUR_APPOINTMENT');
    }

    if (oldAppointment.status !== AppointmentStatus.BOOKED) {
      throw new Error('INVALID_STATUS');
    }

    const newSlotStart = new Date(newSlotStartStr);
    const slotDuration = oldAppointment.doctorProfile.slotDuration;
    const newSlotEnd = new Date(newSlotStart.getTime() + slotDuration * 60 * 1000);

    try {
      const result = await prisma.$transaction(async (tx) => {
        // Check if new slot is available
        const existing = await tx.appointment.findFirst({
          where: {
            doctorProfileId: oldAppointment.doctorProfileId,
            slotStart: newSlotStart,
            OR: [
              { status: AppointmentStatus.BOOKED },
              {
                status: AppointmentStatus.HELD,
                holdExpiresAt: { gt: new Date() },
              },
            ],
          },
        });

        if (existing) {
          throw new Error('SLOT_TAKEN');
        }

        // Cancel old appointment
        await tx.appointment.update({
          where: { id: appointmentId },
          data: {
            status: AppointmentStatus.RESCHEDULED,
            cancelReason: 'Rescheduled',
          },
        });

        // Create new appointment
        const newAppointment = await tx.appointment.create({
          data: {
            patientId,
            doctorProfileId: oldAppointment.doctorProfileId,
            slotStart: newSlotStart,
            slotEnd: newSlotEnd,
            status: AppointmentStatus.BOOKED,
          },
          include: {
            doctorProfile: {
              include: { user: { select: { id: true, name: true, email: true } } },
            },
            patient: { select: { id: true, name: true, email: true } },
          },
        });

        return newAppointment;
      }, {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      });

      // Notify about reschedule
      await prisma.notificationLog.create({
        data: {
          userId: patientId,
          type: 'EMAIL',
          subject: 'Appointment Rescheduled',
          payload: {
            oldSlotStart: oldAppointment.slotStart,
            newSlotStart: result.slotStart,
            doctorName: result.doctorProfile.user.name,
          },
          status: 'PENDING',
        },
      });

      if (oldAppointment.googleEventId) {
        await calendarService.deleteEvent(patientId, oldAppointment.googleEventId);
      }
      // Create new calendar event and store its ID
      const newEventId = await calendarService.createEvent(
        patientId, result.id,
        `Appointment with Dr. ${result.doctorProfile.user.name}`,
        `Clinic appointment`, result.slotStart, result.slotEnd
      );
      const doctorEventId = await calendarService.createEvent(
        result.doctorProfile.userId, result.id,
        `Appointment with ${result.patient.name}`,
        `Patient visit`, result.slotStart, result.slotEnd
      );
      if (newEventId) {
        await prisma.appointment.update({ where: { id: result.id }, data: { googleEventId: newEventId } });
      }

      return result;
    } catch (err: any) {
      if (err.code === 'P2002') {
        throw new Error('SLOT_TAKEN');
      }
      throw err;
    }
  }

  /**
   * Get patient's appointments.
   */
  async getPatientAppointments(patientId: string) {
    return prisma.appointment.findMany({
      where: { patientId },
      include: {
        doctorProfile: {
          include: { user: { select: { name: true, email: true } } },
        },
        symptomForm: true,
        preVisitSummary: true,
        postVisitSummary: true,
        prescriptions: true,
      },
      orderBy: { slotStart: 'desc' },
    });
  }

  /**
   * Get doctor's appointments (optionally filtered by date).
   */
  async getDoctorAppointments(doctorProfileId: string, date?: string) {
    const where: any = {
      doctorProfileId,
      status: { in: [AppointmentStatus.BOOKED, AppointmentStatus.COMPLETED] },
    };

    if (date) {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);
      where.slotStart = { gte: startOfDay, lte: endOfDay };
    }

    return prisma.appointment.findMany({
      where,
      include: {
        patient: { select: { id: true, name: true, email: true, phone: true } },
        symptomForm: true,
        preVisitSummary: true,
        postVisitNotes: true,
        postVisitSummary: true,
        prescriptions: true,
      },
      orderBy: { slotStart: 'asc' },
    });
  }

  /**
   * Clean up expired holds.
   */
  async cleanupExpiredHolds() {
    const result = await prisma.appointment.deleteMany({
      where: {
        status: AppointmentStatus.HELD,
        holdExpiresAt: { lt: new Date() },
      },
    });
    return result.count;
  }
}

export const bookingService = new BookingService();
