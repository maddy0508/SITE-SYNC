# M2 State

- **Milestone:** M2 — Project & Site lifecycle, suspension overlay,
  assignment states, ExternalParty / ProjectExternalParty, HandoverRecord.
- **Operative EP:** EP-5.0 (lock commit
  `00c2adbed0fa91be136c76029267d88dbacff583`; tag object `5075aa1b…`).
- **M2-start baseline:** `cfda19f` (M1 final evidence commit).
- **HEAD at this record:** `ed59903` (T2). This file is added by the
  following evidence commit (E2); the final M2 evidence head is that
  commit's SHA — see `git log`.
- **Commit sequence (INV-C):**
  - T1 `6134b22` — acceptance tests AC-1..15 test-first + lib + runner.
    Baseline run: 0/15 (11 strict ABSENT; 3 sentinels FAIL on missing AMB
    records; AC-15 FAIL on unwhitelisted freeze/governance commits —
    designed pre-whitelist condition).
  - I1 `891fa7a` — M2 domain core. 11/11 strict PASS; ancestry verified.
  - E1 `b33ff78` — AMB-003/004/005 formalised; adversarial Q1–Q14 all PASS;
    3 sentinels PASS (halts intact).
  - T2 `ed59903` — AC-15 freeze-whitelist (mechanical; chronology disclosed
    in acceptance-map.md). AC-15 PASS.
- **CI status:** none configured for this repository (local execution
  environment). Recorded local runs: M2 suite 15/15 (exit 0); adversarial
  14/14 (exit 0); M1 behavioural regression 13/13 (m1-ac-14 diff-scope
  failure disclosed in acceptance-map.md — post-milestone range pollution,
  same construction as m0-ac-10 after M1).
- **Migration head:** none. The reference core is in-memory
  (E/F/D/C classes in a store object); M2 introduces no migrations or
  schema files.
- **Gate result:** BLOCKED — M2-AC-5 (AMB-004), M2-AC-8 (AMB-003),
  M2-AC-11 (AMB-005) halted per contract; all other criteria PASS.
  M2 PASS is not declared; the human accepts or rejects the gate.

## M2 implementation decisions (with anchors)

1. **Self-contained extension module** (`M2/src/domain.js`). M1 source is
   untouched (milestone isolation; M2-AC-15 diff scope). M1 command types
   delegate to M1's `execute`; M1-internal plumbing (id sequence, freeze,
   fact/entity append, tenancy check, outcome records, device
   attribution) is re-implemented against the shared store with identical
   semantics. Anchor: M2 contract §Architectural inheritance.
2. **Event vocabulary (AC-ARCH-I3).** §7.3-catalogued types only:
   ProjectLifecycleEvent / SiteLifecycleEvent for project/site transitions,
   HandoverRecord for handovers, and the generic LifecycleEvent for
   ExternalParty / assignment / ProjectExternalParty lifecycle facts (M1
   precedent: OffboardWorker). No bespoke event types. Anchor: §7.3.
3. **Closure cascade scope** — the closed Site's SiteAssignment records
   only; ProjectAssignment is Worker×Project (PS-INV-3) and survives
   (§6.1.3 close-and-recreate remediation presumes it). Noted
   interpretation #1 in open-items.md; asserted in m2-ac-02. Anchor:
   §6.1.3.
4. **Handover freeze scope** (the contract's designated M2 implementation
   decision): current lifecycle state + non-removed assignments with their
   state at freeze + latest-revision Requirement set with scope, for the
   handed-over entity and its containment descendants. Anchor: §6.1.3
   "freezes a defined set of data as of a timestamp". Noted interpretation
   #2 (the "active assignments" reading) in open-items.md.
5. **Handover authority**: company_admin. Anchor: §6.11.2.
6. **Duplicate association rejection**: one active ProjectExternalParty per
   (Project, ExternalParty). Noted interpretation #3. Anchor: §7.5.
7. **No offline expansion**: no M2 command is offline-capable (§6.10.2
   classifies structural/administrative commands connectivity-required).
   Probe Q5.
8. **M2-aware readiness**: M2 supplies `siteReady`/`assignmentState`
   derivations that see the M2 `paused` state; M1's readiness derivation is
   not modified and cannot express it. Anchor: §4.4, §6.1.2.
9. **Reason discipline**: mandatory exactly at §6.11.6 (project
   suspension), §6.3.6 (assignment removal), §6.1.3 (closure cascade, fixed
   "site closure"); never fabricated elsewhere. Anchor: §6.1.6, §7.8.

## M0/M1 architecture refinement requested

None. The inherited architecture supported every implemented criterion
without modification. One latent observation for the programme (not a
defect; no action requested): range-diff scope tests (m0-ac-10, m1-ac-14,
m2-ac-15) fail by construction once the next milestone lands, because the
range is open-ended. Future milestone contracts may want to anchor the end
of the range (e.g. milestone-gate tag) or accept the documented
point-in-time semantics, as M2's acceptance-map does.
