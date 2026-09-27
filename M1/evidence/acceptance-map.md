# M1 Acceptance Map

Milestone: M1 — Identity, Company & Onboarding

## Two-phase execution (AMB-002)

M1 executed in two phases under two operative packages, because AMB-002
halted AC-9/AC-11 until the human's resolution (Option D2) was frozen as
EP-4.0:

- **Phase 1 (operative EP-3.0, tag `4739e9dc4dbd2b1545c8b4a8d1ed00c22d9ad696`):**
  AC-1 … AC-8, AC-10, AC-12, AC-13, AC-14 verified. Per human instruction
  (2026-09-27) this verification remains valid and was not re-run.
- **Phase 2 (operative EP-4.0, tag `0ac087ee1687b5a2a0f3cda80c035e3913dfe4fe`):**
  AC-9, AC-11 verified against the amended §4.4.

M1-start commit (AC-14 comparison baseline): `4739e9dc4dbd2b1545c8b4a8d1ed00c22d9ad696` (EP-3.0)

Phase 1 commits:
- Test-first commit: `1d2afc5ee7d9bf15715185894ce125403e385f27`
- Test amendment commit (pre-implementation defect fixes, AC-1 + AC-13): `b79d31235244bd7665234c28356262e39f64b535`
- Implementation commit: `62241d3f0699b46a55d169fcb72392db2a2f2eb5`
- Evidence bundle (phase 1): `2a4d4aea6332b74d8983444a4e77d2d07ecc88bc`

Phase 2 commits:
- EP-4.0 freeze: A `967b361774bcd79dd65c9367b6b86637753ca969` (§4.4 amendment),
  B `1bfdd923f46c98e8459afc89397c2fcfcf0e2e95` (manifest),
  C `0ac087ee1687b5a2a0f3cda80c035e3913dfe4fe` (lock; tag EP-4.0)
- Test-first commit (AC-9, AC-11): `b93b6ff8aaace1569244ed634984d41a19c8a8db`
- Implementation commit: `1af43d6332919d7148878b6040b3e619b9ec4174`

Phase 2 ancestry:

```
$ git merge-base --is-ancestor b93b6ff8aaace1569244ed634984d41a19c8a8db 1af43d6332919d7148878b6040b3e619b9ec4174   # exit 0
```

Phase 2 baselines at `b93b6ff` (domain core present from phase 1, readiness /
offline functions absent): both tests FAIL (`TypeError: profileComplete is not
a function` / `createCache is not a function`, exit 1). At `1af43d6`: both PASS.

Both test commits precede the implementation commit:

```
$ git merge-base --is-ancestor 1d2afc5ee7d9bf15715185894ce125403e385f27 62241d3f0699b46a55d169fcb72392db2a2f2eb5   # exit 0
$ git merge-base --is-ancestor b79d31235244bd7665234c28356262e39f64b535 62241d3f0699b46a55d169fcb72392db2a2f2eb5   # exit 0
```

Baseline at test commits (recorded before any implementation existed):

```
$ node M1/acceptance-tests/run-all.mjs     # at 1d2afc5 / b79d312
M1-AC-1..8, 10, 12, 13: FAIL — ABSENT: M1/src/domain.js (M1 domain core not implemented)
M1-AC-14: PASS (comparative-negative: pre-M1 state legitimately satisfies the property;
                 the run establishes the comparison baseline, not a failure condition)
exit=1
```

Implementation run (at `62241d3`):

```
$ node M1/acceptance-tests/run-all.mjs     # at 62241d3f0699b46a55d169fcb72392db2a2f2eb5
12/12 present tests passing; 2 expected files absent
exit=0
```

