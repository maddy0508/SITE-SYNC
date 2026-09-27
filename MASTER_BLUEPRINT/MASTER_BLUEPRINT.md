SITE-SYNC_MASTER_BLUEPRINT.md

Version: 1.0 — FINAL / LOCKED
Status: All sections locked. M0 locked at v1.0.1. Blueprint frozen.
Note: Where a section locked at a base version plus recorded amendments, the amendments are integrated below. The version column in §0.1 records what was actually locked.

---

§0.1 — Version register

Section Locked version
§1 Vision, scope, non-goals v0.1
§2 Roles v0.1
§3 Complete lifecycle v0.1
§4 Onboarding / induction v0.1.1
§5 Definition of Done v0.1
§6.1 Projects & Sites v0.2
§6.2 Map / Site Operating Surface v0.5
§6.3 Workers & Crews v0.9.2
§6.4 Daily Operations / Pre-starts v0.11.1
§6.5 Attendance & Timesheets v0.3 + FORCE_CLOSE + pre-start gating
§6.6 Progress v0.6
§6.7 QA / Evidence / Blockers v0.4 + 2 amendments
§6.8 Communication v0.13.1
§6.9 Reporting v0.12.1
§6.10 Offline / Sync v0.2
§6.11 Administration v0.10.1
§7 Conceptual Data Model v0.7.2 + §6.3/§6.4/§6.9 catalogue amendments
§8 Architectural Constraints v0.8.1
§11 Milestone map provisional / arch-gated
§12 Salvage register partial
M0 Product / Architecture Contract v1.0.1

---

§1 — Vision, scope, non-goals

1.1 What SITE-SYNC is

SITE-SYNC is an Android-first, local-first site-work platform for construction and infrastructure projects. It is the operational surface where a company registers, workers are onboarded and inducted, projects and sites are created, work is assigned and evidenced against a map of physical assets, attendance and timesheets are captured, QA and blockers are recorded, and everything is auditable — including when the device is offline.

1.2 What SITE-SYNC is not

· Not a generic HR system.
· Not a payroll engine (produces timesheet inputs, not payments).
· Not a CAD or design tool.
· Not a chat replacement (communication is contextual).
· Not web-first. Android field use is primary; web/admin is derived.

1.3 Scope of v1

Company registration, worker onboarding and induction, projects and sites, map operating surface, workers and crews, daily operations, QR attendance and timesheets, tasks and progress, QA/evidence/blockers, communication, reporting, offline/sync, administration.

1.4 Non-goals of v1

Multi-tenant billing, marketplace features, third-party payroll integrations, iOS native, desktop native, external API marketplace.

---

§2 — Roles

Five product-level roles. Role ≠ person ≠ company membership ≠ project assignment.

· Worker — performs site work, signs in/out, completes tasks, submits evidence, raises blockers.
· Supervisor — leads a crew on a site, assigns work, verifies attendance, resolves blockers, communicates with workers.
· Company Admin — owns the company account, manages users, roles, projects, documents, and configuration.
· EPC / Client — external stakeholder with read-and-review visibility into assigned projects, progress, and reports.
· Platform Admin — SITE-SYNC operator. Manages tenants, escalation, platform-level configuration. Not a company role.

Capabilities, not roles: Safety Officer, Leading Hand, Project Manager, First Aider, Management Contact are capability flags on a Worker, not first-class roles. They may be promoted only if field requirements demonstrate role-based permissions genuinely need them.

Permissions are evaluated as role × scope × membership.

---

§3 — Complete lifecycle

1. Install — app installed, no account.
2. Company registration — registrant becomes Company Admin.
3. Company setup — profile, branding, required documents, induction templates, project defaults.
4. Project creation — Company Admin creates a project, site, EPC/client association.
5. Worker invitation — worker invited to company (and optionally a project).
6. Worker registration — worker creates an account.
7. Company join — worker associated with the company; profile begins.
8. Document collection — worker uploads required documents, licences, tickets.
9. Company induction — worker completes company-level induction.
10. SWMS / document acknowledgement — worker reads and signs required documents.
11. Project assignment — worker assigned to one or more projects.
12. Project induction — worker completes site/project-specific induction.
13. Site readiness — all gates pass; worker cleared to sign in.
14. Daily operations — pre-start, tasks, evidence, blockers, communication.
15. Attendance — QR sign-in/out, breaks, crew attendance, timesheets.
16. Offline operation — all of the above function without connectivity.
17. Sync — queued actions reconcile with the server.
18. Reporting — attendance, progress, QA, blockers, documents, exports.
19. Renewal — expiring documents and inductions trigger re-verification.
20. Offboarding — worker leaves company or project; access revoked; history retained.

Steps 6–13 are the onboarding/induction vertical (M1).

---

§4 — Onboarding, induction, and readiness

4.1 Two-level model

```text
COMPANY READINESS  +  PROJECT/SITE READINESS  →  SITE READINESS  →  ELIGIBLE FOR SITE OPERATIONS
```

A worker may be: a valid user but not company-ready · company-ready but not project-ready · assigned but not site-ready · site-ready for Site A but not Site B.

4.2 Requirement

Onboarding is not a single state machine. It is a set of Requirements, each with its own type and lifecycle.

Attribute Values
scope company · project · site
applies_to all_workers · role · named_workers
type document · induction · acknowledgement
requires_verification true · false
expiry none · fixed_date · duration_from_satisfaction
revision tracked; a new revision supersedes prior satisfaction

Satisfaction is the record of a specific worker against a specific requirement.

4.3 Three requirement lifecycles

Document (licences, tickets, qualifications, uploaded evidence, permits)

```text
missing → uploaded → under_review → verified | rejected
                                   → expiring_soon → expired → (renewal → uploaded)
```

Documents have administrative verification when requires_verification = true. Self-declared documents move uploaded → verified.

Induction (company induction, site induction)

```text
not_started → in_progress → completed → expired | superseded
```

Completed, not verified. expired by time. superseded by revision.

Acknowledgement (SWMS, safety policy, site rules)

```text
required → presented → acknowledged → superseded | expired
```

Signed, not verified. presented and acknowledged are distinct auditable facts.

4.4 Readiness is derived, not chained

```text
company_ready(worker) :=
    profile_complete(worker)
    AND ∀ requirement R where R.scope = company AND applies(R, worker):
            satisfied(worker, R)

site_ready(worker, site) :=
    company_ready(worker)
    AND ∀ requirement R where R.scope ∈ {project(site), site} AND applies(R, worker):
            satisfied(worker, R)
```

Linear state chains are convenience summaries for UI and gating — never the stored truth.

4.5 Site readiness gate

A worker may sign in to a site only if site_ready(worker, site) holds and no applicable requirement is expired or rejected. Every block returns the specific failing requirement(s) — never a generic error.

4.6 Renewal and supersession

· expiring_soon triggers worker notification at configured threshold.
· expired removes site_ready and blocks new sign-ins.
· Renewal re-enters only that requirement at uploaded (document) or not_started (induction).
· A new requirement revision supersedes prior satisfaction without resetting unrelated requirements.

4.7 Invariants

· INV-1 — No worker is site_ready without all applicable company, project, and site requirements satisfied.
· INV-2 — No sign-in for a worker with any applicable requirement expired or rejected.
· INV-3 — Every satisfaction, verification, acknowledgement, expiry, and supersession is attributed and auditable.
· INV-4 — Readiness state is reconstructible from the audit trail alone.
· INV-5 — Offline requirement actions are durable and reconcile without silent loss.
· INV-6 — Readiness is derived from requirements; no requirement's lifecycle is forced into another's.

4.8 Open decisions

· requires_verification per-requirement or per-type default. Draft: per-requirement, with type defaults.
· Requirement revisions as versioned documents or timestamped records. Draft: timestamped records.
· Project induction at project scope when a project has one site. Draft: always site scope, even single-site.

---

§5 — Definition of Done

5.1 DoD — Task

Implemented against an acceptance test that existed before implementation. Test passes. No regressions. Evidence attached.

5.2 DoD — Feature

All task DoDs met. Offline behaviour specified and verified (or explicitly marked online-only with justification). Error and empty states implemented. Audit events emitted where the feature mutates state. Adversarial audit completed.

5.3 DoD — Milestone

All features complete. End-to-end acceptance tests pass. Offline/sync reconciliation verified for every state mutation. Evidence bundle produced. Salvage register updated. Next milestone execution contract drafted.

5.4 DoD — Release

All milestones complete. Android field validation passed on real devices, real connectivity. Security and tenant-isolation review passed. Data model and API contracts frozen. Rollback plan documented and rehearsed.

5.5 Product invariants gating all DoD layers

· INV-A — Every user-visible action has a defined offline behaviour.
· INV-B — Every state mutation is auditable.
· INV-C — No feature ships without a test that predates its implementation.
· INV-D — Existing code enters only via the salvage register, citing a blueprint requirement and a test.
· INV-E — Tenant data isolation is verified, not assumed.

---

§6.1 — Projects & Sites

6.1.1 Invariants

· PS-INV-1 — Containment. Every Site belongs to exactly one Project. Every Project belongs to exactly one Company. No Site exists without a Project.
· PS-INV-2 — Non-empty. Every active Project has at least one Site. A Project with zero Sites may exist only in draft.
· PS-INV-3 — Assignment is explicit. A worker's presence on a Project is distinct from presence on a Site. Neither is inferred from the other.
· PS-INV-4 — Readiness is per-site. A worker's site readiness is always computed against a specific Site. There is no "project-ready" implying "site-ready".
· PS-INV-5 — Historical immutability. Attendance, evidence, QA records, and audit events recorded against a Site remain attached to that Site even after suspension, closure, or archival.
· PS-INV-6 — External parties are first-class. EPC/client and subcontractor relationships are entities, not free-text fields.
· PS-INV-7 — Handover is a state transition, not an export. Handover produces a permanent auditable record and freezes certain operational mutations.
· PS-INV-8 — Lifecycle transitions are attributed and auditable.
· PS-INV-9 — Site requirements are scoped to sites.

6.1.2 Operational requirements

Company → Project → Site. A Site cannot be reassigned to a different Project. A Project's Sites are visible at the Project level; operations are Site-scoped.

External parties. EPC/client and subcontractor are Company-scoped ExternalParty records, referenced per Project. Not Companies in SITE-SYNC.

Assignment. ProjectAssignment grants visibility/eligibility; SiteAssignment places a worker on a Site. Assignment states: assigned, active, paused, removed.

Permissions. Evaluated as role × scope × project/site membership. Not stored as a single access level.

6.1.3 Product behaviour

