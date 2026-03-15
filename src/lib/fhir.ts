// FHIR R4 Resource Mappers
// Maps BoMed Prisma models <-> FHIR R4 JSON resources
// Spec: https://hl7.org/fhir/R4/

// ─── Types ──────────────────────────────────────────────────────────

export interface FhirResource {
  resourceType: string;
  id: string;
  meta?: { lastUpdated: string; versionId?: string };
  [key: string]: unknown;
}

export interface FhirBundle {
  resourceType: 'Bundle';
  type: 'searchset' | 'batch' | 'transaction';
  total: number;
  entry: { fullUrl: string; resource: FhirResource }[];
}

export interface FhirPatient extends FhirResource {
  resourceType: 'Patient';
  name: { use: string; family: string; given: string[] }[];
  telecom: { system: string; value: string; use?: string }[];
  birthDate?: string;
  address?: { use: string; line: string[]; city: string; state: string; postalCode: string }[];
  contact?: { relationship: { text: string }[]; name: { text: string }; telecom: { system: string; value: string }[] }[];
  identifier?: { system: string; value: string }[];
}

export interface FhirPractitioner extends FhirResource {
  resourceType: 'Practitioner';
  name: { use: string; family: string; given: string[] }[];
  telecom: { system: string; value: string }[];
  qualification?: { code: { text: string } }[];
  active: boolean;
  identifier?: { system: string; value: string }[];
}

export interface FhirOrganization extends FhirResource {
  resourceType: 'Organization';
  name: string;
  telecom: { system: string; value: string }[];
  address?: { line: string[]; city?: string; state?: string; postalCode?: string }[];
  active: boolean;
  identifier?: { system: string; value: string }[];
}

export interface FhirAppointment extends FhirResource {
  resourceType: 'Appointment';
  status: string;
  serviceType?: { coding: { system: string; code: string; display: string }[] }[];
  start: string;
  end: string;
  minutesDuration: number;
  comment?: string;
  participant: {
    actor: { reference: string; display: string };
    status: string;
    type?: { coding: { system: string; code: string }[] }[];
  }[];
  identifier?: { system: string; value: string }[];
}

// ─── Status Mapping ─────────────────────────────────────────────────

const BOMED_TO_FHIR_STATUS: Record<string, string> = {
  PENDING: 'proposed',
  CONFIRMED: 'booked',
  DECLINED: 'cancelled',
  RESCHEDULED: 'pending',
  CANCELLED: 'cancelled',
  COMPLETED: 'fulfilled',
};

const FHIR_TO_BOMED_STATUS: Record<string, string> = {
  proposed: 'PENDING',
  pending: 'PENDING',
  booked: 'CONFIRMED',
  cancelled: 'CANCELLED',
  fulfilled: 'COMPLETED',
  noshow: 'CANCELLED',
  'entered-in-error': 'CANCELLED',
};

const BOMED_TYPE_TO_FHIR: Record<string, { code: string; display: string }> = {
  PT_SESSION: { code: 'physical-therapy', display: 'Physical Therapy Session' },
  EVALUATION: { code: 'evaluation', display: 'Evaluation' },
  FOLLOW_UP: { code: 'follow-up', display: 'Follow-Up Visit' },
};

// ─── Patient Mapper ─────────────────────────────────────────────────

type PrismaPatient = {
  id: string;
  name: string;
  handle: string | null;
  email: string;
  phone: string | null;
  dateOfBirth: Date | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  emergencyName: string | null;
  emergencyPhone: string | null;
  emergencyRelation: string | null;
  insuranceCarrier: string | null;
  insuranceMemberId: string | null;
  updatedAt: Date;
};