| AC | Test file | Test SHA | Form | Baseline result | Impl SHA | Impl result | precedes | Operative EP |
|---|---|---|---|---|---|---|---|---|
| M1-AC-1 | M1/acceptance-tests/m1-ac-01.test.mjs | b79d312 (amended; initially 1d2afc5) | strict | ABSENT | 62241d3 | PASS | YES | EP-3.0 |
| M1-AC-2 | M1/acceptance-tests/m1-ac-02.test.mjs | 1d2afc5 | strict | ABSENT | 62241d3 | PASS | YES | EP-3.0 |
| M1-AC-3 | M1/acceptance-tests/m1-ac-03.test.mjs | 1d2afc5 | strict | ABSENT | 62241d3 | PASS | YES | EP-3.0 |
| M1-AC-4 | M1/acceptance-tests/m1-ac-04.test.mjs | 1d2afc5 | strict | ABSENT | 62241d3 | PASS | YES | EP-3.0 |
| M1-AC-5 | M1/acceptance-tests/m1-ac-05.test.mjs | 1d2afc5 | strict | ABSENT | 62241d3 | PASS | YES | EP-3.0 |
| M1-AC-6 | M1/acceptance-tests/m1-ac-06.test.mjs | 1d2afc5 | strict | ABSENT | 62241d3 | PASS | YES | EP-3.0 |
| M1-AC-7 | M1/acceptance-tests/m1-ac-07.test.mjs | 1d2afc5 | strict | ABSENT | 62241d3 | PASS | YES | EP-3.0 |
| M1-AC-8 | M1/acceptance-tests/m1-ac-08.test.mjs | 1d2afc5 | strict | ABSENT | 62241d3 | PASS | YES | EP-3.0 |
| M1-AC-9 | M1/acceptance-tests/m1-ac-09.test.mjs | b93b6ff | strict | FAIL (functions absent) | 1af43d6 | PASS | YES | EP-4.0 |
| M1-AC-10 | M1/acceptance-tests/m1-ac-10.test.mjs | 1d2afc5 | strict | ABSENT | 62241d3 | PASS | YES | EP-3.0 |
| M1-AC-11 | M1/acceptance-tests/m1-ac-11.test.mjs | b93b6ff | strict | FAIL (functions absent) | 1af43d6 | PASS | YES | EP-4.0 |
| M1-AC-12 | M1/acceptance-tests/m1-ac-12.test.mjs | 1d2afc5 | strict | ABSENT | 62241d3 | PASS | YES | EP-3.0 |
| M1-AC-13 | M1/acceptance-tests/m1-ac-13.test.mjs | b79d312 (amended; initially 1d2afc5) | strict | ABSENT | 62241d3 | PASS | YES | EP-3.0 |
| M1-AC-14 | M1/acceptance-tests/m1-ac-14.test.mjs | 1d2afc5 | comparative-negative | comparison baseline = 4739e9d (M1-start) | M1-start commit | PASS | N/A | EP-3.0 |

**AC-14 note (post-EP-4.0).** AC-14's range-diff check (`EP-3.0..HEAD`)
legitimately fails if executed after the EP-4.0 freeze, because the freeze
commits A/B/C touch `MASTER_BLUEPRINT/MASTER_BLUEPRINT.md` and `EP/EP-4.0.*`
— governance artifacts, not M1 implementation. Per human instruction
(2026-09-27, Part 5) AC-14's verification under EP-3.0 (at `2a4d4ae`, where
the diff contained only `M1/` paths) remains valid and was not re-run. The
EP-4.0 freeze commits are separately scope-verified by EP-4.0 verification j
(freeze commits contain exactly the three expected files).

## Notes on test-commit history (integrity disclosure)

1. AC-1 and AC-13 were amended at `b79d312` **before any implementation
   existed**. The amendments fixed defects discovered while drafting the
   implementation against the committed tests:
   - AC-1's atomicity assertion counted audit substrate (CommandOutcome)
     records as domain state, contradicting AC-ARCH-C9 (rejected commands
     must be audited). The assertion now scopes G4's no-partial-mutation
     property to domain state and additionally asserts the rejection IS
     audited. The failing case was also switched from duplicate-name
     rejection (not blueprint-specified) to missing-name rejection
     (structural validation).
   - AC-13's "rejected command" scenario (a second suspension on an active
     worker) would have been accepted, not rejected. It now uses a
     reason-less suspension, which §6.3.6 makes mandatorily rejected.
   Both amended tests still precede the implementation commit, both baselines
   remain ABSENT, and ancestry is verified above. INV-C strict-form
   discipline (test first → baseline FAIL/ABSENT → impl PASS → ancestry) is
   preserved end-to-end.
2. AC-14's pre-M1 run passes by design (comparative-negative form; M1
   contract INV-C handling: "The pre-M1 state legitimately satisfies the
   property"). Its comparison baseline is the M1-start commit `4739e9d`
   (EP-3.0). `precedes: N/A`.
3. AC-9 and AC-11 had no test files during phase 1 (AMB-002; see
   open-items.md historical record). After AMB-002's resolution was frozen
   as EP-4.0, both tests were authored fresh with clean test-first
   provenance (`b93b6ff`, FAIL baseline, `1af43d6` PASS, ancestry verified),
   per the phase-1 commitment.

## M1-AC-14 post-M1 delta evaluation

```
$ git diff --name-only 4739e9dc4dbd2b1545c8b4a8d1ed00c22d9ad696 HEAD
M1/acceptance-tests/... (12 files)
M1/src/domain.js
M1/evidence/... (this bundle)
```

Every changed path is under `M1/` (M1-authorised). The entity/fact catalogue
introduced by `M1/src/domain.js` contains only in-scope §7 types (asserted at
runtime and by source scan in m1-ac-14.test.mjs): E — Company, Person,
Device, Worker, Project (entry state `draft` only), Site (entry state
`planned` only), ProjectAssignment, SiteAssignment (states `assigned` /
`active` only), Requirement, WorkerQrIdentity; F — WorkerProfileChange,
WorkerLifecycleEvent, Invitation, CapabilityGrant, DocumentRevision,
InductionCompletion, Acknowledgement, WorkerQrIdentityEvent, LifecycleEvent
(assignment-ending on offboarding only), CommandReceipt, CommandOutcome.