Project lifecycle

```text
draft → active → suspended → active (resumed)
                → completed → archived
draft → cancelled
```

Site lifecycle

```text
planned → mobilising → active → demobilising → closed → archived
```

Suspension. A suspended Site blocks new sign-ins immediately. Workers with in-progress shifts are not forcibly signed out. In-progress QA and evidence continue. Unsuspending returns to prior state.

Closure. Sign-in rejected with reason "Site closed." Closure marks assignments removed with reason "site closure."

Transfer. Platform Admin may transfer a Project between Companies. Transfer creates a new Project record with a new identity; copies Sites, requirements, active assignments; does not copy historical attendance/evidence/QA — those remain with the original Project. Records a TransferEvent referencing both.

Site-level transfer is not permitted.

Handover. Freezes a defined set of data as of a timestamp; produces a permanent handover record; does not prevent later operational activity.

Multi-site projects. Requirements may be scoped Company / Project / Site. A worker may be site-ready at one Site and not another within the same Project. Reporting aggregates but always allows drill-down.

Readiness interaction. Site readiness is derived from requirements scoped to the Site, its parent Project, and the parent Company. A Project-level requirement applies to all its Sites unless explicitly opted out at Site scope. Default: apply.

6.1.4 Conceptual model

Source-of-truth entities: Company, Project, Site, ExternalParty, ProjectExternalParty, ProjectAssignment, SiteAssignment, Requirement, HandoverRecord, TransferEvent, LifecycleEvent.

Derived: Project's active workers, Site readiness gate, Project operational status summary, Worker project visibility.

No derived entity is authoritative.

6.1.5 Failure and recovery

Site created against wrong Project cannot be moved — closed and recreated. Transfer of an active Project is rejected; Sites must be suspended first. Handover records are not invalidated by later state changes. Site closure with open shifts is blocked until shifts are closed or force-closed with reason.

6.1.6 Audit requirements

Project and Site lifecycle events; TransferEvent; assignment state changes; ExternalParty changes; Requirement changes; HandoverRecord. All carry actor, timestamp, reason where applicable.

6.1.7 Acceptance criteria

AC-PS-1 through AC-PS-7.

6.1.8 Open decisions

ExternalParty sharing across Companies. Joint ventures (draft: no). Handover per-site vs per-project. Suspension retroactivity. Archival as distinct state vs flag.

---

§6.2 — Map / Site Operating Surface

6.2.1 Invariants

· MAP-INV-1 — Site-scoped. Every asset belongs to exactly one Site.
· MAP-INV-2 — Stable identity. Asset identity stable across position, geometry, name changes.
· MAP-INV-3 — Geometry is captured, not corrected. Never silently corrected; re-survey is a new event referencing prior geometry.
· MAP-INV-4 — Asset registration is structural. Requires connectivity in v1.
· MAP-INV-5 — Asset state is derived, not stored.
· MAP-INV-6 — The map view is derived.
· MAP-INV-7 — Worker location context is an explicit fact. Selected asset / Site-wide / unknown. Never inferred silently from GPS.
· MAP-INV-8 — Field actions are offline-capable on cached assets.
· MAP-INV-9 — Asset lifecycle is attributed and auditable.
· MAP-INV-10 — Asset deletion is soft.
· MAP-INV-11 — Site closure does not invalidate assets.
· MAP-INV-12 — Asset taxonomy is extensible but typed. New types require blueprint amendment.

6.2.2 Operational requirements

Operating surface provides spatial view, list view, asset selection, aggregate Site state, worker position.

Asset hierarchy

```text
Company → Project → Site → WorkArea (optional) → Asset
```

Taxonomy (v1): PILE, FOOTING, COLUMN, SPAN, AREA, POINT, LINE. Type determines geometry class. Type is immutable after creation.

Tracker deferred (ambiguous term; see open decisions).

Geometry: Point (lat/lon, optional altitude, accuracy radius), Line (vertices), Area (closed vertices). Captured at registration by GPS, manual placement, or import (deferred). Immutable as fact; re-survey appends.

Worker location context: selected asset / Site-wide / unknown. GPS may suggest, not set.

Map interaction: pan, zoom, select by tap, filter by type, filter by derived state, locate self, view assigned asset. Multi-select deferred.

Field actions: view derived state, capture evidence, raise QA, raise blocker, task actions, view history. None mutate the asset.

6.2.3 Product behaviour

Asset lifecycle

```text
registered → active → retired
                    → re-surveyed (identity persists)
active → suspended → active
any → archived (terminal)
```

GPS semantics — three distinct facts: (1) asset geometry — captured once or re-surveyed; (2) evidence location — captured at moment of capture; (3) worker live location — ephemeral, not persisted as fact. "Locate me" uses (3) for display only.

Offline-capable: view cached assets, select assets, view cached derived state, capture evidence, raise QA/blocker, task actions, locate me.

Connectivity-required: register asset, re-survey geometry, retire/suspend/archive asset, import geometry, view uncached assets, cross-Site views.

Cache freshness. Staleness indicated per asset ("last synced 2h ago"); stale data never presented as current.

6.2.4 Conceptual model

Source-of-truth: WorkArea, Asset, AssetGeometryEvent, AssetLifecycleEvent, AssetWorkAreaAssignment.

Derived: current geometry, current lifecycle, current WorkArea membership, progress, QA state, blocker state, map render, list render.

6.2.5 Failure and recovery

GPS unavailable → registration blocked. GPS inaccurate → accuracy recorded, correction is re-survey. Wrong coordinates → re-survey supersedes. Offline registration → rejected locally. Asset archived → context downgrades to Site-wide. Stale cache → indicated. Retired asset action → rejected locally. Site switched → context cleared. Duplicate registration → applied once. GPS disagrees with geometry → both preserved.

6.2.6 Audit requirements

Every asset event records: asset identity, command identity, actor, device identity, device timestamp, server sync timestamp, event type, payload. Freshness presentation records asset identity, last confirmed sync, what is stale.

6.2.7 Acceptance criteria

AC-MAP-1 through AC-MAP-14.

6.2.8 AC-04 reconciliation

NOT PRESENT. No map/asset/geometry/GPS/spatial domain implementation in AC-04. Roadmap references only.

6.2.9 Open decisions

Tracker definition. WorkArea in v1 (draft: optional). Geometry import format. Map tile offline availability. GPS accuracy threshold. Multi-select. Asset naming conventions. Re-survey authority. Map rotation. Worker live location persistence (draft: no). Cross-Site asset reference (draft: no).

---

§6.3 — Workers & Crews

6.3.1 Invariants

· WC-INV-1 — Person is Platform-scoped and stable.
· WC-INV-2 — Worker is a Company-scoped membership. Has its own identity; does not replace Person.
· WC-INV-3 — No duplicate human identity. One human is one Person.
· WC-INV-4 — Assignment is explicit and tripartite. ProjectAssignment, SiteAssignment, CrewMembership are distinct. None implies another.
· WC-INV-5 — Crew is Company-scoped and reusable. CrewSiteAssociation is separate and Site-scoped.
· WC-INV-6 — Worker profile is derived from creation fact plus profile-change events.
· WC-INV-7 — WorkerQrIdentity is identity-bearing and Company-scoped. At most one active per Worker. Offboarded or revoked Worker has zero. Rotation creates new identity, retires prior; Worker identity unchanged.
· WC-INV-8 — Capabilities are flags, not roles.
· WC-INV-9 — Deactivation is not deletion.
· WC-INV-10 — QR is identity, not authorisation.
· WC-INV-11 — Actor/subject distinction preserved.
· WC-INV-12 — Communication identity is not authorisation.
· WC-INV-13 — Worker lifecycle is derived.

6.3.2 Operational requirements

Person → Worker. Person created at invitation creation (if invited by reference) or at invitation acceptance. Worker created at the registered transition. A Person may be a Worker in multiple Companies. Not two simultaneous memberships in the same Company.

Invitation lifecycle

```text
pending → accepted → (Worker creation)
        → cancelled
        → expired
```

Worker lifecycle

```text
registered → active → suspended → active (resumed)
                    → offboarded (terminal)
```

Worker profile fields (Company-scoped): display name, contact phone, contact email, photo, capabilities, role label, management contact reference.

Role label (Worker / Supervisor / Company Admin) is descriptive membership metadata. Never consulted for permission or capability evaluation.

Capabilities (Company-scoped, granted/revoked by Company Admin, attributed): supervisor, first_aider, management_contact (v1); others deferred.

Crew. Company-scoped E entity, reusable across Projects and Sites. Crew membership is a distinct relationship. CrewSiteAssociation is a separate Site-scoped relationship.

Assignment model

```text
ProjectAssignment    Worker × Project
SiteAssignment       Worker × Site
CrewMembership       Worker × Crew (Company-scoped)
CrewSiteAssociation  Crew × Site
```

WorkerQrIdentity. Company-scoped E entity. Encodes a reference to the QR identity; resolving yields the Worker. Rotation retires current and creates new. Revocation retires without replacement. At most one active per Worker.

Communication. Contact fields are profile data. WhatsApp handoff is a UI affordance, not an integration.

6.3.3 Product behaviour

Worker registration. Connectivity-required. Existing Person linked; new Worker identity created for the new Company.

Worker activation. Automatic on registration unless Company Admin holds in registered state for review.

Assignment management. Created by Supervisor or Company Admin with authority. Removal is a state change, not deletion. A removed assignment is not reusable; a new assignment creates a new identity.

Site readiness interaction. Requires company readiness, all scoped requirements satisfied, and SiteAssignment (active or assigned). ProjectAssignment alone, CrewMembership alone, CrewSiteAssociation alone do not satisfy readiness.

Capability attribution. Grant/revoke attributed. Revocation does not retroactively invalidate prior actions.

QR behaviour. Scanning resolves to Worker identity. Scanning does not itself record attendance, grant readiness, or authorise any action.

QR rotation race (deterministic). QR identity lifecycle: active → retired. Retirement is server-authoritative once accepted. Before retirement is server-authoritative: resolution proceeds. After: new resolution rejected with "QR retired." A scan that resolved before retirement carries the pre-retirement QR identity; the requested action's validity is determined by authorisation at the point of action, not by the QR's later state.

QR atomicity. Creation/rotation atomic with respect to at-most-one-active. Rotation is a single atomic operation (create new + retire prior). No observable two-active or zero (while QR-enabled and not offboarded). Enforced server-side. Concurrent rotations resolved by server ordering; loser rejected with reason.

Offline-capable: view own profile, cached crew memberships, cached SiteAssignments and readiness, present own QR, scan a cached Worker QR.