export function patientToFhir(p: PrismaPatient, baseUrl: string): FhirPatient {
  const nameParts = p.name.split(' ');
  const family = nameParts.pop() || '';
  const given = nameParts.length > 0 ? nameParts : [p.name];

  const telecom: { system: string; value: string; use?: string }[] = [
    { system: 'email', value: p.email, use: 'work' },
  ];
  if (p.phone) telecom.push({ system: 'phone', value: p.phone, use: 'mobile' });

  const resource: FhirPatient = {
    resourceType: 'Patient',
    id: p.id,
    meta: { lastUpdated: p.updatedAt.toISOString() },
    name: [{ use: 'official', family, given }],
    telecom,
  };

  if (p.handle) {
    resource.identifier = [{ system: 'https://bolo.so/handle', value: `@${p.handle}` }];
  }

  if (p.dateOfBirth) {
    resource.birthDate = p.dateOfBirth.toISOString().split('T')[0];
  }

  if (p.address || p.city) {
    resource.address = [{
      use: 'home',
      line: p.address ? [p.address] : [],
      city: p.city || '',
      state: p.state || '',
      postalCode: p.zip || '',
    }];
  }

  if (p.emergencyName) {
    resource.contact = [{
      relationship: [{ text: p.emergencyRelation || 'Emergency Contact' }],
      name: { text: p.emergencyName },
      telecom: p.emergencyPhone ? [{ system: 'phone', value: p.emergencyPhone }] : [],
    }];
  }

  if (p.insuranceCarrier && p.insuranceMemberId) {
    resource.identifier = [
      ...(resource.identifier || []),
      { system: `https://insurance/${p.insuranceCarrier.toLowerCase().replace(/\s+/g, '-')}`, value: p.insuranceMemberId },
    ];
  }

  return resource;
}

export function fhirToPatientData(fhir: Partial<FhirPatient>): Record<string, unknown> {
  const data: Record<string, unknown> = {};

  if (fhir.name?.[0]) {
    const n = fhir.name[0];
    data.name = [...(n.given || []), n.family].filter(Boolean).join(' ');
  }

  if (fhir.telecom) {
    for (const t of fhir.telecom) {
      if (t.system === 'email') data.email = t.value;
      if (t.system === 'phone') data.phone = t.value;
    }
  }

  if (fhir.birthDate) data.dateOfBirth = new Date(fhir.birthDate);

  if (fhir.address?.[0]) {
    const a = fhir.address[0];
    if (a.line?.[0]) data.address = a.line[0];
    if (a.city) data.city = a.city;
    if (a.state) data.state = a.state;
    if (a.postalCode) data.zip = a.postalCode;
  }

  if (fhir.identifier) {
    const boloId = fhir.identifier.find((i) => i.system === 'https://bolo.so/handle');
    if (boloId) data.handle = boloId.value.replace(/^@/, '');
  }

  return data;
}

// ─── Practitioner Mapper ────────────────────────────────────────────

type PrismaPractitioner = {
  id: string;
  name: string;
  handle: string;
  email: string;
  specialty: string | null;
  isActive: boolean;
  updatedAt: Date;
};

export function practitionerToFhir(p: PrismaPractitioner): FhirPractitioner {
  const nameParts = p.name.split(' ');
  const family = nameParts.pop() || '';
  const given = nameParts.length > 0 ? nameParts : [p.name];

  const resource: FhirPractitioner = {
    resourceType: 'Practitioner',
    id: p.id,
    meta: { lastUpdated: p.updatedAt.toISOString() },
    name: [{ use: 'official', family, given }],
    telecom: [{ system: 'email', value: p.email }],
    active: p.isActive,
    identifier: [{ system: 'https://bolo.so/handle', value: `@${p.handle}` }],
  };

  if (p.specialty) {
    resource.qualification = [{ code: { text: p.specialty } }];
  }

  return resource;
}

// ─── Organization (Practice) Mapper ─────────────────────────────────

type PrismaPractice = {
  id: string;
  name: string;
  handle: string;
  email: string;
  phone: string | null;
  address: string | null;
  updatedAt: Date;
};

export function organizationToFhir(p: PrismaPractice): FhirOrganization {
  const telecom: { system: string; value: string }[] = [
    { system: 'email', value: p.email },
  ];
  if (p.phone) telecom.push({ system: 'phone', value: p.phone });

  return {
    resourceType: 'Organization',
    id: p.id,
    meta: { lastUpdated: p.updatedAt.toISOString() },
    name: p.name,
    telecom,
    active: true,
    identifier: [{ system: 'https://bolo.so/handle', value: `@${p.handle}` }],
    ...(p.address ? { address: [{ line: [p.address] }] } : {}),
  };
}

// ─── Appointment Mapper ─────────────────────────────────────────────

type PrismaAppointment = {
  id: string;
  dateTime: Date;
  duration: number;
  status: string;
  type: string;
  notes: string | null;
  updatedAt: Date;
  patient: { id: string; name: string };
  practitioner: { id: string; name: string };
};

