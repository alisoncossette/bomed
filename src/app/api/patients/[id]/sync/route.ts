import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { notFound } from '@/lib/validate';
import { relaySend, relayResponses, relayAck } from '@/lib/bolo';

type Params = { params: Promise<{ id: string }> };

// POST /api/patients/:id/sync — Request demographics/insurance from patient via Bolo relay
export async function POST(req: NextRequest, { params }: Params) {
  const auth = requireAuth(req);
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const type = body.type || 'all';

  if (!['demographics', 'insurance', 'all'].includes(type)) {
    return NextResponse.json({ error: 'type must be demographics, insurance, or all' }, { status: 400 });
  }

  const patient = await prisma.patient.findUnique({
    where: { id },
    include: { practice: true },
  });

  if (!patient) return notFound('Patient');
  if (!patient.handle) {
    return NextResponse.json({ error: 'Patient has no Bolo handle — cannot sync data' }, { status: 400 });
  }

  const results: { demographics?: string; insurance?: string } = {};

  if (type === 'demographics' || type === 'all') {
    try {
      const msg = await relaySend({
        recipientHandle: patient.handle,
        widgetSlug: 'bomed',
        scope: 'demographics:read',
        content: JSON.stringify({
          type: 'demographics_request',
          practiceHandle: patient.practice.handle,
          practiceName: patient.practice.name,
          fields: ['address', 'city', 'state', 'zip', 'phone', 'email', 'dateOfBirth', 'emergencyContact'],
        }),
        metadata: { patientId: id, requestType: 'demographics' },
      });
      results.demographics = msg.id;
    } catch (err) {
      results.demographics = `error: ${err instanceof Error ? err.message : 'unknown'}`;
    }
  }

  if (type === 'insurance' || type === 'all') {
    try {
      const msg = await relaySend({
        recipientHandle: patient.handle,
        widgetSlug: 'bomed',
        scope: 'insurance:read',
        content: JSON.stringify({
          type: 'insurance_request',
          practiceHandle: patient.practice.handle,
          practiceName: patient.practice.name,
          fields: ['carrier', 'plan', 'groupNo', 'memberId', 'effectiveDate', 'expirationDate'],
        }),
        metadata: { patientId: id, requestType: 'insurance' },
      });
      results.insurance = msg.id;
    } catch (err) {
      results.insurance = `error: ${err instanceof Error ? err.message : 'unknown'}`;
    }
  }

  return NextResponse.json({ message: 'Sync request sent via Bolo relay', relayMessages: results });
}

// GET /api/patients/:id/sync — Check for sync responses from Bolo relay
export async function GET(req: NextRequest, { params }: Params) {
  const auth = requireAuth(req);
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const patient = await prisma.patient.findUnique({ where: { id } });
  if (!patient) return notFound('Patient');

  const { messages } = await relayResponses();
  let updated = false;
  const acked: string[] = [];

  for (const msg of messages) {
    if (!msg.metadata || msg.metadata.patientId !== id) continue;

    let payload: Record<string, string | number | boolean | null>;
    try {
      payload = JSON.parse(msg.content);
    } catch {
      continue;
    }

    if (msg.metadata.requestType === 'demographics' || payload.type === 'demographics_response') {
      const data: Record<string, unknown> = { demographicsGranted: true, boloSyncedAt: new Date() };
      if (payload.address) data.address = String(payload.address);
      if (payload.city) data.city = String(payload.city);
      if (payload.state) data.state = String(payload.state);
      if (payload.zip) data.zip = String(payload.zip);
      if (payload.phone) data.phone = String(payload.phone);
      if (payload.email) data.email = String(payload.email);
      if (payload.dateOfBirth) data.dateOfBirth = new Date(String(payload.dateOfBirth));
      if (payload.emergencyName) data.emergencyName = String(payload.emergencyName);
      if (payload.emergencyPhone) data.emergencyPhone = String(payload.emergencyPhone);
      if (payload.emergencyRelation) data.emergencyRelation = String(payload.emergencyRelation);
      await prisma.patient.update({ where: { id }, data });
      updated = true;
      acked.push(msg.id);
    }

    if (msg.metadata.requestType === 'insurance' || payload.type === 'insurance_response') {
      const data: Record<string, unknown> = {
        insuranceVerified: true, insuranceVerifiedAt: new Date(),
        insuranceGranted: true, boloSyncedAt: new Date(),
      };
      if (payload.carrier) data.insuranceCarrier = String(payload.carrier);
      if (payload.plan) data.insurancePlan = String(payload.plan);
      if (payload.groupNo) data.insuranceGroupNo = String(payload.groupNo);
      if (payload.memberId) data.insuranceMemberId = String(payload.memberId);
      if (payload.effectiveDate) data.insuranceEffDate = new Date(String(payload.effectiveDate));
      if (payload.expirationDate) data.insuranceExpDate = new Date(String(payload.expirationDate));
      await prisma.patient.update({ where: { id }, data });
      updated = true;
      acked.push(msg.id);
    }
  }

  // Acknowledge processed messages so they don't come back
  if (acked.length > 0) {
    try { await relayAck(acked); } catch { /* best-effort */ }
  }

  const freshPatient = updated ? await prisma.patient.findUnique({ where: { id } }) : patient;
  return NextResponse.json({ updated, acknowledged: acked.length, patient: freshPatient });
}