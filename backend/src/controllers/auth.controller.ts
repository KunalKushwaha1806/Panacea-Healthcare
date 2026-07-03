import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { authService } from '../services/auth.service';
import { registerSchema, loginSchema } from '../validators/auth.validator';
import { sendSuccess, sendError, sendCreated, sendUnauthorized } from '../utils/apiResponse';

export class AuthController {
  /**
   * POST /api/auth/register
   */
  async register(req: AuthRequest, res: Response): Promise<void> {
    try {
      const input = registerSchema.parse(req.body);
      const result = await authService.register(input);
      sendCreated(res, result, 'Registration successful');
    } catch (err: any) {
      if (err.name === 'ZodError') {
        sendError(res, 'Validation error', 422, JSON.stringify(err.errors));
        return;
      }
      if (err.message === 'USER_EXISTS') {
        sendError(res, 'A user with this email already exists', 409);
        return;
      }
      sendError(res, 'Registration failed', 500, err.message);
    }
  }

  /**
   * POST /api/auth/login
   */
  async login(req: AuthRequest, res: Response): Promise<void> {
    try {
      const input = loginSchema.parse(req.body);
      const result = await authService.login(input);
      sendSuccess(res, result, 'Login successful');
    } catch (err: any) {
      if (err.name === 'ZodError') {
        sendError(res, 'Validation error', 422, JSON.stringify(err.errors));
        return;
      }
      if (err.message === 'INVALID_CREDENTIALS') {
        sendUnauthorized(res, 'Invalid email or password');
        return;
      }
      sendError(res, 'Login failed', 500, err.message);
    }
  }

  /**
   * GET /api/auth/me
   */
  async getProfile(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        sendUnauthorized(res);
        return;
      }
      const profile = await authService.getProfile(req.user.userId);
      sendSuccess(res, profile, 'Profile retrieved');
    } catch (err: any) {
      if (err.message === 'USER_NOT_FOUND') {
        sendError(res, 'User not found', 404);
        return;
      }
      sendError(res, 'Failed to fetch profile', 500, err.message);
    }
  }
}

export const authController = new AuthController();
