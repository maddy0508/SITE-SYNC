# SITE-SYNC Product Roadmap

**Effective:** 2026-09-14
**Controlling tracker:** Linear — `SITE-SYNC — Clean-Room Build`

## Product definition

SITE-SYNC is a field-operations platform for construction and solar projects.

It connects people, work, safety, documents, evidence, progress, reporting and communication into one secure operational record.

The project/site and map are central operating surfaces.

## Product hierarchy

```text
SITE-SYNC
├── TODAY
│   ├── Attendance
│   ├── Crew / supervisor
│   ├── Pre-start status
│   ├── Take 5 / SWMS / permits / inductions
│   ├── Weather / warnings / hazards
│   ├── Progress / blockers / actions
│   └── Site / project context
├── PROJECT / SITE
│   ├── MAP
│   ├── Spatial work areas / work fronts
│   ├── Progress
│   └── Activity
├── PEOPLE
│   ├── Worker profiles
│   ├── Crews
│   ├── Contractors
│   ├── Qualifications / documents
│   └── Attendance
├── SAFETY & COMPLIANCE
│   ├── Pre-starts
│   ├── SWMS
│   ├── Permits / hot work
│   ├── Inductions
│   └── Hazards / actions
├── REPORTING & ANALYTICS
│   ├── Daily
│   ├── Weekly
│   ├── Monthly
│   ├── Dashboards / KPIs
│   └── Drill-down to source records
└── COMMUNICATIONS
    ├── Calls
    ├── External messaging
    ├── Alerts
    └── Notifications
```

## Roadmap

| Milestone | Product outcome | Target |
|---|---|---|
| M1 | Trustworthy Offline Operational Record | Hard gate |
| M2 | Product Shell & TODAY | 2026-09-27 |
| M3 | PEOPLE & Worker Profiles | 2026-10-11 |
| M4 | PRE-STARTS, Safety, SWMS & Permits | 2026-10-25 |
| M5 | MAP, GPS & Spatial Progress | 2026-11-15 |
| M6 | Reporting, Analytics & Operational Intelligence | 2026-12-13 |
| M7 | Communications & Notifications | 2027-01-10 |
| M8 | Admin, Integration, Production Hardening & Release | 2027-02-07 |

Dates are delivery targets, not permission to bypass acceptance gates.

## M1 — Trustworthy Offline Operational Record

The engineering foundation proves:

`Login → company/project context → worker identity → QR → offline attendance → durable command → Supabase effect → reconciliation → timesheet derivation → audit/RLS proof → Android release verification`

M1.7 and M1.8 are the final trust gates.

Do not extend M1 indefinitely with speculative M1.x work.

## M2 — Product Shell & TODAY

First visible product tranche.

### TODAY must expose

- date/time
- project/site
- location where permitted
- current shift
- weather and warnings
- site/progress summary
- workers onsite
- active work fronts
- crew/supervisor
- attendance state
- pre-start state
- Take 5 state
- SWMS requirements
- permit state
- hazards/restrictions/warnings
- blockers/outstanding actions
- scheduled/upcoming work

### Acceptance

The app opens into TODAY, not a QA harness. Data is repository-backed. Loading, empty, offline, error and permission states are explicit.

## M3 — PEOPLE & Worker Profiles

### PEOPLE

Searchable worker directory with filters for attendance, crew, supervisor, contractor, trade and company.

### Worker Profile

- profile photograph
- company banner
- worker name in capitals
- position/trade
- company/project
- contact details
- CALL
- external messaging action
- QR code
- attendance status/history/statistics
- qualifications
- White Card / licences / competencies
- documents and expiry dates
- inductions
- SWMS assignments
- permits
- restrictions/actions
- operational history

Worker Profile is a reusable identity object shared by attendance, pre-starts, map, reports and communications.

## M4 — PRE-STARTS, Safety, SWMS & Permits

Pre-start lifecycle:

`Prepare → review conditions → hazards → controls → crew → SWMS → permits → acknowledgements → issues → signatures → submit → supervisor approval → immutable record`

The workflow automatically consumes available project, site, location, weather, crew, supervisor, work, SWMS, permit and action context.

Deliver:

- digital pre-starts
- Take 5
- hazards and controls
- weather/site conditions
- SWMS confirmation
- permit checks
- version-controlled SWMS
- permit-to-work/hot-work lifecycle
- inductions and competency state
- signatures
- approval lifecycle
- immutable records
- compliance visibility

## M5 — MAP, GPS & Spatial Progress

The map becomes a primary operational surface.

### Spatial objects

- site boundary
- project zones
- work areas/work fronts
- workers/devices where permitted
- crews
- equipment
- hazards
- incidents
- permits
- restricted areas
- photos
- annotations

### Spatial progress

For each work area:

- planned quantity
- completed quantity
- percentage complete
- unit
- crew
- status
- start date
- expected completion
- actual completion
- blockers
- photos/evidence
- inspections/defects where applicable

Example solar hierarchy:

`Project → Block → Pile / Tracker / Module / Electrical work fronts → spatial progress`

Location must define permission, privacy, freshness, accuracy, battery/network and offline behaviour.

## M6 — Reporting, Analytics & Operational Intelligence

### Daily

Workforce, attendance, hours, productivity, progress, weather, delays, incidents, hazards, permits, SWMS, pre-starts, blockers, photos and activities.

### Weekly

Workforce trend, attendance trend, hours, productivity, planned vs actual, progress by work area/contractor, delays, incidents, safety trends, outstanding actions and upcoming work.

### Monthly

Overall progress, programme performance, labour utilisation, productivity, contractor performance, safety statistics, attendance/work-hour trends, planned vs actual, cumulative progress, forecast completion, major risks and outstanding issues.

### Dashboards

- Project progress
- Workforce
- Productivity
- Safety
- Documents/compliance
- Programme

Every chart is operational, not decorative. Drill-down must lead to underlying records.

## M7 — Communications & Notifications

Communications are integrated around operational identity and events.

Examples:

- worker contact
- crew contact
- supervisor contact
- project communication
- pre-start completion notification
- permit approval notification
- schedule change notification
- critical warning notification

External platform/API capability must be verified before committing to an integration design.

## M8 — Admin, Integration, Production Hardening & Release

Finish:

- project/company administration
- roles and permissions
- tenant isolation
- cross-domain offline/online reliability
- notification reliability
- performance
- accessibility
- device compatibility
- security review
- telemetry
- backup/recovery
- migration governance
- production Supabase gates
- signing
- release builds
- field acceptance
- operator documentation/training

## Development model

Every product feature follows:

`domain → backend/RLS → local projection → repository → service → UI → real data → tests → Android acceptance`

A feature is not complete because it has a schema, endpoint, mockup, scaffold or placeholder.

## Definition of done

1. Real workflow exists end-to-end.
2. Real persisted state drives UI.
3. Authorization and tenant isolation are proven.
4. Offline/online semantics are proven where relevant.
5. Failure/empty/loading/permission states are tested.
6. Android physical acceptance is complete.
7. Evidence is recorded in Linear.
8. Documentation is current.