Connectivity-required: registration, invitation, assignment creation/pause/resume/removal, crew creation and membership, capability grant/revoke, QR rotation/revocation, lifecycle transitions.

Suspended Worker: cannot initiate new Worker actions; cannot be assigned new work; existing artifacts may be administered by authorised actors; open shifts continue until explicitly closed; Crew memberships retained; QR retained unless revoked.

Offboarded Worker: all assignments and memberships ended; CrewSiteAssociations unaffected; open shifts must be closed or force-closed with reason; pending tasks reassigned or cancelled; pending CompletionClaims preserved and remain verifiable; QR retired; historical facts preserved; Person preserved.

Pending CompletionClaims on offboarding. Preserved as immutable F records. Remain verifiable by authorised actors. May be rejected or reversed by normal authority. Cannot be withdrawn by the offboarded Worker; only a Company Admin may withdraw on their behalf with mandatory reason. Surfaced to Company Admin in the offboarding checklist; resolution not time-limited.

Person continuity. A Person's Worker memberships across Companies are independent. Company A cannot see Company B's profile, contact, or activity.

6.3.4 Conceptual model

Source-of-truth: Person (E, Platform), Worker (E, Company), WorkerProfileChange (F), WorkerLifecycleEvent (F), CapabilityGrant (F), ProjectAssignment (E), SiteAssignment (E), Crew (E, Company), CrewMembership (E, Company), CrewSiteAssociation (E, Site), WorkerQrIdentity (E, Company), WorkerQrIdentityEvent (F), Invitation (F).

Crew lifecycle: created → active → archived. Archival terminal; memberships and associations must be ended before archival. Archival attributed; history queryable.

CrewSiteAssociation lifecycle: active → removed. Removal does not affect CrewMemberships or SiteAssignments.

Relationship-entity rule. A relationship is E if it has state independent of its endpoints; otherwise F or D.

Derived: current Worker lifecycle, current profile, current capabilities, current Crew memberships, current assignments, readiness, active QR identity, Crew members, Crew Site associations.

6.3.5 Failure and recovery

Registration offline → rejected. Duplicate invitation → rejected. Duplicate registration → idempotent. Person exists elsewhere → linked, new Worker created. Assignment against non-cached Site → rejected. QR scan of non-cached Worker → rejected. Crew archival with active memberships → blocked. Offboarding with open shift → blocked. Suspended while on-shift → shift continues; next check-in blocked. Concurrent offboarding + verification → both preserved. QR rotation while old QR scanning → deterministic per §6.3.3.

6.3.6 Audit requirements

Every Worker-lifecycle, assignment, capability, and QR event records: event identity, command identity, event type, subject, actor, device identity, device timestamp, server sync timestamp, reason (mandatory for suspension, offboarding, capability revocation, assignment removal, QR revocation), payload.

6.3.7 Acceptance criteria

AC-WC-1 through AC-WC-15.

6.3.8 AC-04 reconciliation

PARTIAL — extraction completed. No RETAIN. Results:

Artifact Disposition
authService.ts REFERENCE — session boundary only
identityService.ts REFERENCE — organisation-scoped, conflicts WC-INV-1/2
projectContext.ts REFERENCE — no SiteAssignment
deviceRegistrationService.ts FREEZE — pending §7 Device physical representation
persons migration REFERENCE — organisation-scoped
company_memberships REFERENCE — precursor, not Worker E
project_assignments REFERENCE — no SiteAssignment, ACTIVE/INACTIVE only
QR parser / validation / camera mechanics SALVAGE (mechanism only)
QR identity model NEW
QR rotation/revocation NEW
Crew model NEW
QR tests SALVAGE test mechanics only; INV-C requires new tests

Critical note: CompanyMembership is not renameable to Worker without silently preserving the organisation-scoped identity model. That leak is prohibited.

6.3.9 Open decisions

Capability set (draft: supervisor, first_aider, management_contact). Multiple Crew memberships (draft: yes). CrewSiteAssociation authority. Emergency contact fields (draft: deferred). Photo storage. Person self-registration (draft: no). Cross-Company Person merge (draft: no). QR format (draft: opaque token). QR rotation trigger (draft: manual only). Worker reactivation (draft: new Worker identity). Crew archival semantics. Communication endpoints (draft: WhatsApp handoff only). Invitation delivery (draft: deferred).

CLOSED — Offboarding open-shift force-close authority: Company Admin only. Supervisor cannot. Reason mandatory. Produces AttendanceEvent type FORCE_CLOSE.

---

§6.4 — Daily Operations / Pre-starts

6.4.1 Invariants

· DO-INV-1 — Pre-start is a Site-scoped daily event.
· DO-INV-2 — Pre-start is a fact, not a state. Immutable once submitted; corrections are additive.
· DO-INV-3 — Attendance at pre-start is explicit.
· DO-INV-4 — Pre-start attendance is not shift attendance.
· DO-INV-5 — Pre-start content is versioned and referenced.
· DO-INV-6 — Acknowledgement at pre-start is a §4 acknowledgement with pre-start presenting context.
· DO-INV-7 — Pre-start completion is derived.
· DO-INV-8 — Pre-start is offline-capable for participants.
· DO-INV-9 — Pre-start content definition is connectivity-required; acknowledgement is offline-capable if cached.
· DO-INV-10 — Pre-start is attributable.
· DO-INV-11 — Daily operations are not a second task system.
· DO-INV-12 — Site readiness gates pre-start participation.
· DO-INV-13 — Daily state is derived.

6.4.2 Operational requirements

Pre-start: Site (required), work date, presenter, content reference, participant list, acknowledgement set.

Content: versioned Site-scoped items — safety briefing, hazard notes, site-specific requirements, named acknowledgements, optional environmental notes. Each content set has a version identity. Revisions do not retroactively affect prior pre-starts.

PreStartContent is a single E entity per Site. Revisions are immutable PreStartContentRevision F records. No second identity per revision.

Participant recording. Individually by Worker identity. Must be site_ready at time of recording. Offline recording validated locally against cached readiness; server revalidates on sync; a server rejection surfaces as a CommandOutcome and does not silently delete the recording.

Presenter. Supervisor (capability), Company Admin, or Worker with supervisor capability.

Acknowledgements. §4.3 Acknowledgement with pre-start context. Offline-capable if cached. Duplicate for same content item / same work date / same Worker is idempotent.

6.4.3 Product behaviour

Authoritative model

```text
PreStart identity + creation fact + PreStartLifecycleEvent facts + PreStartCorrection facts
= derived current condition
```

corrected is a derived predicate (≥1 PreStartCorrection referencing a closed PreStart), not a state.

Derived pre-start completion

```text
pre_start_complete(site, work_date) :=
    ∃ closed PreStart for (site, work_date)
    AND every required content item has ≥1 acknowledgement per participant
    AND no participant is missing a required acknowledgement
```

Site configuration (C-class): pre_start_required_before_check_in (draft: default false), pre_start_content_required_for_all (draft: all), pre_start_presenter_min_capability (draft: supervisor).

Offline-capable: present against cached content, record cached and site-ready participants, acknowledge cached content, view cached derived daily state.

Connectivity-required: define/revise content, close pre-start server-side, corrections, cross-site queries, content library changes.

Corrections. PreStartCorrection is additive; does not mutate original participant list or acknowledgement set. Corrected views are derived.

Conflict semantics. Participant recording additive; duplicate idempotent. Acknowledgement additive, idempotent per (worker, content item, work date). Closure: first accepted wins; second rejected; corrections are the mechanism. Content revision does not affect open or closed pre-starts.

Site state snapshot. Derived from §6.5, §6.6, §6.7, §6.4. Freshness-annotated per element.

6.4.4 Conceptual model

Source-of-truth: PreStartContent (E, Site), PreStart (E, Site), PreStartContentRevision (F), PreStartContentItem (F), PreStartLifecycleEvent (F), PreStartParticipant (F), PreStartCorrection (F), DailyLogEntry (F, modelled as §6.7 Note evidence).

PreStartAcknowledgement is not a separate fact type — it is a §4.3 Acknowledgement with pre_start_context.

Derived: pre-start completion, Site daily state, participant acknowledgement matrix, presenters and participants.

6.4.5 Failure and recovery

Participant not site-ready → rejected with specific failing requirements. Content not cached offline → presenting blocked. App killed after draft → committed draft preserved; uncommitted text best-effort. Duplicate acknowledgement/closure → idempotent. Closure rejected server-side → notified, correction path provided. Content revised while pre-start open → open pre-start retains version. Presenter capability revoked mid-pre-start → closure by former presenter rejected.

6.4.6 Audit requirements

Every pre-start-related F record carries: event identity, command identity, event type, subject, actor, device identity, device timestamp, server sync timestamp, reason (mandatory for corrections and excluded participants), payload.

6.4.7 Acceptance criteria

AC-DO-1 through AC-DO-14.

6.4.8 AC-04 reconciliation

EXTRACTION REQUIRED — not performed. Expected: NOT PRESENT.

6.4.9 Open decisions

Pre-start required before check-in (default false). Content authorship. Presenter minimum capability. Bulk acknowledgement (draft: not in v1). Correction window. Templates (draft: not in v1). Daily log retention. Language (English only). Weather capture (separate evidence). Pre-start attendance export. Presenter geographic presence (not enforced).

---

§6.5 — Attendance & Timesheets

6.5.1 Invariants

· AT-INV-1 — Site-scoped. Every attendance event references exactly one Site.
· AT-INV-2 — Subject and actor are distinct.
· AT-INV-3 — Events are immutable.
· AT-INV-4 — Attendance events are the source of truth. Timesheets are derived.
· AT-INV-5 — Readiness gate is enforced at event creation.
· AT-INV-6 — Offline attendance has deterministic behaviour.
· AT-INV-7 — Provenance is complete.
· AT-INV-8 — Corrections are additive and attributed.
· AT-INV-9 — Attendance events are causally ordered. Check-out cannot precede its check-in; break-end cannot precede break-start; overlapping shift segments for the same worker are prohibited. Violations rejected before commit where determinable, and explicitly rejected/surfaced at sync where only server state can establish the violation.
· AT-INV-10 — Duplicate commands apply once.
· AT-INV-11 — Readiness expiry does not retro-terminate.
· AT-INV-12 — Timesheet approval is a state, not a mutation.

6.5.2 Operational requirements

Event types (v1): CHECK_IN, CHECK_OUT, BREAK_START, BREAK_END, CORRECTION, FORCE_CLOSE.

FORCE_CLOSE — administrative termination of an open shift without the subject's check-out. Actor ≠ subject. Mandatory reason. References the open shift's most recent CHECK_IN (or BREAK_START).

