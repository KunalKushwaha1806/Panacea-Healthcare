import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { bookingService } from '../services/booking.service';
import { slotService } from '../services/slot.service';
import {
  searchSlotsSchema,
  holdSlotSchema,
  cancelBookingSchema,
  rescheduleBookingSchema,
  symptomFormSchema,
} from '../validators/booking.validator';
import { sendSuccess, sendCreated, sendError, sendNotFound, sendConflict } from '../utils/apiResponse';
import { llmService } from '../services/llm.service';
import prisma from '../config/database';

export class BookingController {
  /**
   * GET /api/bookings/slots?doctorId=&date=
   */
  async getAvailableSlots(req: AuthRequest, res: Response): Promise<void> {
    try {
      const input = searchSlotsSchema.parse({
        doctorId: req.query.doctorId,
        date: req.query.date,
      });
      const slots = await slotService.getAvailableSlots(input.doctorId, input.date);
      sendSuccess(res, slots);
    } catch (err: any) {
      if (err.name === 'ZodError') {
        sendError(res, 'Validation error', 422, JSON.stringify(err.errors));
        return;
      }
      if (err.message === 'DOCTOR_NOT_FOUND') {
        sendNotFound(res, 'Doctor not found');
        return;
      }
      sendError(res, 'Failed to fetch slots', 500, err.message);
    }
  }

  /**
   * POST /api/bookings/hold
   */
  async holdSlot(req: AuthRequest, res: Response): Promise<void> {
    try {
      const input = holdSlotSchema.parse(req.body);
      const result = await bookingService.holdSlot(
        req.user!.userId,
        input.doctorProfileId,
        input.slotStart
      );
      sendCreated(res, result, 'Slot held successfully. Complete booking within 5 minutes.');
    } catch (err: any) {
      if (err.name === 'ZodError') {
        sendError(res, 'Validation error', 422, JSON.stringify(err.errors));
        return;
      }
      if (err.message === 'SLOT_TAKEN') {
        sendConflict(res, 'This slot is already taken. Please choose another.');
        return;
      }
      if (err.message === 'DOCTOR_NOT_FOUND') {
        sendNotFound(res, 'Doctor not found');
        return;
      }
      sendError(res, 'Failed to hold slot', 500, err.message);
    }
  }

  /**
   * POST /api/bookings/confirm/:id
   */
  async confirmBooking(req: AuthRequest, res: Response): Promise<void> {
    try {
      const result = await bookingService.confirmBooking(
        req.params.id,
        req.user!.userId
      );
      sendSuccess(res, result, 'Appointment confirmed successfully');
    } catch (err: any) {
      if (err.message === 'APPOINTMENT_NOT_FOUND') {
        sendNotFound(res, 'Appointment not found');
        return;
      }
      if (err.message === 'NOT_YOUR_APPOINTMENT') {
        sendError(res, 'This is not your appointment', 403);
        return;
      }
      if (err.message === 'HOLD_EXPIRED') {
        sendError(res, 'Booking hold has expired. Please select a new slot.', 410);
        return;
      }
      if (err.message === 'INVALID_STATUS') {
        sendError(res, 'This appointment cannot be confirmed in its current state', 400);
        return;
      }
      sendError(res, 'Failed to confirm booking', 500, err.message);
    }
  }

  /**
   * POST /api/bookings/cancel/:id
   */
  async cancelBooking(req: AuthRequest, res: Response): Promise<void> {
    try {
      const input = cancelBookingSchema.parse(req.body);
      const result = await bookingService.cancelBooking(
        req.params.id,
        req.user!.userId,
        input.reason
      );
      sendSuccess(res, result, 'Appointment cancelled');
    } catch (err: any) {
      if (err.message === 'APPOINTMENT_NOT_FOUND') {
        sendNotFound(res, 'Appointment not found');
        return;
      }
      if (err.message === 'NOT_AUTHORIZED') {
        sendError(res, 'Not authorized to cancel this appointment', 403);
        return;
      }
      if (err.message === 'ALREADY_CANCELLED') {
        sendError(res, 'This appointment is already cancelled', 400);
        return;
      }
      sendError(res, 'Failed to cancel booking', 500, err.message);
    }
  }

