SITE-SYNC_MASTER_BLUEPRINT.md

Status: AUTHORITATIVE SOURCE
Version: v1.0
Date: 2026-09-26
Owner: Maddy McKellar
Applies to: SITE-SYNC product, platform, delivery, and governance

---

# PART A — IDENTITY

## 1. Product identity

### 1.1 What SITE-SYNC is

SITE-SYNC is an Android-first, local-first site-work platform for construction and infrastructure projects. It is the operational surface where a company registers, workers are onboarded and inducted, projects and sites are created, work is assigned and evidenced against a map of physical assets, attendance and timesheets are captured, QA and blockers are recorded, and everything is auditable — including when the device is offline.

SITE-SYNC is not a drawing tool, not a BIM authoring tool, not a messaging app, not a payroll engine, not an ERP, not a document management system, and not a generic project-management suite. It is the operational record of physical work and the coordination layer around that record.

### 1.2 What SITE-SYNC is not

SITE-SYNC does not replace CAD, BIM, scheduling, payroll, or accounting software. It does not store drawings as its primary data model. It does not provide free-form chat. It does not compute salaries. It does not manage procurement.

SITE-SYNC integrates with these systems where necessary but never absorbs them.

### 1.3 Single sentence

SITE-SYNC is the offline-first operational record and coordination platform for physical construction work, from worker induction to evidence-backed progress to audit.

---

## 2. Domain

### 2.1 Domain statement

SITE-SYNC operates in the construction and infrastructure site-work domain: the coordination of people, work, and physical assets on a site, with evidence capture, attendance, QA, and audit, under conditions of intermittent connectivity.

### 2.2 Domain boundaries

In scope: company and worker onboarding; project and site management; physical asset mapping; task assignment and execution; QR-based attendance; timesheets; QA and evidence capture; blockers; reporting; offline-first operation; audit trail.

Out of scope: CAD/BIM authoring; payroll computation; procurement; accounting; free-form messaging; document management as a primary function.

### 2.3 Core domain objects

Company, Worker, Project, Site, Asset (physical: pile, footing, column, slab, pipe segment, etc.), WorkArea (spatial grouping of Assets), Task, Shift, AttendanceRecord, Timesheet, QARecord, Evidence, Blocker, Crew, Invitation, Report.

### 2.4 Domain invariants

1. Every fact about physical work traces to a specific Asset or WorkArea on a specific Site.
2. Every fact about a person traces to a specific Worker enrolled in a specific Company.
3. Every mutation is a fact (F record) with an actor, a timestamp, and an audit trail.
4. No fact is deleted; facts are superseded or retired.
5. Offline operation is the default, not the exception. The platform must function fully for a worker's daily operations without connectivity.
6. Sync is deterministic: the same set of facts always converges to the same state regardless of order of arrival.
7. Authority is explicit: every fact carries the authority under which it was recorded.
8. A worker's device is a trusted endpoint for that worker's facts only. Cross-entity facts require server authority.

---

## 3. Actors and roles

### 3.1 Actor taxonomy

**Platform Admin** — SITE-SYNC operator. Manages tenants, escalation, platform-level configuration. Not a company role.

**Company Admin** — registers and configures the company, manages workers, projects, sites, roles. Full authority within the company scope.

**Project Manager** — manages assigned projects: sites, work areas, assets, tasks, QA review, reports. Authority scoped to assigned projects.

**Supervisor** — day-to-day site operations: task assignment, attendance verification, QA sign-off, blocker resolution. Authority scoped to assigned sites.

**Worker** — executes work: checks in via QR, views tasks, records progress, captures evidence, raises blockers. Authority scoped to own work and assigned tasks.

**Subcontractor** — external worker belonging to a subcontractor company, enrolled in the host company's project. Authority same as Worker but flagged as external.

**EPC / Client** — external stakeholder with read-and-review visibility into assigned projects, progress, and reports.

### 3.2 Role-permission matrix

| Capability | Platform Admin | Company Admin | Project Manager | Supervisor | Worker | Subcontractor | EPC/Client |
|---|---|---|---|---|---|---|---|
| Register company | ✓ | | | | | | |
| Manage company config | | ✓ | | | | | |
| Enrol/remove workers | | ✓ | ✓ | | | | |
| Create project/site | | ✓ | ✓ | | | | |
| Define assets/work areas | | ✓ | ✓ | | | | |
| Assign tasks | | ✓ | ✓ | ✓ | | | |
| Execute tasks (progress, evidence) | | | | | ✓ | ✓ | |
| QR check-in/out | | | | | ✓ | ✓ | |
| Verify attendance | | ✓ | ✓ | ✓ | | | |
| Review QA | | ✓ | ✓ | ✓ | | | |
| Raise blockers | | | | ✓ | ✓ | ✓ | |
| Resolve blockers | | ✓ | ✓ | ✓ | | | |
| View reports | | ✓ | ✓ | ✓ | own | own | ✓ |
| Export reports | | ✓ | ✓ | | | | |
| View audit trail | | ✓ | ✓ | ✓ | own | own | |

### 3.3 Authority rules

1. Authority is granted per scope: platform, company, project, site, or self.
2. Authority cannot exceed the grantor's own authority.
3. Authority revocation is immediate and audited.
4. Every F record carries the authority scope under which it was written.
5. Self-authority extends only to the worker's own attendance, task execution, evidence, and blocker raising.
6. Cross-entity operations (anything affecting another worker, another company, or project-level state) require the appropriate scope authority.

---

## 4. Core entities

### 4.1 Entity catalogue

**Company** — a tenant. Has name, registration details, configuration, workers, projects. Companies are isolated; cross-company visibility requires explicit EPC/client grants.

**Worker** — a person enrolled in a company. Has identity, role, skills, induction status, device registration. A worker may be a direct employee or a subcontractor.

**Project** — a container of sites. Has name, client, timeline, status, assigned managers.

**Site** — a physical location within a project. Has geofence, address, supervisors, work areas, assets, daily state.

**Asset** — a physical construction element (pile, footing, column, beam, slab, pipe segment, valve, etc.). Has type, geometry (point/line/polygon), lifecycle state, progress, QA status, blockers. Assets are the primary unit of work tracking.

**WorkArea** — a spatial grouping of assets within a site. Has geometry, name, assigned crews. Work areas enable map-based navigation and filtering.

**Task** — a unit of work assigned to a worker or crew against assets or work areas. Has type, description, status, priority, due date, evidence requirements.

**Shift** — a scheduled work period for a site. Has start/end time, assigned workers, actual attendance.

**AttendanceRecord** — a QR-verified check-in or check-out event. Has worker, site, timestamp, QR code reference, geolocation.

**Timesheet** — a derived aggregation of attendance records for a worker over a period. Has hours, approval state, supervisor sign-off.

**QARecord** — a quality assurance observation against an asset or task. Has type (inspection, test, defect), status, evidence, resolution.

**Evidence** — a photo, video, or document attached to a fact. Has capture timestamp, uploader, hash, linkage to the fact it evidences.