Who can record: Self; QR scan (self); QR scan (proxy — Supervisor or Company Admin); Manual proxy (Supervisor, reason required); Correction (authorised actor).

Site scoping. Bound to a Site at creation. Multiple Sites requires selection. Unavailable Site shown with specific failing requirements.

Unique worker QR. Encodes identity, not action. Not a session token.

Timesheets. Derived view over events for subject × Site × work date window. Shows total worked minutes, break minutes, first check-in, last check-out, corrections with attribution. Not editable.

Corrections. Additive events referencing prior events. Intents: adjust_time, void_event, add_missing_event, reassign_site.

Approvals. submitted → approved or rejected, attributed. A correction after approval moves back to pending_review.

6.5.3 Product behaviour

Shift state (derived): not_present → on_shift → on_break → on_shift → not_present. Derived from events, not stored. Simultaneous on_shift at two Sites rejected.

Event acceptance rules. Check-in requires site_ready, not_present at X, not on_shift elsewhere, and, if pre_start_required_before_check_in = true, pre_start_complete(site, work_date). Check-out requires on_shift or on_break at X and timestamp ≥ most recent check-in. Break start/end per state. Correction requires authority and non-violation.

Work date. OPEN — draft default: Site local timezone, cross-midnight bound to check-in work date. Resolution gate: before M6.

Multi-shift days permitted (split shifts); segments summed; overlaps rejected.

Cross-midnight shift belongs entirely to the check-in work date.

Readiness interaction. Checked at check-in only. Expiry mid-shift permits subsequent events. Suspension mid-shift: shift continues; new check-ins blocked.

Offline-capable: check-in/out, break start/end, view current shift state, view own timesheet, correction authoring by Supervisor with cached referenced event.

Connectivity-required: timesheet approval, correction of non-cached events, cross-Site/cross-day reconciliation views.

Conflict semantics. Same worker, same field, later timestamp → later wins for derived state, both events preserved. Shift boundaries → local rejection if causality violated; if only discovered at sync, server rejection with reason. Corrections → applied in actor-performed order.

Timesheet approval lifecycle

```text
open → submitted → approved
                 → rejected → open
```

6.5.4 Conceptual model

Source-of-truth: AttendanceEvent, CorrectionEvent, WorkerQrIdentity, SiteShiftBoundaryConfig, TimesheetApprovalEvent.

Derived: current shift state, segment, worked minutes, timesheet, timesheet approval state, attendance summary.

6.5.5 Failure and recovery

Not site-ready → rejected with requirements. Already on_shift elsewhere → rejected. Offline + crash → preserved. Duplicate → once. Server rejection → surfaced, preserved as rejected record. Clock drift → server rejects, correction path provided. Readiness expires mid-shift → continues. Site suspended mid-shift → continues. Offline approval attempt → rejected locally.

6.5.6 Audit requirements

Every event: event identity, command identity, subject, actor, source (SELF / QR_SELF / QR_PROXY / MANUAL_PROXY / CORRECTION), Site, device identity, device timestamp, server sync timestamp, type, correction reference, reason (mandatory for MANUAL_PROXY and CORRECTION).

Every rejection: command identity, attempted action, reason, actor notification timestamp, actor subsequent action.

Every approval: timesheet identity, actor, action, reason (mandatory for rejected), timestamp.

6.5.7 Acceptance criteria

AC-AT-1 through AC-AT-12.

6.5.8 AC-04 reconciliation

Area Treatment
Commands CHECK_IN / CHECK_OUT MODIFY (add BREAK, CORRECTION, FORCE_CLOSE)
Identity commandId + eventId ACCEPT
ProjectAssignment REJECT
Scope project/person/work-date MODIFY → Site-scoped
Sources SELF, QR_SCAN MODIFY (add QR_PROXY, MANUAL_PROXY, CORRECTION)
Local commit atomicity MODIFY (timesheet derived, not committed)
Offline check-in/out ACCEPT
State CHECKED_IN/OUT MODIFY → derived
Revision current/baseRevision FREEZE — §6.10 concern
Duplicate command ACCEPT
Ordering ACCEPT
Authorization MODIFY (add site_ready check)
QR proxy ACCEPT
Timesheet first-in/last-out MODIFY
Provenance MODIFY (add site; drop org)
Work date from UTC REJECT
Server rejection ACCEPT
Restart persistence ACCEPT

Three REJECTs, six MODIFYs, nine ACCEPTs.

6.5.9 Open decisions

Work date rule (OPEN). Break model (unpaid only). Proxy authority (Supervisor + Admin). Correction authority. Correction window. Approval requirement. Split-shift cap. Multiple Sites per day.

---

§6.6 — Progress

6.6.1 Invariants

· PR-INV-1 — Progress is derived. Asset never stores complete = true.
· PR-INV-2 — Completion is claimed, then verified.
· PR-INV-3 — Claims and verifications are immutable.
· PR-INV-4 — Progress is asset-scoped.
· PR-INV-5 — Quantities are first-class.
· PR-INV-6 — Critical blockers gate progress.
· PR-INV-7 — Task and asset are distinct.
· PR-INV-8 — Verification authority is declared, not inferred.
· PR-INV-9 — Over-claim is surfaced, never silent.
· PR-INV-10 — Offline progress capture is deterministic.
· PR-INV-11 — Aggregate progress is derived.
· PR-INV-12 — Evidence requirements are per-requirement, not universal.

6.6.2 Operational requirements

Task. References subject (asset / WorkArea / Site), assignee, optional window, scope description. Lifecycle: created → assigned → accepted → in_progress → complete / paused / cancelled / reassigned. Task completion is operational, not authoritative for progress.

Completion claim. Asset identity, claimer, quantity claimed, method, evidence refs, optional task ref, device timestamp. Full or partial.

Verification. Claim ref, verifier, outcome (accepted/rejected), reason (mandatory for rejection), evidence refs, timestamp.

Reversal. Prior event ref, actor, reason (mandatory).

Quantities. Where target quantity exists: unit and value. verified_quantity = sum(verified_claim.amount); progress = verified_quantity / target_quantity. Where no target: discrete (not_started / claimed / complete).

Authority. Worker can claim, withdraw own; Supervisor can verify, reject, reverse (Site), create/assign/cancel task; Company Admin can do all (Company scope).

Aggregate progress. WorkArea ← assets; Site ← WorkAreas/assets; Project ← Sites. Always computed.

6.6.3 Product behaviour

Derived asset progress states: not_started, in_progress, pending_verification, complete, disputed.

Claim acceptance. Asset active; claimant assigned or scoped; task window respected; rejected if CRITICAL blocker open; rejected if would exceed target without explicit over-claim flag and reason; accepted otherwise.

Verification acceptance. Verifier authority; claim not already verified/rejected; evidence requirements satisfied; rejected if CRITICAL blocker raised since claim; accepted otherwise.

Reversal. Moves to disputed; notifies verifier and claimer; resolution is reversal_upheld or reversal_dismissed, both attributed.

Task / progress interaction. Task completion operational; claim verification authoritative for progress. Task may be complete while asset in_progress; asset may be complete while task in_progress.

Offline-capable: task creation against cached assets/workers, task transitions, claim raise and withdraw, evidence attachment, viewing own claims/tasks/cached states.

Connectivity-required: claim verification, rejection, reversal raise/uphold/dismiss, cross-Site assignment, task creation against non-cached assets.

Conflict semantics. Claims additive; task transitions later wins; verifications single (concurrent second rejected); reversals additive and independently resolved; reassignment later wins.

6.6.4 Conceptual model

Source-of-truth: Task, TaskTransition, TaskAssignment, CompletionClaim, CompletionClaimWithdrawal, CompletionVerification, Reversal, ReversalResolution.

Derived: claimed quantity, verified quantity, asset progress state, task state, task assignee, WorkArea/Site/Project progress, Site punch list.

6.6.5 Failure and recovery

Offline claim → durable, queued. App killed → preserved. Duplicate → once. Server rejection → surfaced with reason. Critical blocker after claim before verification → verification rejected. Critical blocker after verification → progress remains; further claims blocked. Concurrent claims → both preserved; over-claim surfaced. Claim rejected, disputed → new claim referencing prior. Reversal dismissed → claim remains verified. Target quantity changed → not permitted on active assets. Aggregate with stale cache → staleness surfaced.

6.6.6 Audit requirements

Every progress event: event identity, command identity, type, subject, actor, device identity, device timestamp, server sync timestamp, payload (quantity, reason, evidence refs, prior event refs). Every rejection records command identity, attempted action, reason, notification timestamp, subsequent action.

6.6.7 Acceptance criteria

AC-PR-1 through AC-PR-14.

6.6.8 AC-04 reconciliation

CLOSED — NOT PRESENT. No progress/task/completion-claim implementation in AC-04. COMPLETE matches in attendance code refer to timesheet completion, not work progress. claim matches in sync code refer to command claiming, not completion claims.

6.6.9 Open decisions

Target quantity change (no). Over-claim handling (permitted with reason). Discrete asset completion (first verified full claim). Verification requirement (always). Partial verification (no). Reversal window (none in v1). Reversal authority for original verifier (yes, with reason). Task without asset (yes). Crew-level task (yes). Task-level progress display (yes, separate). Punch list (derived view). Progress on archived assets (excluded). Cross-Site task assignment (no).

---

§6.7 — QA / Evidence / Blockers

6.7.1 Invariants

· QA-INV-1 — Evidence is immutable.
· QA-INV-2 — Evidence is attributed.
· QA-INV-3 — Evidence is Site-scoped.
· QA-INV-4 — Location is captured, not corrected.
· QA-INV-5 — QA state is derived, not stored.
· QA-INV-6 — Blocker state is derived, not stored.
· QA-INV-7 — Blocker resolution requires attribution.
· QA-INV-8 — Critical blockers gate progress claims.
· QA-INV-9 — Verification is a distinct act from submission.
· QA-INV-10 — Evidence capture is offline-capable.
· QA-INV-11 — QA and blocker state transitions are attributed and auditable.
· QA-INV-12 — Corrections are additive.
· QA-INV-13 — Blocker assignment is explicit.
· QA-INV-14 — Evidence is not destroyed by asset lifecycle changes.

6.7.2 Operational requirements

Evidence types (v1): PHOTO, NOTE, SIGNATURE, FILE. (VOICE deferred.)

Evidence subjects: exactly one of asset, task, blocker, QA observation, or Site directly. Set at capture; immutable.

