import express from 'express';
import cors from 'cors';
import { env } from './config/env';
import { errorHandler } from './middleware/errorHandler';
import { initializeJobs } from './jobs/scheduler';

// Route imports
import authRoutes from './routes/auth.routes';
import adminRoutes from './routes/admin.routes';
import bookingRoutes from './routes/booking.routes';
import doctorRoutes from './routes/doctor.routes';
import googleRoutes from './routes/google.routes';
import doctorsRoutes from './routes/doctors.routes';

const app = express();

// ── Middleware ────────────────────────────────────────────
app.use(cors({
  origin: env.FRONTEND_URL,
  credentials: true,
}));
app.use(express.json());

// ── Routes ───────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/auth', googleRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/doctor', doctorRoutes);
app.use('/api/doctors', doctorsRoutes);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ── Error handler ────────────────────────────────────────
app.use(errorHandler);

// ── Start server ─────────────────────────────────────────
app.listen(env.PORT, () => {
  console.log(`\n🏥 Panacea Healthcare API running on port ${env.PORT}`);
  console.log(`   Environment: ${env.NODE_ENV}`);
  console.log(`   Frontend URL: ${env.FRONTEND_URL}`);
  console.log('');

  // Initialize background jobs
  initializeJobs();
});

export default app;