**Blocker** — an impediment to work on an asset or task. Has type, description, severity, status, resolution, raised-by, resolved-by.

**Crew** — a named group of workers assigned to a site or work area. Has members, supervisor.

**Invitation** — a pending enrolment of a worker into a company. Has email/phone, role, status, expiry.

**Report** — a derived read model aggregating facts for a scope and period. Has type, scope, filters, freshness, export format.

### 4.2 Entity relationships

Company 1→N Project. Project 1→N Site. Site 1→N WorkArea. WorkArea 1→N Asset. Site 1→N Shift. Worker N→N Site (via assignment). Worker N→N Crew. Task → Asset or WorkArea. AttendanceRecord → Worker + Site + Shift. QARecord → Asset or Task. Evidence → any fact. Blocker → Asset or Task. Report → scope (Company/Project/Site/WorkArea).

### 4.3 Lifecycle states

**Company**: active, suspended, archived.
**Worker**: invited, inducted, active, suspended, retired.
**Project**: draft, active, completed, archived.
**Site**: draft, active, completed, archived.
**Asset**: planned, in-progress, complete, verified, defect, retired.
**Task**: draft, assigned, in-progress, complete, verified, cancelled.
**Shift**: scheduled, active, completed, cancelled.
**AttendanceRecord**: checked-in, checked-out.
**Timesheet**: draft, submitted, approved, rejected.
**QARecord**: open, in-review, resolved, closed.
**Blocker**: open, acknowledged, in-progress, resolved, closed.
**Invitation**: pending, accepted, expired, revoked.
**Report**: generated, exported, archived.

### 4.4 Deletion and retirement

No entity is deleted. Entities transition to retired or archived states. All facts remain in the audit trail. Archived entities are excluded from default views but remain queryable and reportable when explicitly requested.

---

## 5. Fact model

### 5.1 What is a fact

A fact (F record) is an immutable, timestamped, actor-attributed statement about the state of the world. Facts are the only mechanism by which state changes. Every mutation in the system — creating an entity, changing a status, recording attendance, capturing evidence, resolving a blocker — is a fact.

### 5.2 Fact anatomy

Every fact has:
- **fact_id**: globally unique identifier (UUIDv7 for temporal ordering).
- **fact_type**: the kind of state change (e.g., AssetCreated, TaskAssigned, AttendanceCheckedIn, QARecordOpened, BlockerResolved).
- **entity_type** + **entity_id**: the entity this fact concerns.
- **actor_id**: who recorded this fact.
- **authority_scope**: the scope under which the actor had authority.
- **timestamp**: when the fact was recorded (device time for offline, server time on sync).
- **payload**: the fact-specific data (structured, schema-versioned).
- **evidence_refs**: zero or more references to Evidence records.
- **supersedes**: optional reference to a prior fact this one replaces.
- **device_id**: the device on which this fact was recorded.
- **sync_state**: pending, confirmed, conflicted, rejected.

### 5.3 Fact types (complete enumeration)

**Company**: CompanyRegistered, CompanyConfigured, CompanySuspended, CompanyArchived.
**Worker**: WorkerInvited, WorkerInducted, WorkerActivated, WorkerSuspended, WorkerRetired, WorkerRoleChanged, WorkerDeviceRegistered, WorkerDeviceRevoked.
**Project**: ProjectCreated, ProjectConfigured, ProjectActivated, ProjectCompleted, ProjectArchived, ProjectManagerAssigned.
**Site**: SiteCreated, SiteConfigured, SiteActivated, SiteCompleted, SiteArchived, SiteSupervisorAssigned, SiteGeofenceUpdated.
**WorkArea**: WorkAreaCreated, WorkAreaConfigured, WorkAreaArchived.
**Asset**: AssetCreated, AssetGeometryUpdated, AssetLifecycleChanged, AssetProgressUpdated, AssetQaStatusChanged, AssetRetired.
**Task**: TaskCreated, TaskAssigned, TaskStarted, TaskProgressUpdated, TaskCompleted, TaskVerified, TaskCancelled, TaskEvidenceRequired.
**Shift**: ShiftScheduled, ShiftActivated, ShiftCompleted, ShiftCancelled, ShiftWorkerAssigned.
**Attendance**: AttendanceCheckedIn, AttendanceCheckedOut, AttendanceVerified, AttendanceFlagged.
**Timesheet**: TimesheetGenerated, TimesheetSubmitted, TimesheetApproved, TimesheetRejected.
**QA**: QARecordOpened, QARecordEvidenceAttached, QARecordInReview, QARecordResolved, QARecordClosed.
**Evidence**: EvidenceCaptured, EvidenceAttached, EvidenceVerified, EvidenceFlagged.
**Blocker**: BlockerRaised, BlockerAcknowledged, BlockerInProgress, BlockerResolved, BlockerClosed.
**Crew**: CrewCreated, CrewMemberAdded, CrewMemberRemoved, CrewDissolved.
**Report**: ReportGenerated, ReportExported.
**Sync**: SyncStarted, SyncCompleted, SyncConflictDetected, SyncConflictResolved.
**Audit**: AuditTrailAccessed, AuditTrailExported.

### 5.4 Fact immutability

Facts are immutable once recorded. A fact may be superseded by a later fact, but the original remains in the audit trail. A fact may be marked as rejected during sync conflict resolution, but it is never deleted. The audit trail is append-only.

### 5.5 Fact authority

Every fact carries the authority scope under which it was recorded. The authority scope determines:
- Whether the fact is valid (the actor must have had the required authority at the time of recording).
- Whether the fact can be synced (offline facts recorded under valid authority are accepted; facts recorded under invalid or expired authority are flagged).
- Whether the fact is visible to other actors (visibility follows authority scope).

---

## 6. Product surface

### 6.1 Platform map

SITE-SYNC has three surfaces:

1. **Android app** (primary): the worker and supervisor operational surface. Offline-first. Local SQLite database. QR scanning, camera, GPS, map view, task list, evidence capture, blocker raising, attendance, timesheet view.

2. **Web dashboard** (secondary): the company admin, project manager, and EPC/client surface. Requires connectivity. Company management, project/site configuration, asset definition, map management, reports, audit trail, worker management, analytics.

3. **Server** (backend): the authoritative store, sync engine, and API. PostgreSQL database. REST + WebSocket API. Report generation, audit trail aggregation, conflict resolution.

### 6.2 Android app modules

**Auth module**: login, device registration, biometric unlock, session management.
**Sync module**: offline queue, sync engine, conflict detection, background sync.
**Map module**: site map, asset rendering, work area display, geolocation, geofence detection.
**Task module**: task list, task detail, progress update, evidence capture, completion.
**Attendance module**: QR scan, check-in/out, attendance history, timesheet view.
**QA module**: QA record creation, evidence attachment, review, resolution.
**Blocker module**: blocker raising, status tracking, resolution.
**Evidence module**: camera capture, gallery selection, hash computation, attachment.
**Report module**: report viewing (cached), freshness display.
**Settings module**: profile, device management, sync settings, about.

### 6.3 Web dashboard modules

