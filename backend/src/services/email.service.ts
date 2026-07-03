import nodemailer from 'nodemailer';
import { env } from '../config/env';

// ── EmailService interface (swappable) ───────────────────

export interface EmailSendResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export interface IEmailService {
  send(to: string, subject: string, html: string): Promise<EmailSendResult>;
}

// ── Nodemailer implementation (Gmail SMTP — free) ────────

class NodemailerEmailService implements IEmailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    if (env.SMTP_USER && env.SMTP_PASS) {
      this.transporter = nodemailer.createTransport({
        host: env.SMTP_HOST,
        port: env.SMTP_PORT,
        secure: env.SMTP_PORT === 465,
        auth: {
          user: env.SMTP_USER,
          pass: env.SMTP_PASS,
        },
      });
    } else {
      // Use Ethereal (free test email) if no SMTP configured
      this.transporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        auth: {
          user: 'test@ethereal.email',
          pass: 'test',
        },
      });
      console.warn('⚠️ No SMTP configured. Using Ethereal test email (emails won\'t actually send).');
    }
  }

  async send(to: string, subject: string, html: string): Promise<EmailSendResult> {
    try {
      const info = await this.transporter.sendMail({
        from: env.EMAIL_FROM,
        to,
        subject: `[Panacea Healthcare] ${subject}`,
        html,
      });

      return {
        success: true,
        messageId: info.messageId,
      };
    } catch (err: any) {
      console.error('❌ Email send failed:', err.message);
      return {
        success: false,
        error: err.message,
      };
    }
  }
}

// ── Console logger fallback (for dev without SMTP) ───────

class ConsoleEmailService implements IEmailService {
  async send(to: string, subject: string, html: string): Promise<EmailSendResult> {
    console.log('\n📧 ═══ EMAIL (console fallback) ═══');
    console.log(`To: ${to}`);
    console.log(`Subject: [Panacea Healthcare] ${subject}`);
    console.log(`Body: ${html.substring(0, 200)}...`);
    console.log('═══════════════════════════════════\n');
    return { success: true, messageId: `console-${Date.now()}` };
  }
}

// ── Factory ──────────────────────────────────────────────

function createEmailService(): IEmailService {
  if (env.SMTP_USER && env.SMTP_PASS) {
    return new NodemailerEmailService();
  }
  console.warn('⚠️ SMTP not configured. Using console email logger.');
  return new ConsoleEmailService();
}

export const emailService: IEmailService = createEmailService();
