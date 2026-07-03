import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { calendarService } from '../services/calendar.service';
import { sendSuccess, sendError } from '../utils/apiResponse';
import { AuthRequest } from '../middleware/auth';
import { env } from '../config/env';

const router = Router();

/**
 * GET /api/auth/google/connect — Start OAuth flow
 */
router.get('/google/connect', authenticate, (req: AuthRequest, res) => {
  try {
    const url = calendarService.getAuthUrl();
    sendSuccess(res, { url }, 'Redirect user to this URL');
  } catch (err: any) {
    sendError(res, 'Google Calendar not configured', 501, err.message);
  }
});

/**
 * GET /api/auth/google/callback — OAuth callback
 */
router.get('/google/callback', authenticate, async (req: AuthRequest, res) => {
  try {
    const code = req.query.code as string;
    if (!code) {
      sendError(res, 'Authorization code missing', 400);
      return;
    }

    await calendarService.handleCallback(code, req.user!.userId);

    // Redirect to frontend with success
    res.redirect(`${env.FRONTEND_URL}/settings?calendar=connected`);
  } catch (err: any) {
    sendError(res, 'Failed to connect Google Calendar', 500, err.message);
  }
});

export default router;
