# M0 Architecture — Product / Architecture Contract

Milestone: M0 (§M0.3.1–§M0.3.18)
Authority: MASTER_BLUEPRINT v1.0 LOCKED (§M0.1); KIMI/OPERATING_CONTRACT.md §2 (authority hierarchy)
Skill basis: KIMI/SKILLS/02_architecture-contract.md (required §A–§Q format)
Status: architecture contract only. No implementation. No schema. No salvage promotion (§M0.4).

This document names mechanisms and required properties. Per §8.J it chooses no
language, framework, storage engine, sync algorithm, or vendor; the selections in
§8.M remain OPEN and are recorded in M0/evidence/open-items.md.

---

## §8 Compliance Matrix (verified at M0 per §8.K)

Disposition vocabulary: SATISFIED = the architecture below names a mechanism that
satisfies the constraint at contract level, with a named verification path.
DEFERRED = permitted only where §8 permits, with target milestone and test —
none is deferred. UNVERIFIABLE = the constraint is declared but undefined in the
blueprint; recorded as an ambiguity, not resolved here (Skill 01, SILENT class).

| Constraint | Disposition | Mechanism / section |
|---|---|---|
| AC-ARCH-A1 | SATISFIED | Four-class storage discipline, §C below |
| AC-ARCH-A2 | SATISFIED | Single identity per entity, §B below |
| AC-ARCH-A2a | SATISFIED | TransferEvent successor linkage, §B below |
| AC-ARCH-A3 | SATISFIED | E representation from creation fact + history, §C below |
| AC-ARCH-A4 | SATISFIED | No stored status/boolean/flag authoritative, §C/§E below |
| AC-ARCH-B1 | SATISFIED | Company tenancy boundary at storage, §A below |
| AC-ARCH-B2 | SATISFIED | Site operational boundary, §A below |
| AC-ARCH-B3 | SATISFIED | Cross-tenant references via transfer model only, §A below |
| AC-ARCH-B4 | SATISFIED | Device as Platform-scoped E, §N below |
| AC-ARCH-C1 | SATISFIED | Durable local commit before success, §H below |
| AC-ARCH-C2 | SATISFIED | Stable client-generated command identity, §F/§G below |
| AC-ARCH-C3 | SATISFIED | Atomicity per authority boundary, §F below |
| AC-ARCH-C4 | SATISFIED | Per-entity ordering, §I below |
| AC-ARCH-C5 | SATISFIED | Explicit terminal outcomes, six-state vocabulary, §F below |
| AC-ARCH-C5a | SATISFIED | "confirmed" permitted as UI label only, §F below |
| AC-ARCH-C6 | SATISFIED | Per-entity-class conflict semantics, §J below |
| AC-ARCH-C7 | SATISFIED | Reconciliation converges or discloses, §I below |
| AC-ARCH-C8 | SATISFIED | Two-sided source-of-truth, §I below |
| AC-ARCH-C9 | SATISFIED | CommandOutcome retention, §F/§K below |
| AC-ARCH-C10 | SATISFIED | Structural operations connectivity-required, §H below |
| AC-ARCH-D1 | SATISFIED | Audit derivable from facts, §K below |
| AC-ARCH-D2 | SATISFIED | Common audit fields on every F record, §K below |
| AC-ARCH-D3 | SATISFIED | Actor/subject distinction, §K/§M below |
| AC-ARCH-D4 | SATISFIED | No operational mutation/deletion of F, §D below |
| AC-ARCH-D5 | SATISFIED | Device attribution on facts, §N below |
| AC-ARCH-D6 | SATISFIED | Offline/online audit parity, §K below |
| AC-ARCH-E1 | SATISFIED | Every D recomputable from E+F, §E below |
| AC-ARCH-E2 | SATISFIED | Freshness state four-valued, §L below |
| AC-ARCH-E3 | SATISFIED | No derived state as input to facts, §E below |
| AC-ARCH-E4 | SATISFIED | Aggregate derivability, §E below |
| AC-ARCH-F1 | SATISFIED | Offline preconditions documented, local rejection with reason, §H below |
| AC-ARCH-F2 | SATISFIED | Operational continuity, §H below |
| AC-ARCH-F3 | SATISFIED | Observable sync state, §I/§L below |
| AC-ARCH-F4 | SATISFIED | No silent queue loss, §H below |
| AC-ARCH-G1 | SATISFIED | Idempotent server application, §G below |
| AC-ARCH-G2 | SATISFIED | Terminal failure visibility, §F/§I below |
| AC-ARCH-G3 | SATISFIED | Recovery after restart, §H below |
| AC-ARCH-G4 | SATISFIED | No partial mutation, §D/§F below |
| AC-ARCH-G5 | SATISFIED | Clock drift explicit rejection, §I below |
| AC-ARCH-H1 | SATISFIED | Soft delete only on user paths, §D below |
| AC-ARCH-H2 | SATISFIED | Site archival preserves facts, §D below |
| AC-ARCH-H3 | SATISFIED | Company offboarding is archival, §D below |
| AC-ARCH-H4 | SATISFIED | Facts capture resolved values at creation, §C below |
| AC-ARCH-H5 | SATISFIED | Retention destruction sole mechanism, §O below |
| AC-ARCH-I1 | SATISFIED | Asset taxonomy closed in v1, §C below |
| AC-ARCH-I2 | SATISFIED | Requirement types fixed in v1, §C below |
| AC-ARCH-I3 | SATISFIED | Event vocabulary fixed, §D below |
| AC-ARCH-I4 | SATISFIED | No field-operational entity/fact in two Sites, §A below |
| AC-ARCH-0.1 through AC-ARCH-0.8 | CLOSED — AMB-001 RESOLVED | §8.K as amended (commit 0eefbd6, operative package EP-2.0) states these identifiers were a drafting artifact, consolidated into M0-AC-1 through M0-AC-10 during blueprint finalisation; no separate criterion set exists. Nothing to disposition beyond the M0-AC set. |

