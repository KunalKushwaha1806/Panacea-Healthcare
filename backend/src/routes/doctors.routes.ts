import { Router } from 'express';
import prisma from '../config/database';
import { sendSuccess } from '../utils/apiResponse';
import { Role } from '@prisma/client';

const router = Router();

/**
 * GET /api/doctors — Public list of all doctors with profiles
 * Available to all authenticated users (patients searching for doctors)
 */
router.get('/', async (_req, res) => {
  try {
    const doctors = await prisma.user.findMany({
      where: { role: Role.DOCTOR },
      select: {
        id: true,
        name: true,
        doctorProfile: {
          select: {
            id: true,
            specialisation: true,
            slotDuration: true,
            bio: true,
            workingHours: true,
            leaveDays: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    sendSuccess(res, doctors);
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to fetch doctors', error: err.message });
  }
});

/**
 * GET /api/doctors/:id — Single doctor details
 */
router.get('/:id', async (req, res) => {
  try {
    const profile = await prisma.doctorProfile.findUnique({
      where: { id: req.params.id },
      include: {
        user: {
          select: { id: true, name: true },
        },
      },
    });

    if (!profile) {
      res.status(404).json({ success: false, message: 'Doctor not found' });
      return;
    }

    sendSuccess(res, profile);
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to fetch doctor', error: err.message });
  }
});

export default router;
