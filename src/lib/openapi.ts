// OpenAPI 3.1 spec for BoMed API — hand-written for Zod v4 compatibility

type Schema = Record<string, unknown>;

function ref(name: string): Schema {
  return { $ref: `#/components/schemas/${name}` };
}

function jsonBody(schema: Schema) {
  return { required: true, content: { 'application/json': { schema } } };
}

function ok(description: string) {
  return { description };
}

const err400 = { 400: { description: 'Validation error', content: { 'application/json': { schema: ref('Error') } } } };
const err404 = { 404: { description: 'Not found', content: { 'application/json': { schema: ref('Error') } } } };
const security = [{ BearerAuth: [] }];

export function generateDocument() {
  return {
    openapi: '3.1.0',
    info: {
      title: 'BoMed API',
      version: '1.0.0',
      description: 'Privacy-first scheduling API for PT & athletic training practices. Built on the Bolo trust layer.',
    },
    servers: [{ url: '/' }],
    security,
    components: {
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          description: 'API key (BOMED_API_KEY). Omit in dev mode if no key is configured.',
        },
      },
      schemas: {
        Error: {
          type: 'object',
          properties: { error: { type: 'string' } },
          required: ['error'],
        },
        CreatePractice: {
          type: 'object',
          required: ['name', 'handle', 'email'],
          properties: {
            name: { type: 'string' },
            handle: { type: 'string', description: 'Bolo @handle (without @)' },
            email: { type: 'string', format: 'email' },
            phone: { type: 'string' },
            address: { type: 'string' },
            timezone: { type: 'string', default: 'America/New_York' },
          },
        },
        CreatePractitioner: {
          type: 'object',
          required: ['name', 'handle', 'email', 'practiceId'],
          properties: {
            name: { type: 'string' },
            handle: { type: 'string' },
            email: { type: 'string', format: 'email' },
            specialty: { type: 'string' },
            practiceId: { type: 'string' },
          },
        },
        UpdatePractitioner: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            email: { type: 'string', format: 'email' },
            specialty: { type: 'string' },
            isActive: { type: 'boolean' },
          },
        },
        CreatePatient: {
          type: 'object',
          required: ['name', 'email', 'practiceId'],
          properties: {
            name: { type: 'string' },
            email: { type: 'string', format: 'email' },
            practiceId: { type: 'string' },
            handle: { type: 'string' },
            phone: { type: 'string' },
            practitionerId: { type: 'string', description: 'Optional: assign primary practitioner on create' },
            dateOfBirth: { type: 'string', format: 'date' },
            address: { type: 'string' },
            city: { type: 'string' },
            state: { type: 'string' },
            zip: { type: 'string' },
            emergencyName: { type: 'string' },
            emergencyPhone: { type: 'string' },
            emergencyRelation: { type: 'string' },
            insuranceCarrier: { type: 'string' },
            insurancePlan: { type: 'string' },
            insuranceGroupNo: { type: 'string' },
            insuranceMemberId: { type: 'string' },
            insuranceEffDate: { type: 'string', format: 'date' },
            insuranceExpDate: { type: 'string', format: 'date' },
          },
        },
        SyncPatient: {
          type: 'object',
          properties: {
            type: { type: 'string', enum: ['demographics', 'insurance', 'all'], default: 'all' },
          },
        },
        CreateAppointment: {
          type: 'object',
          required: ['practitionerId', 'patientId', 'practiceId', 'dateTime'],
          properties: {
            practitionerId: { type: 'string' },
            patientId: { type: 'string' },
            practiceId: { type: 'string' },
            dateTime: { type: 'string', format: 'date-time' },
            duration: { type: 'integer', minimum: 5, maximum: 480, default: 30 },
            type: { type: 'string', enum: ['PT_SESSION', 'EVALUATION', 'FOLLOW_UP'], default: 'PT_SESSION' },
            notes: { type: 'string' },
            recurring: { type: 'boolean', default: false, description: 'Create weekly recurring appointments' },
            recurringWeeks: { type: 'integer', minimum: 1, maximum: 52, description: 'Number of additional weekly occurrences (requires recurring: true)' },
          },
        },
        UpdateAppointment: {
          type: 'object',
          properties: {
            status: { type: 'string', enum: ['PENDING', 'CONFIRMED', 'DECLINED', 'RESCHEDULED', 'CANCELLED', 'COMPLETED'] },
            dateTime: { type: 'string', format: 'date-time' },
            duration: { type: 'integer', minimum: 5, maximum: 480 },
            type: { type: 'string', enum: ['PT_SESSION', 'EVALUATION', 'FOLLOW_UP'] },
            notes: { type: 'string' },
          },
        },
        CheckAvailability: {
          type: 'object',
          required: ['patientHandle', 'dateTime'],
          properties: {
            patientHandle: { type: 'string' },
            dateTime: { type: 'string', format: 'date-time' },
          },
        },
      },
    },
    paths: {
      // ─── Practices ────────────────────────────────────────
      '/api/practices': {
        get: { summary: 'List practices', tags: ['Practices'], responses: { 200: ok('List of practices') } },
        post: { summary: 'Create a practice', tags: ['Practices'], requestBody: jsonBody(ref('CreatePractice')), responses: { 201: ok('Practice created'), ...err400 } },
      },
      '/api/practices/{id}': {
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        get: { summary: 'Get practice by ID', tags: ['Practices'], responses: { 200: ok('Practice details'), ...err404 } },
        patch: { summary: 'Update a practice', tags: ['Practices'], requestBody: jsonBody(ref('CreatePractice')), responses: { 200: ok('Practice updated'), ...err400, ...err404 } },
      },

      // ─── Practitioners ────────────────────────────────────
      '/api/practitioners': {
        get: {
          summary: 'List practitioners', tags: ['Practitioners'],
          parameters: [
            { name: 'practiceId', in: 'query', schema: { type: 'string' } },
            { name: 'active', in: 'query', schema: { type: 'string', enum: ['true', 'false'] } },
            { name: 'limit', in: 'query', schema: { type: 'integer', default: 100 } },
            { name: 'offset', in: 'query', schema: { type: 'integer', default: 0 } },
          ],
          responses: { 200: ok('List of practitioners') },
        },
        post: { summary: 'Create a practitioner', tags: ['Practitioners'], requestBody: jsonBody(ref('CreatePractitioner')), responses: { 201: ok('Practitioner created'), ...err400, ...err404 } },
      },
      '/api/practitioners/{id}': {
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        get: { summary: 'Get practitioner by ID', tags: ['Practitioners'], responses: { 200: ok('Practitioner details'), ...err404 } },
        patch: { summary: 'Update a practitioner', tags: ['Practitioners'], requestBody: jsonBody(ref('UpdatePractitioner')), responses: { 200: ok('Updated'), ...err400, ...err404 } },
        delete: { summary: 'Deactivate a practitioner', tags: ['Practitioners'], responses: { 200: ok('Deactivated'), ...err404 } },
      },

      // ─── Patients ─────────────────────────────────────────
      '/api/patients': {
        get: {
          summary: 'List patients', tags: ['Patients'],
          parameters: [
            { name: 'practiceId', in: 'query', schema: { type: 'string' } },
            { name: 'limit', in: 'query', schema: { type: 'integer', default: 100 } },
            { name: 'offset', in: 'query', schema: { type: 'integer', default: 0 } },
          ],
          responses: { 200: ok('List of patients') },
        },
        post: { summary: 'Create a patient', tags: ['Patients'], requestBody: jsonBody(ref('CreatePatient')), responses: { 201: ok('Patient created'), ...err400, ...err404 } },
      },
      '/api/patients/{id}': {
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        get: { summary: 'Get patient by ID', tags: ['Patients'], responses: { 200: ok('Patient details with practitioners and recent appointments'), ...err404 } },
        patch: { summary: 'Update a patient', tags: ['Patients'], requestBody: jsonBody(ref('CreatePatient')), responses: { 200: ok('Updated'), ...err400, ...err404 } },
      },
      '/api/patients/{id}/sync': {
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        post: { summary: 'Request demographics/insurance sync via Bolo relay', tags: ['Patients', 'Bolo Relay'], requestBody: jsonBody(ref('SyncPatient')), responses: { 200: ok('Sync request sent'), ...err400, ...err404 } },
        get: { summary: 'Check sync responses and apply updates', tags: ['Patients', 'Bolo Relay'], responses: { 200: ok('Sync status'), ...err404 } },
      },

      // ─── Appointments ─────────────────────────────────────
      '/api/appointments': {
        get: {
          summary: 'List appointments', tags: ['Appointments'],
          parameters: [
            { name: 'practiceId', in: 'query', schema: { type: 'string' } },
            { name: 'practitionerId', in: 'query', schema: { type: 'string' } },
            { name: 'patientId', in: 'query', schema: { type: 'string' } },
            { name: 'status', in: 'query', schema: { type: 'string', enum: ['PENDING', 'CONFIRMED', 'DECLINED', 'RESCHEDULED', 'CANCELLED', 'COMPLETED'] } },
            { name: 'upcoming', in: 'query', schema: { type: 'string', enum: ['true'] }, description: 'Only future PENDING/CONFIRMED' },
            { name: 'limit', in: 'query', schema: { type: 'integer', default: 100 } },
            { name: 'offset', in: 'query', schema: { type: 'integer', default: 0 } },
          ],
          responses: { 200: ok('Paginated list of appointments') },
        },
        post: { summary: 'Create appointment (+ Bolo relay notification if patient has handle). Returns 409 on scheduling conflicts.', tags: ['Appointments'], requestBody: jsonBody(ref('CreateAppointment')), responses: { 201: ok('Appointment created'), ...err400, ...err404, 409: { description: 'Scheduling conflict (double-booking, outside hours, break time, or time-off)' } } },
      },
      '/api/appointments/{id}': {
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        get: { summary: 'Get appointment by ID', tags: ['Appointments'], responses: { 200: ok('Appointment details'), ...err404 } },
        patch: { summary: 'Update appointment (status: CONFIRMED/DECLINED triggers relay reply)', tags: ['Appointments'], requestBody: jsonBody(ref('UpdateAppointment')), responses: { 200: ok('Updated'), ...err400, ...err404 } },
        delete: { summary: 'Cancel appointment (soft delete)', tags: ['Appointments'], responses: { 200: ok('Cancelled'), ...err404 } },
      },

      // ─── Practitioner Schedule ─────────────────────────────
      '/api/practitioners/{id}/schedule': {
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        get: { summary: 'Get weekly working hours', tags: ['Practitioners'], responses: { 200: ok('Weekly schedule'), ...err404 } },
        put: {
          summary: 'Set weekly working hours (replaces all)',
          tags: ['Practitioners'],
          requestBody: jsonBody({
            type: 'object', required: ['schedule'],
            properties: {
              schedule: {
                type: 'array',
                items: {
                  type: 'object',
                  required: ['dayOfWeek', 'startTime', 'endTime'],
                  properties: {
                    dayOfWeek: { type: 'integer', minimum: 0, maximum: 6, description: '0=Sun, 6=Sat' },
                    startTime: { type: 'string', description: '24h format, e.g. "08:00"' },
                    endTime: { type: 'string', description: '24h format, e.g. "17:00"' },
                    breakStart: { type: 'string' },
                    breakEnd: { type: 'string' },
                  },
                },
              },
            },
          }),
          responses: { 200: ok('Schedule updated'), ...err400, ...err404 },
        },
      },
      '/api/practitioners/{id}/time-off': {
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        get: {
          summary: 'List time-off blocks', tags: ['Practitioners'],
          parameters: [
            { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
            { name: 'upcoming', in: 'query', schema: { type: 'string', enum: ['true'] } },
          ],
          responses: { 200: ok('Time-off list'), ...err404 },
        },
        post: {
          summary: 'Add time-off block', tags: ['Practitioners'],
          requestBody: jsonBody({
            type: 'object', required: ['startDate', 'endDate'],
            properties: {
              startDate: { type: 'string', format: 'date-time' },
              endDate: { type: 'string', format: 'date-time' },
              reason: { type: 'string' },
            },
          }),
          responses: { 201: ok('Time-off created'), ...err400, ...err404 },
        },
        delete: {
          summary: 'Delete time-off block', tags: ['Practitioners'],
          parameters: [
            { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
            { name: 'timeOffId', in: 'query', required: true, schema: { type: 'string' } },
          ],
          responses: { 200: ok('Deleted'), ...err404 },
        },
      },

      // ─── Practitioner Calendar ──────────────────────────────
      '/api/practitioners/{id}/calendar': {
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        get: {
          summary: 'Get practitioner calendar with appointments and available slots',
          tags: ['Practitioners', 'Appointments'],
          parameters: [
            { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
            { name: 'date', in: 'query', schema: { type: 'string', format: 'date' }, description: 'Start date (default: today)' },
            { name: 'days', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 31, default: 7 }, description: 'Number of days to return' },
            { name: 'slotDuration', in: 'query', schema: { type: 'integer', minimum: 15, maximum: 120, default: 30 }, description: 'Slot size in minutes' },
          ],
          responses: { 200: ok('Calendar with appointments and available slots per day'), ...err404 },
        },
      },

      // ─── Availability ─────────────────────────────────────
      '/api/availability': {
        post: { summary: 'Check patient availability via Bolo relay', tags: ['Bolo Relay'], requestBody: jsonBody(ref('CheckAvailability')), responses: { 200: ok('Availability check sent'), ...err400 } },
      },

      // ─── Relay ────────────────────────────────────────────
      '/api/relay/inbox': {
        get: {
          summary: 'Poll Bolo relay inbox', tags: ['Bolo Relay'],
          parameters: [{ name: 'since', in: 'query', schema: { type: 'string', format: 'date-time' } }],
          responses: { 200: ok('Inbox messages') },
        },
      },

      // ─── Widget Registration ──────────────────────────────
      '/api/register': {
        post: { summary: 'Register BoMed as a Bolo widget', tags: ['Bolo Relay'], responses: { 200: ok('Widget registered') } },
      },

      // ─── PCC Sync ─────────────────────────────────────────
      '/api/fhir/r4/sync/pcc': {
        get: { summary: 'Check PCC integration status', tags: ['PCC Sync'], responses: { 200: ok('PCC status') } },
        post: {
          summary: 'Push confirmed appointments to PointClickCare', tags: ['PCC Sync'],
          requestBody: jsonBody({ type: 'object', properties: { appointmentId: { type: 'string', description: 'Optional: sync a specific appointment' } } }),
          responses: { 200: ok('Sync results'), 503: { description: 'PCC not configured', content: { 'application/json': { schema: ref('Error') } } } },
        },
      },
    },
    tags: [
      { name: 'Practices', description: 'Practice management' },
      { name: 'Practitioners', description: 'Practitioner management' },
      { name: 'Patients', description: 'Patient management' },
      { name: 'Appointments', description: 'Appointment scheduling' },
      { name: 'Bolo Relay', description: 'Agent-to-agent communication via Bolo trust layer' },
      { name: 'PCC Sync', description: 'PointClickCare FHIR integration' },
      { name: 'FHIR R4', description: 'FHIR R4 resource endpoints' },
    ],
  };
}