No constraint is DEFERRED. All 43 defined constraints are SATISFIED by named
mechanisms below. AMB-001 is RESOLVED (2026-09-27): §8.K as amended under
EP-2.0 identifies M0-AC-1 through M0-AC-10 as the operative criteria, so the
§8-verification completeness claim within M0-AC-1 is fully evidenced.

---

## §A. Tenancy and scope isolation (M0.3.1)

Anchors: §7 DM-INV-5 (Company is the tenancy boundary), DM-INV-6 (Site is the
operational boundary), §7.4 (ownership), §8 B1–B4, §6.11 AD-INV-9 (isolation
enforced at storage).

Mechanism:

1. Every persisted record except Platform-owned records carries a mandatory
   `company_id` tenancy key; every field-operation record additionally carries a
   mandatory `site_id` operational key (§7.4 ownership table, realised in
   M0/persistence-model.md).
2. Enforcement is at storage, not at application: the server store must evaluate
   tenancy on every read and write path, including administrative, reporting,
   sync, and internal batch paths (B1; §M0.3.1 clarification: "we use RLS" is
   not satisfaction — bypass paths must be addressed).
3. Bypass-path analysis (required by §M0.3.1):
   - Privileged store roles (migration, replication, backup, analytics) can
     physically bypass row-level filtering. Mitigation at contract level:
     privileged roles are non-serving (no application traffic), enumerated, and
     their use is itself audited; the serving role has no bypass grant.
   - Server-side function paths (stored procedures / RPC) execute with elevated
     privilege. Mitigation: every such path re-derives the caller's Company and
     Site scope from the authenticated identity and asserts it inside the
     transaction; no path accepts a caller-supplied company_id.
   - Sync ingress (§I) is a write path and applies the same assertion per
     command envelope.
   - Reporting/export (D only) reads through the same filtered serving role.
   - Platform Admin has no operational authority over a Company's field actions
     (§6.11.2) and no path to mutate Company F records (AD-INV-2, B3).
