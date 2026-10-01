# M2 Open Items

Operative contract: KIMI/MILESTONES/M2_EXECUTION_CONTRACT.md v1.0.3 (EP-5.0,
commit `0d43b43`). Raised dates use the repository clock (UTC).

---

## AMB-003: OPEN — Transfer across Company-scoped Worker identities

**Status: OPEN. Blocker: yes.**
Raised: 2026-09-27 (executor; formalises the contract's pre-identified
draft ambiguity #1 — "The executor is not required to rediscover ambiguities
already identified in this section").

**Where.** MASTER_BLUEPRINT §6.1.3 (Project transfer copies active
assignments) read against §6.3 WC-INV-2 (Worker is Company-scoped) and
AC-ARCH-B3 (no cross-tenant operational references).

**The defect.** §6.1.3 requires that Project transfer copy active
assignments into the receiving Project. Every transferable portion is
derivable and is enumerated in the M2 contract (new Project identity owned
by the receiving Company; original unchanged; TransferEvent old → new;
Requirements/Sites/assignments re-created as new identities with
provenance; Company-scope Requirements stay behind; historical-record
preservation deferred to M6/M7/M8). The non-derivable portion: an active
assignment binds a Worker who is Company-scoped to the *source* Company.
How that assignment becomes an assignment under the *receiving* Company —
which does not employ that Worker — is not defined by the blueprint, and
every candidate resolution (re-employment, cross-tenant reference, Worker
re-scoping) either violates WC-INV-2 / AC-ARCH-B3 / DM-INV-5 or invents
domain semantics.

**Why it is not decidable by the executor.** Any selection among transfer
models invents blueprint semantics ("Do not reinterpret the blueprint";
"On ambiguity: raise AMBIGUITY_RECORD and halt the affected scope"). The M2
contract directs: raise AMB-003 and halt M2-AC-8 rather than select a
transfer model.

**Affected scope (halted).** M2-AC-8 (Project transfer). No transfer
command, TransferEvent, or successor linkage exists in M2. Halt integrity
is continuously verified by the sentinel `m2-ac-08.test.mjs` (source scan +
runtime unknown-command probe). The derivable sub-properties listed in the
contract remain specified-but-unimplemented and become verification
obligations when AMB-003 is resolved.

---

## AMB-004: OPEN — Independent Site operational suspension representation

**Status: OPEN. Blocker: yes.**
Raised: 2026-09-27 (executor; formalises the contract's pre-identified
draft ambiguity #2).

**Where.** MASTER_BLUEPRINT §6.1.3 ("a suspended Site blocks new sign-ins
immediately"; "unsuspending returns to prior state") read against the
§6.1.3 Site lifecycle vocabulary (planned → mobilising → active →
demobilising → closed → archived), which contains no suspended state, and
against the absence of any specified persistence mechanism for the
independent-suspension condition.

**The defect.** The Project suspension overlay is fully derivable (D-class
derivation from Project lifecycle facts alone; implemented and tested by
M2-AC-4). Independent Site operational suspension is not: representing it
requires either a new lifecycle state (absent from the §6.1.3 vocabulary)
or an F-class operational-suspension fact with its own identity and
lifecycle (a candidate the contract permits to be tested against §7/§8 but
does not specify). "Unsuspending returns to prior state" additionally
requires the representation to remember the pre-suspension operational
condition without storing an authoritative status (DM-INV-3). The contract
names candidate representations but pre-decides none; the blueprint defines
no command vocabulary, no fact type, and no interaction rule between an
independently suspended Site and the Project overlay (needed by M2-AC-5's
second portion).

**Why it is not decidable by the executor.** Materially different
representations produce different observable behaviour (event streams,
resume semantics, audit content). Choosing one invents domain semantics.

**Affected scope (halted).** M2-AC-5 (Resume semantics) — the
independent-suspension portion. No partial PASS is permitted by the
contract, so M2-AC-5 cannot PASS until AMB-004 is resolved. The overlay
portion (M2-AC-4) is independent and PASSes. Halt integrity is continuously
verified by the sentinel `m2-ac-05.test.mjs` (no independent-suspension
command, fact type, or stored flag exists in the M2 core).

---

## AMB-005: OPEN — Requirement-scope opt-out mechanism

**Status: OPEN. Blocker: yes.**
Raised: 2026-09-27 (executor; formalises the contract's pre-identified
draft ambiguity #3).

**Where.** MASTER_BLUEPRINT §6.1.3: a Project-scope Requirement applies to
all contained Sites "unless explicitly opted out at Site scope".

**The defect.** The default-apply rule is derivable and is implemented
(M2 readiness derivation includes applicable project-scope Requirements at
every contained Site; verified live by `m2-ac-11.test.mjs` part (b)). The
opt-out is not: the blueprint defines no mechanism by which a Site declares
the opt-out — no command, no fact type, no attribute, no actor/permission
rule, and no interaction with §4.2's fixed Requirement attribute vocabulary
(scope is company | project | site; an opt-out flag on a Requirement would
change the requirement's applicability semantics, which §4.2 does not
describe).

**Why it is not decidable by the executor.** Any mechanism (per-Site
exclusion list, Site-scope override Requirement, applicability flag)
invents blueprint semantics and changes readiness outcomes. The M2 contract
directs: raise AMB-005 and halt M2-AC-11 rather than invent a mechanism.

**Affected scope (halted).** M2-AC-11 (Requirement scope precedence). No
partial PASS is permitted. Halt integrity is continuously verified by the
sentinel `m2-ac-11.test.mjs` (default-apply rule live; no opt-out artifact
in the M2 core).

---

## Noted interpretations (implementation decisions; not ambiguities)

Recorded here and in `state.md`; each is anchored and test-asserted. If any
is judged wrong by the human, the affected test and implementation change
together.

1. **Site closure cascade — ProjectAssignment referent.** §6.1.3 (as
   quoted by M2-AC-2) says closure marks "the Site's ProjectAssignment and
   SiteAssignment records" removed. ProjectAssignment is a Worker×Project
   membership (PS-INV-3) with no Site referent — no record is "the Site's"
   ProjectAssignment; and §6.1.3's own close-and-recreate remediation
   presumes project membership survives closure. M2 therefore cascades
   removal to the closed Site's **SiteAssignment** records only (reason
   "site closure", fixed). Asserted in `m2-ac-02.test.mjs`.
2. **Handover freeze scope — "active assignments".** Read as "assignments
   not removed at freeze time, with their derived state recorded in the
   snapshot". A paused assignment is a roster fact the handover must not
   silently drop; the snapshot records it as `paused`. Asserted in
   `m2-ac-09.test.mjs`.
3. **Duplicate association.** One active ProjectExternalParty per
   (Project, ExternalParty) pair; duplicates rejected. Re-association after
   removal is a new identity (§7.5). Asserted in `m2-ac-07.test.mjs`.
4. **Handover authority.** RecordHandover is a Company Admin surface
   (§6.11.2). Asserted in `m2-ac-13.test.mjs`.
5. **M2-aware readiness.** M1's `siteReady` cannot see the M2 `paused`
   state; M2 supplies its own derivation in `M2/src/domain.js`. M1 source
   is untouched (milestone isolation; M2-AC-15 diff scope).

## Deferred verification obligations (become obligations in the named
milestones; from the M2 contract)

- **Site closure with open shifts is blocked** (§6.1.3) — M6. M2's
  CloseSite has no shift model to check; the obligation attaches when
  attendance exists.
- **Transfer preserves historical attendance / evidence / QA / progress
  with the source Project** (§6.1.3) — M6, M7, M8 (and blocked regardless
  pending AMB-003).
- **Full handover freeze scope** (§6.1.3) — M3+. Facts from later-milestone
  domains become additional freeze-scope obligations in their milestones.

## Deferred items

- **Offline mutation of M2 commands.** None. §6.10.2 classifies the M2
  command set (structural/administrative) as connectivity-required; no M2
  command is added to the offline-capable set. The halted M1 AC-11 offline
  path (AMB-002, resolved) is unaffected.
- **Reporting aggregation across Sites** — M9 (contract §In-scope #10).
## Legacy scope-test policy (A + C) — governance decision, 2026-09-28

Option A — Frozen-snapshot policy.
  Accepted milestone suites are frozen at their close SHA.
  Regression verification for prior milestones uses a snapshot
  runner that checks out the milestone-close SHA rather than
  running their tests at later HEADs.

Option C — Explicit commit enumeration.
  Future milestone scope-check tests (M3+) must use explicit
  commit enumeration, never `baseline..HEAD` range operators.

Existing M0/M1 scope-check tests that use open-ended ranges
are not maintained at later HEADs and are not expected to
pass. Their verification at their own close SHA remains
authoritative.
