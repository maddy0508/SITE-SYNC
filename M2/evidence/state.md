# M2 State

- **Milestone:** M2 — Project & Site lifecycle, suspension overlay,
  assignment states, ExternalParty / ProjectExternalParty, HandoverRecord;
  phase 2 (EP-6.0): independent Site operational suspension, Project
  transfer, Site opt-out from project-scope Requirements.
- **Operative EP (at close):** EP-6.0 (lock commit
  `a764d4f563ca95f6cb0d42d1565b62373d1e1564`; tag object
  `e81c8c3bd5d2635c6c8f4fe19efc083658672a2b` → `a764d4f`; blueprint amended,
  AMB-003/004/005 resolved). Historical: EP-5.0 (lock commit
  `00c2adbed0fa91be136c76029267d88dbacff583`; tag object
  `5075aa1b8429a9c9e5586bad90d0d109a48adefc` → `00c2adb`) — superseded.
- **M2-start baseline:** `cfda19f` (M1 final evidence commit).
- **HEAD at this record:** `da983aa` (T4). This file is updated by the
  following evidence commit (E3); the final M2 evidence head is that
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
  - T3 `b872cf6` — phase-2 tests for AC-5/8/11 test-first under EP-6.0
    (sentinels replaced by substantive tests). Baseline run: 11/15 (the
    three new tests FAIL on unknown command type — designed
    ABSENT-equivalent; AC-15 FAIL on unwhitelisted EP-6.0 freeze commits —
    designed pre-whitelist condition). Verbatim output in
    acceptance-map.md.
  - I2 `35c99af` — phase-2 implementation: SiteOperationalSuspension
    (SuspendSite/UnsuspendSite), TransferProject (system actor, AMB-003
    option C), SiteRequirementOptOut (OptOut/Revoke); derivations fold both
    new F streams. AC-5/8/11 PASS; twelve phase-1 tests still PASS;
    ancestry verified.
  - T4 `da983aa` — AC-15 EP-6.0 freeze-whitelist + catalogue (mechanical;
    chronology disclosed in acceptance-map.md). AC-15 PASS.
  - E3 — AMB resolutions recorded; evidence updated (this commit).
- **CI status:** none configured for this repository (local execution
  environment). Recorded local runs: M2 suite 15/15 (exit 0, phase 2, all
  substantive); adversarial 17/17 (exit 0); M1 behavioural regression 13/13
  (m1-ac-14 diff-scope failure disclosed in acceptance-map.md —
  post-milestone range pollution, same construction as m0-ac-10 after M1).
- **Migration head:** none. The reference core is in-memory
  (E/F/D/C classes in a store object); M2 introduces no migrations or
  schema files.
- **Gate result:** all fifteen acceptance criteria verified PASS (AC-5/8/11
  under EP-6.0 after AMB resolution; the twelve phase-1 criteria verified
  at EP-5.0 and still PASS in the phase-2 final run). M2 PASS is not
  declared; the human accepts or rejects the gate.

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

### Phase-2 implementation decisions (EP-6.0; AMB-003/004/005 resolved)

10. **System actor for TransferProject** — Platform Admin surface (§6.11);
    `ctx.actor = { kind: 'system' }` (M1 precedent). Tenancy checks do not
    apply to the transfer itself (it crosses Companies by design); the
    transfer payload references (source Project, receiving Company) are
    validated for existence, and a same-Company destination is rejected.
    Probe Q12.
11. **Stream independence** — the Project overlay and the
    SiteOperationalSuspension stream are folded independently in
    `siteOperationalStatus`; neither derivation writes to the other and a
    Project resume cannot lift an independent suspension (M2-AC-5b).
12. **Copy semantics on transfer** — copied Sites/Requirements are genesis
    records (new identities, entry states `planned`/fresh `groupId`), not
    fact-carried history; the source records, being deep-frozen, cannot
    change, so "source unchanged" is structural. TransferEvent is the sole
    cross-Company linkage (F record, §7.3-catalogued).
13. **Opt-out scope guard** — OptOutSiteRequirement admits only
    project-scope Requirements of the Site's own Project; revocation
    requires an active opt-out. Probe Q16.
14. **Reason discipline (phase 2)** — mandatory on SiteOperationalSuspension
    and SiteRequirementOptOut facts (§6.1.3 amended) and on the transfer
    removal cascade (fixed "project transfer").

## M0/M1 architecture refinement requested

None. The inherited architecture supported every implemented criterion
without modification. One latent observation for the programme (not a
defect; no action requested): range-diff scope tests (m0-ac-10, m1-ac-14,
m2-ac-15) fail by construction once the next milestone lands, because the
range is open-ended. Future milestone contracts may want to anchor the end
of the range (e.g. milestone-gate tag) or accept the documented
point-in-time semantics, as M2's acceptance-map does.
