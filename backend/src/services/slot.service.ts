import prisma from '../config/database';
import { AppointmentStatus } from '@prisma/client';

interface WorkingHourSlot {
  start: string; // "HH:MM"
  end: string;   // "HH:MM"
}

interface WorkingHours {
  mon?: WorkingHourSlot;
  tue?: WorkingHourSlot;
  wed?: WorkingHourSlot;
  thu?: WorkingHourSlot;
  fri?: WorkingHourSlot;
  sat?: WorkingHourSlot;
  sun?: WorkingHourSlot;
}

export interface TimeSlot {
  start: Date;
  end: Date;
  available: boolean;
}

const DAY_MAP: Record<number, keyof WorkingHours> = {
  0: 'sun', 1: 'mon', 2: 'tue', 3: 'wed',
  4: 'thu', 5: 'fri', 6: 'sat',
};

export class SlotService {
  /**
   * Generate all possible slots for a doctor on a given date,
   * then subtract booked/held slots and check against leave days.
   */
  async getAvailableSlots(doctorProfileId: string, date: string): Promise<TimeSlot[]> {
    const profile = await prisma.doctorProfile.findUnique({
      where: { id: doctorProfileId },
    });

    if (!profile) {
      throw new Error('DOCTOR_NOT_FOUND');
    }

    const targetDate = new Date(date);
    const dayOfWeek = targetDate.getDay();
    const dayKey = DAY_MAP[dayOfWeek];

    const workingHours = profile.workingHours as WorkingHours;
    const dayHours = workingHours[dayKey];

    // Doctor doesn't work on this day
    if (!dayHours) {
      return [];
    }

    // Check if this date is a leave day
    const isLeaveDay = (profile.leaveDays || []).some((leaveDate: Date) => {
      const ld = new Date(leaveDate);
      return ld.toISOString().split('T')[0] === date;
    });

    if (isLeaveDay) {
      return [];
    }

    // Generate all slots for the day
    const allSlots = this.generateSlots(targetDate, dayHours, profile.slotDuration);

    // Get booked/held appointments for this doctor on this date
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const existingAppointments = await prisma.appointment.findMany({
      where: {
        doctorProfileId,
        slotStart: {
          gte: startOfDay,
          lte: endOfDay,
        },
        OR: [
          { status: AppointmentStatus.BOOKED },
          {
            status: AppointmentStatus.HELD,
            holdExpiresAt: { gt: new Date() },
          },
        ],
      },
      select: { slotStart: true },
    });

    const bookedTimes = new Set(
      existingAppointments.map(a => a.slotStart.getTime())
    );

    // Mark slots as available or not
    return allSlots.map(slot => ({
      ...slot,
      available: !bookedTimes.has(slot.start.getTime()),
    }));
  }

  /**
   * Generate time slots from working hours and slot duration.
   */
  private generateSlots(date: Date, hours: WorkingHourSlot, durationMinutes: number): TimeSlot[] {
    const slots: TimeSlot[] = [];

    const [startH, startM] = hours.start.split(':').map(Number);
    const [endH, endM] = hours.end.split(':').map(Number);

    const start = new Date(date);
    start.setHours(startH, startM, 0, 0);

    const end = new Date(date);
    end.setHours(endH, endM, 0, 0);

    let current = new Date(start);

    while (current.getTime() + durationMinutes * 60 * 1000 <= end.getTime()) {
      const slotEnd = new Date(current.getTime() + durationMinutes * 60 * 1000);
      slots.push({
        start: new Date(current),
        end: slotEnd,
        available: true,
      });
      current = slotEnd;
    }

    return slots;
  }
}

export const slotService = new SlotService();
