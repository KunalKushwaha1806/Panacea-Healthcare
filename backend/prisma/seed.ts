import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...\n');

  // ── Clear existing data ──
  await prisma.notificationLog.deleteMany();
  await prisma.medicationReminder.deleteMany();
  await prisma.prescription.deleteMany();
  await prisma.postVisitSummary.deleteMany();
  await prisma.postVisitNotes.deleteMany();
  await prisma.preVisitSummary.deleteMany();
  await prisma.symptomForm.deleteMany();
  await prisma.appointment.deleteMany();
  await prisma.doctorProfile.deleteMany();
  await prisma.user.deleteMany();

  const hash = await bcrypt.hash('password123', 12);

  // ── Admin ──
  const admin = await prisma.user.create({
    data: {
      email: 'admin@panacea.health',
      passwordHash: hash,
      name: 'System Admin',
      role: Role.ADMIN,
    },
  });
  console.log(`✅ Admin: ${admin.email} / password123`);

  // ── Doctors ──
  const doctors = [
    {
      email: 'dr.sharma@panacea.health',
      name: 'Dr. Priya Sharma',
      specialisation: 'General Medicine',
      bio: 'MBBS, MD — 12 years of experience in internal medicine and primary care.',
      slotDuration: 30,
      workingHours: {
        mon: { start: '09:00', end: '17:00' },
        tue: { start: '09:00', end: '17:00' },
        wed: { start: '09:00', end: '13:00' },
        thu: { start: '09:00', end: '17:00' },
        fri: { start: '09:00', end: '17:00' },
      },
    },
    {
      email: 'dr.patel@panacea.health',
      name: 'Dr. Rajesh Patel',
      specialisation: 'Cardiology',
      bio: 'MBBS, DM Cardiology — Specialises in interventional cardiology and heart failure management.',
      slotDuration: 45,
      workingHours: {
        mon: { start: '10:00', end: '16:00' },
        wed: { start: '10:00', end: '16:00' },
        fri: { start: '10:00', end: '16:00' },
      },
    },
    {
      email: 'dr.gupta@panacea.health',
      name: 'Dr. Ananya Gupta',
      specialisation: 'Dermatology',
      bio: 'MBBS, MD Dermatology — Expert in cosmetic dermatology and skin disorders.',
      slotDuration: 20,
      workingHours: {
        mon: { start: '11:00', end: '18:00' },
        tue: { start: '11:00', end: '18:00' },
        wed: { start: '11:00', end: '18:00' },
        thu: { start: '11:00', end: '18:00' },
        fri: { start: '11:00', end: '15:00' },
        sat: { start: '10:00', end: '14:00' },
      },
    },
    {
      email: 'dr.kumar@panacea.health',
      name: 'Dr. Vikram Kumar',
      specialisation: 'Orthopedics',
      bio: 'MBBS, MS Ortho — Sports medicine and joint replacement specialist.',
      slotDuration: 30,
      workingHours: {
        mon: { start: '08:00', end: '14:00' },
        tue: { start: '08:00', end: '14:00' },
        thu: { start: '08:00', end: '14:00' },
        sat: { start: '09:00', end: '13:00' },
      },
    },
    {
      email: 'dr.reddy@panacea.health',
      name: 'Dr. Meera Reddy',
      specialisation: 'Pediatrics',
      bio: 'MBBS, MD Pediatrics — Caring for children from newborns to adolescents.',
      slotDuration: 25,
      workingHours: {
        mon: { start: '09:00', end: '16:00' },
        tue: { start: '09:00', end: '16:00' },
        wed: { start: '09:00', end: '16:00' },
        thu: { start: '09:00', end: '16:00' },
        fri: { start: '09:00', end: '13:00' },
      },
    },
  ];

  for (const doc of doctors) {
    const user = await prisma.user.create({
      data: {
        email: doc.email,
        passwordHash: hash,
        name: doc.name,
        role: Role.DOCTOR,
        doctorProfile: {
          create: {
            specialisation: doc.specialisation,
            bio: doc.bio,
            slotDuration: doc.slotDuration,
            workingHours: doc.workingHours,
          },
        },
      },
    });
    console.log(`✅ Doctor: ${user.email} / password123 (${doc.specialisation})`);
  }

  // ── Patients ──
  const patients = [
    { email: 'john@example.com', name: 'John Doe', phone: '+91-9876543210' },
    { email: 'jane@example.com', name: 'Jane Smith', phone: '+91-9876543211' },
    { email: 'rahul@example.com', name: 'Rahul Mehta', phone: '+91-9876543212' },
  ];

  for (const pat of patients) {
    const user = await prisma.user.create({
      data: {
        email: pat.email,
        passwordHash: hash,
        name: pat.name,
        phone: pat.phone,
        role: Role.PATIENT,
      },
    });
    console.log(`✅ Patient: ${user.email} / password123`);
  }

  console.log('\n🎉 Seed complete!\n');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
