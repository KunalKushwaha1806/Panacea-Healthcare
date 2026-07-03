import { Router } from 'express';
import { bookingController } from '../controllers/booking.controller';
import { authenticate, authorize } from '../middleware/auth';
import { Role } from '@prisma/client';

const router = Router();

// All booking routes require authentication
router.use(authenticate);

// Patient routes
router.get('/slots', (req, res) => bookingController.getAvailableSlots(req, res));
router.post('/hold', authorize(Role.PATIENT), (req, res) => bookingController.holdSlot(req, res));
router.post('/confirm/:id', authorize(Role.PATIENT), (req, res) => bookingController.confirmBooking(req, res));
router.post('/cancel/:id', (req, res) => bookingController.cancelBooking(req, res));
router.post('/reschedule/:id', authorize(Role.PATIENT), (req, res) => bookingController.rescheduleBooking(req, res));
router.get('/my', authorize(Role.PATIENT), (req, res) => bookingController.getMyAppointments(req, res));
router.post('/:id/symptoms', authorize(Role.PATIENT), (req, res) => bookingController.submitSymptomForm(req, res));

// Doctor routes
router.get('/doctor', authorize(Role.DOCTOR), (req, res) => bookingController.getDoctorAppointments(req, res));

export default router;
