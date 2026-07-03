import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { adminService } from '../services/admin.service';
import {
  createDoctorSchema,
  updateDoctorSchema,
  markLeaveSchema,
} from '../validators/admin.validator';
import { sendSuccess, sendCreated, sendError, sendNotFound } from '../utils/apiResponse';

export class AdminController {
  /**
   * POST /api/admin/doctors — Create a new doctor
   */
  async createDoctor(req: AuthRequest, res: Response): Promise<void> {
    try {
      const input = createDoctorSchema.parse(req.body);
      const doctor = await adminService.createDoctor(input);
      sendCreated(res, doctor, 'Doctor created successfully');
    } catch (err: any) {
      if (err.name === 'ZodError') {
        sendError(res, 'Validation error', 422, JSON.stringify(err.errors));
        return;
      }
      if (err.message === 'USER_EXISTS') {
        sendError(res, 'A user with this email already exists', 409);
        return;
      }
      sendError(res, 'Failed to create doctor', 500, err.message);
    }
  }

  /**
   * PUT /api/admin/doctors/:id — Update a doctor profile
   */
  async updateDoctor(req: AuthRequest, res: Response): Promise<void> {
    try {
      const input = updateDoctorSchema.parse(req.body);
      const doctor = await adminService.updateDoctor(req.params.id, input);
      sendSuccess(res, doctor, 'Doctor updated successfully');
    } catch (err: any) {
      if (err.name === 'ZodError') {
        sendError(res, 'Validation error', 422, JSON.stringify(err.errors));
        return;
      }
      if (err.message === 'DOCTOR_NOT_FOUND') {
        sendNotFound(res, 'Doctor not found');
        return;
      }
      sendError(res, 'Failed to update doctor', 500, err.message);
    }
  }

  /**
   * DELETE /api/admin/doctors/:id — Delete a doctor
   */
  async deleteDoctor(req: AuthRequest, res: Response): Promise<void> {
    try {
      await adminService.deleteDoctor(req.params.id);
      sendSuccess(res, null, 'Doctor deleted successfully');
    } catch (err: any) {
      if (err.message === 'DOCTOR_NOT_FOUND') {
        sendNotFound(res, 'Doctor not found');
        return;
      }
      sendError(res, 'Failed to delete doctor', 500, err.message);
    }
  }

  /**
   * GET /api/admin/doctors — Get all doctors
   */
  async getAllDoctors(req: AuthRequest, res: Response): Promise<void> {
    try {
      const doctors = await adminService.getAllDoctors();
      sendSuccess(res, doctors);
    } catch (err: any) {
      sendError(res, 'Failed to fetch doctors', 500, err.message);
    }
  }

  /**
   * GET /api/admin/doctors/:id — Get a single doctor
   */
  async getDoctorById(req: AuthRequest, res: Response): Promise<void> {
    try {
      const doctor = await adminService.getDoctorById(req.params.id);
      sendSuccess(res, doctor);
    } catch (err: any) {
      if (err.message === 'DOCTOR_NOT_FOUND') {
        sendNotFound(res, 'Doctor not found');
        return;
      }
      sendError(res, 'Failed to fetch doctor', 500, err.message);
    }
  }

  /**
   * POST /api/admin/doctors/:id/leave — Mark leave days
   */
  async markLeave(req: AuthRequest, res: Response): Promise<void> {
    try {
      const input = markLeaveSchema.parse(req.body);
      const dates = input.dates.map(d => new Date(d));
      const result = await adminService.markLeave(req.params.id, dates);
      sendSuccess(res, result, 
        result.cancelledAppointments.length > 0
          ? `Leave marked. ${result.cancelledAppointments.length} appointment(s) cancelled and patients notified.`
          : 'Leave marked successfully.'
      );
    } catch (err: any) {
      if (err.name === 'ZodError') {
        sendError(res, 'Validation error', 422, JSON.stringify(err.errors));
        return;
      }
      if (err.message === 'DOCTOR_NOT_FOUND') {
        sendNotFound(res, 'Doctor not found');
        return;
      }
      sendError(res, 'Failed to mark leave', 500, err.message);
    }
  }
}

export const adminController = new AdminController();