**Company module**: registration, configuration, worker management, role management, invitations.
**Project module**: project creation, site management, work area definition, asset definition, map management.
**Operations module**: task management, attendance overview, timesheet approval, QA review, blocker management.
**Report module**: report generation, filtering, export, scheduling (v2).
**Audit module**: audit trail query, export, fact inspection.
**Analytics module**: dashboards, KPIs, trend analysis (v2).

### 6.4 API surface

REST API for CRUD operations on all entities. WebSocket for real-time sync notifications. GraphQL for complex queries (v2). Webhook for external integrations (v2).

---

## 7. Offline and sync model

### 7.1 Offline-first principle

The Android app operates fully offline for all daily operations. A worker can check in, view tasks, update progress, capture evidence, raise blockers, and view their own timesheet without any connectivity. All operations are recorded as facts in the local SQLite database and queued for sync.

### 7.2 What requires connectivity

- Initial login and device registration.
- Company registration and configuration (web dashboard).
- Worker invitation and induction (web dashboard or admin-initiated).
- Project and site creation (web dashboard).
- Asset and work area definition (web dashboard).
- Cross-entity report generation (web dashboard).
- Report export (web dashboard).
- Audit trail query (web dashboard).
- Administrative document verification.
- Platform administration.

### 7.3 Sync protocol

Sync is bidirectional and deterministic. The client sends pending facts to the server. The server validates authority, checks for conflicts, and either confirms or rejects each fact. The server sends new facts to the client. The client applies confirmed facts to its local database.

### 7.4 Conflict resolution

Conflicts occur when two facts from different sources attempt to mutate the same entity state. Resolution rules:

1. **Last-writer-wins** for non-authoritative fields (e.g., progress percentage, notes).
2. **Authority-wins** for authoritative fields (e.g., lifecycle state, QA status). The fact recorded under higher authority scope prevails.
3. **Server-wins** for server-initiated state changes (e.g., worker suspension, authority revocation).
4. **Manual resolution** for ambiguous conflicts. The conflict is flagged and presented to the appropriate authority for resolution.

### 7.5 Sync ordering

Facts are ordered by timestamp within a device. Across devices, facts are ordered by server receipt time. Causal ordering is preserved via the `supersedes` chain. The sync engine ensures that a fact is never applied before its predecessor.

### 7.6 Data freshness

Every read model (derived state) carries a freshness indicator: the timestamp of the last fact applied to it. Reports display freshness prominently. Cached data is always marked as potentially stale.

---

## 8. Map operating surface

### 8.1 Map as primary interface

The map is the primary interface for site operations. Assets and work areas are rendered on a satellite or plan-view map. Workers navigate to their assigned work areas, tap assets to view details, update progress, capture evidence, and raise blockers.

### 8.2 Map data model

Sites have a base map (satellite imagery or uploaded plan). Assets have geometry (point, line, or polygon) in the site's coordinate reference system. Work areas have polygon geometry. The map supports zoom, pan, layer toggling, and asset filtering.

### 8.3 Offline map

Map tiles and asset geometry are cached locally for offline use. The cache is populated during connectivity and refreshed on sync. Workers can navigate the map, view assets, and perform all operations offline.

### 8.4 Geofencing

Sites have a geofence (polygon or radius). The app detects when a worker enters or exits the geofence. Check-in is only possible within the geofence (configurable per site). Geofence violations are flagged.

---

## 9. QR attendance

### 9.1 QR check-in flow

