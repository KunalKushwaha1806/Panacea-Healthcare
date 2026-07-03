import { Router } from 'express';
import { doctorController } from '../controllers/doctor.controller';
import { bookingController } from '../controllers/booking.controller';
import { authenticate, authorize } from '../middleware/auth';
import { Role } from '@prisma/client';

const router = Router();

// All doctor routes require authentication + DOCTOR role
router.use(authenticate);
router.use(authorize(Role.DOCTOR));

// Appointments
router.get('/appointments', (req, res) => bookingController.getDoctorAppointments(req, res));

// Post-visit flow
router.post('/appointments/:id/notes', (req, res) => doctorController.submitPostVisitNotes(req, res));
router.get('/appointments/:id/summary', (req, res) => doctorController.getPostVisitSummary(req, res));
router.post('/appointments/:id/approve-summary', (req, res) => doctorController.approvePostVisitSummary(req, res));

export default router;
