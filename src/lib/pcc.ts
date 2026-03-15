// PointClickCare FHIR R4 Sync Client
// Pushes confirmed appointments to PCC via FHIR Appointment resource
// Docs: https://fhir.pointclickcare.com/

const PCC_BASE_URL = process.env.PCC_FHIR_BASE_URL || ''; // e.g. https://connect2.pointclickcare.com/fhir/R4/{tenantId}
const PCC_CLIENT_ID = process.env.PCC_CLIENT_ID || '';
const PCC_CLIENT_SECRET = process.env.PCC_CLIENT_SECRET || '';
const PCC_TOKEN_URL = process.env.PCC_TOKEN_URL || 'https://connect2.pointclickcare.com/auth/token';

// ─── Auth ────────────────────────────────────────────────────────────

let cachedToken: { token: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAt - 60000) {
    return cachedToken.token;
  }

  const res = await fetch(PCC_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: PCC_CLIENT_ID,
      client_secret: PCC_CLIENT_SECRET,
      scope: 'system/Appointment.write system/Patient.read system/Practitioner.read',
    }),
  });

  if (!res.ok) {
    throw new Error(`PCC auth failed (${res.status}): ${await res.text()}`);
  }

  const data = await res.json();
  cachedToken = {
    token: data.access_token,
    expiresAt: Date.now() + (data.expires_in || 3600) * 1000,
  };

  return cachedToken.token;
}

// ─── FHIR Client ─────────────────────────────────────────────────────

async function pccRequest<T>(
  path: string,
  options: { method?: string; body?: unknown } = {},
): Promise<T> {
  if (!PCC_BASE_URL) {
    throw new Error('PCC_FHIR_BASE_URL not configured');
  }

  const token = await getAccessToken();
  const res = await fetch(`${PCC_BASE_URL}/${path}`, {
    method: options.method || 'GET',
    headers: {
      'Content-Type': 'application/fhir+json',
      Accept: 'application/fhir+json',
      Authorization: `Bearer ${token}`,
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`PCC FHIR (${res.status}): ${text}`);
  }

  return res.json();
}

// ─── Sync Operations ─────────────────────────────────────────────────

export interface PccSyncResult {
  success: boolean;
  pccResourceId?: string;
  error?: string;
}

/**
 * Push a confirmed appointment to PointClickCare
 * Creates a FHIR Appointment resource in PCC
 */
export async function syncAppointmentToPcc(appointment: {
  dateTime: Date;
  duration: number;
  status: string;
  type: string;
  notes: string | null;
  patient: { name: string; email: string };
  practitioner: { name: string };
}): Promise<PccSyncResult> {
  try {
    const start = appointment.dateTime;
    const end = new Date(start.getTime() + appointment.duration * 60000);

    const fhirAppointment = {
      resourceType: 'Appointment',
      status: appointment.status === 'CONFIRMED' ? 'booked' : 'proposed',
      start: start.toISOString(),
      end: end.toISOString(),
      minutesDuration: appointment.duration,
      comment: appointment.notes || undefined,
      serviceType: [{
        coding: [{
          system: 'https://bomed.app/service-type',
          code: appointment.type.toLowerCase().replace(/_/g, '-'),
          display: appointment.type.replace(/_/g, ' '),
        }],
      }],
      participant: [
        {
          actor: { display: appointment.patient.name },
          status: 'accepted',
        },
        {
          actor: { display: appointment.practitioner.name },
          status: 'accepted',
        },
      ],
    };

    const result = await pccRequest<{ id: string }>('Appointment', {
      method: 'POST',
      body: fhirAppointment,
    });

    return { success: true, pccResourceId: result.id };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}

/**
 * Update an existing appointment in PCC (e.g., status change)
 */
export async function updatePccAppointment(
  pccResourceId: string,
  updates: { status?: string; start?: string; end?: string; comment?: string },
): Promise<PccSyncResult> {
  try {
    const statusMap: Record<string, string> = {
      CONFIRMED: 'booked',
      CANCELLED: 'cancelled',
      COMPLETED: 'fulfilled',
      DECLINED: 'cancelled',
    };

    const patch: Record<string, unknown> = {};
    if (updates.status) patch.status = statusMap[updates.status] || updates.status;
    if (updates.start) patch.start = updates.start;
    if (updates.end) patch.end = updates.end;
    if (updates.comment) patch.comment = updates.comment;

    await pccRequest(`Appointment/${pccResourceId}`, {
      method: 'PUT',
      body: { resourceType: 'Appointment', id: pccResourceId, ...patch },
    });

    return { success: true, pccResourceId };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}

/**
 * Check if PCC integration is configured
 */
export function isPccConfigured(): boolean {
  return !!(PCC_BASE_URL && PCC_CLIENT_ID && PCC_CLIENT_SECRET);
}