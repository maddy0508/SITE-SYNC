# M2 Execution Contract
Version: 1.0.3 — APPROVED (pending EP-5.0 freeze)
Status: AWAITING M1 ACCEPTANCE AND EP-5.0
Implementation: PROHIBITED until this contract is frozen as part of
                EP-5.0 and the EP-5.0 preflight returns READY

*Sections marked (you) are addressed to the agent operating under the EP.
Other sections define the M2 contract neutrally.*

## Current milestone
M2 — Projects & Sites

## Dependencies

### M1 dependencies (must be satisfied before M2 can be approved)

1. M1 formal acceptance by the human.
2. AC-14 test defect correction (completed at cfda19f).
3. AC-11 physical-engine deferral record (completed at cfda19f).

### M2 known draft ambiguities

The following were identified during contract review. They must be
resolved before M2 approval, or — if still unresolved when M2 reaches
the affected criterion — the executor formalises the applicable AMB
record before proceeding with that criterion. The executor is not
required to rediscover ambiguities already identified in this section.

1. **Transfer across Company-scoped Worker identities.** §6.1.3 says
   Project transfer copies active assignments. Worker is Company-scoped
   (§6.3 WC-INV-2). Cross-tenant operational references are prohibited
   (AC-ARCH-B3). How an active assignment whose Worker is scoped to the
   source Company becomes an assignment under the receiving Company is
   not defined. → AMB-003.
2. **Independent Site operational suspension representation.** §6.1.3
   states "a suspended Site blocks new sign-ins" for Sites suspended
   independently of their Project, but the Site lifecycle vocabulary
   does not include a suspended state, and the blueprint does not
   specify a persistence mechanism. → AMB-004.
3. **Requirement-scope opt-out mechanism.** §6.1.3 states a
   Project-scope Requirement applies to all Sites "unless explicitly
   opted out at Site scope", but the opt-out mechanism is not defined.
   → AMB-005.

## Preconditions

M2 execution may begin only when all of the following hold:

1. M1 has reported PASS and the human has accepted the M1 gate.
2. This contract is approved by the human and frozen as part of EP-5.0.
3. EP-5.0 is tagged and verified.
4. The executor preflight (E-01 through E-14) has been re-run against
   EP-5.0 and returned READY.

Until (1)–(4) hold, M2 implementation is prohibited.

## Authoritative inputs

| # | Input | Location | Status |
|---|---|---|---|
| 1 | Master Blueprint | MASTER_BLUEPRINT/MASTER_BLUEPRINT.md | LOCKED (EP-4.0) |
| 2 | Kimi Operating Contract | KIMI/OPERATING_CONTRACT.md | LOCKED |
| 3 | Skills | KIMI/SKILLS/ | LOCKED |
| 4 | M0 Execution Contract | KIMI/MILESTONES/M0_EXECUTION_CONTRACT.md | LOCKED |
| 5 | M1 Execution Contract | KIMI/MILESTONES/M1_EXECUTION_CONTRACT.md | LOCKED |
| 6 | M0 accepted architecture | M0/ @ a72a31f (accepted) | ACCEPTED EVIDENCE |
| 7 | M1 accepted evidence | M1/ @ <M1 final evidence commit> | ACCEPTED EVIDENCE (populated at EP-5.0) |
| 8 | Salvage register | M0/salvage-register.md | CURRENT |
| 9 | Blueprint sections governing M2 | §6.1, §6.11, §7, §8 | LOCKED |

**Repository baseline (historical):**
    Repository: maddy0508/SITE-SYNC
    Commit:     f90b77ab73cb7ae20b1084ad94fb5bc159afa841

**M2 execution baseline:**
    Commit: <M1 final evidence commit>
    Populated at EP-5.0 freeze time. M2's implementation diff, scope
    check (M2-AC-15), and comparative-negative baseline are measured
    from this commit — not from the historical repository baseline.

**EP-4.0 tag:** 0ac087ee1687b5a2a0f3cda80c035e3913dfe4fe

## M2 objective

Deliver the M2-defined Projects & Sites domain, extending the M1
Project/Site scaffolding to the lifecycle, external-party, transfer,
handover, assignment-state, and requirement-scoping semantics
explicitly covered by this contract.

