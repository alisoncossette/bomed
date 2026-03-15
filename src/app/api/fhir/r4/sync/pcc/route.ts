import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { syncAppointmentToPcc, isPccConfigured } from '@/lib/pcc';

// POST /api/fhir/r4/sync/pcc — Push confirmed appointments to PointClickCare
export async function POST(req: NextRequest) {
  const auth = requireAuth(req);
  if (!auth.ok) return auth.response;

  if (!isPccConfigured()) {
    return NextResponse.json(
      { error: 'PointClickCare integration not configured. Set PCC_FHIR_BASE_URL, PCC_CLIENT_ID, PCC_CLIENT_SECRET.' },
      { status: 503 },
    );
  }

  const body = await req.json().catch(() => ({}));
  const { appointmentId } = body;

  // If specific appointment ID provided, sync just that one
  if (appointmentId) {
    const apt = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: {
        patient: { select: { name: true, email: true } },
        practitioner: { select: { name: true } },
      },
    });

    if (!apt) return NextResponse.json({ error: 'Appointment not found' }, { status: 404 });

    const result = await syncAppointmentToPcc(apt);
    if (result.success) {
      await prisma.appointment.update({
        where: { id: apt.id },
        data: { pccResourceId: result.pccResourceId, pccSyncedAt: new Date(), pccSyncError: null },
      });
    } else {
      await prisma.appointment.update({
        where: { id: apt.id },
        data: { pccSyncError: result.error || 'Unknown sync error' },
      });
    }

    return NextResponse.json(result);
  }

  // Sync all confirmed appointments that haven't been synced yet
  const unsynced = await prisma.appointment.findMany({
    where: {
      status: 'CONFIRMED',
      pccSyncedAt: null,
    },
    include: {
      patient: { select: { name: true, email: true } },
      practitioner: { select: { name: true } },
    },
    orderBy: { dateTime: 'asc' },
    take: 50,
  });

  const results = [];
  for (const apt of unsynced) {
    const result = await syncAppointmentToPcc(apt);
    if (result.success) {
      await prisma.appointment.update({
        where: { id: apt.id },
        data: { pccResourceId: result.pccResourceId, pccSyncedAt: new Date(), pccSyncError: null },
      });
    } else {
      await prisma.appointment.update({
        where: { id: apt.id },
        data: { pccSyncError: result.error || 'Unknown sync error' },
      });
    }
    results.push({ appointmentId: apt.id, ...result });
  }

  return NextResponse.json({
    synced: results.filter((r) => r.success).length,
    failed: results.filter((r) => !r.success).length,
    remaining: await prisma.appointment.count({ where: { status: 'CONFIRMED', pccSyncedAt: null } }),
    results,
  });
}

// GET /api/fhir/r4/sync/pcc — Check PCC integration status
export async function GET(req: NextRequest) {
  const auth = requireAuth(req);
  if (!auth.ok) return auth.response;

  const [total, synced, failed] = await Promise.all([
    prisma.appointment.count({ where: { status: 'CONFIRMED' } }),
    prisma.appointment.count({ where: { pccSyncedAt: { not: null } } }),
    prisma.appointment.count({ where: { pccSyncError: { not: null } } }),
  ]);

  return NextResponse.json({
    configured: isPccConfigured(),
    stats: { totalConfirmed: total, synced, failed, pending: total - synced },
  });
}