4. Site boundary: no field-operational entity or fact belongs to multiple Sites
   (§8 I4); containment entities (Project, Company) unaffected. Cross-Site
   references are by identity, never containment (§7.6).
5. Pre-M1 verification test (testable before M1, per M0-AC-7): a structural test
   against the server persistence definition asserting (a) every Company-scoped
   table declares the tenancy key, (b) every field-operation table declares the
   site key, (c) the serving role holds no bypass grant, (d) every server-side
   write path contains the scope assertion. Named:
   `m1-gate/tenancy-isolation.structural.test` — executed at M1 gate against the
   M1 schema before any feature code is accepted.

## §B. Identity (M0.3.2)

Anchors: §7 DM-INV-1 (identity stable, never reused), DM-INV-11 (no entity has
two identities), §8 A2/A2a, §6.3 WC-INV-1/2/3 (Person Platform-scoped; Worker
Company-scoped membership; CompanyMembership not renameable).

Mechanism:

1. Identity is generated where the entity is born (§7.4): client-generated for
   offline-born field entities, server-generated for server-born structural
   entities; in both cases a single opaque globally-unique identifier is the
   only identity — no client/server dual-keying (A2).
2. Identity is never reused and never rewritten. Project transfer creates a
   successor identity linked via TransferEvent; the old identity remains
   unreferenced and unreused (A2a, §7.4).
3. Person identity is Platform-scoped and globally unique at Platform level,
   visible only to Companies where the Person holds membership (§7.15 open
   decision record). Worker is Company-scoped membership — an E entity, not a
   rename of AC-04's CompanyMembership (§12 critical leak note).
4. Command identity (§F) is distinct from entity identity and is likewise
   client-generated and stable (§8 C2, §6.10 OS-INV-4).

## §C. E/F/C/D persistence (M0.3.3)

Anchors: §7.2 (four classes, no fifth), §7.5 (lifecycle classification), §8
A1–A4, H4, I1, I2.

Mechanism:

1. E: identity row + creation fact + immutable domain facts; current
   representation derived (A3). Materialised projections permitted, never
   authoritative (A4). Mutable E attributes are never sole authority.
2. F: write-once records; no update path exists in the model (see §D).
3. C: authoritative current-value records, admin-mutated only (§7.5); every C
   mutation emits a ConfigChangeEvent F record capturing the resolved value
   (H4 — configuration history not required because facts capture resolved
   values, §7.15).
4. D: recomputable projections; materialisation optional (§7.7); see §E.
5. Full per-type mapping: M0/conceptual-model-mapping.md. Four-class closure is
   asserted there: no fifth kind (§7.2).
6. v1 closures: asset taxonomy closed (I1, §6.2 taxonomy); requirement type set
   fixed (I2); event vocabulary fixed (I3, §D).

## §D. Immutable facts (M0.3.4)

Anchors: §7 DM-INV-2 (append-only), DM-INV-8 (soft delete), §8 D4, G4, H1–H3,
I3.

Mechanism:

1. F records are append-only at both authority boundaries. No user-reachable
   path updates or deletes an F record (D4). Corrections are additive
   (§6.7 QA-INV-12; §6.4 PreStartCorrection).
2. No cascade delete may reach an F record; archival is a state change, never
   removal (H1, H2; §6.10 OS-INV-11). Company offboarding is archival, not
   purge (H3). The sole destruction mechanism is §O (H5).
3. Event vocabulary is the §7.3 F catalogue; new event types require blueprint
   amendment (I3, DM-INV-12).
4. Fact application is atomic within each authority boundary — all facts of a
   command apply in full or not at all, locally and server-side (G4, §6.10
   OS-INV-8; see §F for the boundary distinction).

