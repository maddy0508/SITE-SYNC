# M0 Persistence Model — local + server

Authority: MASTER_BLUEPRINT §7.4 (ownership, identity, scoping), §7.10 (two-sided
source-of-truth), §6.10.4 (local/server source-of-truth types), §8 A1–A4, B1–B4,
C1–C4, D4, G1/G4, H1–H5; M0/architecture.md §C/§P/§Q.
Technology-neutral per §8.J: storage engines are OPEN (§8.M); this document
defines required structures and properties only.

## 1. Server persistence (M0.3.18)

### 1.1 Tenancy and scope keys (AC-ARCH-B1/B2, DM-INV-5/6)

Every server table carries its ownership scope as mandatory, non-nullable keys:

| Scope | Key | Applies to |
|---|---|---|
| Platform | none (Platform-rooted) | Company (tenancy root), Person, Device, CommandReceipt, RetentionDestructionEvent |
| Company | `company_id` | Worker, ExternalParty, WorkerQrIdentity, Crew, CrewMembership, Company-scoped Requirement, Company C records (RoleCapability, CompanyBrandConfig, ReportConfig, CompanyOnboardingConfig), Invitation, CapabilityGrant, ReportExportEvent, WorkerProfileChange, WorkerLifecycleEvent, WorkerQrIdentityEvent |
| Project | `company_id` + `project_id` | Site, ProjectAssignment, ProjectExternalParty, Project-scoped Requirement, ProjectOnboardingConfig |
| Site | `company_id` + `project_id` + `site_id` | WorkArea, Asset, SiteAssignment, CrewSiteAssociation, PreStartContent, PreStart, Site-scoped Requirement, SiteShiftBoundaryConfig, SiteOnboardingConfig, and every field-operation F record (AttendanceEvent, CorrectionEvent, TimesheetApprovalEvent, TaskTransition, TaskAssignment, CompletionClaim, CompletionClaimWithdrawal, CompletionVerification, Reversal, ReversalResolution, Evidence, QaTransition, BlockerTransition, BlockerAssignment, AssetGeometryEvent, AssetLifecycleEvent, AssetWorkAreaAssignment, PreStartContentRevision, PreStartContentItem, PreStartLifecycleEvent, PreStartParticipant, PreStartCorrection, DailyLogEntry, HandoverRecord) |

- No field-operational entity or fact may reference two Sites (AC-ARCH-I4).
- Cross-scope references by identity, never containment (§7.6).
- Cross-tenant references only via TransferEvent successor linkage and Platform
  audit records (AC-ARCH-B3).

### 1.2 Class storage discipline (AC-ARCH-A1–A4)

- **E tables**: identity key + creation-fact reference. No mutable attribute
  columns carrying sole authority; current representation derived (A3).
  Materialised projection tables may exist, marked non-authoritative (A4).
- **F tables**: append-only. The serving role holds INSERT/SELECT only — no
  UPDATE/DELETE grant on any F table (D4). No cascade delete reaches an F table
  (H1). Retention destruction is performed by a separate Platform retention
  role that writes RetentionDestructionEvent first (H5).
- **C tables**: current-value rows, UPDATE permitted to the admin serving path
  only, every update emitting ConfigChangeEvent in the same transaction (H4).
- **D**: projections; recomputable; droppable (E1).

### 1.3 Command/idempotency storage (AC-ARCH-G1, C9)

- `command_receipt` (CommandReceipt, Platform): keyed by client-generated
  command identity; written atomically with the command's fact application.
- `command_outcome` (CommandOutcome): one terminal record per command
  (accepted/rejected/failed/conflicted), retained independently of domain fact
  production (C9), carrying the six-state vocabulary with local/server
  distinction (§M0.3.7).

### 1.4 Enforcement (AC-ARCH-B1, §M0.3.1)

- Storage-level tenancy filtering on the serving role for every query and
  mutation; every server-side write path re-derives caller scope from the
  authenticated identity and asserts it in-transaction; no path accepts a
  caller-supplied tenancy key (see architecture.md §A bypass-path analysis).
- Server source-of-truth types per §6.10.4: ServerEntityState,
  ServerAuditEvent, CommandReceipt.

## 2. Local (Android) persistence (M0.3.17)

Anchors: §6.10.4, §8 C1–C4, F1–F4, G3/G4.

### 2.1 Local source-of-truth types (§6.10.4)

| Local type | Contents | Properties |
|---|---|---|
| LocalCommand | command identity, actor, entity target, intent, payload, device timestamp, state | durable; identity stable across retries/restarts (C2); atomic write with its facts (C1/C3) |
| LocalEntityState | local slice of E/F records (source-of-truth for the slice until confirmed, DM-INV-10/10a) | append-only for F; E identity + facts |
| QueueEntry | command identity, per-entity ordering key, retry state, terminal failure reason | per-command independence; no silent eviction (F4); survives restart (G3) |
| LocalAuditEvent | audit fields identical to server (D6) | immutable; merged into audit projection on sync |

### 2.2 Local derived read models

Recomputable projections for offline reads (§6.10.2 read list): own readiness,
assigned Sites and status, cached crew/contact lists, cached pre-start content,
sync indicator per action. Each carries freshness state (E2). Engine selection
OPEN (§8.M); required properties: atomic multi-record transactions, durable
writes, per-entity ordered replay (architecture.md §P).

## 3. Identity and keys (AC-ARCH-A2)

Single identity per entity, generated where born; no client/server dual-keying;
local and server identity for the same entity are identical (A2, DM-INV-11).
Project transfer: successor identity via TransferEvent (A2a).

## 4. Lifecycle (AC-ARCH-H1–H5)

Soft delete/archival only on user paths (H1–H3); F records never operationally
deleted; C records may be deleted only if non-historical (§7.9); D never
explicitly deleted; destruction solely per architecture.md §O (H5).
