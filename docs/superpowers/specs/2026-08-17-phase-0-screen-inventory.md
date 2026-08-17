# SITE-SYNC Phase 0 — Master Screen Inventory

**Status:** Phase 0 architecture specification
**Date:** 2026-08-17
**Scope:** Master screen inventory and screen-level behaviour contract.

## 1. Purpose

This document is the screen-level source of truth for Phase 0. It maps the major SITE-SYNC surfaces identified by the approved Phase 0 brief and existing product/domain requirements. It deliberately does not invent screens for unspecified features.

Every screen is defined by:

- Exact screen name
- Role/access
- Entry
- Exit
- Purpose
- Primary action
- Secondary actions
- Required data
- Loading behaviour
- Empty behaviour
- Error behaviour
- Offline behaviour
- Permission behaviour
- Destructive interactions
- Navigation consequences

Where a behaviour cannot yet be determined from the approved product/domain material, it is marked **OPEN** rather than silently invented.

## 2. Role model

The minimum Phase 0 role surfaces are:

- Worker
- Supervisor
- Administrator/company-level user

Shared screens/components remain shared unless capability requires a role-specific composition.

## 3. Global lifecycle screens

### S01 — Authentication
**Role:** All users
**Entry:** App launch / signed-out state
**Exit:** Identity/context establishment
**Purpose:** Establish authenticated session.
**Primary action:** Sign in
**Secondary actions:** Recovery/other authentication actions where supported
**Data:** Authentication credentials/session
**Loading:** Authentication progress; prevent duplicate submission
**Empty:** Not applicable
**Error:** Explain authentication failure and recovery path
**Offline:** Do not imply authentication can succeed without required authority; behaviour depends on existing valid session
**Permission:** Account/session failure is distinct from feature authorization
**Destructive:** Logout is handled from authenticated settings/context, not as part of login
**Navigation:** Successful authentication proceeds to Identity/context resolution

### S02 — Identity / Account
**Role:** All users
**Entry:** Authentication success; account/context access
**Exit:** Organisation/company or project context
**Purpose:** Resolve the authenticated person's identity and role.
**Primary action:** Continue to context
**Secondary actions:** Account-related actions where supported
**Data:** Person identity, role, membership/context
**Loading:** Identity resolution
**Empty:** No valid identity context — blocking state
**Error:** Identity could not be resolved
**Offline:** Use trusted cached identity only where domain authority permits; otherwise UNVERIFIABLE
**Permission:** Membership/role failure is distinct from authentication
**Destructive:** None defined
**Navigation:** Continue to organisation/company/project selection or restoration

### S03 — Organisation / Company Context
**Role:** All users where applicable
**Entry:** Identity resolution; company switch
**Exit:** Project selection or restored project
**Purpose:** Establish company/organisation context.
**Primary action:** Select/continue with company
**Secondary actions:** Switch company if permitted
**Data:** Organisation/company membership
**Loading:** Membership/context retrieval
**Empty:** No accessible company context — blocked
**Error:** Company context unavailable
**Offline:** Cached context may remain visible but must not imply current authority if verification is unavailable
**Permission:** Membership restriction = BLOCKED
**Destructive:** None
**Navigation:** Establishes company context for project surfaces

### S04 — Project Context
**Role:** All users assigned to projects
**Entry:** Company context; project switch; restored session
**Exit:** Role Home
**Purpose:** Establish active project context.
**Primary action:** Select/continue with project
**Secondary actions:** Switch project
**Data:** Project membership/assignment, project identity
**Loading:** Project/context resolution
**Empty:** No accessible project — blocked
**Error:** Project context unavailable
**Offline:** Cached project may be shown as provisional/stale; actions requiring current authority are blocked
**Permission:** Project access failure = BLOCKED
**Destructive:** None
**Navigation:** Active project becomes global context for role home/features

## 4. Role home screens

### S05 — Worker Home
**Role:** Worker
**Entry:** Project context
**Exit:** Feature surfaces
**Purpose:** Worker operational starting surface.
**Primary action:** Context-dependent quick action
**Secondary actions:** QR, attendance, timesheets, permits, SWMS and other worker-authorized features
**Data:** Identity, company/project context, current operational status, feature summaries
**Loading:** Shell first; individual cards/surfaces load independently where practical
**Empty:** No current feature data; retain navigation/context
**Error:** Local feature error without taking down the entire shell
**Offline:** Show persistent offline condition and feature-specific availability
**Permission:** Feature capability denied = BLOCKED at feature boundary
**Destructive:** None on home itself
**Navigation:** Feature selection follows role-specific routing

