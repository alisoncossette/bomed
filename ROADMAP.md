# BoMed Roadmap

## Phase 1: Standalone MVP
- [x] Practice dashboard (manage practitioners, patients)
- [x] Basic appointment management (create, confirm, reschedule, cancel)
- [x] Privacy-first availability queries via Bolo relay (yes/no only)
- [x] FHIR R4-compliant API (`/api/fhir/r4/`) — Patient, Practitioner, Appointment, Organization
- [x] FHIR CapabilityStatement at `/api/fhir/r4/metadata`
- [x] Patient demographics & insurance sync via Bolo relay
- [ ] Patient portal / hosted calendar (confirm, deny, reschedule)
- [ ] Auto-scheduler (same patient, same practitioner)
- [ ] Documentation: what is BoMed, how it works, setup guide

## Phase 2: Patient Experience
- [ ] Patient connects their own calendar via Bolo (hands-free scheduling)
- [ ] Non-connected patients get hosted BoMed calendar
- [ ] Appointment reminders (reduce no-shows)
- [ ] Recurring appointment patterns (e.g., every Tuesday at 10am)
- [ ] Patient preference learning (preferred times, practitioner)

## Phase 3: EHR Sync (Scheduling Only)
- [x] **FHIR R4-native API** — BoMed speaks FHIR natively, any EHR can connect
- [x] **PointClickCare (PCC) sync service** — push confirmed appointments via FHIR (https://fhir.pointclickcare.com/)
- [ ] **PCC pilot customer onboarding** — register as USCDI Connector, get tenant credentials
- [ ] One-way sync: BoMed -> PCC (push confirmed appointment times back)
- [ ] Two-way patient lookup (match BoMed patients to PCC records)
- [ ] SMART on FHIR auth flow for PCC (certificate-based)
- [ ] Support for major PT EHRs: PCC, WebPT, Clinicient, TheraOffice
- [ ] Calendar events only — no clinical data, ever
- [ ] Stay out of clinical data business entirely

## Phase 4: Scale
- [ ] Epic App Orchard certification (if demand warrants)
- [ ] Multi-location practice support
- [ ] Insurance/billing integration (appointment codes only)
- [ ] Analytics: no-show rates, scheduling efficiency, practitioner utilization

## FHIR R4 Endpoint Reference

| Method | Path | FHIR Resource |
|--------|------|---------------|
| GET | `/api/fhir/r4/metadata` | CapabilityStatement |
| GET/POST | `/api/fhir/r4/Patient` | Patient (search, create) |
| GET/PUT | `/api/fhir/r4/Patient/:id` | Patient (read, update) |
| GET | `/api/fhir/r4/Practitioner` | Practitioner (search) |
| GET | `/api/fhir/r4/Practitioner/:id` | Practitioner (read) |
| GET/POST | `/api/fhir/r4/Appointment` | Appointment (search, create) |
| GET/PUT | `/api/fhir/r4/Appointment/:id` | Appointment (read, update) |
| GET | `/api/fhir/r4/Organization` | Organization (search) |
| GET | `/api/fhir/r4/Organization/:id` | Organization (read) |
| GET/POST | `/api/fhir/r4/sync/pcc` | PCC sync status / push appointments |

## Business Strategy
- Start standalone — PT practices are desperate for better scheduling
- Small/mid practices (1-10 practitioners) are the beachhead
- Privacy angle is the differentiator — no EHR offers this
- FHIR-native from day one — any EHR can connect without custom adapters
- Prove the product works, get traction, THEN EHR vendors come to you
- BoMed doesn't replace your EHR — it replaces the phone calls