## §E. Derived state (M0.3.5)

Anchors: §7 DM-INV-3 (derived never authoritative), §7.7 (three rules), §8
E1–E4, §4 (company_ready / site_ready derived predicates, §7.11 RESOLVED).

Mechanism:

1. Every D record is recomputable from E and F records alone (E1). Derivation
   definitions are named per read model in M0/conceptual-model-mapping.md.
2. Derived state is never authoritative (DM-INV-3) and is never an input to
   fact creation (E3) — commands validate against F-record state (and cached
   derivations offline, disclosed as such), never against materialised D rows
   as authority.
3. Materialisation is an implementation choice (§7.15); any materialised D may
   be dropped and recomputed without loss.
4. Freshness is a product fact (§7.7 rule 3) — see §L.
5. Aggregates (WorkArea/Site/Project progress, §6.6 PR-INV-11; timesheets,
   §6.5) are always computed, never stored as authority (E4).
6. No stored status, boolean, or flag is authoritative for a derived value
   (§8 A4; §M0.2 prohibition). Physical columns are permitted only as
   materialisations, C records, or internal indexes.

## §F. Command processing + CommandOutcome (M0.3.6, M0.3.7)

Anchors: §M0.3.7 (six-state vocabulary), §6.10.3 (sync state per command), §8
C3, C5, C5a, C9; §6.9.3 (report commands produce CommandOutcome, not F).

Mechanism:

1. Every mutation intent is a command with one stable, client-generated command
   identity that persists across retries, restarts, and duplicate delivery
   (C2, OS-INV-4) and is carried on every produced record (local F, server F,
   CommandReceipt, CommandOutcome) — one identity across all layers (§M0.3.7).
2. CommandOutcome vocabulary is exactly the six §M0.3.7 states with explicit
   local/server distinction:
   - locally rejected — failed local precondition validation; terminal; not
     queued (§M0.3.7; §8 F1).
   - locally committed — durable local commit achieved; queued for
     transmission.
   - server accepted — server applied the command exactly once.
   - server rejected — server refused with reason; terminal for the command;
     preserved as an auditable record (C9).
   - server failed — terminal transmission/application failure; surfaced,
     actionable (§8 G2).
   - server conflicted — resolved by the declared per-entity-class rule (§J);
     outcome audited.
   "confirmed" is permitted as a UI label for server accepted only (C5a).
3. Atomicity is scoped per authority boundary (C3): client and server do not
   perform identical mutations; each applies a command's facts atomically
   within its own store (G4).
4. CommandOutcomes are F-class records retained independently of domain fact
   production (C9) — including for rejected, failed, and conflicted commands
   and for report/export commands (§6.9.4: no ReportRequested/Ready/Failed F).
5. Full command model: M0/command-sync-model.md.

## §G. Idempotency (M0.3.8)

Anchors: §8 G1, C2; §6.10.3 (duplicate delivery applied once); §7.10
(CommandReceipt guarantees idempotency).

Mechanism:

1. Server maintains CommandReceipt (F, Platform, §7.4) keyed by command
   identity. First delivery applies the command and writes the receipt in the
   same atomic transaction (G1, G4); duplicate deliveries match the receipt
   and return the recorded outcome without reapplication.
2. Client dedupe: a command identity is generated once per logical action and
   reused across retries and restarts (C2); retransmission after uncertain
   delivery is therefore safe (§7.12: local without receipt → retransmit,
   idempotent; duplicate F-records → one receipt).
3. Domain-level idempotency declared per §6 where the blueprint requires it
   (e.g., §6.4 duplicate acknowledgement idempotent per
   (worker, content item, work date); §6.5 duplicate command ACCEPT).

## §H. Offline durable intent (M0.3.9)

Anchors: §6.10 OS-INV-1/2/3/12, §8 C1, C10, F1–F4, G3.

Mechanism:

1. Local commit sequence (C1, OS-INV-3): validate locally → write durable local
   record (command + resulting local F records + queue entry) in one atomic
   local transaction → only then show committed state → transmit in background.
   "Saving…" states for offline-capable actions are prohibited (§6.10.3).
2. Documented local preconditions per offline-capable action (F1); unmet
   precondition ⇒ locally rejected with a specific reason; no partial queue
   entry is created (Skill 05 checklist).
3. Offline-mutating / read-only / connectivity-required classification per
   §6.10.2 with the full coverage table in M0/offline-reconciliation-model.md.
   Structural/administrative operations are connectivity-required (C10) and do
   not enter the offline queue (§6.11.3).
4. Queue: per-command independent success/failure; bounded automatic retries;
   manual retry only on terminal failure; no all-or-nothing across the queue;
   no silent eviction or loss (F4, OS-INV-2); committed commands survive
   restart (G3) and are retained until confirmed or explicitly abandoned with
   reason (§6.10.3).
5. Prolonged offline is a state, not an error (OS-INV-12); warning thresholds
   are OPEN (24h/72h draft, §6.10.8) — recorded in open-items.md.

## §I. Sync and reconciliation (M0.3.10)

Anchors: §6.10.3–6.10.5, §7.10 (two-sided source-of-truth), §8 C4, C7, C8, G5,
F3.

Mechanism:

1. Two-sided source-of-truth (C8, §7.10): local E/F records are source-of-truth
   for the local slice until server-confirmed (DM-INV-10/10a); server F records
   are created on receipt. Neither side is a cache of the other. Server
   authority is explicit and enumerated: server-governed validation,
   uniqueness, authorization, conflict resolution, and designated state
   transitions (DM-INV-10; §6.10.2 connectivity lists).
2. Ordering is per-entity, not global (OS-INV-9, C4): causally related commands
   on the same entity apply in user-performed order; dependencies are enforced
   locally before queueing.
3. Reconciliation (C7, OS-INV-5): on reconnect, compare local and server state;
   retire succeeded commands; surface rejected/failed with reason and options;
   resolve server-side conflicts by the declared §J rule, audited; detect
   divergence, attribute it to specific commands, and converge or disclose —
   never silently overwrite (§6.10.3).
4. Connectivity loss mid-transmission: local commit preserved, command returns
   to queued, no partial server state (G4).
5. Clock drift (G5): device timestamp is recorded as captured; server
   revalidation failures caused by drift are explicit rejections with reason —
   never silent reordering.
6. Sync state is observable per action (F3, OS-INV-7): committed → queued →
   transmitting → accepted / rejected / failed (§6.10.3), plus conflicted.
7. Full model: M0/command-sync-model.md, M0/offline-reconciliation-model.md.

## §J. Per-entity conflict rules (M0.3.11)

Anchors: §8 C6 (no global LWW), §6.10.3 conflict table, §6.4.3, §6.5.8, §6.6.3,
§6.7 Amendment 2.

"Last write wins" is not a global default. Every conflicting entity class has a
declared rule; the complete table is in M0/command-sync-model.md §Conflict
rules. Summary of anchors: same worker same field → later wins, both recorded;
shift boundaries → attempted conflict locally rejected, user prompted; evidence
attachment → additive; blocker/QA transitions → server-authoritative current
state with declared transition ordering, concurrent transitions preserved;
readiness-gate violation at sync → rejected, preserved as rejected record;
completion claims → additive; task transitions → later wins; verifications →
single (concurrent second rejected); reversals → additive, independently
resolved; reassignment → later wins; pre-start closure → first accepted wins;
participant/acknowledgement → additive, idempotent; C-record changes → declared
ordering, both audited.

## §K. Audit (M0.3.12)

Anchors: §7.8 (AuditTrail = DomainFacts ∪ CommandOutcomes), §7 DM-INV-9, §8
D1–D6.