### S06 — Supervisor Home
**Role:** Supervisor
**Entry:** Project context
**Exit:** Supervisor feature surfaces
**Purpose:** Supervisor operational starting surface.
**Primary action:** Context-dependent supervisory action
**Secondary actions:** QR scanner, attendance, timesheets/approval, permits, SWMS, reports and other authorized surfaces
**Data:** Project context, worker/site operational summaries, pending supervisory actions
**Loading:** Shell + independent surface loading
**Empty:** No pending work/data
**Error:** Localized feature errors
**Offline:** Explicit availability/provisional rules per feature
**Permission:** BLOCKED where capability is absent
**Destructive:** None on home itself
**Navigation:** Role-specific composition over shared design system

### S07 — Administrator Home
**Role:** Administrator/company-level user
**Entry:** Company/project context
**Exit:** Administrative/company/project surfaces
**Purpose:** Company-level operational and management starting surface.
**Primary action:** Context-dependent administrative action
**Secondary actions:** Reports, company/project management surfaces, permits/SWMS/attendance administration where authorized
**Data:** Company/project context and administrative summaries
**Loading:** Independent surface loading
**Empty:** No administrative data/action queue
**Error:** Localized feature errors
**Offline:** Authority-sensitive actions are restricted; cached data may be marked stale/provisional
**Permission:** BLOCKED where capability absent
**Destructive:** Explicit confirmation required for irreversible administrative actions
**Navigation:** Administrative composition using shared components

## 5. QR screens

### S08 — My QR Code
**Role:** Worker
**Entry:** Worker Home / QR feature
**Exit:** Worker Home / contextual action
**Purpose:** Display worker QR identity for authorized site workflows.
**Primary action:** Display/maintain QR
**Secondary actions:** Contextual QR actions if later specified
**Data:** Worker identity, company/project context, QR payload/status, verification metadata
**Loading:** QR generation/retrieval state
**Empty:** QR unavailable — explicit error/unavailable state
**Error:** QR cannot be displayed/generated
**Offline:** Follow provisional/offline QR rules; never imply current verification if only cached authority exists
**Permission:** Identity/assignment restriction = BLOCKED
**Destructive:** Regeneration/refresh only if later authorized by domain
**Navigation:** Back to worker context

### S09 — QR Scanner
**Role:** Supervisor / authorized user
**Entry:** Supervisor Home / scanning action
**Exit:** Scan Result or back
**Purpose:** Scan a worker QR using camera.
**Primary action:** Scan
**Secondary actions:** Back; permission recovery
**Data:** Camera stream, QR payload
**Loading:** Camera initialization / processing
**Empty:** No scan detected is an active scanning state, not empty state
**Error:** Camera unavailable / scanner processing failure
**Offline:** Scan may proceed only where domain permits; result must distinguish provisional/unverifiable from verified
**Permission:** Camera permission denied is distinct from authorization blocked
**Destructive:** None
**Navigation:** Successful detection transitions to Scan Result

### S10 — QR Scan Result
**Role:** Supervisor / authorized user
**Entry:** QR Scanner detection
**Exit:** Scanner / relevant workflow
**Purpose:** Communicate result and authority state.
**Primary action:** Contextual authorized action
**Secondary actions:** Scan again / back
**Data:** QR identity, assignment, project/company context, verification state, timestamps
**Loading:** Processing state before result
**Empty:** Not applicable
**Error:** INVALID / UNASSIGNED / UNVERIFIABLE / BLOCKED states are explicit result states
**Offline:** PROVISIONAL/UNVERIFIABLE must be visually distinct from VERIFIED
**Permission:** PERMISSION DENIED / BLOCKED as separate states
**Destructive:** None
**Navigation:** Result-specific next action; return to scanner where appropriate

## 6. Attendance and time

