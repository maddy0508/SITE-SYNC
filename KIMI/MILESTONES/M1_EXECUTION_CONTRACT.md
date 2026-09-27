# M1 Execution Contract
Version: 1.0 — LOCKED
Status: EXECUTION PERMITTED
Implementation: PROHIBITED until M1 acceptance passes

*Sections marked (you) are addressed to the agent operating under the EP.
Other sections define the M1 contract neutrally.*

## Current milestone
M1 — Identity, Company & Onboarding

## Preconditions

M1 execution may begin only when all of the following hold:

1. This contract is approved by the human and frozen as part of EP-3.0.
2. EP-3.0 is tagged and verified.
3. The executor preflight (E-01 through E-14) has been re-run against
   EP-3.0 and returned READY.

Until (1)–(3) hold, M1 implementation is prohibited. Drafting this
contract does not authorise implementation. Contract approval and
implementation authorisation are separate decisions.

## Authoritative inputs

| # | Input | Location | Status |
|---|---|---|---|
| 1 | Master Blueprint | MASTER_BLUEPRINT/MASTER_BLUEPRINT.md | LOCKED (EP-2.0) |
| 2 | Kimi Operating Contract | KIMI/OPERATING_CONTRACT.md | LOCKED |
| 3 | Skills | KIMI/SKILLS/ | LOCKED |
| 4 | M0 Execution Contract | KIMI/MILESTONES/M0_EXECUTION_CONTRACT.md | LOCKED |
| 5 | M0 accepted architecture | M0/ @ a72a31f (accepted) | ACCEPTED EVIDENCE |
| 6 | Salvage register | M0/salvage-register.md | CURRENT |
| 7 | AC-04 baseline | EVIDENCE/AC-04_BASELINE/ | PARTIAL |
| 8 | Blueprint sections governing M1 | §4, §6.1, §6.3, §6.11, §7, §8 | LOCKED |

Baseline repository: maddy0508/SITE-SYNC
Baseline commit:     f90b77ab73cb7ae20b1084ad94fb5bc159afa841
M0 accepted evidence commit: a72a31f00fa86ea3f2e625d7f92fa1822301749d
EP-2.0 tag:          276c7994b5c0cbfd88ed4d5cb4587a7bd46a0adb

## M1 objective

Deliver the Identity, Company & Onboarding vertical of SITE-SYNC: the
behaviours that establish Person identity, Company-scoped Worker
membership, Company setup and invitation, onboarding requirements and
their satisfaction facts, capability grants, Worker lifecycle, minimal
Project/Site assignment context required for readiness, Worker QR
identity, and the derived `company_ready(worker)` and
`site_ready(worker, site)` states. M1 is the first implementation
milestone and must establish these behaviours without implementing
later operational domains.

## In-scope — entities and their lifecycles

The following §7 entities are in scope. Each is implemented in its §7
class (E / F / C / D) per the accepted M0 architecture.

**Identity and membership**
- Person (E, Platform)
- Worker (E, Company) — the Company-scoped membership
- WorkerProfileChange (F)
- WorkerLifecycleEvent (F)
- Invitation (F)
- CapabilityGrant (F)
- Device (E, Platform) — enough to attribute M1 facts; full device
  lifecycle is out of scope

**Onboarding requirements**
- Requirement (Company / Project / Site scoped, versioned)
- RequirementSatisfaction (F) — one of the three §7 subtypes:
  DocumentRevision, InductionCompletion, Acknowledgement

**Readiness (derived)**
- `company_ready(worker)` (D)
- `site_ready(worker, site)` (D)
- `profile_complete(worker)` (D)

**Minimal Project and Site scaffolding — identity and scoping only**

- Project (E, Company): creation, containment of Sites, association
  with a Company.
- Site (E, Project): creation, containment in later milestones,
  association with a Project.
- ProjectAssignment (E): creation, scoping a Worker to a Project.
- SiteAssignment (E): creation, scoping a Worker to a Site; required
  for `site_ready` per §4.4.