Mechanism:

1. Audit is derivable from facts (D1): AuditTrail is a projection over
   DomainFacts (F records about domain entities) and CommandOutcomes (F records
   about command processing). No parallel audit store exists — this is
   prohibited explicitly (§M0.2; AD-INV-2: no administrative fact layer
   separate from §7's F-record union; admin surfaces are read-only over the
   same projection, §6.11.3).
2. Every F record carries the minimum common audit fields (D2, §7.8): event
   identity, command identity, actor, device identity, device timestamp, server
   sync timestamp, reason where required — plus the per-section additions
   (§6.4.6, §6.5.6, §6.6.6, §6.7.6, §6.9.6, §6.10.6).
3. Actor ≠ subject is universal (D3, §7.6).
4. Device attribution on every fact (D5) — see §N.
5. Offline and online actions are audited with identical fidelity (D6,
   OS-INV-6); the only difference is the server sync timestamp.
6. Rejected commands never disappear from the audit trail: their CommandOutcome
   is retained (C9).
7. Full model: M0/audit-model.md.

## §L. Freshness (M0.3.13)

Anchors: §8 E2, §7.7 rule 3, §6.9.3 (freshness on reports and exports), §6.10.3
(sync indicator).

Mechanism:

1. Freshness is a state, not a universal timestamp (E2), with four values:
   locally committed / server-confirmed / stale / unknown.
2. Every D surface and every cached read exposes its freshness state
   (§6.10.3 user-facing sync indicator; §6.9.3 report freshness including
   freshness at export on ReportExportEvent).
3. Stale data is never presented as current; locally committed facts are never
   presented as server-confirmed (Skill 07 adversarial probes F1/E2).

## §M. Authorization (M0.3.14)

Anchors: §2 (roles; capabilities are flags; permission = role × scope ×
membership), §7 DM-INV-4/4a (ownership vs operational scope), §6.11 AD-INV-1,
AD-INV-10.

Mechanism:

1. Authorization decision = role × scope × membership (§2): role (Worker,
   Supervisor, Company Admin, EPC-Client, Platform Admin) × operational scope
   (Platform/Company/Project/Site) × membership (Worker is Company-scoped
   membership, §6.3 WC-INV-2).
2. Capabilities are flags on membership (§2; §6.11 CapabilityGrant F), distinct
   from roles; capabilities gate field actions, admin roles gate administrative
   actions — admin surfaces are not a second permission system (AD-INV-10).
3. Overrides are named, reasoned, attributed domain facts (AD-INV-4): the three
   v1 overrides (force-close shift, dismiss blocker, reverse verification)
   produce canonical domain F records (§6.11.3).
4. Enforcement points: local precondition check (offline, against cached
   authority, disclosed) + server revalidation (authoritative) per command
   (§6.10 conflict table; DM-INV-10).
5. Full model: M0/authorization-scope-model.md.

## §N. Device identity (M0.3.15)

Anchors: §7.3 Device (E, Platform), §7.13 AC-DM-20–23, §8 B4, D5, §7.15
(physical DeviceInstallation representation is an implementation choice; must
not introduce a second identity).

Mechanism:

1. Device is a Platform-scoped E entity (B4) with a single stable identity;
   every fact carries device identity (D5).
2. The physical installation representation (per-device app instance) is an
   OPEN implementation choice (§8.M) constrained to: it references the Device
   identity and must not introduce a second device identity (§7.15). AC-04's
   device_installations is FREEZE pending this decision (§12 SR-001.2; §6.3.8
   deviceRegistrationService FREEZE).

## §O. Retention destruction (M0.3.16)

Anchors: §8 H5, §6.11.4 (RetentionDestructionEvent F, Platform), §7.9.

Mechanism:

1. Retention destruction is the only mechanism by which F records may cease to
   exist (H5): Platform-initiated, policy-permitted, never reachable from any
   user or Company path (D4).