QA observations. Claims about asset/task/Site state. Reference subject; carry evidence; have a lifecycle; attributed to submitter and verifier.

Blocker types (draft): SAFETY, QUALITY, ACCESS, MATERIALS, EQUIPMENT, WEATHER, INFORMATION, OTHER.

Blocker severity (draft): CRITICAL, HIGH, MEDIUM, LOW. CRITICAL and HIGH gate.

Authority table in §6.7.2 — Worker can capture own/crew evidence, submit QA, raise blocker, resolve as assignee; Supervisor can verify QA, assign, verify resolution; Company Admin full scope.

6.7.3 Product behaviour

QA observation lifecycle

```text
draft → submitted → under_review → verified
                                → rejected → submitted (after correction)
                                → withdrawn
```

Blocker lifecycle

```text
raised → acknowledged → in_progress → resolved → verified → closed
                                    → escalated → in_progress
                                    → dismissed (from any state with authority + reason)
```

resolved and verified are distinct.

Progress gating. CRITICAL blocker blocks completion claim. HIGH blocker requires explicit Supervisor override, attributed and reasoned.

Offline-capable: evidence capture (photo, note, signature, file), QA observation draft/submit, blocker raise, blocker acknowledgement/in_progress/resolved (assignee), viewing own submissions.

Connectivity-required: QA verification, blocker verification, dismissal, escalation across Sites/roles.

Evidence upload vs creation. Creating evidence is offline-capable; uploading the binary is transmission per §6.10.

Amendment 1 (evidence immutability vs storage). Storage metadata is not evidence content. Upload state, storage reference, checksum, and transmission metadata may be populated as transmission progresses, without modifying the captured evidence fact.

Amendment 2 (conflict authority). QA observation and blocker transitions are accepted only when valid against the server-authoritative current state and the actor has authority for that transition. Concurrent transitions are preserved. Where two otherwise-valid transitions race, the server's declared transition ordering determines the resulting derived state; no transition is silently discarded.

6.7.4 Conceptual model

Source-of-truth: Evidence, QaObservation, QaTransition, Blocker, BlockerTransition, BlockerAssignment.

Derived: current QA state, current blocker state, current blocker owner, asset completion status, Site QA summary, critical blockers gating an asset.

6.7.5 Failure and recovery

Photo offline, app killed → preserved. Duplicate evidence → once. QA transition rejected server-side → surfaced with reason. Blocker verified after dismissal → server rejects. Evidence upload permanent failure → record retained, user notified. Location unavailable → recorded as unavailable, never back-filled. Asset closed with open blocker → permitted if not CRITICAL. Cross-Site evidence → rejected.

6.7.6 Audit requirements

Every evidence item: identity, command identity, type, subject, actor, source, device identity, device timestamp, location as captured (or unavailable), storage reference (on upload), server sync timestamp. Storage metadata is not evidence content.

Every QA/blocker transition: transition identity, subject, prior state, new state, actor, timestamp, reason (mandatory for rejected, dismissed, escalated, resolved).

Every blocker assignment: blocker, assignee, assigning actor, timestamp, reason.

6.7.7 Acceptance criteria

AC-QA-1 through AC-QA-13.

6.7.8 AC-04 reconciliation

CLOSED — NOT PRESENT. No substantive AC-04 QA/blocker/evidence implementation. M16QaScreen is an attendance verification harness, not a QA-domain implementation. QR components frozen pending §6.3. Roadmap references only.

6.7.9 Open decisions

Voice evidence (deferred). Video (deferred). Evidence retention. Blocker SLA. QA verification scope. Rejection loop. Evidence deduplication (no). Signature weight (advisory pending legal review).

---

§6.8 — Communication

6.8.1 Invariants

· COM-INV-1 — Communication is contextual. Anchored to a Site, Crew, Task, Blocker, QA observation, or Worker's current operational context. No general chat.
· COM-INV-2 — Communication does not create domain facts.
· COM-INV-3 — Communication identity is profile data.
· COM-INV-4 — Crew communication is membership-scoped. Membership determines reachability, not authority.
· COM-INV-5 — Supervisor and management contacts are profile-attributed.
· COM-INV-6 — External channel handoff is not integration.
· COM-INV-7 — Communication scope respects tenancy.
· COM-INV-8 — Communication availability is derived from current state.
· COM-INV-9 — Communication is offline-limited. No offline messaging.
· COM-INV-10 — No communication is authoritative.

6.8.2 Operational requirements

Surfaces: Worker → Supervisor; Worker → Management; Worker → Worker within Crew; Supervisor → Crew (individual only); Site-scoped context (Supervisor roster visibility); Task/blocker context.

Methods: phone call handoff, WhatsApp handoff, email handoff. No in-app messaging, no push-based text/voice, no group messaging, no message history.

Contact visibility.

· Company Admin: all Company Workers.
· Supervisor: Workers on assigned Sites.
· Worker: Crew members (phone only by default), assigned Supervisor, management contact, self.
· Not visible: other Companies, EPC/clients, Platform Admin (unless authorised for support, audited).

Crew communication. Available to active Crew members. A surface, not a channel. No persistent group.

Supervisor and management references. Profile fields, populated administratively. Not derived from Site assignment.

Authority boundaries. Communication surfaces never permit an action.

Amendment 1. No group communication in v1. A Supervisor can view and initiate individual contact only. No Crew-wide broadcast, no group messaging, no group call.

Amendment 2. Worker cannot discover or contact arbitrary Site workers outside their Crew. Supervisor retains roster visibility for assigned Sites.

Amendment 3. Phone visibility follows the fixed v1 rules above. Company-configurable contact privacy is deferred; if required later, it is added via §7/§8 reconciliation introducing an explicit C-class field.

6.8.3 Product behaviour

No lifecycle. Handoffs are ephemeral UI actions. The only potential F record (CommunicationInitiated) is not introduced in v1.

Offline-capable: view cached contact details, open handoff with cached contact, view cached Crew memberships.

Connectivity-required: retrieving uncached contacts, uncached Site-scoped roster, contact field updates.

6.8.4 Conceptual model

§6.8 introduces no new E or F entities. Contact details are profile fields on Worker. Crew membership is §6.3.4. Site assignment is §6.1.2. Supervisor and management references are profile fields.

Derived: contactable Workers, Site roster (for communication), Crew member list, Worker's current supervisor, Worker's management contact.

6.8.5 Failure and recovery

No contact number → handoff hidden. Offline + uncached → rejected locally. External app missing → fallback (dialer or copy-to-clipboard). Cross-Company attempt → not visible, no handoff. Cross-Crew same-Site attempt → permitted only where both are on the Site roster. Stale cached contact → staleness indicated; handoff still permitted.

6.8.6 Audit requirements

No required audit F records in v1. A CommunicationInitiated record (if introduced later) would carry: event identity, command identity, actor, subject, context, method, timestamp, no content.

6.8.7 Acceptance criteria

AC-COM-1 through AC-COM-13.

6.8.8 AC-04 reconciliation

EXTRACTION REQUIRED — not performed. Expected: NOT PRESENT or REFERENCE.

6.8.9 Open decisions

In-app messaging (deferred). Push notifications (platform notifications only in v1). Communication audit (no in v1). Supervisor reference derivation (manual). Group communication (closed — not in v1). Contact privacy configurability (deferred). External app fallback. Site roster visibility (closed — Supervisors only; Workers see own Crew + supervisor + management). Cross-Crew same-Site (closed — no for Workers). Translation (English only). Emergency communication (not in v1).

---

§6.9 — Reporting

6.9.1 Invariants

· REP-INV-1 — Reports are derived.
· REP-INV-2 — Reports do not aggregate across Companies.
· REP-INV-3 — Report content is a function of fact scope.
· REP-INV-4 — Freshness is a first-class report property.
· REP-INV-5 — Reports are permission-scoped. Scope enforced at fact retrieval.
· REP-INV-6 — Exports are products of reports, not new facts. The act of export is an F record.
· REP-INV-7 — Reports never mutate facts.
· REP-INV-8 — Report configurations are C-class.
· REP-INV-9 — Reports are reproducible.
· REP-INV-10 — No report is authoritative for a fact.
· REP-INV-11 — Reports are connectivity-required to generate.
· REP-INV-12 — Report scope includes only active and archived entities, per configuration. Archived entities remain reportable; default exclusion is not an exclusion principle.

6.9.2 Operational requirements

Report types (v1): Attendance summary, Timesheet, Worker timesheet history, Progress by asset, Progress by Project, QA observations, Open blockers, Blocker history, Pre-start register, Worker roster, Requirement compliance, Document register, Permits/expiries, Crew activity, Site daily state.

Additional types may be added without blueprint amendment if they consume facts and produce D output.

Scopes: Worker, Site, Project, Company, EPC/client (read-only, assigned Projects), Platform (Company metadata only).

Permissions enforce scope at fact retrieval. A report never retrieves a fact the requester is not authorised to see.

Export. CSV, PDF (or other). Content is a snapshot. The act of export is an F record. Exports carry freshness state at export.

Report config. C-class. Company-scoped. Changes audited. Cannot override scope rules.

6.9.3 Product behaviour

Report computation is execution state, not a domain lifecycle:

```text
Report command
    ↓
CommandOutcome (accepted / rejected / failed / conflicted)
    ↓
D result / materialisation available (on accepted)
```

requested, computing, ready, failed are UI/execution status only. No domain states, no ReportFailed/ReportReady/ReportRequested F types.

Freshness. Every report presents last confirmed server sync (where meaningful), freshness state per AC-ARCH-E2 where divergent, and whether facts are locally committed but not server-confirmed.

Offline-capable: viewing previously-generated cached report result with freshness; viewing own facts (worker-scope).

Connectivity-required: generating any cross-entity aggregate report, exporting, generating over uncached Sites, Company-scope or Project-scope reports. Offline generation attempts fail locally with reason.

Conflicts. Reports are read-only over facts. ReportConfig changes follow §6.10.3's C-record rule.

6.9.4 Conceptual model

Source-of-truth: ReportExportEvent (F, Company) — only on successful export; a failed or rejected export produces only a CommandOutcome. ReportConfig (C, Company).

No ReportRequest F. A report request is a command; its outcome is a CommandOutcome.

Derived: any report; Site daily state; timesheet; worker attendance history; progress aggregate; QA/blocker summaries; requirement compliance; roster.

6.9.5 Failure and recovery

Offline generation → rejected locally. Server transient failure → CommandOutcome failed, retry permitted. Server authority failure → rejected with reason. Offline viewing from stale cache → freshness shown. Offline export → rejected locally. Concurrent ReportConfig changes → declared ordering, both audited. Authority revoked mid-request → rejected at completion. Underlying fact rejected mid-request → report reflects post-rejection fact set.