The M1 Project/Site scaffolding exists **only** because `site_ready`
and later milestone entry points require Site and Assignment context.

**Lifecycle boundary.** M1 implements only the lifecycle state and
creation transition required by the Blueprint to establish the
Project/Site identity and containment context:

- Project entry state: `draft` (§6.1.3).
- Site entry state: `planned` (§6.1.3).

M1 does not implement subsequent Project/Site lifecycle transitions or
lifecycle-management operations. Specifically, no M1 code path may
transition a Project or Site into `active`, `suspended`, `completed`,
`cancelled`, `archived`, `mobilising`, `demobilising`, or `closed`.
Those transitions belong to M2.

M1 does not implement ExternalParty or ProjectExternalParty. M1 does
not implement Site closure, suspension, or assignment removal beyond
`assigned` / `active` states.

M1 verifies this boundary structurally (M1-AC-14).

**QR identity**
- WorkerQrIdentity (E, Company)
- WorkerQrIdentityEvent (F)

**Command and audit substrate (per §6.10 and M0 architecture)**
- CommandOutcome (F)
- CommandReceipt (F)
- Local command queue and durability (per §6.10)

**Note on RequirementSatisfaction representation.** §7.3.2 defines
RequirementSatisfaction as an F record with exactly one subtype:
DocumentRevision, InductionCompletion, or Acknowledgement. The word
"subtype" denotes the conceptual relationship in §7; it does **not**
authorise a new persistence class, inheritance hierarchy, or
polymorphic storage beyond what §7 and the accepted M0 architecture
specify. M1 implements the §7 model exactly, using the canonical §7
fact names.

## In-scope — behaviours

1. **Company setup flow.** A new Company is created. The creating
   Person is associated with that Company through a Worker membership
   and a CapabilityGrant conferring Company Admin (§6.11.3, §6.11.4).

2. **Person → Worker registration.** A Person may be invited to a
   Company by reference (existing Person) or created at invitation
   acceptance. A Worker E entity is created on the `registered`
   transition (§6.3.2).

3. **Worker lifecycle.** Registered → active → suspended → active →
   offboarded. Lifecycle events recorded as F records.

   M1 enforces the offboarding preconditions against all artifact
   classes implemented by M1. Absence of a later-milestone artifact
   class is not itself an authorization to bypass a blueprint-defined
   precondition; later artifact classes become additional enforcement
   obligations in their respective milestones.

   Where §6.3.3 requires an offboarding precondition against an
   artifact class that M1 has not implemented, M1's implementation
   must distinguish:

   - **"no applicable open artifacts exist"** — the correct M1
     outcome when the artifact class does not exist yet; and
   - **"later artifact classes are ignored"** — prohibited.

   The distinction is enforced by ensuring the M1 offboarding code
   checks the classes it can check and does not short-circuit on
   unimplemented classes.

4. **Worker profile derivation.** A Worker's current profile is
   recomputed from its creation fact plus WorkerProfileChange events.
   No stored authoritative profile field.

5. **Capability grants.** Grant / revoke capabilities on a Worker,
   attributed. Capability set per §6.3.9; M1 implements the flags but
   only the Company Admin and Supervisor flags gate actions that exist
   in M1.

6. **Invitation lifecycle.** Pending → accepted (Worker created) |
   cancelled | expired. Invitation is a distinct identity from Worker.

7. **Requirement model.** Typed requirements: document | induction |
   acknowledgement. Each has scope, applies_to, requires_verification,
   expiry, revision.

8. **RequirementSatisfaction subtype/fact lifecycles** per §4.3,
   using the canonical §7 fact names:

   - **DocumentRevision**: missing → uploaded → under_review → verified
     | rejected → expiring_soon → expired → renewal. Self-declared
     documents (requires_verification = false) skip under_review.
   - **InductionCompletion**: not_started → in_progress → completed →
     expired | superseded.
   - **Acknowledgement**: required → presented → acknowledged →
     superseded | expired.