export function appointmentToFhir(a: PrismaAppointment): FhirAppointment {
  const start = new Date(a.dateTime);
  const end = new Date(start.getTime() + a.duration * 60000);
  const typeInfo = BOMED_TYPE_TO_FHIR[a.type] || { code: a.type.toLowerCase(), display: a.type };

  return {
    resourceType: 'Appointment',
    id: a.id,
    meta: { lastUpdated: a.updatedAt.toISOString() },
    status: BOMED_TO_FHIR_STATUS[a.status] || 'proposed',
    serviceType: [{
      coding: [{ system: 'https://bomed.app/service-type', code: typeInfo.code, display: typeInfo.display }],
    }],
    start: start.toISOString(),
    end: end.toISOString(),
    minutesDuration: a.duration,
    ...(a.notes ? { comment: a.notes } : {}),
    participant: [
      {
        actor: { reference: `Patient/${a.patient.id}`, display: a.patient.name },
        status: 'accepted',
        type: [{ coding: [{ system: 'http://terminology.hl7.org/CodeSystem/v3-ParticipationType', code: 'SBJ' }] }],
      },
      {
        actor: { reference: `Practitioner/${a.practitioner.id}`, display: a.practitioner.name },
        status: 'accepted',
        type: [{ coding: [{ system: 'http://terminology.hl7.org/CodeSystem/v3-ParticipationType', code: 'PPRF' }] }],
      },
    ],
  };
}

export function fhirToAppointmentData(fhir: Partial<FhirAppointment>): Record<string, unknown> {
  const data: Record<string, unknown> = {};

  if (fhir.status) data.status = FHIR_TO_BOMED_STATUS[fhir.status] || 'PENDING';
  if (fhir.start) data.dateTime = new Date(fhir.start);
  if (fhir.minutesDuration) data.duration = fhir.minutesDuration;
  if (fhir.comment) data.notes = fhir.comment;

  if (fhir.serviceType?.[0]?.coding?.[0]?.code) {
    const code = fhir.serviceType[0].coding[0].code;
    const match = Object.entries(BOMED_TYPE_TO_FHIR).find(([, v]) => v.code === code);
    if (match) data.type = match[0];
  }

  return data;
}

// ─── Bundle Helper ──────────────────────────────────────────────────

export function toBundle(resources: FhirResource[], baseUrl: string): FhirBundle {
  return {
    resourceType: 'Bundle',
    type: 'searchset',
    total: resources.length,
    entry: resources.map((r) => ({
      fullUrl: `${baseUrl}/fhir/r4/${r.resourceType}/${r.id}`,
      resource: r,
    })),
  };
}

// ─── Capability Statement ───────────────────────────────────────────

export function capabilityStatement(baseUrl: string): FhirResource {
  return {
    resourceType: 'CapabilityStatement',
    id: 'bomed',
    status: 'active',
    date: new Date().toISOString(),
    kind: 'instance',
    software: { name: 'BoMed', version: '1.0.0' },
    implementation: {
      description: 'BoMed FHIR R4 Server — Privacy-first scheduling for PT & athletic training',
      url: baseUrl,
    },
    fhirVersion: '4.0.1',
    format: ['json'],
    rest: [{
      mode: 'server',
      resource: [
        {
          type: 'Patient',
          interaction: [{ code: 'read' }, { code: 'search-type' }, { code: 'create' }, { code: 'update' }],
          searchParam: [
            { name: 'name', type: 'string' },
            { name: 'identifier', type: 'token' },
            { name: 'email', type: 'string' },
          ],
        },
        {
          type: 'Practitioner',
          interaction: [{ code: 'read' }, { code: 'search-type' }],
          searchParam: [
            { name: 'name', type: 'string' },
            { name: 'identifier', type: 'token' },
            { name: 'active', type: 'token' },
          ],
        },
        {
          type: 'Appointment',
          interaction: [{ code: 'read' }, { code: 'search-type' }, { code: 'create' }, { code: 'update' }],
          searchParam: [
            { name: 'status', type: 'token' },
            { name: 'date', type: 'date' },
            { name: 'patient', type: 'reference' },
            { name: 'practitioner', type: 'reference' },
          ],
        },
        {
          type: 'Organization',
          interaction: [{ code: 'read' }, { code: 'search-type' }],
        },
      ],
    }],
  };
}
