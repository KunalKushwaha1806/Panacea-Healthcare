import cron from 'node-cron';
import prisma from '../config/database';
import { emailService } from '../services/email.service';
import { bookingService } from '../services/booking.service';
import { AppointmentStatus } from '@prisma/client';
import {
  reminderEmail,
  medicationReminderEmail,
  bookingConfirmationEmail,
  cancellationEmail,
  leaveConflictEmail,
} from '../templates/emails';
import { env } from '../config/env';

/**
 * Initialize all background cron jobs.
 */
export function initializeJobs() {
  console.log('🔧 Initializing background jobs...');

  // ── Hold cleanup — every minute ──
  cron.schedule('* * * * *', async () => {
    try {
      const cleaned = await bookingService.cleanupExpiredHolds();
      if (cleaned > 0) {
        console.log(`🧹 Cleaned up ${cleaned} expired slot holds`);
      }
    } catch (err) {
      console.error('❌ Hold cleanup error:', err);
    }
  });

  // ── Email retry queue — every 2 minutes ──
  cron.schedule('*/2 * * * *', async () => {
    try {
      await processEmailQueue();
    } catch (err) {
      console.error('❌ Email queue error:', err);
    }
  });

  // ── Appointment reminders — every 15 minutes ──
  cron.schedule('*/15 * * * *', async () => {
    try {
      await sendAppointmentReminders();
    } catch (err) {
      console.error('❌ Reminder error:', err);
    }
  });

  // ── Medication reminders — every 15 minutes ──
  cron.schedule('*/15 * * * *', async () => {
    try {
      await sendMedicationReminders();
    } catch (err) {
      console.error('❌ Medication reminder error:', err);
    }
  });

  console.log('✅ Background jobs initialized');
}

/**
 * Process pending email notifications from NotificationLog.
 * Implements retry with exponential backoff.
 */
async function processEmailQueue() {
  const pendingEmails = await prisma.notificationLog.findMany({
    where: {
      type: 'EMAIL',
      status: { in: ['PENDING', 'RETRYING'] },
      OR: [
        { nextRetryAt: null },
        { nextRetryAt: { lte: new Date() } },
      ],
    },
    include: {
      user: { select: { email: true, name: true } },
    },
    take: 10, // Process 10 at a time
  });

  for (const notification of pendingEmails) {
    if (!notification.user?.email) {
      await prisma.notificationLog.update({
        where: { id: notification.id },
        data: { status: 'FAILED', error: 'No user email found' },
      });
      continue;
    }

    const payload = notification.payload as any;

    // Build email HTML based on subject
    let html = `<p>${notification.subject}</p><pre>${JSON.stringify(payload, null, 2)}</pre>`;

    if (notification.subject.includes('Confirmed')) {
      html = bookingConfirmationEmail({
        patientName: notification.user.name,
        doctorName: payload?.doctorName || 'Your Doctor',
        slotStart: new Date(payload?.slotStart),
        slotEnd: new Date(payload?.slotEnd || payload?.slotStart),
      });
    } else if (notification.subject.includes('Reminder') && payload?.appointmentId) {
      html = reminderEmail({
        patientName: notification.user.name,
        doctorName: payload?.doctorName || 'Your Doctor',
        slotStart: new Date(payload?.slotStart),
        hoursUntil: payload?.hoursUntil,
      });
    } else if (notification.subject.includes('Cancelled') && notification.subject.includes('Leave')) {
      html = leaveConflictEmail({
        patientName: notification.user.name,
        doctorName: payload?.doctorName || 'Your Doctor',
        slotStart: new Date(payload?.slotStart),
        rebookUrl: `${env.FRONTEND_URL}/book`,
      });
    } else if (notification.subject.includes('Cancelled')) {
      html = cancellationEmail({
        patientName: notification.user.name,
        doctorName: payload?.doctorName || 'Your Doctor',
        slotStart: new Date(payload?.slotStart),
        reason: payload?.reason || 'Not specified',
        rebookUrl: `${env.FRONTEND_URL}/book`,
      });
    }

    const result = await emailService.send(
      notification.user.email,
      notification.subject,
      html
    );

    if (result.success) {
      await prisma.notificationLog.update({
        where: { id: notification.id },
        data: { status: 'SENT', error: null },
      });
    } else {
      const newRetries = notification.retries + 1;
      if (newRetries >= notification.maxRetries) {
        await prisma.notificationLog.update({
          where: { id: notification.id },
          data: {
            status: 'FAILED',
            retries: newRetries,
            error: result.error || 'Max retries exceeded',
          },
        });
      } else {
        // Exponential backoff: 2^retries minutes
        const backoffMs = Math.pow(2, newRetries) * 60 * 1000;
        await prisma.notificationLog.update({
          where: { id: notification.id },
          data: {
            status: 'RETRYING',
            retries: newRetries,
            error: result.error,
            nextRetryAt: new Date(Date.now() + backoffMs),
          },
        });
      }
    }
  }
}

/**
 * Send appointment reminders (24h and 1h before).
 */
async function sendAppointmentReminders() {
  const now = new Date();

  // Find appointments that need reminders
  for (const hoursUntil of [24, 1]) {
    const reminderTime = new Date(now.getTime() + hoursUntil * 60 * 60 * 1000);
    const windowStart = new Date(reminderTime.getTime() - 15 * 60 * 1000); // 15 min window
    const windowEnd = new Date(reminderTime.getTime() + 15 * 60 * 1000);

    const appointments = await prisma.appointment.findMany({
      where: {
        status: AppointmentStatus.BOOKED,
        slotStart: { gte: windowStart, lte: windowEnd },
      },
      include: {
        patient: { select: { id: true, email: true, name: true } },
        doctorProfile: {
          include: { user: { select: { name: true } } },
        },
      },
    });

    for (const apt of appointments) {
      // Check if reminder already sent (avoid duplicates)
      const alreadySent = await prisma.notificationLog.findFirst({
        where: {
          userId: apt.patientId,
          subject: { contains: `${hoursUntil}h Reminder` },
          payload: { path: ['appointmentId'], equals: apt.id },
          status: { in: ['SENT', 'PENDING'] },
        },
      });

      if (alreadySent) continue;

      await prisma.notificationLog.create({
        data: {
          userId: apt.patientId,
          type: 'EMAIL',
          subject: `${hoursUntil}h Reminder — Appointment with Dr. ${apt.doctorProfile.user.name}`,
          payload: {
            appointmentId: apt.id,
            slotStart: apt.slotStart,
            doctorName: apt.doctorProfile.user.name,
            hoursUntil,
          },
          status: 'PENDING',
        },
      });
    }
  }
}

/**
 * Send medication reminders that are due.
 */
async function sendMedicationReminders() {
  const dueReminders = await prisma.medicationReminder.findMany({
    where: {
      sent: false,
      scheduledAt: { lte: new Date() },
    },
    include: {
      prescription: {
        include: {
          appointment: {
            include: {
              patient: { select: { id: true, email: true, name: true } },
            },
          },
        },
      },
    },
    take: 20,
  });

  for (const reminder of dueReminders) {
    const patient = reminder.prescription.appointment.patient;

    await prisma.notificationLog.create({
      data: {
        userId: patient.id,
        type: 'EMAIL',
        subject: `Medication Reminder — ${reminder.prescription.medication}`,
        payload: {
          medication: reminder.prescription.medication,
          dosage: reminder.prescription.dosage,
          instructions: reminder.prescription.instructions,
        },
        status: 'PENDING',
      },
    });

    await prisma.medicationReminder.update({
      where: { id: reminder.id },
      data: { sent: true },
    });
  }
}
