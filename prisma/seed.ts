import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaNeon } from '@prisma/adapter-neon';

const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  // Check if data already exists
  const existingPractice = await prisma.practice.findFirst();
  if (existingPractice) {
    console.log('Seed data already exists, skipping.');
    return;
  }

  // Create practice
  const practice = await prisma.practice.create({
    data: {
      name: 'ACME Physical Therapy',
      handle: 'acmept',
      email: 'info@acmept.com',
      phone: '(555) 100-2000',
      address: '123 Main St, Suite 200, Austin TX 78701',
      timezone: 'America/Chicago',
    },
  });
  console.log('Created practice:', practice.name);

  // Create practitioners
  const dr1 = await prisma.practitioner.create({
    data: {
      name: 'Dr. Sarah Johnson',
      handle: 'dr.johnson',
      email: 'sarah@acmept.com',
      specialty: 'PT',
      practiceId: practice.id,
    },
  });

  const dr2 = await prisma.practitioner.create({
    data: {
      name: 'Marcus Rivera',
      handle: 'marcus.rivera',
      email: 'marcus@acmept.com',
      specialty: 'Athletic Training',
      practiceId: practice.id,
    },
  });

  const dr3 = await prisma.practitioner.create({
    data: {
      name: 'Dr. Emily Chen',
      handle: 'dr.chen',
      email: 'emily@acmept.com',
      specialty: 'Sports Medicine',
      practiceId: practice.id,
    },
  });
  console.log('Created 3 practitioners');

  // Create patients
  const p1 = await prisma.patient.create({
    data: {
      name: 'Tom Williams',
      handle: 'tom',
      email: 'tom@example.com',
      phone: '(555) 111-1111',
      calendarConnected: true,
      practiceId: practice.id,
    },
  });

  const p2 = await prisma.patient.create({
    data: {
      name: 'Alison Park',
      handle: 'alison',
      email: 'alison@example.com',
      phone: '(555) 222-2222',
      calendarConnected: true,
      practiceId: practice.id,
    },
  });

  const p3 = await prisma.patient.create({
    data: {
      name: 'Jordan Mitchell',
      email: 'jordan@example.com',
      phone: '(555) 333-3333',
      practiceId: practice.id,
    },
  });

  const p4 = await prisma.patient.create({
    data: {
      name: 'Maya Rodriguez',
      handle: 'maya.r',
      email: 'maya@example.com',
      calendarConnected: true,
      practiceId: practice.id,
    },
  });
  console.log('Created 4 patients');

  // Link patients to practitioners
  await prisma.patientPractitioner.createMany({
    data: [
      { patientId: p1.id, practitionerId: dr1.id, isPrimary: true },
      { patientId: p2.id, practitionerId: dr1.id, isPrimary: true },
      { patientId: p3.id, practitionerId: dr2.id, isPrimary: true },
      { patientId: p4.id, practitionerId: dr3.id, isPrimary: true },
      { patientId: p1.id, practitionerId: dr2.id, isPrimary: false },
    ],
  });
  console.log('Linked patients to practitioners');

  // Create appointments (spread over upcoming days)
  const now = new Date();
  const today = (h: number, m: number) => {
    const d = new Date(now);
    d.setHours(h, m, 0, 0);
    return d;
  };
  const daysFromNow = (days: number, h: number, m: number) => {
    const d = new Date(now);
    d.setDate(d.getDate() + days);
    d.setHours(h, m, 0, 0);
    return d;
  };

  await prisma.appointment.createMany({
    data: [
      {
        practiceId: practice.id,
        practitionerId: dr1.id,
        patientId: p1.id,
        dateTime: today(10, 0),
        duration: 30,
        status: 'CONFIRMED',
        type: 'PT_SESSION',
        notes: 'Shoulder rehab - week 4',
      },
      {
        practiceId: practice.id,
        practitionerId: dr1.id,
        patientId: p2.id,
        dateTime: today(11, 0),
        duration: 45,
        status: 'PENDING',
        type: 'EVALUATION',
        notes: 'Initial evaluation - knee pain',
      },
      {
        practiceId: practice.id,
        practitionerId: dr2.id,
        patientId: p3.id,
        dateTime: today(14, 0),
        duration: 30,
        status: 'CONFIRMED',
        type: 'PT_SESSION',
      },
      {
        practiceId: practice.id,
        practitionerId: dr3.id,
        patientId: p4.id,
        dateTime: daysFromNow(1, 9, 0),
        duration: 60,
        status: 'PENDING',
        type: 'EVALUATION',
        notes: 'Sports injury assessment',
      },
      {
        practiceId: practice.id,
        practitionerId: dr1.id,
        patientId: p1.id,
        dateTime: daysFromNow(2, 10, 0),
        duration: 30,
        status: 'CONFIRMED',
        type: 'FOLLOW_UP',
        recurring: true,
        recurringDay: (now.getDay() + 2) % 7,
        recurringTime: '10:00',
      },
      {
        practiceId: practice.id,
        practitionerId: dr2.id,
        patientId: p1.id,
        dateTime: daysFromNow(3, 15, 0),
        duration: 30,
        status: 'PENDING',
        type: 'PT_SESSION',
        notes: 'Cross-training session',
      },
      {
        practiceId: practice.id,
        practitionerId: dr3.id,
        patientId: p2.id,
        dateTime: daysFromNow(5, 11, 30),
        duration: 45,
        status: 'CONFIRMED',
        type: 'FOLLOW_UP',
      },
    ],
  });
  console.log('Created 7 appointments');

  console.log('\nSeed complete! Visit http://localhost:3000/dashboard');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());