6.9.6 Audit requirements

CommandOutcome for every report command and every export command. ReportExportEvent only on successful export: actor, report type, scope, filter, output format, timestamp, freshness state at export, underlying fact count.

No ReportRequested/ReportReady/ReportFailed F types.

6.9.7 Acceptance criteria

AC-REP-1 through AC-REP-12.

6.9.8 AC-04 reconciliation

EXTRACTION REQUIRED — not performed. Expected: NOT PRESENT or REFERENCE.

6.9.9 Open decisions

Output formats (CSV + PDF). Scheduled reports (v2). Report caching (session-only). Cross-Project reporting. EPC/client detail level (draft: aggregate; individual names only with explicit Site config). Fidelity vs performance (exact recomputation). Time zone. Worker-scope offline export (no). Report retention (no past results). Retired/archived inclusion (opt-in). Anonymised exports (deferred). Permission delegation (no in v1).

---

§6.10 — Offline / Sync

6.10.1 Invariants

· OS-INV-1 — Local-first is the default. Any action a worker can take on site while online, they must be able to take offline. Connectivity is an optimisation, not a precondition.
· OS-INV-2 — No silent loss.
· OS-INV-3 — Durable intent. Durable local commit before user confirmation. Survives restart.
· OS-INV-4 — Stable command identity. Client-generated; persists across retries, restarts, duplicate delivery. Same logical action cannot apply twice.
· OS-INV-5 — Convergence or disclosure.
· OS-INV-6 — Audit parity. Offline actions audited with same fidelity as online.
· OS-INV-7 — Observable sync state.
· OS-INV-8 — No partial mutation. Applied in full or not at all, locally and server-side.
· OS-INV-9 — Ordering is per-entity, not global. Causally related actions on the same entity apply in user-performed order.
· OS-INV-10 — Server rejection is explicit.
· OS-INV-11 — Deletion is soft for auditable entities.
· OS-INV-12 — Prolonged offline is a state, not an error.

6.10.2 Operational requirements

Must work offline (v1): sign-in/out (QR or equivalent), break start/end, task start/pause/complete, evidence capture, blocker raise/update/resolve, daily pre-start completion, acknowledgement with signature capture, crew and contact lookups against cached data, viewing own readiness, viewing assigned Sites and status.

May require connectivity: creating Company/Project/Site, inviting a worker, administrative document verification, Platform administration, cross-Company operations, reporting exports aggregating across Sites.

Must not be allowed offline: creating a new entity the server has never seen; anything requiring server-authoritative uniqueness guarantees.

Boundary: field actions are offline-capable; administrative and structural actions are online-only in v1.

6.10.3 Product behaviour

Local commit. Validate locally → durable local record with stable identity and device timestamp → user shown committed state → queued for transmission. Never "saving…" for an offline-capable action.

Transmission. Background. Per-command independent success/failure. Automatic bounded retries. Manual retry only on terminal failure.

Sync state per command

```text
committed → queued → transmitting → accepted
                                  → rejected (server) → user-visible, actionable
                                  → failed (terminal) → user-visible, actionable
```

("confirmed" permitted as a UI label for accepted.)

Duplicate delivery. Applied once server-side.

Ordering. Same entity: user-performed order. Unrelated entities: any order. Dependencies enforced locally before queueing.

Conflict semantics (per entity class, not globally):

Conflict class Default resolution
Same worker, same field, later timestamp Later wins, both recorded
Same worker, shift boundaries Attempted conflict rejected locally; user prompted
Evidence attachment Additive; no conflict
Blocker state transition Local transition authoritative for worker's intent; server reconciles
Readiness-gate violation discovered at sync Command rejected; user notified; preserved as rejected record

"Last write wins" is not a global default.

Reconciliation. Compare local and server state. Succeeded commands retired. Rejected/failed surfaced with reason and options. Server-side conflicts resolved by declared rule; outcome audited.

Partial sync. Per-command. No all-or-nothing across queue.

Connectivity loss mid-transmission. Local commit preserved; command returns to queued; no partial server state.

Local/server divergence. Detected on reconnect; attributed to specific command(s); resolved by declared rule or surfaced. Never silently overwritten.

Prolonged offline. Fully functional indefinitely for offline-capable actions. Warning at threshold (draft: 24h visible, 72h escalated). Commands retained until confirmed or explicitly abandoned. Storage constraints surfaced, not silently dropped.

Recovery after restart. Committed but unsynced commands survive. In-progress forms: best-effort. Queue resumes without intervention.

Deletion and archival. Soft state change, transmitted as any command. Hard deletion Platform Admin under retention policy, audited. Archival is a state, not removal.

User-facing. Sync indicator per action. Queue view available. Failed commands actionable (retry, correct, abandon with reason). Offline state visible but not modal.

6.10.4 Conceptual model

Source-of-truth (local): LocalCommand, LocalEntityState, QueueEntry, LocalAuditEvent.

Source-of-truth (server): ServerEntityState, ServerAuditEvent, CommandReceipt.

Derived: sync indicator per action, entity sync state, reconciliation outcome.

6.10.5 Failure and recovery

Transmission fails → returns to queue. Server rejects → user notified, preserved. Server unreachable → queue grows, user warned at threshold, no loss. Device restart mid-transmission → preserved, retried. Duplicate delivery → once. Conflict on reconnect → per-entity rule, audited. Unrecoverable divergence → surfaced with attribution. Local storage constraint → user prompted, no silent eviction.

6.10.6 Audit requirements

Every command: stable ID, actor, entity target, intent, device timestamp, sync timestamp, outcome. Every conflict resolution: conflicting commands, rule, outcome. Every rejection: reason, user notification, user's subsequent action. Offline and online audited identically except sync timestamp. Immutable on both sides.

6.10.7 Acceptance criteria

AC-OS-1 through AC-OS-10.

6.10.8 Open decisions

Prolonged-offline warning threshold (24h / 72h). In-progress form preservation (best-effort). Local queue max size (no hard cap). Server-authoritative entities (structural only). Conflict rules per-entity (v1) with per-field refinement later. Client-side conflict resolution for declared-safe cases.

---

§6.11 — Administration

6.11.1 Invariants

· AD-INV-1 — Administration is authority-scoped, not identity-scoped.
· AD-INV-2 — Accepted administrative mutations produce domain facts; attempted commands produce CommandOutcomes. No administrative fact layer separate from §7's F-record union.
· AD-INV-3 — No administrative mutation of F records. Corrections additive. Retention destruction is a Platform retention action, not an admin capability.
· AD-INV-4 — Overrides are named, reasoned, attributed. No silent admin mode.
· AD-INV-5 — Configuration is C-class. Never overrides a domain invariant.
· AD-INV-6 — Audit visibility is bounded by scope.
· AD-INV-7 — Administrative actions are structural. Overwhelmingly connectivity-required.
· AD-INV-8 — Invitations are the sole membership creation path in v1.
· AD-INV-9 — Tenant isolation is enforced at storage.
· AD-INV-10 — Administrative surfaces are not a second permission system. Capabilities gate field actions; admin roles gate administrative actions.

6.11.2 Operational requirements

Company Admin — scoped to Company. Company profile, user management (invite, suspend, offboard), capability grant/revoke, Crew management, Project/Site lifecycle, ExternalParty, Requirement management, document administration, QR administration, configuration, audit visibility, overrides (force-close shift, dismiss blocker, reverse verification).

Platform Admin — Platform-scoped. Company lifecycle, cross-Company transfer, retention processing, Platform configuration, escalation handling. Not: operational authority over a Company's field actions; mutation of a Company's F records; bypass of a Company's invariants.

Surfaces: Company, Users, Projects, Requirements, Crews, Audit (read-only), Configuration.

Configuration scope: Company, Project, Site. Precedence: Site > Project > Company.

Scope boundaries. Company Admin bounded by Company. Platform Admin bounded by Platform; cannot substitute for Company operational authority. Cross-Company references only via TransferEvent.

Connectivity-required: all administrative mutations. Offline-readable: cached profile, user list, project/site list, cached audit.

6.11.3 Product behaviour

Administrative action lifecycle. Follows §6.10 command model. Connectivity-required; do not enter offline queue. A rejected admin command produces a CommandOutcome and is surfaced.

Invitation flow. Admin initiates; invitation carries Person reference or invitation identity; recipient accepts; Person resolved/created; Worker created; onboarding proceeds per §4. Admin cannot skip invitation, create a Worker directly, or create a Person directly.

User suspension / offboarding. Company Admin action with mandatory reason. Offboarding with open artifacts blocked until force-close, reassign, resolve, or address.

Override actions (three in v1), each named:

· Force-close shift — Company Admin only. AttendanceEvent type FORCE_CLOSE, actor = admin, subject = worker, mandatory reason.
· Dismiss blocker — Company Admin or authorised Supervisor, mandatory reason.
· Reverse verification — Company Admin, mandatory reason. Produces a Reversal.

Each is a normal domain fact, subject to the domain's rules.

Audit surface. Read-only. Queryable by entity, actor, timestamp, event type. Derived from F records. Export permitted for own Company.

Configuration. Site > Project > Company. Cannot override invariants.

Company setup (M1): Company created → profile → requirements → Project → Site → Site-scoped requirements → first Workers invited.

6.11.4 Conceptual model

No new E entities. Introduces (all F):

· Invitation (F, Company)
· CapabilityGrant (F, Company)
· ConfigChangeEvent (F, Company/Project/Site)
· RetentionDestructionEvent (F, Platform) — not part of any Company's retention set; survives the destruction it causes; references destroyed records, retention policy version, and Platform actor.

Removed: AdminActionEvent, OverrideEvent. Overrides produce domain-canonical events.

Derived: Company profile, current requirements, current Users, Company audit trail, Platform Company list.

6.11.5 Failure and recovery

Admin action offline → rejected. Server rejection → CommandOutcome with reason. Concurrent actions → declared ordering; loser rejected with reason. Hard-delete attempt → not reachable. Out-of-scope attempt → rejected at creation. Config change violating invariant → rejected with reason. Offboarding with open artifacts → blocked, resolutions surfaced. Platform operational authority → rejected. Config conflict → declared ordering, both audited.

6.11.6 Audit requirements

Every administrative action: event identity, command identity, event type, subject, actor, acting scope, device identity, device timestamp, server sync timestamp, reason (mandatory for suspension, offboarding, capability revocation, override actions, retention destruction, transfer), payload. Administrative audit records identical in structure to domain audit records.