### S11 — Attendance
**Role:** Worker / Supervisor / authorized admin surface
**Entry:** Role Home / QR workflow / attendance feature
**Exit:** Home or attendance detail/action
**Purpose:** Site attendance workflow derived from QR attendance.
**Primary action:** Role-specific attendance action
**Secondary actions:** View relevant attendance information
**Data:** Person, project, attendance event, timestamp, verification state
**Loading:** Attendance retrieval/submission
**Empty:** No attendance events
**Error:** Attendance submission/retrieval failure
**Offline:** Offline/provisional rules must be explicit; pending local events must not be presented as fully verified
**Permission:** Unauthorized attendance action = BLOCKED
**Destructive:** Any correction/reversal must use explicit domain-approved confirmation
**Navigation:** Returns to originating role context

### S12 — Timesheets
**Role:** Worker / Supervisor / Administrator according to capability
**Entry:** Role Home / attendance/time feature
**Exit:** Detail/approval or role home
**Purpose:** Timesheet review and workflow derived from attendance.
**Primary action:** Worker submission or authorized approval
**Secondary actions:** View details/history
**Data:** Attendance-derived time records, project/company, submission/approval status
**Loading:** Retrieval/submission/approval
**Empty:** No timesheets for current context
**Error:** Retrieval/submission/approval failure
**Offline:** Cached records can be displayed with stale/provisional status; authority-sensitive approval remains blocked when required authority is unavailable
**Permission:** Cross-company/project access must be blocked
**Destructive:** Reversal/edit actions require domain-defined confirmation
**Navigation:** Detail/approval returns to list preserving context

## 7. SWMS

### S13 — SWMS Library
**Role:** Worker / Supervisor / Administrator according to capability
**Entry:** Role Home / SWMS feature
**Exit:** SWMS Detail
**Purpose:** Browse accessible version-controlled SWMS.
**Primary action:** Open SWMS
**Secondary actions:** Filter/search where supported
**Data:** SWMS documents, versions, project/company scope, status
**Loading:** Document list retrieval
**Empty:** No accessible SWMS
**Error:** Retrieval failure
**Offline:** Cached documents must show version/verification freshness; unavailable current authority = UNVERIFIABLE where applicable
**Permission:** Company/project isolation enforced
**Destructive:** None for worker browsing; administrative actions are separate
**Navigation:** Open selected document

### S14 — SWMS Detail / Version
**Role:** Worker / Supervisor / Administrator according to capability
**Entry:** SWMS Library
**Exit:** Library / related workflow
**Purpose:** Read the selected version-controlled SWMS and its status/signature information.
**Primary action:** Review/acknowledge/sign where authorized
**Secondary actions:** Version/history access where supported
**Data:** Document version, scope, effective status, signatures/acknowledgements
**Loading:** Document/version retrieval
**Empty:** Document content unavailable = explicit unavailable state
**Error:** Retrieval/validation failure
**Offline:** Cached document may remain readable with stale/provisional metadata; do not imply current validation
**Permission:** Unauthorized access/action = BLOCKED
**Destructive:** Signature/acknowledgement reversal follows domain rules
**Navigation:** Back preserves library/context

## 8. Permits

### S15 — My Permits / Permit List
**Role:** Worker / Supervisor / Administrator according to capability
**Entry:** Role Home / permits feature
**Exit:** Permit Detail / create/request flow where authorized
**Purpose:** Browse permits relevant to current company/project/person.
**Primary action:** Open permit / create request where authorized
**Secondary actions:** Filter/search
**Data:** Permit records, status, project/company scope, lifecycle state
**Loading:** Permit retrieval
**Empty:** No relevant permits
**Error:** Retrieval failure
**Offline:** Cached permit data marked stale/provisional as applicable; authority-sensitive lifecycle actions may be blocked
**Permission:** Company/project isolation and capability checks
**Destructive:** Closure/suspension/revocation uses explicit domain confirmation
**Navigation:** Detail/request flow

### S16 — Permit Detail
**Role:** Worker / Supervisor / Administrator according to capability
**Entry:** Permit List / notification/contextual link
**Exit:** Permit List / lifecycle action
**Purpose:** View permit and execute authorized lifecycle actions.
**Primary action:** State-appropriate lifecycle action
**Secondary actions:** View history/details
**Data:** Permit, requester, project/company, status, timestamps, approvals
**Loading:** Retrieval/action submission
**Empty:** Not applicable
**Error:** Action/retrieval failure
**Offline:** Show cached state but block lifecycle changes requiring current authority; clearly mark stale/provisional
**Permission:** Unauthorized lifecycle action = BLOCKED
**Destructive:** Suspend/close/revoke confirmation as domain requires
**Navigation:** Successful transition updates detail and returns only when explicitly requested