1. Worker opens the app and navigates to the attendance screen.
2. Worker scans the site QR code (displayed at the site entrance or on a supervisor's device).
3. App validates the QR code (site ID, timestamp, signature).
4. App records an AttendanceCheckedIn fact with worker ID, site ID, timestamp, geolocation, and QR reference.
5. Fact is queued for sync.

### 9.2 QR check-out flow

Same as check-in but records AttendanceCheckedOut. Check-out is optional; a worker who does not check out is automatically checked out at shift end (configurable per site).

### 9.3 QR code generation

QR codes are generated by the server and are time-limited (configurable, default 15 minutes). Each QR code encodes: site ID, timestamp, nonce, and HMAC signature. QR codes cannot be replayed.

### 9.4 Attendance verification

Supervisors can verify attendance records. Verification is a fact (AttendanceVerified). Flagged attendance (geofence violation, duplicate check-in, missing check-out) requires supervisor review.

---

## 10. Reporting

### 10.1 Report types

**Progress report**: asset progress by work area, site, or project. Shows completion percentage, evidence count, QA status, blockers.
**Attendance report**: worker attendance by site, shift, or period. Shows check-in/out times, hours, verification status, flags.
**Timesheet report**: worker timesheets by period. Shows hours, approval status, supervisor sign-off.
**QA report**: QA records by asset, task, or site. Shows open items, resolution rate, defect trends.
**Blocker report**: blockers by site, severity, or status. Shows resolution time, escalation rate.
**Audit report**: fact trail for any entity, actor, or period. Shows all state changes with actor, timestamp, and evidence.

### 10.2 Report generation

Reports are generated on the server from the fact store. Report generation requires connectivity and appropriate authority. Reports are cached for session-only viewing.

### 10.3 Report export

Reports can be exported as CSV or PDF. Export is a fact (ReportExported) with actor, timestamp, format, and scope. Exported reports are immutable snapshots.

### 10.4 Report freshness

Every report displays its freshness: the timestamp of the last fact included. Reports generated over stale data are marked accordingly. Cross-entity reports require the latest sync state.

---

## 11. Audit and evidence

### 11.1 Audit trail

The audit trail is the complete, append-only sequence of facts. It is queryable by entity, actor, fact type, date range, and authority scope. The audit trail is the ultimate source of truth.

### 11.2 Evidence chain

Evidence (photos, videos, documents) is captured on device, hashed (SHA-256), and attached to facts. The evidence hash is stored in the fact payload. Evidence integrity is verifiable: the hash of the stored file must match the hash in the fact.

### 11.3 Immutability guarantee

Facts and evidence are immutable. Any attempt to modify a fact or evidence file is detectable via hash mismatch. The audit trail itself is append-only and tamper-evident.

---

## 12. Architecture overview

### 12.1 System components

- **Android app**: Kotlin, Jetpack Compose, Room (SQLite), Hilt (DI), CameraX, ML Kit (QR), MapLibre (map), WorkManager (background sync).
- **Web dashboard**: React, TypeScript, Tailwind CSS, MapLibre GL, Recharts.
- **Server**: Node.js, Hono, Drizzle ORM, PostgreSQL, WebSocket (ws), Redis (pub/sub for real-time).
- **Infrastructure**: Docker, GitHub Actions (CI/CD), Cloudflare (CDN, R2 for evidence storage).

### 12.2 Data stores

- **PostgreSQL** (server): authoritative fact store, entity state, audit trail.
- **SQLite** (Android): local fact store, entity state, offline queue, cached read models.
- **R2 / S3** (cloud): evidence file storage (photos, videos, documents).
- **Redis** (server): pub/sub for real-time sync notifications, session cache.

### 12.3 API architecture

REST API for CRUD. WebSocket for real-time sync. All API calls are authenticated (JWT) and authorized (scope-based). Rate limiting and input validation at the API layer.

### 12.4 Sync architecture

The sync engine runs on both client and server. Client-side: WorkManager-scheduled background sync, manual sync trigger, conflict detection. Server-side: fact validation, authority checking, conflict resolution, broadcast to connected clients.

---

## 13. Security model

### 13.1 Authentication

JWT-based authentication. Access tokens are short-lived (15 minutes). Refresh tokens are long-lived (30 days) and device-bound. Biometric unlock for the Android app (local only, not server-verified).

### 13.2 Authorization

Scope-based authorization. Every API call and every fact carries the actor's authority scope. The server validates authority for every operation. Authority is checked at the fact level, not just the API level.

### 13.3 Data encryption

TLS for all network communication. At-rest encryption for PostgreSQL (managed by hosting provider). Evidence files are encrypted at rest in R2/S3. Local SQLite database is encrypted (SQLCipher) on Android.

### 13.4 Audit security

The audit trail is append-only. No API or database operation can modify or delete facts. Audit trail access requires appropriate authority. Audit trail export is a fact.

---

## 14. Non-functional requirements

### 14.1 Performance

- App cold start: < 3 seconds on mid-range Android device.
- Map render: < 1 second for 1000 assets.
- Sync: < 5 seconds for 100 facts on 3G.
- Report generation: < 10 seconds for 10,000 facts.
- API response: < 200ms p95 for CRUD operations.

### 14.2 Scalability

- Support 10,000 workers per company.
- Support 1,000 sites per project.
- Support 100,000 assets per site.
- Support 1M facts per company per month.
- Horizontal scaling for the server (stateless API, shared database).

### 14.3 Reliability

- 99.9% uptime for the server.
- Zero data loss for confirmed facts.
- Offline operation for 7 days without sync.
- Automatic retry for failed sync.

### 14.4 Usability

- Android app usable with gloves (large touch targets).
- Android app usable in bright sunlight (high contrast).
- Web dashboard usable on tablet.
- Accessibility: WCAG 2.1 AA for web dashboard.

---

## 15. Constraints

### 15.1 Technical constraints

- Android API 26+ (Android 8.0+).
- No Google Play Services dependency for core functionality (QR scanning, map, camera).
- SQLite for local storage (Room ORM).
- PostgreSQL 15+ for server.
- Node.js 20+ for server runtime.

### 15.2 Business constraints

- Multi-tenant from day one. No single-tenant shortcuts.
- Offline-first is non-negotiable. No feature may require connectivity unless explicitly listed in §7.2.
- Audit trail is non-negotiable. No state change without a fact.
- Evidence integrity is non-negotiable. All evidence is hashed and verifiable.

### 15.3 Regulatory constraints

- GDPR: worker data is personal data. Right to access, right to erasure (within audit constraints), data portability.
- Local labour laws: attendance records may be required for payroll compliance. Retention periods vary by jurisdiction.
- Construction industry standards: QA records may be subject to regulatory inspection.

---

## 16. Glossary

**Fact (F record)**: an immutable, timestamped, actor-attributed statement about a state change.
**Entity (E)**: a domain object (Company, Worker, Project, Site, Asset, etc.).
**Derived (D)**: a read model computed from facts (timesheet, progress report, site daily state).
**Asset**: a physical construction element tracked on the map.
**WorkArea**: a spatial grouping of assets within a site.
**Authority scope**: the level at which an actor has permission to record facts (platform, company, project, site, self).
**Sync**: the bidirectional exchange of facts between client and server.
**Freshness**: the timestamp of the last fact applied to a read model.
**Geofence**: a virtual boundary around a site used for attendance validation.
**QR code**: a time-limited, signed code used for attendance check-in/out.
**Evidence**: a photo, video, or document attached to a fact, hashed for integrity.
**Blocker**: an impediment to work that requires resolution.
**Crew**: a named group of workers assigned to a site or work area.
**Tenant**: a company using SITE-SYNC. Tenants are isolated.
**Audit trail**: the complete, append-only sequence of facts.

---

# PART B — ARCHITECTURE CONTRACT

## 17. Architecture principles

### AC-ARCH-1: Fact-sourced architecture
All state is derived from facts. There is no mutable entity state outside the fact store. Read models are computed from facts and are disposable.

### AC-ARCH-2: Offline-first
The Android app operates fully offline for all daily operations. Offline is the default, not the exception.

### AC-ARCH-3: Tenant isolation
Companies are fully isolated. No cross-tenant data access without explicit grants.

### AC-ARCH-4: Authority-scoped operations
Every operation carries an authority scope. The scope determines validity, visibility, and sync acceptance.

### AC-ARCH-5: Immutable audit trail
Facts are immutable and append-only. The audit trail is the ultimate source of truth.

### AC-ARCH-6: Evidence integrity
All evidence is hashed (SHA-256) at capture. Integrity is verifiable at any time.

### AC-ARCH-7: Deterministic sync
The same set of facts always converges to the same state regardless of order of arrival.

### AC-ARCH-8: Local-first read models
The Android app computes read models locally from the local fact store. Server-computed read models are cached and marked with freshness.

---

## 18. Data architecture

### AC-DATA-1: Fact store schema
The fact store is a single append-only table (or collection) with the schema defined in §5.2. Indexes on entity_id, actor_id, fact_type, timestamp, and sync_state.

### AC-DATA-2: Entity state projection
Entity state is a projection from the fact store. Projections are rebuilt on demand and cached. The cache is invalidated when new facts arrive.

### AC-DATA-3: Local database schema
The Android local database mirrors the server schema with additional tables for sync queue, conflict resolution, and cached read models.

### AC-DATA-4: Evidence storage
Evidence files are stored in object storage (R2/S3). The fact store contains only the evidence reference (URL, hash, metadata). Evidence files are immutable.

### AC-DATA-5: Schema versioning
Fact payloads are schema-versioned. The sync engine handles version negotiation. Old clients can read new facts (forward-compatible). New clients can read old facts (backward-compatible).

---

## 19. Sync architecture

### AC-SYNC-1: Bidirectional sync
Sync is bidirectional. The client sends pending facts. The server sends new facts. Both directions are atomic per batch.

### AC-SYNC-2: Conflict detection
The server detects conflicts by checking if a fact's supersedes chain is consistent with the server's current state. A conflict occurs when the supersedes reference is not the latest fact for the entity.

### AC-SYNC-3: Conflict resolution
Conflicts are resolved per §7.4. Resolved conflicts are recorded as SyncConflictResolved facts.

### AC-SYNC-4: Sync batching
Facts are synced in batches (default 100). Batches are atomic: either all facts in a batch are applied or none are.

### AC-SYNC-5: Sync ordering
Facts within a batch are ordered by timestamp. Batches are ordered by client sync sequence number. The server applies batches in order.

### AC-SYNC-6: Sync retry
Failed sync is retried with exponential backoff (1s, 2s, 4s, 8s, 16s, 32s, 64s, then every 5 minutes). Retry is automatic via WorkManager.

### AC-SYNC-7: Sync notification
After sync, the server notifies connected clients via WebSocket. Clients invalidate affected read models.

---

## 20. API architecture

### AC-API-1: REST API
All CRUD operations are REST. Resources are entities. Operations are standard HTTP methods. Responses are JSON.

### AC-API-2: WebSocket API
Real-time sync notifications use WebSocket. Clients subscribe to their company's channel. Notifications are fact-type-specific.

### AC-API-3: Authentication
JWT access tokens (15-minute expiry) + refresh tokens (30-day expiry, device-bound). Token refresh is automatic.

### AC-API-4: Authorization
Every API call is authorized against the actor's authority scope. Authorization is enforced at the API layer and at the fact layer.

### AC-API-5: Rate limiting
API calls are rate-limited per actor and per company. Default: 100 requests/minute per actor, 1000 requests/minute per company.

### AC-API-6: Input validation
All API inputs are validated against JSON schemas. Invalid inputs return 400 with detailed error messages.

---

## 21. Android architecture

### AC-AND-1: MVVM + Repository
The Android app uses MVVM with Repository pattern. ViewModels expose StateFlow. Repositories mediate between local database and remote API.

### AC-AND-2: Offline-first repository
Repositories always read from the local database. Writes go to the local database and the sync queue. Sync is handled by the sync engine.

### AC-AND-3: Room database
Local storage uses Room (SQLite). Database is encrypted (SQLCipher). Migrations are tested.

### AC-AND-4: WorkManager sync
Background sync uses WorkManager. Sync runs on network availability, on app foreground, and on a periodic schedule (every 15 minutes when connected).

### AC-AND-5: CameraX evidence capture
Evidence capture uses CameraX. Photos are compressed (JPEG, max 2MB), hashed (SHA-256), and stored locally before sync.

### AC-AND-6: ML Kit QR scanning
QR scanning uses ML Kit. Scanning is fast (< 500ms) and works offline.

### AC-AND-7: MapLibre map
The map uses MapLibre GL Native. Map tiles are cached locally. Asset geometry is rendered as GeoJSON layers.

---

## 22. Web dashboard architecture

### AC-WEB-1: React SPA
The web dashboard is a React single-page application. State management uses React Query + Zustand.

### AC-WEB-2: Server-side rendering (optional)
SSR is not required for v1. The dashboard is behind authentication and does not need SEO.

### AC-WEB-3: MapLibre GL JS
The map uses MapLibre GL JS. Asset geometry is rendered as GeoJSON layers.

### AC-WEB-4: Real-time updates
The dashboard subscribes to WebSocket notifications for real-time updates.

---

## 23. Server architecture

### AC-SRV-1: Hono framework
The server uses Hono (Node.js). Hono is lightweight, fast, and TypeScript-native.

### AC-SRV-2: Drizzle ORM
Database access uses Drizzle ORM. Migrations are versioned and tested.

### AC-SRV-3: PostgreSQL
The primary database is PostgreSQL 15+. Connection pooling via pg-pool.

### AC-SRV-4: Redis pub/sub
Real-time notifications use Redis pub/sub. The server publishes fact notifications. WebSocket servers subscribe and forward to clients.

### AC-SRV-5: Horizontal scaling
The server is stateless. Horizontal scaling is via load balancer + multiple instances. Redis is shared for pub/sub. PostgreSQL is shared for state.

---

## 24. Security architecture

### AC-SEC-1: TLS everywhere
All network communication uses TLS 1.3. Certificate pinning on Android (v2).

### AC-SEC-2: JWT authentication
Access tokens are JWT (RS256). Refresh tokens are opaque, device-bound, and revocable.

### AC-SEC-3: Scope-based authorization
Authorization is scope-based. Scopes are: platform, company, project, site, self. Every operation is authorized against the required scope.

### AC-SEC-4: SQL injection prevention
All database access uses parameterized queries via Drizzle ORM. No raw SQL.

### AC-SEC-5: XSS prevention
The web dashboard sanitizes all user input. React's built-in XSS protection is enabled.

### AC-SEC-6: CSRF prevention
API calls require JWT in the Authorization header (not cookies). CSRF is not applicable.

### AC-SEC-7: Rate limiting
API calls are rate-limited. Brute-force protection on authentication endpoints.

### AC-SEC-8: Evidence integrity
Evidence files are hashed (SHA-256) at capture. The hash is stored in the fact. Verification compares the stored file's hash with the fact's hash.

---

## 25. Testing architecture

### AC-TEST-1: Unit tests
All business logic has unit tests. Coverage target: 80% for domain logic, 60% overall.

### AC-TEST-2: Integration tests
API endpoints have integration tests. Database operations are tested against a test database.

### AC-TEST-3: E2E tests
Critical user flows have E2E tests: login, check-in, task execution, evidence capture, sync, report viewing.

### AC-TEST-4: Sync tests
Sync conflict resolution has dedicated tests. Deterministic sync is verified by replaying fact sequences in different orders.

### AC-TEST-5: Offline tests
Offline operation is tested by disabling network and verifying all offline-capable operations.

---

## 26. Deployment architecture

### AC-DEP-1: Docker containers
All server components run in Docker containers. Docker Compose for local development. Kubernetes for production (v2).

### AC-DEP-2: CI/CD
GitHub Actions for CI/CD. Tests run on every PR. Deployment is automated on merge to main.

### AC-DEP-3: Database migrations
Database migrations are versioned and run automatically on deployment. Rollback is supported.

### AC-DEP-4: Evidence storage
Evidence files are stored in Cloudflare R2 (or S3). CDN for fast access. Signed URLs for secure access.

---

# PART C — ACCEPTANCE CRITERIA

## 27. Acceptance criteria format

Each acceptance criterion has:
- **ID**: unique identifier (AC-{module}-{number}).
- **Given/When/Then**: the criterion in Gherkin format.
- **Offline**: whether the criterion applies offline.
- **Authority**: the required authority scope.
- **Evidence**: the evidence required to verify the criterion.

---

## 28. Company management acceptance criteria

### AC-CO-1: Company registration
Given a platform admin, when they register a new company with name and details, then the company is created with status active and a CompanyRegistered fact is recorded.
Offline: No. Authority: Platform Admin. Evidence: Company record, fact trail.

### AC-CO-2: Company configuration
Given a company admin, when they update company configuration, then the configuration is saved and a CompanyConfigured fact is recorded.
Offline: No. Authority: Company Admin. Evidence: Updated configuration, fact trail.

### AC-CO-3: Company suspension
Given a platform admin, when they suspend a company, then all company operations are disabled and a CompanySuspended fact is recorded.
Offline: No. Authority: Platform Admin. Evidence: Company status, fact trail.

### AC-CO-4: Tenant isolation
Given two companies, when a user from company A attempts to access company B's data, then access is denied.
Offline: N/A. Authority: N/A. Evidence: Access denied response.

---

## 29. Worker management acceptance criteria

### AC-WM-1: Worker invitation
Given a company admin, when they invite a worker by email or phone, then an invitation is created with status pending and a WorkerInvited fact is recorded.
Offline: No. Authority: Company Admin. Evidence: Invitation record, fact trail.

### AC-WM-2: Worker induction
Given an invited worker, when they accept the invitation and complete induction, then their status changes to inducted and a WorkerInducted fact is recorded.
Offline: No. Authority: Self (with valid invitation). Evidence: Worker record, fact trail.

### AC-WM-3: Worker device registration
Given an inducted worker, when they log in on a new device, then the device is registered and a WorkerDeviceRegistered fact is recorded.
Offline: No. Authority: Self. Evidence: Device record, fact trail.

### AC-WM-4: Worker suspension
Given a company admin, when they suspend a worker, then the worker cannot log in and a WorkerSuspended fact is recorded.
Offline: No. Authority: Company Admin. Evidence: Worker status, fact trail.

### AC-WM-5: Worker role change
Given a company admin, when they change a worker's role, then the worker's authority scope is updated and a WorkerRoleChanged fact is recorded.
Offline: No. Authority: Company Admin. Evidence: Worker record, fact trail.

---

## 30. Project and site management acceptance criteria

### AC-PS-1: Project creation
Given a company admin, when they create a project with name, client, and timeline, then the project is created with status draft and a ProjectCreated fact is recorded.
Offline: No. Authority: Company Admin. Evidence: Project record, fact trail.

### AC-PS-2: Site creation
Given a project manager, when they create a site with geofence and address, then the site is created with status draft and a SiteCreated fact is recorded.
Offline: No. Authority: Project Manager. Evidence: Site record, fact trail.

### AC-PS-3: Work area definition
Given a project manager, when they define a work area with polygon geometry, then the work area is created and a WorkAreaCreated fact is recorded.
Offline: No. Authority: Project Manager. Evidence: Work area record, fact trail.

### AC-PS-4: Asset definition
Given a project manager, when they define an asset with type and geometry, then the asset is created with status planned and an AssetCreated fact is recorded.
Offline: No. Authority: Project Manager. Evidence: Asset record, fact trail.

### AC-PS-5: Site activation
Given a project manager, when they activate a site, then the site status changes to active and a SiteActivated fact is recorded.
Offline: No. Authority: Project Manager. Evidence: Site status, fact trail.

---

## 31. Task management acceptance criteria

### AC-TM-1: Task creation
Given a supervisor, when they create a task with type, description, and assigned assets, then the task is created with status draft and a TaskCreated fact is recorded.
Offline: Yes. Authority: Supervisor. Evidence: Task record, fact trail.

### AC-TM-2: Task assignment
Given a supervisor, when they assign a task to a worker or crew, then the task status changes to assigned and a TaskAssigned fact is recorded.
Offline: Yes. Authority: Supervisor. Evidence: Task record, fact trail.

### AC-TM-3: Task start
Given an assigned worker, when they start a task, then the task status changes to in-progress and a TaskStarted fact is recorded.
Offline: Yes. Authority: Self (assigned worker). Evidence: Task record, fact trail.

### AC-TM-4: Task progress update
Given an assigned worker, when they update task progress, then the progress is recorded and a TaskProgressUpdated fact is recorded.
Offline: Yes. Authority: Self (assigned worker). Evidence: Task record, fact trail.

### AC-TM-5: Task completion
Given an assigned worker, when they complete a task with required evidence, then the task status changes to complete and a TaskCompleted fact is recorded.
Offline: Yes. Authority: Self (assigned worker). Evidence: Task record, evidence, fact trail.

### AC-TM-6: Task verification
Given a supervisor, when they verify a completed task, then the task status changes to verified and a TaskVerified fact is recorded.
Offline: Yes. Authority: Supervisor. Evidence: Task record, fact trail.

---

## 32. Attendance acceptance criteria

### AC-AT-1: QR check-in
Given a worker on-site, when they scan the site QR code, then an AttendanceCheckedIn fact is recorded with worker ID, site ID, timestamp, and geolocation.
Offline: Yes. Authority: Self. Evidence: Attendance record, QR reference, fact trail.

### AC-AT-2: QR check-out
Given a checked-in worker, when they scan the site QR code again, then an AttendanceCheckedOut fact is recorded.
Offline: Yes. Authority: Self. Evidence: Attendance record, fact trail.

### AC-AT-3: Geofence validation
Given a worker outside the site geofence, when they attempt to check in, then the check-in is flagged and an AttendanceFlagged fact is recorded.
Offline: Yes. Authority: Self. Evidence: Flagged attendance record, fact trail.

### AC-AT-4: Attendance verification
Given a supervisor, when they verify a flagged attendance record, then an AttendanceVerified fact is recorded.
Offline: Yes. Authority: Supervisor. Evidence: Verified attendance record, fact trail.

### AC-AT-5: Duplicate check-in prevention
Given a worker who is already checked in, when they attempt to check in again, then the duplicate is flagged.
Offline: Yes. Authority: Self. Evidence: Flagged attendance record.

---

## 33. QA acceptance criteria

### AC-QA-1: QA record creation
Given a supervisor, when they create a QA record against an asset with type and description, then a QARecordOpened fact is recorded.
Offline: Yes. Authority: Supervisor. Evidence: QA record, fact trail.

### AC-QA-2: QA evidence attachment
Given a QA record, when evidence is attached, then a QARecordEvidenceAttached fact is recorded with evidence reference and hash.
Offline: Yes. Authority: Supervisor or Worker (depending on QA type). Evidence: QA record, evidence, fact trail.

### AC-QA-3: QA resolution
Given a supervisor, when they resolve a QA record, then a QARecordResolved fact is recorded.
Offline: Yes. Authority: Supervisor. Evidence: QA record, fact trail.

---

## 34. Blocker acceptance criteria

### AC-BL-1: Blocker raising
Given a worker, when they raise a blocker against an asset or task, then a BlockerRaised fact is recorded with type, description, and severity.
Offline: Yes. Authority: Self. Evidence: Blocker record, fact trail.

### AC-BL-2: Blocker acknowledgment
Given a supervisor, when they acknowledge a blocker, then a BlockerAcknowledged fact is recorded.
Offline: Yes. Authority: Supervisor. Evidence: Blocker record, fact trail.

### AC-BL-3: Blocker resolution
Given a supervisor, when they resolve a blocker, then a BlockerResolved fact is recorded.
Offline: Yes. Authority: Supervisor. Evidence: Blocker record, fact trail.

---

## 35. Evidence acceptance criteria

### AC-EV-1: Evidence capture
Given a worker, when they capture a photo as evidence, then the photo is compressed, hashed (SHA-256), and an EvidenceCaptured fact is recorded.
Offline: Yes. Authority: Self. Evidence: Evidence file, hash, fact trail.

### AC-EV-2: Evidence attachment
Given a fact, when evidence is attached, then an EvidenceAttached fact is recorded linking the evidence to the fact.
Offline: Yes. Authority: Self. Evidence: Evidence reference, fact trail.

### AC-EV-3: Evidence integrity verification
Given an evidence file, when its hash is computed and compared with the hash in the fact, then the hashes match.
Offline: Yes. Authority: Any. Evidence: Hash comparison result.

---

## 36. Sync acceptance criteria

### AC-SY-1: Offline fact recording
Given a worker offline, when they perform an operation, then a fact is recorded locally with sync_state pending.
Offline: Yes. Authority: Self. Evidence: Local fact record.

### AC-SY-2: Fact sync
Given pending facts, when connectivity is restored, then facts are synced to the server and sync_state changes to confirmed.
Offline: N/A. Authority: Self. Evidence: Synced fact records.

### AC-SY-3: Conflict detection
Given conflicting facts, when sync occurs, then the conflict is detected and flagged.
Offline: N/A. Authority: N/A. Evidence: Conflict record.

### AC-SY-4: Deterministic sync
Given the same set of facts, when they are applied in different orders, then the final state is identical.
Offline: N/A. Authority: N/A. Evidence: State comparison.

### AC-SY-5: Sync retry
Given a failed sync, when retry occurs, then the sync is attempted again with exponential backoff.
Offline: N/A. Authority: N/A. Evidence: Sync retry log.

---

## 37. Report acceptance criteria

### AC-RP-1: Progress report generation
Given a project manager, when they generate a progress report for a site, then the report shows asset progress by work area with freshness timestamp.
Offline: No. Authority: Project Manager. Evidence: Report output.

### AC-RP-2: Attendance report generation
Given a supervisor, when they generate an attendance report for a shift, then the report shows worker attendance with verification status.
Offline: No. Authority: Supervisor. Evidence: Report output.

### AC-RP-3: Report export
Given a company admin, when they export a report as CSV, then the export is recorded as a ReportExported fact.
Offline: No. Authority: Company Admin. Evidence: Exported file, fact trail.

### AC-RP-4: Report freshness display
Given a report, when it is displayed, then the freshness timestamp is prominently shown.
Offline: Yes (cached). Authority: Any. Evidence: Report display.

---

## 38. Audit acceptance criteria

### AC-AU-1: Fact trail query
Given a company admin, when they query the audit trail for an entity, then all facts for that entity are returned in chronological order.
Offline: No. Authority: Company Admin. Evidence: Query results.

### AC-AU-2: Fact trail completeness
Given any entity, when its audit trail is queried, then every state change is present as a fact with actor, timestamp, and authority scope.
Offline: No. Authority: Company Admin. Evidence: Query results.

### AC-AU-3: Audit trail immutability
Given the audit trail, when any attempt is made to modify or delete a fact, then the attempt is rejected.
Offline: N/A. Authority: N/A. Evidence: Rejection response.

### AC-AU-4: Audit trail access logging
Given an audit trail query, when it is executed, then an AuditTrailAccessed fact is recorded.
Offline: No. Authority: Company Admin. Evidence: Access log, fact trail.

---

## 39. Map acceptance criteria

### AC-MP-1: Map rendering
Given a site with assets, when the map is displayed, then all assets are rendered with correct geometry and color-coded by lifecycle state.
Offline: Yes (cached). Authority: Any. Evidence: Map display.

### AC-MP-2: Asset tap
Given a map with assets, when a worker taps an asset, then the asset detail panel is displayed with current state, progress, QA status, and blockers.
Offline: Yes. Authority: Any. Evidence: Detail panel display.

### AC-MP-3: Offline map
Given a worker offline, when they open the map, then the cached map tiles and asset geometry are displayed.
Offline: Yes. Authority: Any. Evidence: Map display.

### AC-MP-4: Geofence detection
Given a worker with location services enabled, when they enter or exit a site geofence, then the app detects the transition.
Offline: Yes. Authority: Self. Evidence: Geofence event log.

---

## 40. Non-functional acceptance criteria

### AC-NF-1: App cold start
Given a mid-range Android device, when the app is cold-started, then it is ready for interaction within 3 seconds.
Evidence: Performance measurement.

### AC-NF-2: Map render performance
Given 1000 assets, when the map is rendered, then it renders within 1 second.
Evidence: Performance measurement.

### AC-NF-3: Sync performance
Given 100 pending facts, when sync occurs on 3G, then sync completes within 5 seconds.
Evidence: Performance measurement.

### AC-NF-4: API response time
Given any CRUD API call, when it is executed, then the p95 response time is under 200ms.
Evidence: Performance measurement.

### AC-NF-5: Offline duration
Given a worker offline, when they operate for 7 days without sync, then all operations function correctly and all facts are preserved.
Evidence: Offline operation test.

### AC-NF-6: Zero data loss
Given confirmed facts, when the server restarts, then all confirmed facts are preserved.
Evidence: Data integrity test.

---

## 41. Security acceptance criteria

### AC-SE-1: Unauthenticated access
Given an unauthenticated request, when it attempts to access any API endpoint, then access is denied with 401.
Evidence: API response.

### AC-SE-2: Unauthorized access
Given an authenticated request without required authority, when it attempts an operation, then access is denied with 403.
Evidence: API response.

### AC-SE-3: SQL injection
Given any API endpoint, when malicious SQL is submitted as input, then the input is rejected and no SQL is executed.
Evidence: Security test.

### AC-SE-4: XSS prevention
Given any user input displayed in the web dashboard, when malicious JavaScript is submitted, then the script is not executed.
Evidence: Security test.

### AC-SE-5: Evidence integrity
Given an evidence file, when it is modified after capture, then hash verification fails.
Evidence: Hash comparison.

---

## 42. Integration acceptance criteria

### AC-IN-1: R2/S3 evidence upload
Given a captured evidence file, when it is synced, then it is uploaded to R2/S3 and the fact is updated with the storage URL.
Evidence: Storage record, fact trail.

### AC-IN-2: WebSocket notification
Given a synced fact, when other clients are connected, then they receive a WebSocket notification.
Evidence: WebSocket message.

### AC-IN-3: Redis pub/sub
Given a fact notification, when it is published to Redis, then all subscribed WebSocket servers receive it.
Evidence: Redis pub/sub log.

---

## 43. Deployment acceptance criteria

### AC-DE-1: Docker build
Given the server source code, when it is built as a Docker image, then the image builds successfully and passes all tests.
Evidence: CI/CD pipeline result.

### AC-DE-2: Database migration
Given a database migration, when it is applied, then the schema is updated without data loss.
Evidence: Migration log, schema comparison.

### AC-DE-3: Rollback
Given a deployed version, when rollback is triggered, then the previous version is restored and operational.
Evidence: Rollback log.

---

# PART D — DELIVERY MODEL

## 44. Delivery principles

### 44.1 Milestone-driven delivery
Delivery is organized into milestones. Each milestone has a defined scope, acceptance criteria, and a completion contract. No milestone is started until the previous milestone's contract is satisfied.

### 44.2 Contract-first execution
Every milestone has an execution contract that defines: what will be built, what will not be built, acceptance criteria, test requirements, and the definition of done. The contract is agreed before work begins.

### 44.3 Fact-sourced progress
Progress is measured by facts, not by subjective assessment. A milestone is complete when its acceptance criteria are met and verified by evidence.

### 44.4 No partial completion
A milestone is either complete or not complete. There is no "80% done." Partial progress is tracked at the task level, not the milestone level.

### 44.5 Audit-first reporting
Every milestone report includes: facts recorded, acceptance criteria met, evidence provided, test results, and any deviations from the contract.

---

## 45. Milestone sequence

### M0: Repository archaeology and baseline
Audit the existing repository. Document what exists, what works, what is broken, what is missing. Establish the baseline from which all future work is measured. No new features.

### M1: Foundation and sync engine
Implement the fact store, sync engine, offline queue, and basic Android app shell. The app can record facts locally and sync them to the server. No domain features.

### M2: Company and worker management
Implement company registration, worker invitation, induction, device registration, and role management. Web dashboard for admin operations. Android app for worker login and profile.

### M3: Project, site, and asset management
Implement project creation, site creation, work area definition, asset definition, and map rendering. Web dashboard for configuration. Android app for map viewing.

### M4: Task management
Implement task creation, assignment, progress tracking, completion, and verification. Android app for task execution. Web dashboard for task management.

### M5: QR attendance
Implement QR code generation, check-in/out, geofence validation, and attendance verification. Android app for QR scanning. Web dashboard for attendance overview.

### M6: QA and evidence
Implement QA record creation, evidence capture, attachment, and resolution. Android app for evidence capture. Web dashboard for QA review.

### M7: Blockers
Implement blocker raising, acknowledgment, and resolution. Android app for blocker management. Web dashboard for blocker overview.

### M8: Timesheets
Implement timesheet generation, submission, approval, and rejection. Android app for timesheet viewing. Web dashboard for timesheet approval.

### M9: Reports
Implement progress, attendance, QA, and blocker reports. Web dashboard for report generation and export.

### M10: Audit trail
Implement audit trail query, export, and access logging. Web dashboard for audit trail.

### M11: Hardening
Performance optimization, security audit, accessibility audit, and bug fixes.

### M12: Beta release
Deploy to production. Onboard beta companies. Monitor and fix issues.

---

## 46. Milestone contract template

Each milestone contract defines:

1. **Scope**: what is included and excluded.
2. **Dependencies**: what must be complete before this milestone starts.
3. **Acceptance criteria**: the specific criteria that must be met.
4. **Test requirements**: unit, integration, E2E, and offline tests.
5. **Evidence requirements**: what evidence must be provided.
6. **Definition of done**: the complete checklist for milestone completion.
7. **Report requirements**: what the milestone report must contain.

---

## 47. Milestone completion verification

A milestone is complete when:

1. All acceptance criteria are met and verified.
2. All tests pass.
3. All evidence is provided.
4. The milestone report is complete.
5. The code is merged to main.
6. The deployment is successful.
7. The human approver has signed off.

---

## 48. Change management

### 48.1 Scope changes
Scope changes require a new milestone contract or an amendment to the existing contract. Amendments require human approval.

### 48.2 Architecture changes
Architecture changes require an updated architecture contract. Changes are documented as facts.

### 48.3 Blueprint changes
Changes to this blueprint require a new version. The old version is archived but remains accessible. Changes are documented with rationale.

---

## 49. Quality gates

### 49.1 Code quality
- All code passes linting.
- All code passes type checking.
- All code has adequate test coverage.
- No TODO comments in merged code.

### 49.2 Security quality
- No known vulnerabilities in dependencies.
- All inputs are validated.
- All outputs are sanitized.
- Authentication and authorization are enforced.

### 49.3 Performance quality
- All performance acceptance criteria are met.
- No memory leaks.
- No unnecessary network requests.
- Efficient database queries.

### 49.4 Usability quality
- All usability acceptance criteria are met.
- UI is consistent with design system.
- Error messages are clear and actionable.
- Offline behavior is transparent to the user.

---

## 50. Risk register

### 50.1 Technical risks

**Risk**: Sync conflict resolution is complex and error-prone.
**Mitigation**: Deterministic sync with comprehensive tests. Conflict resolution rules are explicit and tested.

**Risk**: Offline-first is hard to get right.
**Mitigation**: Offline-first is the default, not an afterthought. All features are designed for offline first.

**Risk**: Map performance with large asset counts.
**Mitigation**: Spatial indexing, layer-based rendering, asset clustering at low zoom levels.

**Risk**: QR code security.
**Mitigation**: Time-limited, signed QR codes. No replay attacks. Geofence validation.

### 50.2 Business risks

**Risk**: Adoption resistance from workers.
**Mitigation**: Simple, fast UI. Glove-friendly. Works offline. Minimal training required.

**Risk**: Data privacy concerns.
**Mitigation**: GDPR compliance. Worker data is encrypted. Access is scope-limited. Audit trail is transparent.

**Risk**: Integration complexity.
**Mitigation**: API-first design. Webhook support (v2). Standard data formats.

### 50.3 Operational risks

**Risk**: Server downtime.
**Mitigation**: 99.9% uptime target. Horizontal scaling. Automated failover.

**Risk**: Data loss.
**Mitigation**: Zero data loss for confirmed facts. Automated backups. Point-in-time recovery.

**Risk**: Evidence tampering.
**Mitigation**: SHA-256 hashing. Immutable storage. Integrity verification.

---

## 51. Success metrics

### 51.1 Adoption metrics
- Number of companies registered.
- Number of active workers per company.
- Daily active users.
- Retention rate (30-day, 90-day).

### 51.2 Operational metrics
- Facts recorded per day.
- Sync success rate.
- Sync latency (p50, p95, p99).
- Offline operation duration.

### 51.3 Quality metrics
- Bug rate (bugs per 1000 facts).
- Crash rate (crashes per 1000 sessions).
- QA defect rate.
- Blocker resolution time.

### 51.4 Business metrics
- Revenue per company.
- Customer acquisition cost.
- Customer lifetime value.
- Net promoter score.

---

## 52. Governance

### 52.1 Blueprint governance
This blueprint is the authoritative source for SITE-SYNC. Changes require human approval and a new version. The blueprint is versioned and archived.

### 52.2 Architecture governance
The architecture contract is binding. Deviations require documented rationale and human approval.

### 52.3 Delivery governance
Milestone contracts are binding. Scope changes require human approval. Milestone completion requires human sign-off.

### 52.4 Quality governance
Quality gates are enforced. No code is merged without passing all gates. No milestone is complete without meeting all criteria.

---

## 53. Appendix

### 53.1 Fact type schema
Each fact type has a JSON schema defining its payload structure. Schemas are versioned and stored in the repository.

### 53.2 API specification
The REST API is specified in OpenAPI 3.0 format. The specification is generated from the code and kept up to date.

### 53.3 Database schema
The database schema is defined in Drizzle ORM migrations. The schema is versioned and tested.

### 53.4 Android app architecture diagram
[Diagram placeholder: Android app module dependency graph]

### 53.5 Server architecture diagram
[Diagram placeholder: Server component diagram]

### 53.6 Data flow diagram
[Diagram placeholder: Fact flow from capture to sync to read model]

---

END OF MASTER BLUEPRINT
