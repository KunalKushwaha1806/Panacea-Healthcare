import { Router } from 'express';
import { adminController } from '../controllers/admin.controller';
import { authenticate, authorize } from '../middleware/auth';
import { Role } from '@prisma/client';

const router = Router();

// All admin routes require authentication + ADMIN role
router.use(authenticate);
router.use(authorize(Role.ADMIN));

router.get('/doctors', (req, res) => adminController.getAllDoctors(req, res));
router.get('/doctors/:id', (req, res) => adminController.getDoctorById(req, res));
router.post('/doctors', (req, res) => adminController.createDoctor(req, res));
router.put('/doctors/:id', (req, res) => adminController.updateDoctor(req, res));
router.delete('/doctors/:id', (req, res) => adminController.deleteDoctor(req, res));
router.post('/doctors/:id/leave', (req, res) => adminController.markLeave(req, res));

export default router;