M2 does not deliver the "full" §6.1 domain — the operational
consequences of Site closure, sign-in gating, and later-domain artifact
preservation are deferred to M3, M6, M8, M9 as specified in the
out-of-scope list and in the deferred-verification records.

## In-scope — entities and their lifecycles

**Project**
- Project (E, Company) — extended from M1's `draft`-only entry state
- ProjectLifecycleEvent (F): draft, activated, suspended, resumed,
  completed, cancelled, archived
- TransferEvent (F)
- HandoverRecord (F, Project-scoped)

**Site**
- Site (E, Project) — extended from M1's `planned`-only entry state
- SiteLifecycleEvent (F): planned, mobilising, activated,
  demobilising, closed, archived
- HandoverRecord (F, Site-scoped)

**Project suspension overlay (derivable)**

Project lifecycle state = `suspended` imposes a D-class effective
operational suspension on all contained Sites, derived from Project
lifecycle facts alone. It produces no SiteLifecycleEvent and does not
alter the Site's underlying lifecycle state.

This portion is derivable from existing architecture and is tested by
M2-AC-4 without any AMB dependency.

**Independent Site operational suspension (AMB-004 expected)**

§6.1.3 additionally requires that "a suspended Site blocks new
sign-ins immediately" and that "unsuspending returns to prior state",
in a manner that allows a Site to be suspended independently of its
Project. The Site lifecycle vocabulary defined by §6.1.3 does not
include a suspended state, and the blueprint does not specify a
persistence mechanism for this independent-suspension condition.

M2 must derive the representation of the independent-suspension
condition using only architecture permitted by §7 and §8, and must
not invent semantics beyond those permitted. If a representation
cannot be derived unambiguously, M2 raises AMB-004 and halts
M2-AC-5 rather than selecting a representation.

Candidate representations that may be tested against §7/§8 (not
pre-decided by this contract):

- an F-class operational-suspension fact with its own identity and
  lifecycle facts; or
- another representation satisfying §7.2's four-class model,
  PS-INV-8 (attributable lifecycle transitions), and DM-INV-3
  (no stored boolean or status is authoritative for a derived value).

**External parties**
- ExternalParty (E, Company)
- ProjectExternalParty (E, Project) — lifecycle derived per §7.5

**Assignment state extensions**
- ProjectAssignment (E) — extended to `paused` and `removed` states
- SiteAssignment (E) — same extension

**Requirement scoping — runtime precedence**
- Project-scoped and Site-scoped Requirements (§4.2) enforced in
  readiness derivation at their respective scopes. The Site-scope
  opt-out mechanism is not defined by the blueprint (see M2-AC-11).

## In-scope — behaviours

1. **Project lifecycle.** Draft → active → suspended → active
   (resumed) → completed → archived. Draft → cancelled. Every
   transition produces a ProjectLifecycleEvent.

2. **Site lifecycle.** Planned → mobilising → active → demobilising →
   closed → archived. Every transition produces a SiteLifecycleEvent.

3. **Project suspension as overlay.** Project lifecycle state =
   `suspended` imposes a D-class effective operational suspension on
   all contained Sites. No SiteLifecycleEvent; Site lifecycle state
   unchanged.

4. **Independent Site operational suspension.** Representation
   derived per §7/§8. If not derivable, AMB-004 halts AC-5.

5. **Resume semantics.** When a Project resumes:
   - Sites whose only operational suspension was the Project overlay
     return to their underlying lifecycle state's normal operation.
   - Sites that were individually operationally suspended before the
     Project was suspended remain individually operationally suspended
     after the Project resumes.

   The Site returns to its own prior operational condition, not to
   the Project's.

6. **ExternalParty management.** Company Admin can create, update, and
   archive ExternalParty records.

7. **ProjectExternalParty association.** Project-level association of
   ExternalParty records. Lifecycle per §7.5: creation fact
   (associated), removal fact (removed), current state derived. No
   independent lifecycle vocabulary. Removed association is not
   reactivated; a new association creates a new identity.

