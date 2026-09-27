# M1 Acceptance Map

Milestone: M1 — Identity, Company & Onboarding
Operative EP: EP-3.0 (tag `4739e9dc4dbd2b1545c8b4a8d1ed00c22d9ad696`)
M1-start commit (comparison baseline): `4739e9dc4dbd2b1545c8b4a8d1ed00c22d9ad696` (EP-3.0)
Test-first commit: `1d2afc5ee7d9bf15715185894ce125403e385f27`
Test amendment commit (pre-implementation defect fixes, AC-1 + AC-13): `b79d31235244bd7665234c28356262e39f64b535`
Implementation commit: `62241d3f0699b46a55d169fcb72392db2a2f2eb5`

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

| AC | Test file | Test SHA | Form | Baseline result | Impl SHA | Impl result | precedes |
|---|---|---|---|---|---|---|---|
| M1-AC-1 | M1/acceptance-tests/m1-ac-01.test.mjs | b79d312 (amended; initially 1d2afc5) | strict | ABSENT | 62241d3 | PASS | YES |
| M1-AC-2 | M1/acceptance-tests/m1-ac-02.test.mjs | 1d2afc5 | strict | ABSENT | 62241d3 | PASS | YES |
| M1-AC-3 | M1/acceptance-tests/m1-ac-03.test.mjs | 1d2afc5 | strict | ABSENT | 62241d3 | PASS | YES |
| M1-AC-4 | M1/acceptance-tests/m1-ac-04.test.mjs | 1d2afc5 | strict | ABSENT | 62241d3 | PASS | YES |
| M1-AC-5 | M1/acceptance-tests/m1-ac-05.test.mjs | 1d2afc5 | strict | ABSENT | 62241d3 | PASS | YES |
| M1-AC-6 | M1/acceptance-tests/m1-ac-06.test.mjs | 1d2afc5 | strict | ABSENT | 62241d3 | PASS | YES |
| M1-AC-7 | M1/acceptance-tests/m1-ac-07.test.mjs | 1d2afc5 | strict | ABSENT | 62241d3 | PASS | YES |
| M1-AC-8 | M1/acceptance-tests/m1-ac-08.test.mjs | 1d2afc5 | strict | ABSENT | 62241d3 | PASS | YES |
| M1-AC-9 | — (no test authored; see below) | — | strict | — | — | BLOCKED (AMB-002) | — |
| M1-AC-10 | M1/acceptance-tests/m1-ac-10.test.mjs | 1d2afc5 | strict | ABSENT | 62241d3 | PASS | YES |
| M1-AC-11 | — (no test authored; see below) | — | strict | — | — | BLOCKED (AMB-002) | — |
| M1-AC-12 | M1/acceptance-tests/m1-ac-12.test.mjs | 1d2afc5 | strict | ABSENT | 62241d3 | PASS | YES |
| M1-AC-13 | M1/acceptance-tests/m1-ac-13.test.mjs | b79d312 (amended; initially 1d2afc5) | strict | ABSENT | 62241d3 | PASS | YES |
| M1-AC-14 | M1/acceptance-tests/m1-ac-14.test.mjs | 1d2afc5 | comparative-negative | comparison baseline = 4739e9d (M1-start) | M1-start commit | PASS | N/A |

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
3. AC-9 and AC-11 have no test files. Authoring either test requires
   choosing the semantics of `profile_complete(worker)`, which §4.4 uses as a
   gate conjunct but no authoritative input defines. Choosing would be
   reinterpretation; the scope is halted under AMB-002 (see open-items.md).
   When AMB-002 is resolved, both tests will be authored fresh with clean
   test-first provenance.

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