2. Every destruction is recorded as a RetentionDestructionEvent (F, Platform)
   that is not part of any Company's retention set and survives the destruction
   it causes; it references the destroyed records, the retention policy
   version, and the Platform actor (§6.11.4).
3. Retention windows are DEFERRED to Platform retention policy (§7.15) — an
   open decision, recorded in open-items.md, not an architecture gap.

## §P. Android / local persistence (M0.3.17)

Anchors: §8.J (engine not dictated), §8.M (local storage engine OPEN), §8
C1–C4, F1–F4, G3–G4; §6.10.4 (local source-of-truth types).

Mechanism (required properties, not products):

1. Local store must support atomic multi-record transactions (local commit +
   local F records + queue entry in one transaction — C1/C3/G4), durable
   writes across process death (G3), and per-entity ordered replay (C4).
2. Local logical schema mirrors the four classes (§C): LocalCommand,
   LocalEntityState, QueueEntry, LocalAuditEvent are the local source-of-truth
   types (§6.10.4); derived read models are recomputable local projections.
3. Local schema versioning and migration is required; migrations must never
   rewrite F records (DM-INV-2).
4. Engine selection is OPEN (§8.M) and is not made at M0.

## §Q. Server persistence (M0.3.18)

Anchors: §8.J/§8.M (server storage and tenancy mechanism OPEN), §8 B1 (tenancy
at storage), D4 (no F mutation path), G1 (idempotent application), §6.10.4
(server source-of-truth types).

Mechanism (required properties, not products):

1. Server store must express: append-only F storage with no update/delete path
   reachable by any serving role (D4); E identity + derivation model (A3);
   C current-value storage; CommandReceipt idempotency keyed by command
   identity (§G); ServerEntityState, ServerAuditEvent, CommandReceipt as
   server source-of-truth types (§6.10.4).
2. Storage-level tenancy enforcement with the §A bypass-path analysis applied;
   the serving role holds no bypass grant.
3. Transactional application of a command's full fact set (G4) including the
   CommandReceipt write (G1).
4. Server storage engine and tenancy mechanism are OPEN (§8.M); not chosen at
   M0.

---

## Cross-cutting prohibitions restated (§M0.2)

The following are prohibited by §M0.2 and are closed by this architecture:

- Stored domain booleans acting as authoritative state — closed by §C/§E
  (AC-ARCH-A4): no stored status, boolean, or flag is authoritative.
- Mutable E attributes as sole authority — closed by §C (AC-ARCH-A3).
- Derived values presented as source of truth — closed by §E: derived state is
  never authoritative (DM-INV-3).
- Parallel audit store — closed by §K: no parallel audit store; audit derives
  from F ∪ CommandOutcome only (§7.8; AD-INV-2).
- Any shadow reporting/messaging/notification/admin layer writing outside the
  F-record model — closed: reports are D only (REP-INV-1, REP-INV-10);
  communication creates no domain facts (COM-INV-2, COM-INV-10); administration
  produces canonical domain F records and no separate admin log (AD-INV-2);
  platform notifications in v1 carry no domain content (§6.8.9).
- No derived state is an input to fact creation (AC-ARCH-E3) — §E rule 2.

## Ambiguities and open items

- AMB-001 — RESOLVED 2026-09-27 (Maddy McKellar): §8.K was a drafting
  artifact; AC-ARCH-0.1 through AC-ARCH-0.8 were consolidated into M0-AC-1
  through M0-AC-10 during blueprint finalisation; no separate criterion set
  exists. §8.K amended at commit 0eefbd6; operative package EP-2.0. Full
  record in M0/evidence/open-items.md.
- §8.M open selections (local storage engine; sync algorithm; per-class
  conflict mechanisms; physical DeviceInstallation representation; server
  storage and tenancy mechanism; audit materialisation strategy) remain OPEN
  per §8.J and are tracked in open-items.md.
