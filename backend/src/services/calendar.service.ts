import { google } from 'googleapis';
import { env } from '../config/env';
import prisma from '../config/database';

export class CalendarService {
  private isConfigured: boolean;

  constructor() {
    this.isConfigured = !!(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET);
    if (!this.isConfigured) {
      console.warn('⚠️ Google Calendar API not configured. Calendar features disabled.');
    }
  }

  /**
   * Get OAuth2 client.
   */
  private getOAuthClient() {
    return new google.auth.OAuth2(
      env.GOOGLE_CLIENT_ID,
      env.GOOGLE_CLIENT_SECRET,
      env.GOOGLE_REDIRECT_URI
    );
  }

  /**
   * Generate OAuth consent URL for a user.
   */
  getAuthUrl(): string {
    if (!this.isConfigured) throw new Error('CALENDAR_NOT_CONFIGURED');
    const client = this.getOAuthClient();
    return client.generateAuthUrl({
      access_type: 'offline',
      scope: ['https://www.googleapis.com/auth/calendar.events'],
      prompt: 'consent',
    });
  }

  /**
   * Handle OAuth callback — exchange code for tokens.
   */
  async handleCallback(code: string, userId: string) {
    if (!this.isConfigured) throw new Error('CALENDAR_NOT_CONFIGURED');
    const client = this.getOAuthClient();
    const { tokens } = await client.getToken(code);

    if (tokens.refresh_token) {
      await prisma.user.update({
        where: { id: userId },
        data: { googleRefreshToken: tokens.refresh_token },
      });
    }

    return { connected: true };
  }

  /**
   * Create a calendar event for an appointment.
   */
  async createEvent(
    userId: string,
    appointmentId: string,
    summary: string,
    description: string,
    startTime: Date,
    endTime: Date
  ): Promise<string | null> {
    if (!this.isConfigured) return null;

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user?.googleRefreshToken) return null;

    try {
      const client = this.getOAuthClient();
      client.setCredentials({ refresh_token: user.googleRefreshToken });

      const calendar = google.calendar({ version: 'v3', auth: client });

      const event = await calendar.events.insert({
        calendarId: 'primary',
        requestBody: {
          summary,
          description,
          start: { dateTime: startTime.toISOString() },
          end: { dateTime: endTime.toISOString() },
          reminders: {
            useDefault: false,
            overrides: [
              { method: 'email', minutes: 60 },
              { method: 'popup', minutes: 30 },
            ],
          },
        },
      });

      return event.data.id || null;
    } catch (err: any) {
      console.error('❌ Calendar event creation failed:', err.message);
      await prisma.notificationLog.create({
        data: {
          userId,
          type: 'CALENDAR',
          subject: 'Failed to create calendar event',
          payload: { appointmentId, error: err.message },
          status: 'FAILED',
          error: err.message,
        },
      });
      return null;
    }
  }

  /**
   * Update a calendar event (for reschedule).
   */
  async updateEvent(
    userId: string,
    eventId: string,
    startTime: Date,
    endTime: Date
  ): Promise<boolean> {
    if (!this.isConfigured || !eventId) return false;

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user?.googleRefreshToken) return false;

    try {
      const client = this.getOAuthClient();
      client.setCredentials({ refresh_token: user.googleRefreshToken });
      const calendar = google.calendar({ version: 'v3', auth: client });

      await calendar.events.patch({
        calendarId: 'primary',
        eventId,
        requestBody: {
          start: { dateTime: startTime.toISOString() },
          end: { dateTime: endTime.toISOString() },
        },
      });

      return true;
    } catch (err: any) {
      console.error('❌ Calendar event update failed:', err.message);
      return false;
    }
  }

  /**
   * Delete a calendar event (for cancellation).
   */
  async deleteEvent(userId: string, eventId: string): Promise<boolean> {
    if (!this.isConfigured || !eventId) return false;

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user?.googleRefreshToken) return false;

    try {
      const client = this.getOAuthClient();
      client.setCredentials({ refresh_token: user.googleRefreshToken });
      const calendar = google.calendar({ version: 'v3', auth: client });

      await calendar.events.delete({
        calendarId: 'primary',
        eventId,
      });

      return true;
    } catch (err: any) {
      console.error('❌ Calendar event deletion failed:', err.message);
      return false;
    }
  }
}

export const calendarService = new CalendarService();