8. **Project transfer.** Platform Admin only. Transfer:
   - Creates a new Project identity owned by the receiving Company.
   - Leaves the original Project identity unchanged and owned by the
     original Company.
   - Records a TransferEvent linking old → new.
   - Transferred Project-scoped and Site-scoped Requirements are newly
     created identities under the receiving Company's new Project/Site
     hierarchy, with explicit transfer provenance recorded in the
     TransferEvent (or another blueprint-permitted provenance
     mechanism, subject to AMB-003's resolution). Source Requirement
     identities remain owned by the source Company and are not reused.
   - Company-scoped Requirements remain with the source Company and
     are not transferred.
   - Copies Sites as new Site identities under the new Project,
     referencing the new Project.
   - Any assignment copied to the receiving Project must be a newly
     created assignment identity. Source assignment identities remain
     attached to the source Project; they are not reused.
   - The handling of active assignments (ProjectAssignment,
     SiteAssignment) whose Worker entities are Company-scoped is
     blocked pending AMB-003.
   - Does not introduce any cross-tenant operational reference.
   - Historical record preservation (attendance / evidence / QA /
     progress) is deferred to M6/M7/M8 — recorded in open-items.md.

9. **Handover.** Handover produces an immutable HandoverRecord F
   carrying the freeze timestamp and the M2-defined freeze scope.

   **M2 handover freeze scope (implementation decision, anchored to
   §6.1.3 "freezes a defined set of data as of a timestamp"):** the
   current Project/Site lifecycle state, active assignments, and the
   current Requirement set with its scope. Facts from later-milestone
   domains (M3+) are not in the M2 freeze scope; they become
   additional freeze-scope obligations in their respective milestones.

   The frozen representation is immutable: subsequent lifecycle,
   assignment, or Requirement changes do not alter the frozen record.
   This is enforced by M2-AC-9.

10. **Multi-site project semantics.** Requirements may be scoped
    Company / Project / Site. A worker may be site-ready at one Site
    and not another within the same Project. Reporting aggregation is
    M9.

11. **Requirement scope precedence.** A Project-scope Requirement
    applies to all its contained Sites by default. The Site-scope
    opt-out mechanism is not defined in the blueprint. M2 must raise
    AMB-005 and halt M2-AC-11 rather than invent a mechanism.

12. **Assignment state transitions.** ProjectAssignment and
    SiteAssignment may transition `assigned` → `active` → `paused` →
    `removed`. A `removed` assignment is not reusable; a new
    assignment creates a new identity.

    **Milestone-scope expansion.** M1 permitted assignment ending only
    inside the offboarding cascade. M2 implements the standalone
    assignment lifecycle defined by §6.1.2. This is an intentional
    milestone-scope expansion, not a revision of the underlying
    blueprint.

13. **Site closure consequence — assignment removal.** §6.1.3 states
    that closure marks assignments `removed` with reason "site
    closure." M2 implements assignment removal and therefore tests
    this closure consequence. The absence of M6 shift artifacts must
    not be interpreted as evidence that the open-shift precondition
    is satisfied; the open-shift gate itself is a deferred
    verification obligation for M6.

14. **Project/Site permissions.** Role × scope × membership evaluated
    for M2 operations.

15. **Audit fields on M2 F records** as required by §7.8.

16. **Tenant isolation.** Extended to cover ExternalParty and any M2
    entity introduced.

## Deferred verification obligations

Recorded in M2/evidence/open-items.md; become verification obligations
in the named milestones:

- **Site closure with open shifts is blocked** (§6.1.3) — M6.
- **Transfer preserves historical attendance / evidence / QA /
  progress with the source Project** (§6.1.3) — M6, M7, M8.
- **Full handover freeze scope** (§6.1.3) — M3+.

## Out-of-scope — deferred to later milestones

- Assets, WorkArea, map entities (M3)
- Crew, CrewMembership, CrewSiteAssociation (M4)
- Daily operations, pre-starts (M5)
- Attendance, timesheets, QR attendance (M6)
- Tasks, progress, claims, verifications (M7)
- Evidence, QA, blockers (M8)
- Reporting surfaces and ReportConfig (M9)
- Administrative surfaces beyond M2 requirements (M9)
- Communication handoffs (M4)
- Full retention-destruction implementation (Platform, later)
- Any M3+ implementation of any kind

M2-AC-15 verifies that M2 introduces none of these.

## Architectural inheritance (from M0 and M1)

From M0: four-class storage discipline; single identity per entity;
command identity; CommandOutcome vocabulary; locally rejected terminal;
per-entity conflict semantics; audit = F ∪ CommandOutcome; no
authoritative stored status for derived values; Company tenancy
boundary at storage; Site operational boundary; two-sided
source-of-truth; freshness state; retention destruction.

From M1: Person / Worker / Company setup model; Requirement model;
Project/Site minimal scaffolding; command/sync substrate; tenant
isolation implementation; §8.J decisions in M1/evidence/state.md.

**Milestone isolation rule.** M2 may rely on M1-accepted evidence for
inherited properties. M2 may not treat M1 evidence as satisfying an
M2 acceptance criterion unless the M2 criterion explicitly permits
inherited evidence.

If M2 discovers that the inherited architecture violates §8,
contradicts the blueprint, or cannot support an M2-AC, M2 raises
AMB-### or BLK-### and halts the affected scope.

## M2's implementation decisions

Recorded in `M2/evidence/state.md` with anchors:

- Handover freeze scope for M2-implemented artifacts (anchor: §6.1.3).

## Required artifacts

    M2/
    ├── acceptance-tests/
    │     m2-ac-01.test.mjs … m2-ac-15.test.mjs
    │     run-all.mjs
    ├── evidence/
    │     claims.md
    │     acceptance-map.md
    │     adversarial.md
    │     open-items.md
    │     state.md
    └── (implementation code, migrations, and schema)

## Gate criteria

M2-AC-1 through M2-AC-15 must PASS. No partial pass.

---

**M2-AC-1** — Project lifecycle transitions: draft → active →
suspended → active (resumed) → completed → archived; draft →
cancelled. Every transition produces a ProjectLifecycleEvent.
*Anchor: §6.1.3, PS-INV-8.* **form: strict.**

**M2-AC-2** — Site lifecycle transitions: planned → mobilising →
active → demobilising → closed → archived. Every transition produces
a SiteLifecycleEvent.

Additionally, Site closure marks the Site's ProjectAssignment and
SiteAssignment records `removed` with reason "site closure" (§6.1.3).
*Anchor: §6.1.3, PS-INV-8.* **form: strict.**

**M2-AC-3** — Every M2 lifecycle F record (ProjectLifecycleEvent,
SiteLifecycleEvent, TransferEvent, HandoverRecord) carries actor and
timestamp as required by §6.1.6. Reason is mandatory only where §6.1
or another governing section explicitly requires it. M2 does not
expand the mandatory-reason set beyond what the blueprint specifies.
*Anchor: §6.1.6, §7.8, AC-ARCH-D2.* **form: strict.**

**M2-AC-4** — Project suspension overlay: Project lifecycle state =
`suspended` imposes a D-class effective operational suspension on all
contained Sites. No SiteLifecycleEvent is produced. The Site's
underlying lifecycle state is unchanged. The overlay is derived from
Project lifecycle facts alone.
*Anchor: §6.1.3.* **form: strict.**

(This criterion has no AMB dependency. The Project overlay portion is
fully derivable from the Project lifecycle facts and is tested
independently.)

**M2-AC-5** — Resume semantics: when a Project resumes, Sites whose
only operational suspension was the Project overlay return to their
underlying lifecycle state's normal operation.

**BLOCKED pending AMB-004.** The portion of the criterion that
concerns independently suspended Sites ("a Site that was individually
operationally suspended before the Project was suspended remains
individually operationally suspended after the Project resumes")
depends on the representation of independent Site suspension. That
representation is the subject of AMB-004. No partial PASS is
permitted; the criterion PASSes only when both portions are testable
and pass.
*Anchor: §6.1.3.* **form: strict.**

**M2-AC-6** — ExternalParty entity exists as a Company-scoped E
record; Company Admin can create, update, and archive.
*Anchor: §6.1.2, PS-INV-6.* **form: strict.**

**M2-AC-7** — ProjectExternalParty lifecycle is defined by the §7.5
relationship-entity rule: creation fact (associated), removal fact
(removed), current state derived. No independent lifecycle vocabulary.
Removed association is not reactivated; a new association creates a
new identity.
*Anchor: §6.1.2, §7.5.* **form: strict.**

**M2-AC-8** — Project transfer (Platform Admin only):

**BLOCKED pending AMB-003.**

The transferable portions that are derivable from the blueprint and
the inherited architecture:

- New Project identity owned by the receiving Company.
- Original Project identity unchanged and owned by the original
  Company.
- TransferEvent links old → new.
- No cross-tenant operational reference is introduced.
- Transferred Project-scoped and Site-scoped Requirements are newly
  created identities under the receiving Company's new Project/Site
  hierarchy, with explicit transfer provenance recorded in the
  TransferEvent (or another blueprint-permitted provenance
  mechanism, subject to AMB-003's resolution). Source Requirement
  identities remain owned by the source Company and are not reused.
- Company-scoped Requirements remain with the source Company and are
  not transferred.
- Sites are copied as new Site identities under the new Project,
  referencing the new Project.
- Any assignment copied to the receiving Project must be a newly
  created assignment identity. Source assignment identities remain
  attached to the source Project; they are not reused.
- Historical record preservation (attendance / evidence / QA /
  progress) deferred to M6/M7/M8 — recorded in open-items.md.

The non-derivable portion — how an active assignment whose Worker is
Company-scoped to the source Company becomes an assignment under the
receiving Company — is the subject of AMB-003. M2 raises AMB-003 and
halts AC-8 rather than selecting a transfer model.

*Anchor: §6.1.3, AC-ARCH-A2a, AC-ARCH-B3, WC-INV-2, DM-INV-5.*
**form: strict.**

**M2-AC-9** — Handover produces an immutable HandoverRecord F carrying
the freeze timestamp and the M2-defined freeze scope (current
Project/Site lifecycle state, active assignments, current Requirement
set with its scope). Subsequent events are permitted and are outside
the frozen set.

**Frozen-record immutability.** Subsequent lifecycle, assignment, or
Requirement changes do not alter the frozen handover record. A
handover record created with `state = active` continues to reflect
`active` after the Project is later suspended. This is tested.
*Anchor: §6.1.3, PS-INV-7, §7.3.2.* **form: strict.**

**M2-AC-10** — Multi-site project: a worker's site readiness is per
Site. A worker assigned to Site A but not Site B is `site_ready` at A
and not at B, within the same Project.
*Anchor: §6.1.2, PS-INV-4, §4.4.* **form: strict.**

**M2-AC-11** — Requirement scope precedence: a Project-scope
Requirement applies to all its contained Sites by default.

**BLOCKED pending AMB-005.** The Site-scope opt-out mechanism is not
defined by the blueprint. §6.1.3 states the rule but does not specify
how a Site declares the opt-out. M2 raises AMB-005 and halts AC-11
rather than invent a mechanism. No partial PASS is permitted.

*Anchor: §6.1.2, §6.1.3, §4.2, §4.4.* **form: strict.**

**M2-AC-12** — Assignment states: ProjectAssignment and SiteAssignment
may transition `assigned` → `active` → `paused` → `removed`. A
`removed` assignment is not reusable; a new assignment creates a new
identity.

Standalone removal is implemented in M2 as a milestone-scope expansion
of §6.1.2's defined lifecycle. This does not revise the underlying
blueprint; it revises only M1's milestone-scope interpretation, which
does not survive into M2.

Additionally, Site closure marks the Site's assignments `removed` with
reason "site closure" (per §6.1.3).
*Anchor: §6.1.2, §6.1.3, §7.5.* **form: strict.**

**M2-AC-13** — Project/Site permissions: role × scope × membership
evaluated for M2 operations.
*Anchor: §2, §6.1.2.* **form: strict.**

**M2-AC-14** — Audit fields present on M2 F records as required by
§7.8 for each event type.
*Anchor: §7.8, AC-ARCH-D2, D3.* **form: strict.**

(This is a positive implementation assertion, not a scope assertion.
M2-AC-15 is the only comparative-negative criterion in M2.)

**M2-AC-15** — Scope boundary: No new M3+ entity, behaviour,
migration, API surface, operational workflow, or authoritative
persistence is introduced by M2. The implementation diff from the
M2-start commit contains only M2-authorised changes, and the resulting
entity/schema catalogue contains no newly introduced out-of-scope
domain types.
*Anchor: §11, M2 out-of-scope list, M0 §M0.4.* **form: comparative-negative.**

---

## INV-C handling

**strict.** Test first; baseline FAIL/ABSENT; implement; PASS; verify
ancestry; `precedes: YES`.

**comparative-negative.** Post-M2 delta against M2-start commit. Not
a failure point. `precedes: N/A`.

**Test-defect-fix pattern.** Mechanical defects in a test may be fixed
with the substantive assertion unchanged, disclosed in the
acceptance-map, and the fix committed before or after the
implementation as appropriate.

**Freeze-whitelist chronology disclosure.** Where a test's scope check
uses a range diff that includes authorised EP freeze commits, the
freeze commits are excluded via a literal-SHA whitelist. The test must
not use a tag-to-tag range for scope checks. The whitelist SHAs are
populated in the test file after the EP-5.0 cut. This is a
**post-freeze mechanical adjustment only**: the substantive assertion
must have been authored before implementation, and the acceptance-map
records both the pre-whitelist test SHA (substantive) and the
post-whitelist test SHA (mechanical) with the disclosure:

    Substantive assertion authored before implementation at <SHA>.
    Post-freeze edit inserted the literal EP-5.0 freeze-SHA
    whitelist at <SHA>. Substantive scope assertion unchanged.

## Evidence requirements (you)

- Every claim in `M2/evidence/claims.md` cites: file, line range,
  commit SHA, command, output, and which M2-AC it supports.
- Every M2-AC in `M2/evidence/acceptance-map.md` maps to: test file,
  test SHA, test form, baseline result, impl SHA (or cumulative
  state), impl result, precedes; plus any freeze-whitelist chronology
  disclosure.
- `M2/evidence/adversarial.md` covers at minimum: tenancy, identity,
  immutability, derived-vs-authoritative, offline durability,
  idempotency, conflict semantics, audit, second source of truth,
  offline reads, archive/retention, transfer provenance, suspension
  overlay derivation, handover snapshot immutability.
- `M2/evidence/open-items.md` records unresolved items, deferred
  items, deferred verification obligations, and any AMB-### or
  BLK-### raised during M2 (including AMB-003, AMB-004, AMB-005 if
  raised).
- `M2/evidence/state.md` records: final commit SHA, CI status,
  migration head, operative EP, M2 implementation decisions taken
  with anchors, and any M0/M1 architecture refinement requested.

## Constraints (you)

- Do not implement M3 or later.
- Do not implement any out-of-scope entity or behaviour.
- Do not promote AC-04 salvage without anchor + predating test + §8
  compliance. Zero promotions by default in M2.
- Do not modify the Master Blueprint.
- Do not modify EP-1.0 through EP-4.0 or any governed artifact from
  those packages.
- Do not reinterpret the blueprint or M0/M1 architecture to fit
  implementation.
- On ambiguity: raise AMBIGUITY_RECORD and halt the affected scope.
- On gate failure: raise BLOCKER_RECORD; do not proceed.
- Do not declare M2 PASS. Report the result; the human accepts or
  rejects the gate.

## Reporting format (you)

    MILESTONE: M2
    STATUS: PASS | BLOCKED | FAIL
    EVIDENCE BUNDLE: M2/evidence/ @ <ref>
    OPERATIVE EP: EP-5.0 (tag <sha>)
    ACCEPTANCE RESULT:
      M2-AC-1:  PASS | FAIL | BLOCKED (reason)   [form: strict]
      ...
      M2-AC-5:  BLOCKED (AMB-004)                [form: strict]
      M2-AC-8:  BLOCKED (AMB-003)                [form: strict]
      M2-AC-11: BLOCKED (AMB-005)                [form: strict]
      ...
      M2-AC-15: ...                              [form: comparative-negative]
    BLUEPRINT AMBIGUITIES RAISED: <list AMB-### or none>
    DEFERRED VERIFICATION OBLIGATIONS: <list>
    SALVAGE ITEMS PROMOTED: <list SR-### or none>
    M0/M1 ARCHITECTURE REFINEMENTS REQUESTED: <list or none>
    NEXT MILESTONE AUTHORISATION: YES | NO
    BLOCKERS: <list BLK-### or none>

## Transition

M3 execution contract is drafted only after M2 reports PASS and the
human accepts the gate.

## Reading order

1. MASTER_BLUEPRINT/MASTER_BLUEPRINT.md (EP-4.0 text)
2. KIMI/OPERATING_CONTRACT.md
3. KIMI/SKILLS/* (all seven)
4. KIMI/MILESTONES/M2_EXECUTION_CONTRACT.md (this file)
5. M0/evidence/state.md and M0/architecture.md
6. M1/evidence/state.md and M1/evidence/acceptance-map.md
7. M0/salvage-register.md
8. EVIDENCE/AC-04_BASELINE/ (as needed)
9. REPOSITORY/ (as needed)