6.11.7 Acceptance criteria

AC-AD-1 through AC-AD-12. AC-AD-1 distinguishes accepted mutations (domain F record) from rejected/failed/conflicted commands (CommandOutcome).

6.11.8 AC-04 reconciliation

OPEN / PENDING — extraction not performed.

6.11.9 Open decisions

Invitation delivery mechanism. Platform escalation consent. Configuration history (resolved: not required; facts capture resolved values). Company offboarding. Retention destruction policy. Admin session duration/re-auth. Multi-Company Admin. Admin visibility across Sites. Delegated administration. Bulk operations.

---

§7 — Conceptual Data Model

v0.7.2 + recorded §6.3 / §6.4 / §6.9 catalogue amendments LOCKED.

7.1 Invariants

· DM-INV-1 — Identity is stable. Never reused.
· DM-INV-2 — Facts are immutable. Append-only.
· DM-INV-3 — Derived state is never authoritative.
· DM-INV-4 — Everything has an explicit ownership scope. Platform, Company, Project, Site, or Worker.
· DM-INV-4a — Ownership scope and operational scope are distinct.
· DM-INV-5 — Company is the tenancy boundary.
· DM-INV-6 — Site is the operational boundary.
· DM-INV-7 — No entity is orphaned.
· DM-INV-8 — Deletion is soft for auditable entities.
· DM-INV-9 — Audit is derivable from facts.
· DM-INV-10 — Offline facts are locally authoritative until reconciled. Server authoritative for server-governed validation, uniqueness, authorization, conflict resolution, and designated state transitions.
· DM-INV-10a — "Locally authoritative" means locally authoritative for the local slice, not globally.
· DM-INV-11 — No entity has two identities.
· DM-INV-12 — Vocabulary is fixed.

7.2 The universal pattern

Every stateful concept is exactly one of four kinds:

1. Identity-bearing entity (E) — stable identity; current representation derived from creation fact + immutable domain facts defining lifecycle, attributes, and relationship state.
2. Immutable fact record (F) — append-only.
3. Configuration record (C) — current value is its meaning.
4. Derived read model (D) — recomputable.

No fifth kind.

7.3 Entity catalogue

E entities: Company (Platform), Person (Platform), Device (Platform), Worker (Company), ProjectAssignment (Project), SiteAssignment (Site), Project (Company), Site (Project), WorkArea (Site), Asset (Site), ExternalParty (Company), ProjectExternalParty (Project), Requirement (Company/Project/Site), Task (Site), QaObservation (Site), Blocker (Site), WorkerQrIdentity (Company), Crew (Company), CrewMembership (Company), CrewSiteAssociation (Site), PreStartContent (Site), PreStart (Site), HandoverRecord (F per §6.3 review — reclassified).

F entities: LifecycleEvent, TransferEvent, AssetGeometryEvent, AssetLifecycleEvent, AssetWorkAreaAssignment, AttendanceEvent, CorrectionEvent, TimesheetApprovalEvent, TaskTransition, TaskAssignment, CompletionClaim, CompletionClaimWithdrawal, CompletionVerification, Reversal, ReversalResolution, Evidence, QaTransition, BlockerTransition, BlockerAssignment, RequirementSatisfaction (+ subtypes DocumentRevision, InductionCompletion, Acknowledgement), CommandReceipt, CommandOutcome, Invitation, CapabilityGrant, ConfigChangeEvent, RetentionDestructionEvent, ReportExportEvent, PreStartContentRevision, PreStartContentItem, PreStartLifecycleEvent, PreStartParticipant, PreStartCorrection, DailyLogEntry, WorkerProfileChange / WorkerLifecycleEvent / WorkerQrIdentityEvent.

C entities: SiteShiftBoundaryConfig, CompanyOnboardingConfig, ProjectOnboardingConfig, SiteOnboardingConfig, RoleCapability, CompanyBrandConfig, ReportConfig.

D entities: all derived read models — company readiness, site readiness, current shift state, timesheet, timesheet approval state, asset current geometry/lifecycle/WorkArea, asset progress/QA/blocker state, task state/assignee, WorkArea/Site/Project progress, Site roster, Site punch list, map render, sync indicator, worker site list, audit trail, pre-start completion, Site daily state, contactable Workers, Crew member list, report outputs.

7.4 Ownership, identity, scoping

Platform owns: Company (as tenancy root), Person, Device, CommandReceipt, RetentionDestructionEvent.
Company owns: Worker, ExternalParty, WorkerQrIdentity, Crew, CrewMembership, Company-scoped Requirements, config.
Project owns: Site, ProjectAssignment, ProjectExternalParty, Project-scoped Requirements.
Site owns: WorkArea, Asset, all field-operation facts, SiteAssignment, CrewSiteAssociation, PreStartContent, PreStart.
Worker is the actor of many facts but does not own them.

Identity generated where entity is born. Globally unique within its scope. Transfer creates a new identity for the transferred Project; the old identity remains unreferenced and unreused.

7.5 Immutability and lifecycle classification

Class Lifecycle Mutated by
E Stable identity, derived current representation Authorized actors via facts
F Append-only Nobody
C Current value authoritative Authorized admin actors
D Recomputable Nobody directly

Relationship-entity rule. A relationship is E if it has state independent of its endpoints; otherwise F or D. ProjectAssignment and SiteAssignment are E. AssetWorkAreaAssignment is F.

E-entity current representation is derived from identity + creation fact + immutable domain facts (AttributeChangeEvents where §7 specifies them; dedicated lifecycle/relationship facts where the owning section specifies them). The architecture must not flatten this distinction.

7.6 Relationships

```text
Platform
  ├── Person
  ├── Device
  └── Company
        ├── Worker (membership → Person)
        │     ├── ProjectAssignment ── Project
        │     ├── SiteAssignment ── Site
        │     ├── CrewMembership ── Crew
        │     └── WorkerQrIdentity
        ├── ExternalParty
        ├── Crew
        │     └── CrewSiteAssociation ── Site
        └── Project
              ├── Site
              │     ├── WorkArea
              │     ├── Asset
              │     └── [field-operation facts]
              └── ProjectExternalParty
```

Cross-scope references by identity, never by containment. Actor ≠ subject is universal.

7.7 Derived state — three rules

1. Never authoritative.
2. Materialisable but not required.
3. Freshness is a product fact.

7.8 Audit trail

```text
AuditTrail
    ├── DomainFacts        (F records about domain entities)
    └── CommandOutcomes    (F records about command processing)
```

Every F record is an audit entry. Every E entity's current representation derived from identity + AttributeChangeEvents. C-record changes are F records. D records are not audit entries directly.

Minimum common audit fields: event identity, command identity, actor, device identity, device timestamp, server sync timestamp, reason (where required).

7.9 Deletion, retention, archival

F records never operationally deleted. E records retired or archived. C records may be deleted if non-historical. D records never explicitly deleted. Site archival preserves facts. Company offboarding is archival; retention destruction per §8 AC-ARCH-H5.

7.10 Offline interaction with §6.10

Local side: E and F records locally are source-of-truth until confirmed. Server side: F records created on receipt; CommandReceipt guarantees idempotency. Reconciliation converges to same identity and content. Derived state computed independently on each side; may differ offline; must converge or be disclosed.

7.11 Onboarding open decision — RESOLVED

Onboarding state is not an entity. It is a derived read model computed from RequirementSatisfaction. company_ready and site_ready are derived predicates. Materialisation permitted; recomputable from RequirementSatisfaction alone.

7.12 Failure and recovery

Derived disagreement → recompute; if persists, surface. E-record references retired parent → preserved. F-record for archived Site → accepted. CommandReceipt without local → recoverable. Local without receipt → retransmit, idempotent. Duplicate F-records → one receipt. Stale aggregate → staleness surfaced. Hard-delete attempt → not reachable.

7.13 Acceptance criteria

AC-DM-1 through AC-DM-23, including:

· AC-DM-15 through AC-DM-19 (from §7 review amendments)
· AC-DM-20 through AC-DM-23 (Device)

7.14 AC-04 reconciliation

PARTIAL — schema-level. Sync schema ALIGNS strongly. Identity/tenancy schema CONFLICTS with PS-INV-1 and DM-INV-5.

7.15 Open decisions

· Company offboarding — DEFERRED to Platform retention policy.
· Configuration history — RESOLVED: not required; facts capture resolved values.
· Retention windows — DEFERRED to Platform retention policy.
· Crew ownership scope — CLOSED: Company-scoped reusable Crew + Site-scoped CrewSiteAssociation.
· Cross-Company Person identity — draft: same Person, two Worker memberships.
· Derived materialisation policy — implementation choice.
· Audit trail materialisation — implementation choice.
· CommandReceipt retention — at least as long as any retry window; exact deferred to §8.
· Cross-Site entity references — not in v1.
· Entity extension points — requirements yes; asset types no; event types no.
· Person identity across Platform — globally unique at Platform level; visible only to Companies the Person is a member of.
· Physical DeviceInstallation representation — implementation choice; must not introduce a second identity.

---

§8 — Architectural Constraints

8.0 Purpose

§8 translates the blueprint into constraints on any implementation. It does not choose languages, databases, frameworks, protocols, or algorithms. It eliminates classes of implementation that cannot satisfy the blueprint.

8.1 Constraint scope

Each AC-ARCH-* cites the invariants it enforces and the acceptance criteria that verify it.

8.2 Categories

```text
A. Storage model
B. Identity and isolation
C. Sync and reconciliation
D. Audit and provenance
E. Derivation and freshness
F. Offline capability
G. Failure and recovery
H. Lifecycle and retention
I. Extensibility and evolution
```

8.A — Storage model

· AC-ARCH-A1 — Four-class storage discipline. Storage must express E, F, C, D without collapsing into one mutable-row model.
· AC-ARCH-A2 — Single identity per entity, except where the blueprint requires intentional replacement. No client/server dual-keying. A2a — Project transfer creates a successor identity, not a rewrite; linkage via TransferEvent.
· AC-ARCH-A3 — E-entity current representation derived from creation fact plus attribute-change history. Materialisation permitted; authority not.
· AC-ARCH-A4 — No stored status, boolean, or flag may be authoritative for a derived value. Physical columns permitted as materialisations, C records, or internal indexes.

8.B — Identity and isolation

· AC-ARCH-B1 — Company as tenancy boundary. Enforced at storage; verifiable by test.
· AC-ARCH-B2 — Site as operational boundary. Every field-operation fact Site-scoped.
· AC-ARCH-B3 — Cross-tenant references prohibited except through the transfer model. TransferEvent, successor linkage, Platform audit records permitted.
· AC-ARCH-B4 — Device as Platform-scoped E entity.