9. **Readiness derivation.** `company_ready(worker)` and
   `site_ready(worker, site)` computed per §4.4, from the
   RequirementSatisfaction stream. `site_ready` additionally requires
   SiteAssignment in `assigned` or `active` state. No stored readiness
   flag.

10. **QR identity lifecycle.** At most one active WorkerQrIdentity per
    Worker. Rotation atomically creates a new active identity and
    retires the prior, server-side. Revocation retires without
    replacement (§6.3.3).

11. **Offline read/cache behaviour.** M1's offline-capable read
    operations (own profile, applicable readiness, assignments, other
    M1 read models permitted by §6.3 and §6.10) expose cached data with
    freshness state. No M1 mutation is declared offline-capable unless
    the blueprint explicitly classifies it as such.

12. **Audit fields on M1 F records** as required by §7.8 for each
    event type.

13. **Tenant isolation.** Company A cannot read or write Company B's
    data through any M1 code path, at storage or application layer.

## Out-of-scope — deferred to later milestones

Explicitly not delivered in M1:

- Crew, CrewMembership, CrewSiteAssociation (M4)
- QR scanning for attendance or any operational purpose beyond
  presenting the QR identity itself (M6)
- Task, TaskTransition, TaskAssignment (M5/M7)
- Evidence, QaObservation, QaTransition, Blocker, BlockerTransition,
  BlockerAssignment (M8)
- CompletionClaim, CompletionVerification, Reversal (M7)
- AttendanceEvent, CorrectionEvent, TimesheetApprovalEvent (M6)
- Asset, WorkArea, AssetGeometryEvent, AssetLifecycleEvent,
  AssetWorkAreaAssignment (M3)
- PreStart, PreStartContent and related facts (M5)
- Project lifecycle transitions beyond `draft` entry (M2)
- Site lifecycle transitions beyond `planned` entry (M2)
- ExternalParty, ProjectExternalParty (M2)
- Reporting surfaces and ReportConfig (M9)
- Administrative surfaces beyond Company setup, invitation flow, and
  the minimal Worker-management surface defined in M1 scope (M9)
- Communication handoffs (M4)
- Full retention-destruction implementation (Platform-scope, later)
- Cross-Company Project transfer (M2)
- Any M2+ implementation of any kind

M1-AC-14 verifies that M1 introduces none of these.

## Architectural inheritance (from M0)

The following are inherited from M0's accepted architecture and are NOT
re-decided by M1:

- Four-class storage discipline (E / F / C / D), no fifth class.
- Single identity per entity; no client/server dual-keying.
- Command identity client-generated, stable, idempotent.
- CommandOutcome vocabulary: accepted / rejected / failed / conflicted.
- Locally rejected commands are terminal and not queued.
- Per-entity-class conflict semantics; no global LWW default.
- Audit trail = F ∪ CommandOutcome. No parallel audit store.
- No stored domain boolean or status is authoritative for a derived
  value.
- Company is the tenancy boundary at the storage layer.
- Site is the operational boundary for field-operation facts.
- Two-sided source-of-truth: local and server each authoritative for
  their slice; server authority explicit for designated operations.
- Freshness state (locally-committed / server-confirmed / stale /
  unknown).
- Retention destruction is the only mechanism by which F records cease
  to exist.

If M1 discovers that the inherited architecture (a) violates §8,
(b) contradicts the blueprint, or (c) cannot support an M1-AC, M1
raises AMB-### or BLK-### and halts the affected scope. M1 does not
silently revise M0 architecture.

## M1's implementation decisions

M1 makes decisions only on items M0 §8.J explicitly leaves open. M1
does not reopen any decision M0 has already made.

Items M0 §8.J left open, on which M1 makes decisions:

- Local storage engine (M0 §8.J).
- Sync algorithm (M0 §8.J), within the M0 architecture's constraints.
- Conflict resolution mechanisms per entity class (M0 §8.J), using
  the rules declared in §6.10.3.
- Physical DeviceInstallation representation (M0 §8.J).
- Audit materialisation strategy (M0 §8.J).

Items the M0 architecture already fixed, which M1 inherits and does not
re-decide:

- Server storage and tenancy mechanism (fixed by M0 architecture;
  Company-as-tenancy-boundary enforced at storage per AC-ARCH-B1).
- E / F / C / D persistence discipline (fixed by AC-ARCH-A1).
- Command identity model (fixed by AC-ARCH-C2).
- Per-entity-class conflict rule structure (fixed by AC-ARCH-C6).

M1's decisions on the open items are recorded in
`M1/evidence/state.md` with the §8.J anchor for each.

## Required artifacts

    M1/
    ├── acceptance-tests/
    │     m1-ac-01.test.mjs … m1-ac-14.test.mjs
    │     run-all.mjs
    ├── evidence/
    │     claims.md
    │     acceptance-map.md
    │     adversarial.md
    │     open-items.md
    │     state.md
    └── (implementation code, migrations, and schema, in paths
         determined by M0's accepted architecture)

## Gate criteria

M1-AC-1 through M1-AC-14 must PASS. No partial pass.

Each criterion declares its test form:

- **strict** — runtime behaviour of M1 code. Test precedes
  implementation; baseline FAIL/ABSENT; impl PASS; ancestry verified.
- **conditional** — cumulative-state assertion. Test executes against
  the pre-M1 state and must fail or report absence; against post-M1
  state and must pass.
- **comparative-negative** — a conditional criterion asserting that a
  milestone has not introduced prohibited state. See INV-C handling
  below for the specific rule.

---

**M1-AC-1** — Company creation establishes a Company E record and
associates the creating Person with that Company through a Worker E
membership and a Company Admin CapabilityGrant. Where the creating
Person does not already exist, the Person E identity is established
according to §6.3.2. The Company, Worker membership, and initial
Company Admin grant are committed atomically within the applicable
authority boundary.
*Anchor: §6.11.3, §6.11.4, §6.3.2, §7.3, WC-INV-1, WC-INV-2.*
**form: strict.**

**M1-AC-2** — Person continuity: a Person who is a Worker in Company A
and is later invited to Company B is the same Person identity; two
distinct Worker identities reference it.
*Anchor: WC-INV-1, WC-INV-3, §7.6.* **form: strict.**

**M1-AC-3** — Worker profile is derived: current profile recomputable
from creation fact plus WorkerProfileChange events alone. No stored
profile column is authoritative.
*Anchor: WC-INV-6, §7.5, AC-ARCH-A3.* **form: strict.**

**M1-AC-4** — Invitation lifecycle: pending → accepted (creating a
Worker) | cancelled | expired. Invitation is a distinct identity from
Worker.
*Anchor: §6.3.2, WC-INV-2.* **form: strict.**

**M1-AC-5** — Requirement model: requirements are typed (document |
induction | acknowledgement), scoped (company | project | site),
versioned, and carry applies_to / requires_verification / expiry.
*Anchor: §4.2.* **form: strict.**

**M1-AC-6** — DocumentRevision lifecycle: missing → uploaded →
under_review → verified | rejected → expiring_soon → expired →
renewal. Self-declared documents skip under_review.
*Anchor: §4.3, INV-1 through INV-6.* **form: strict.**

**M1-AC-7** — InductionCompletion lifecycle: not_started →
in_progress → completed → expired | superseded.
*Anchor: §4.3.* **form: strict.**

**M1-AC-8** — Acknowledgement lifecycle: required → presented →
acknowledged → superseded | expired. `presented` and `acknowledged`
are distinct, auditable facts.
*Anchor: §4.3.* **form: strict.**

**M1-AC-9** — Readiness derivation: `company_ready(worker)` and
`site_ready(worker, site)` computed per §4.4 from
RequirementSatisfaction records. `site_ready` additionally requires
SiteAssignment. No stored readiness flag is authoritative.
*Anchor: §4.4, INV-6, AC-ARCH-E1, AC-ARCH-E3.* **form: strict.**

**M1-AC-10** — QR identity lifecycle: at most one active
WorkerQrIdentity per Worker. Rotation atomically creates a new active
identity and retires the prior. Revocation retires without replacement.
*Anchor: WC-INV-7, §6.3.3.* **form: strict.**

**M1-AC-11** — Offline read/cache and freshness: M1's offline-capable
read operations expose cached own profile, applicable readiness,
assignments, and other M1 read models explicitly permitted by §6.3 and
§6.10. Cached data exposes the M0-defined freshness state
(locally-committed/unconfirmed, server-confirmed, stale, or unknown)
where applicable. M1 does not declare any connectivity-required M1
mutation offline-capable merely to satisfy this criterion. If an M1
mutation is explicitly classified as offline-capable by the governing
blueprint, it must additionally satisfy the durable-intent requirements
of §6.10.
*Anchor: OS-INV-1 through OS-INV-12, AC-ARCH-C1, C2, E2, F1, F3.*
**form: strict.**

**M1-AC-12** — Tenant isolation: no M1 code path allows Company A to
read or write Company B's data. Verified by test and by adversarial
bypass analysis.
*Anchor: DM-INV-5, AC-ARCH-B1, INV-E.* **form: strict.**

**M1-AC-13** — Audit fields present on M1 F records as required by
§7.8 for each event type. The criterion imposes no field beyond what
§7.8 and the owning Blueprint section require for that event type.
*Anchor: §7.8, AC-ARCH-D2, D3.* **form: strict.**

**M1-AC-14** — Scope boundary: No new M2+ entity, behaviour,
migration, API surface, operational workflow, or authoritative
persistence is introduced by M1. The implementation diff from the
M1-start commit contains only M1-authorised changes, and the resulting
entity/schema catalogue contains no newly introduced out-of-scope
domain types. Existing inherited material is not treated as M1
implementation unless it is promoted under the salvage rules.
*Anchor: §11, M1 out-of-scope list, M0 §M0.4 (salvage boundary).*
**form: comparative-negative.**

---

## INV-C handling

Every acceptance criterion declares its form in the table above. The
acceptance-map records the corresponding evidence per form.

**strict form.**

- Commit the test first. Record its SHA as `test_sha`.
- Confirm the test fails at that commit (baseline result FAIL or
  ABSENT) — because the required behaviour does not yet exist.
- Commit the implementation. Record its SHA as `impl_sha`.
- Confirm the test passes at `impl_sha`.
- Verify `git merge-base --is-ancestor <test_sha> <impl_sha>` exits 0.
- Record `precedes?: YES`.

**conditional form.**

- The criterion's "implementation" is the milestone's cumulative state,
  not a single commit.
- Record the test SHA at first commit.
- Run the test against the pre-M1 state. Record the baseline result —
  the test must FAIL or report the property absent.
- Run the test against the post-M1 state. Record the result — the test
  must PASS.
- Record `form: conditional` with both runs documented.

**comparative-negative form.**

- The criterion asserts that a milestone has **not** introduced
  prohibited state (typically out-of-scope implementation).
- The pre-M1 state legitimately satisfies the property, because there
  is no M1 implementation to violate it. Requiring the pre-M1 run to
  FAIL would manufacture a failure where none logically exists.
- The pre-M1 run establishes the **comparison baseline**, not a
  failure condition.
- Record the M1-start commit as the comparison baseline.
- Evaluate the post-M1 delta against that baseline: the diff from the
  M1-start commit and the resulting entity/schema catalogue must
  contain no prohibited implementation.
- The criterion passes only when the post-M1 delta contains no
  prohibited implementation.
- Record `form: comparative-negative`, `baseline: <M1-start commit>`,
  `post-M1: PASS`, `precedes: N/A`.
- This form must not be used to claim that an implementation existed
  before the test.

If a test file mixes forms, it is split into two files.

## Evidence requirements (you)

- Every claim in `M1/evidence/claims.md` cites: file, line range,
  commit SHA, command, output, and which M1-AC it supports.
- Every M1-AC in `M1/evidence/acceptance-map.md` maps to:
  - test file
  - test SHA
  - test form (strict | conditional | comparative-negative)
  - baseline result (FAIL / ABSENT / comparison baseline for
    comparative-negative)
  - impl SHA (or "cumulative state" for conditional, or M1-start
    commit for comparative-negative)
  - impl result (PASS or FAIL)
  - precedes (YES for strict; N/A for conditional and
    comparative-negative, with both runs documented)
- `M1/evidence/adversarial.md` records every adversarial probe and its
  disposition (MITIGATED | EXPOSED | DEFERRED). At minimum, it covers
  the probes enumerated in Skill 07 for identity, tenancy, offline
  durability, idempotency, conflict semantics, audit, second source of
  truth, QR, and archive/retention.
- `M1/evidence/open-items.md` records unresolved items, deferred
  items, and any AMB-### or BLK-### raised during M1.
- `M1/evidence/state.md` records: final commit SHA, CI status,
  migration head, operative EP, M1 implementation decisions taken
  under §8.J (with the §8.J anchor for each), and any M0 architecture
  refinement requested (as an AMB-### or BLK-###, not applied).

## Constraints (you)

- Do not implement M2 or later.
- Do not implement any out-of-scope entity or behaviour.
- Do not promote AC-04 salvage without anchor + predating test + §8
  compliance. Zero promotions by default in M1.
- Do not modify the Master Blueprint.
- Do not modify EP-2.0 or any governed artifact from EP-1.0 or EP-2.0.
- Do not reinterpret the blueprint or M0 architecture to fit
  implementation.
- On ambiguity: raise AMBIGUITY_RECORD and halt the affected scope.
- On gate failure: raise BLOCKER_RECORD; do not proceed.
- Do not declare M1 PASS. Report the result; the human accepts or
  rejects the gate.

## Reporting format (you)

Final M1 report contains:

    MILESTONE: M1
    STATUS: PASS | BLOCKED | FAIL
    EVIDENCE BUNDLE: M1/evidence/ @ <ref>
    OPERATIVE EP: EP-3.0 (tag <sha>)
    ACCEPTANCE RESULT:
      M1-AC-1:  PASS | FAIL | BLOCKED (reason)   [form: strict]
      M1-AC-2:  ...                              [form: strict]
      ...
      M1-AC-14: ...                              [form: comparative-negative]
    BLUEPRINT AMBIGUITIES RAISED: <list AMB-### or none>
    SALVAGE ITEMS PROMOTED: <list SR-### or none>
    M0 ARCHITECTURE REFINEMENTS REQUESTED: <list or none>
    NEXT MILESTONE AUTHORISATION: YES | NO
    BLOCKERS: <list BLK-### or none>

## Transition

M2 execution contract is drafted only after M1 reports PASS and the
human accepts the gate.

M2 implementation begins only after the M2 execution contract is
approved and frozen as part of a subsequent EP cut.

## Reading order

1. MASTER_BLUEPRINT/MASTER_BLUEPRINT.md (unchanged between EP-2.0 and
   EP-3.0; whichever tag is operative supplies the authoritative bytes)
2. KIMI/OPERATING_CONTRACT.md
3. KIMI/SKILLS/* (all seven)
4. KIMI/MILESTONES/M1_EXECUTION_CONTRACT.md (this file)
5. M0/evidence/state.md and M0/architecture.md (accepted architecture)
6. M0/salvage-register.md
7. EVIDENCE/AC-04_BASELINE/ (as needed for extraction)
8. REPOSITORY/ (as needed)