  /**
   * POST /api/bookings/reschedule/:id
   */
  async rescheduleBooking(req: AuthRequest, res: Response): Promise<void> {
    try {
      const input = rescheduleBookingSchema.parse(req.body);
      const result = await bookingService.rescheduleBooking(
        req.params.id,
        req.user!.userId,
        input.newSlotStart
      );
      sendSuccess(res, result, 'Appointment rescheduled successfully');
    } catch (err: any) {
      if (err.message === 'APPOINTMENT_NOT_FOUND') {
        sendNotFound(res, 'Appointment not found');
        return;
      }
      if (err.message === 'NOT_YOUR_APPOINTMENT') {
        sendError(res, 'This is not your appointment', 403);
        return;
      }
      if (err.message === 'SLOT_TAKEN') {
        sendConflict(res, 'The new slot is already taken');
        return;
      }
      if (err.message === 'INVALID_STATUS') {
        sendError(res, 'Only booked appointments can be rescheduled', 400);
        return;
      }
      sendError(res, 'Failed to reschedule', 500, err.message);
    }
  }

  /**
   * GET /api/bookings/my — Patient's appointments
   */
  async getMyAppointments(req: AuthRequest, res: Response): Promise<void> {
    try {
      const appointments = await bookingService.getPatientAppointments(req.user!.userId);
      sendSuccess(res, appointments);
    } catch (err: any) {
      sendError(res, 'Failed to fetch appointments', 500, err.message);
    }
  }

  /**
   * GET /api/bookings/doctor — Doctor's appointments
   */
  async getDoctorAppointments(req: AuthRequest, res: Response): Promise<void> {
    try {
      const doctorProfile = await prisma.doctorProfile.findUnique({
        where: { userId: req.user!.userId },
      });

      if (!doctorProfile) {
        sendNotFound(res, 'Doctor profile not found');
        return;
      }

      const date = req.query.date as string | undefined;
      const appointments = await bookingService.getDoctorAppointments(doctorProfile.id, date);
      sendSuccess(res, appointments);
    } catch (err: any) {
      sendError(res, 'Failed to fetch appointments', 500, err.message);
    }
  }

  /**
   * POST /api/bookings/:id/symptoms — Submit symptom form
   */
  async submitSymptomForm(req: AuthRequest, res: Response): Promise<void> {
    try {
      const input = symptomFormSchema.parse(req.body);
      const appointmentId = req.params.id;

      const appointment = await prisma.appointment.findUnique({
        where: { id: appointmentId },
      });

      if (!appointment) {
        sendNotFound(res, 'Appointment not found');
        return;
      }

      if (appointment.patientId !== req.user!.userId) {
        sendError(res, 'Not your appointment', 403);
        return;
      }

      const symptomForm = await prisma.symptomForm.upsert({
        where: { appointmentId },
        create: {
          appointmentId,
          patientId: req.user!.userId,
          symptoms: input.symptoms,
          duration: input.duration,
          severity: input.severity,
        },
        update: {
          symptoms: input.symptoms,
          duration: input.duration,
          severity: input.severity,
        },
      });

      // Trigger AI pre-visit summary generation (async, non-blocking)
      llmService.generatePreVisitSummary(
        appointmentId,
        input.symptoms,
        input.duration,
        input.severity
      ).catch(err => console.error('Pre-visit summary error:', err));

      sendCreated(res, symptomForm, 'Symptom form submitted');
    } catch (err: any) {
      if (err.name === 'ZodError') {
        sendError(res, 'Validation error', 422, JSON.stringify(err.errors));
        return;
      }
      sendError(res, 'Failed to submit symptoms', 500, err.message);
    }
  }
}

export const bookingController = new BookingController();