8.C — Sync and reconciliation

· AC-ARCH-C1 — Durable local commit before success.
· AC-ARCH-C2 — Stable command identity. Client-generated; persists across retries, restarts, duplicate delivery.
· AC-ARCH-C3 — Atomicity scoped to each authority boundary. Client and server do not perform identical mutations. Each is atomic within its own boundary.
· AC-ARCH-C4 — Per-entity ordering.
· AC-ARCH-C5 — Explicit terminal outcomes, using §7 CommandOutcome vocabulary. accepted / rejected / failed / conflicted. C5a — "confirmed" permitted as UI label.
· AC-ARCH-C6 — Per-entity-class conflict semantics. No global LWW default.
· AC-ARCH-C7 — Reconciliation produces convergence or disclosure.
· AC-ARCH-C8 — Two-sided source-of-truth. Neither side a cache of the other. Server authority explicit for designated operations.
· AC-ARCH-C9 — CommandOutcome retention. Rejected/failed/conflicted retained as auditable records independent of domain fact production.
· AC-ARCH-C10 — Structural operations are connectivity-required.

8.D — Audit and provenance

· AC-ARCH-D1 — Audit derivable from facts.
· AC-ARCH-D2 — Audit fields present on every F record.
· AC-ARCH-D3 — Actor / subject distinction explicit.
· AC-ARCH-D4 — No operational mutation or deletion of F records. Retention destruction permitted and audited.
· AC-ARCH-D5 — Device attribution on facts.
· AC-ARCH-D6 — Offline/online audit parity.

8.E — Derivation and freshness

· AC-ARCH-E1 — Derivability. Every D record recomputable from E and F records alone.
· AC-ARCH-E2 — Freshness state, not universal timestamp. Must distinguish locally committed / server-confirmed / stale / unknown.
· AC-ARCH-E3 — No derived state as input to facts.
· AC-ARCH-E4 — Aggregate derivability.

8.F — Offline capability

· AC-ARCH-F1 — Offline operation relative to documented local preconditions. Fails locally with specific reason where a precondition is unmet.
· AC-ARCH-F2 — Operational continuity for offline-capable actions. Connectivity-required operations remain explicitly unavailable.
· AC-ARCH-F3 — Observable sync state.
· AC-ARCH-F4 — No silent queue loss.

8.G — Failure and recovery

· AC-ARCH-G1 — Idempotent server application.
· AC-ARCH-G2 — Terminal failure visibility.
· AC-ARCH-G3 — Recovery after restart.
· AC-ARCH-G4 — No partial mutation.
· AC-ARCH-G5 — Clock drift tolerance. Explicit rejection, not silent reordering.

8.H — Lifecycle and retention

· AC-ARCH-H1 — Soft delete for operational deletion. No E or F record referenced by another is hard-deleted by any user path.
· AC-ARCH-H2 — Site archival preserves facts.
· AC-ARCH-H3 — Company offboarding is archived, not purged operationally.
· AC-ARCH-H4 — Configuration retention. Facts capture resolved values at creation time.
· AC-ARCH-H5 — Retention destruction. The only mechanism by which F records may cease to exist. Platform-initiated, policy-permitted, recorded as RetentionDestructionEvent that survives.

8.I — Extensibility and evolution

· AC-ARCH-I1 — Asset taxonomy closed in v1.
· AC-ARCH-I2 — Requirement types scoped, set fixed in v1.
· AC-ARCH-I3 — Event vocabulary fixed. New types via blueprint amendment.
· AC-ARCH-I4 — No field-operational entity or fact belongs to multiple Sites. Containment entities (Project, Company) unaffected.

8.J — What §8 does not constrain

Programming languages, runtimes, frameworks, mobile UI framework, local storage engine, server storage engine, sync algorithm, conflict resolution mechanism per entity class, map library and tile source, push mechanism, authentication provider, hosting, CI/CD.

Each must satisfy §8.2–§8.I. None is dictated.

8.K — Architecture acceptance criteria

AC-ARCH-0.1 through AC-ARCH-0.8, verified at M0.

8.L — AC-04 implications

No item promotes solely on the basis of §8. Each salvage item must pass: blueprint anchor test, DM-INV and domain INV tests, §8 constraint tests, and its own predating acceptance test (INV-C).

8.M — Open decisions

Local storage engine. Sync algorithm. Conflict resolution mechanisms per entity class. Physical DeviceInstallation representation. Server storage and tenancy mechanism. Audit materialisation strategy. Plus inherited opens from §6.10.8, §7.15.

---

§11 — Milestone map

· M0 — Product / Architecture Contract
· M1 — Identity, Company & Onboarding
· M2 — Projects & Sites
· M3 — Map / GIS Operating Surface
· M4 — Workers, Crews & Communication
· M5 — Daily Operations / Pre-starts
· M6 — QR Attendance & Timesheets
· M7 — Tasks / Progress / Piles
· M8 — QA / Evidence / Blockers
· M9 — Reporting / Administration
· M10 — Offline / Sync / Recovery
· M11 — Full Integration
· M12 — Android Field Validation

Sequence provisional, validated against §8. Onboarding remains M1.

---

§12 — Salvage register

Status: PARTIAL.

ID Item Status
SR-001.1 init_identity_tenancy REFERENCE
SR-001.2 device_installations FREEZE
SR-001.3–.5 RLS pattern SALVAGE (pattern only)
SR-001.6–.11 sync mechanism SALVAGE (mechanism)
SR-001.12–.13 PLpgSQL stack FREEZE
SR-002.1–.8 sync source SALVAGE (mechanism)
SR-003.1 idempotency SALVAGE
SR-004 CI SALVAGE
SR-005 tests SALVAGE where §6.10-anchored
SR-006 GitHub history REFERENCE
SR-007 M1.x structure DISCARD
SR-008 existing implementation PARTIALLY CLASSIFIED
— identity/auth/QR (§6.3) REFERENCE / FREEZE / SALVAGE (mechanism) / NEW
— pre-start (§6.4) OPEN / PENDING
— reporting (§6.9) OPEN / PENDING
— administration (§6.11) OPEN / PENDING

Rules. No promotion without anchor + predating test + §8 compliance. INV-C in strict form: the test predates the implementation being promoted, not merely its integration.

Critical leak note. AC-04's CompanyMembership is not renameable to Worker. Doing so would silently preserve the organisation-scoped identity model and violate WC-INV-1/2/3.

---

M0 — Product / Architecture Contract

v1.0.1 — LOCKED.

M0.1 — Blueprint baseline (frozen)

Per §0.1 version register. §7 means v0.7.2 base text plus recorded §6.3/§6.4/§6.9 catalogue amendments. Where a section carries recorded amendments, the M0.1 table's version means the locked text including all amendments.

M0.2 — Canonical model

Four classes. No fifth. E current representation derived from identity + creation fact + immutable domain facts (AttributeChangeEvent where §7 specifies it; dedicated lifecycle/relationship facts where the owning section specifies them). The architecture must not flatten this distinction.

Prohibited: stored domain booleans acting as authoritative state; mutable E attributes as sole authority; derived values presented as source of truth; parallel audit store; any shadow reporting/messaging/notification/admin layer writing outside the F-record model.

M0.3 — Architecture requirements

M0.3.1 Tenancy and scope isolation (with RLS enforceability clarification: bypass paths must be addressed; "we use RLS" is not satisfaction).
M0.3.2 Identity.
M0.3.3 E/F/C/D persistence.
M0.3.4 Immutable facts.
M0.3.5 Derived state.
M0.3.6 Command processing.
M0.3.7 CommandOutcome with explicit local/server distinction — locally rejected / locally committed / server accepted / server rejected / server failed / server conflicted. One stable command identity across all layers. Locally rejected is terminal and not queued.
M0.3.8 Idempotency.
M0.3.9 Offline durable intent.
M0.3.10 Sync and reconciliation.
M0.3.11 Per-entity conflict semantics.
M0.3.12 Audit.
M0.3.13 Freshness.
M0.3.14 Authorization.
M0.3.15 Device identity.
M0.3.16 Retention destruction.
M0.3.17 Android / local persistence.
M0.3.18 Server persistence.

M0.4 — Salvage boundary

No artifact promoted by M0 itself. Promotion requires anchor + test that predates the implementation being promoted (INV-C strict) + §8 compliance. Where no qualifying test exists, a new test must be written before promotion.

M0.5 — Pending extraction gate

§6.4, §6.8, §6.9, §6.11 extractions OPEN / PENDING. Do not block M0; block promotion of corresponding legacy implementation.

M0.6 — Acceptance criteria

· M0-AC-1 — No §8 violations, no deferred fundamentals. Every applicable §8 constraint satisfied. Deferrals only where §8 permits, named with target milestone and test; a deferred constraint does not count as satisfied.
· M0-AC-2 — Canonical model mapping: every E/F/C/D type has an explicit persistence or derivation mechanism.
· M0-AC-3 — Offline capability coverage, split by mutation and read. State-mutating: durable-intent path. Read-only: named cache/read model + freshness mechanism. Includes §6.3 offline capabilities.
· M0-AC-4 — CommandOutcome coverage.
· M0-AC-5 — Canonical F mapping; no parallel fact layer.
· M0-AC-6 — No second source of truth.
· M0-AC-7 — Tenancy and Site boundaries enforced structurally, testable before M1.
· M0-AC-8 — No retroactive reinterpretation required.
· M0-AC-9 — Declared conflict rules per entity class.
· M0-AC-10 — Salvage boundary respected.

M0 evidence bundle

```text
M0/
├── architecture.md
├── conceptual-model-mapping.md
├── persistence-model.md
├── command-sync-model.md
├── authorization-scope-model.md
├── offline-reconciliation-model.md
├── audit-model.md
├── salvage-register.md
├── pending-extractions.md
├── acceptance-tests/
└── evidence/
```

M0 is not

Not implementation. Not architecture in the abstract. Not a redesign opportunity. Not a salvage opportunity. Not partially passable.

Transition to M1

M1 begins only when M0-AC-1 through M0-AC-10 pass. M1 = Identity, Company & Onboarding. Governed by §4, §6.3, §6.11, §7, §8.

---

END OF LOCKED BLUEPRINT v1.0

Blueprint status: FROZEN. No further drafting.

Next artifact: Jenny's M0 architecture document and evidence bundle.

Next action: Audit against M0.3.1–M0.3.18 and M0-AC-1–M0-AC-10. Result is binary: PASS or BLOCKED / FAIL with specific criterion named. No M1 drafting until PASS.