## 9. Reports

### S17 — Reports
**Role:** Supervisor / Administrator according to capability
**Entry:** Role Home / reports
**Exit:** Report Detail / generation flow
**Purpose:** Access daily, weekly and monthly company/project reports.
**Primary action:** Open/generate authorized report
**Secondary actions:** Filter period/project/company; forwarding/share/print/PDF where supported
**Data:** Verified report data, project/company scope, period, hash/verification metadata
**Loading:** Retrieval/generation
**Empty:** No report available for selected scope/period
**Error:** Generation/retrieval failure
**Offline:** Previously generated reports may remain available; current generation/verification must state limitations
**Permission:** Scope isolation enforced
**Destructive:** None
**Navigation:** Detail/export/share flows return to report context

### S18 — Report Detail
**Role:** Supervisor / Administrator according to capability
**Entry:** Reports
**Exit:** Reports / share/print/PDF action
**Purpose:** View report contents and verification metadata.
**Primary action:** Share/print/PDF where supported
**Secondary actions:** Navigate report sections
**Data:** Report data, hash, period, scope, verification state
**Loading:** Report retrieval/rendering
**Empty:** Not applicable
**Error:** Rendering/retrieval failure
**Offline:** Cached report remains explicitly marked according to freshness/verification
**Permission:** Scope/access restrictions
**Destructive:** None
**Navigation:** Return preserves report filters/context

## 10. Settings / session

### S19 — Settings
**Role:** All authenticated users; content varies by capability
**Entry:** Role Home / account menu
**Exit:** Subsettings / role home
**Purpose:** Account, device/session, application and available preference controls.
**Primary action:** Context-dependent setting
**Secondary actions:** Account/session controls
**Data:** User/device/session settings
**Loading:** Settings retrieval where required
**Empty:** Not applicable
**Error:** Setting retrieval/update failure
**Offline:** Local-only settings may remain available; server-authoritative settings communicate unavailable state
**Permission:** Administrative settings restricted by capability
**Destructive:** Logout and other destructive account actions require appropriate confirmation
**Navigation:** Back to role home

### S20 — Logout Confirmation
**Role:** All authenticated users
**Entry:** Settings/account action
**Exit:** Authentication or cancel back to settings
**Purpose:** Prevent accidental session termination.
**Primary action:** LOG OUT
**Secondary action:** CANCEL
**Data:** Session state
**Loading:** Session termination
**Empty:** Not applicable
**Error:** Logout failure must not falsely claim the session was terminated
**Offline:** Local session handling must follow authentication/session architecture
**Permission:** Not applicable
**Destructive:** Logout is treated as a consequential session action
**Navigation:** Successful logout clears authenticated context and returns to Authentication

## 11. Screen-state rules

The screen inventory does not imply every screen exposes every state. Each screen must explicitly select applicable states from the shared state model.

Global applicable states:

- Default
- Loading
- Loaded
- Empty
- Error
- Offline
- Stale
- Provisional
- Blocked
- Disabled
- Submitting
- Success

## 12. Open items intentionally not invented

The following require domain/product decisions before screen implementation if they are not already defined elsewhere:

- Exact authentication methods and recovery screens
- Whether organisation and company are distinct navigational levels in every deployment
- Exact bottom-navigation destinations per role
- Exact attendance correction/reversal screens
- Exact permit creation/request screens and lifecycle-specific sub-screens
- Exact administrative management screens
- Exact report filtering/export flows
- Device registration/management screens
- Notification/inbox surfaces
- Detailed settings taxonomy

These are recorded as OPEN rather than silently converting assumptions into requirements.

## 13. Acceptance gate

- [x] Major application surfaces mapped.
- [x] Worker, supervisor and administrator home surfaces distinguished.
- [x] QR display/scanner/result surfaces mapped.
- [x] Attendance/timesheet surfaces mapped.
- [x] SWMS surfaces mapped.
- [x] Permit surfaces mapped.
- [x] Report surfaces mapped.
- [x] Authentication/context/session surfaces mapped.
- [x] Entry/exit behaviour specified.
- [x] Loading/empty/error/offline/permission behaviour specified.
- [x] Destructive and navigation consequences specified where known.
- [x] Unresolved requirements explicitly marked OPEN rather than invented.
