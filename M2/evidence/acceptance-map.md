# M2 Acceptance Map

Contract: KIMI/MILESTONES/M2_EXECUTION_CONTRACT.md v1.0.3 (EP-5.0).
M2-start commit (comparison baseline): `cfda19f` (M1 final evidence commit).
Baseline run: at test commit `6134b22` (T1, pre-implementation), command
`node M2/acceptance-tests/run-all.mjs`, verbatim output below.
Final run: at HEAD (E2), same command — 15/15 present tests passing,
exit 0. Adversarial: `node M2/evidence/adversarial-probes.mjs` — 14/14
PASS, exit 0.

## Baseline (T1 `6134b22`, verbatim)

```
m2-ac-01.test.mjs: FAIL  - ABSENT: M2/src/domain.js (M2 domain core not implemented)
m2-ac-02.test.mjs: FAIL  - ABSENT: M2/src/domain.js (M2 domain core not implemented)
m2-ac-03.test.mjs: FAIL  - ABSENT: M2/src/domain.js (M2 domain core not implemented)
m2-ac-04.test.mjs: FAIL  - ABSENT: M2/src/domain.js (M2 domain core not implemented)
m2-ac-05.test.mjs: FAIL  - ABSENT: M2/evidence/open-items.md (AMB-004 record not created)
m2-ac-06.test.mjs: FAIL  - ABSENT: M2/src/domain.js (M2 domain core not implemented)
m2-ac-07.test.mjs: FAIL  - ABSENT: M2/src/domain.js (M2 domain core not implemented)
m2-ac-08.test.mjs: FAIL  - ABSENT: M2/evidence/open-items.md (AMB-003 record not created)
m2-ac-09.test.mjs: FAIL  - ABSENT: M2/src/domain.js (M2 domain core not implemented)
m2-ac-10.test.mjs: FAIL  - ABSENT: M2/src/domain.js (M2 domain core not implemented)
m2-ac-11.test.mjs: FAIL  - ABSENT: M2/src/domain.js (M2 domain core not implemented)
m2-ac-12.test.mjs: FAIL  - ABSENT: M2/src/domain.js (M2 domain core not implemented)
m2-ac-13.test.mjs: FAIL  - ABSENT: M2/src/domain.js (M2 domain core not implemented)
m2-ac-14.test.mjs: FAIL  - ABSENT: M2/src/domain.js (M2 domain core not implemented)
m2-ac-15.test.mjs: FAIL  - diff touches paths outside M2/: EP/EP-5.0.LOCK, EP/EP-5.0.json,
                          KIMI/MILESTONES/M2_EXECUTION_CONTRACT.md, M1/evidence/state.md
0/15 present tests passing; 0 expected files absent
```

(AC-15's baseline FAIL is the designed pre-whitelist condition: the range
`cfda19f..HEAD` contains the EP-5.0 freeze commits and the M1 gate commit.
See the chronology disclosure below.)

## Map

| AC | Test file | Test SHA | Form | Baseline | Impl / cumulative SHA | Result | precedes |
|---|---|---|---|---|---|---|---|
| M2-AC-1 | m2-ac-01.test.mjs | 6134b22 | strict | FAIL (ABSENT) | 891fa7a | PASS | YES |
| M2-AC-2 | m2-ac-02.test.mjs | 6134b22 | strict | FAIL (ABSENT) | 891fa7a | PASS | YES |
| M2-AC-3 | m2-ac-03.test.mjs | 6134b22 | strict | FAIL (ABSENT) | 891fa7a | PASS | YES |
| M2-AC-4 | m2-ac-04.test.mjs | 6134b22 | strict | FAIL (ABSENT) | 891fa7a | PASS | YES |
| M2-AC-5 | m2-ac-05.test.mjs (halt sentinel) | 6134b22 | strict | FAIL (ABSENT) | b33ff78 (AMB-004 record) | **BLOCKED (AMB-004)** — sentinel PASS; criterion not satisfiable | YES (sentinel) |
| M2-AC-6 | m2-ac-06.test.mjs | 6134b22 | strict | FAIL (ABSENT) | 891fa7a | PASS | YES |
| M2-AC-7 | m2-ac-07.test.mjs | 6134b22 | strict | FAIL (ABSENT) | 891fa7a | PASS | YES |
| M2-AC-8 | m2-ac-08.test.mjs (halt sentinel) | 6134b22 | strict | FAIL (ABSENT) | b33ff78 (AMB-003 record) | **BLOCKED (AMB-003)** — sentinel PASS; criterion not satisfiable | YES (sentinel) |
| M2-AC-9 | m2-ac-09.test.mjs | 6134b22 | strict | FAIL (ABSENT) | 891fa7a | PASS | YES |
| M2-AC-10 | m2-ac-10.test.mjs | 6134b22 | strict | FAIL (ABSENT) | 891fa7a | PASS | YES |
| M2-AC-11 | m2-ac-11.test.mjs (halt sentinel) | 6134b22 | strict | FAIL (ABSENT) | b33ff78 (AMB-005 record) | **BLOCKED (AMB-005)** — sentinel PASS; criterion not satisfiable | YES (sentinel) |
| M2-AC-12 | m2-ac-12.test.mjs | 6134b22 | strict | FAIL (ABSENT) | 891fa7a | PASS | YES |
| M2-AC-13 | m2-ac-13.test.mjs | 6134b22 | strict | FAIL (ABSENT) | 891fa7a | PASS | YES |
| M2-AC-14 | m2-ac-14.test.mjs | 6134b22 | strict | FAIL (ABSENT) | 891fa7a | PASS | YES |
| M2-AC-15 | m2-ac-15.test.mjs | 6134b22 (substantive) / ed59903 (whitelist) | comparative-negative | FAIL (designed; see disclosure) | ed59903 | PASS | N/A |

Ancestry (INV-C): `git merge-base --is-ancestor 6134b22 891fa7a` (strict
tests → implementation): exit 0. `git merge-base --is-ancestor 6134b22
b33ff78` (sentinel tests → AMB evidence): exit 0. `git merge-base
--is-ancestor 6134b22 ed59903` (substantive AC-15 → whitelist): exit 0.

## Freeze-whitelist chronology disclosure (M2-AC-15)

Substantive assertion authored before implementation at `6134b22`.
Post-freeze edit inserted the literal EP-5.0 freeze-SHA whitelist
(`0d43b43`, `1893ab3`, `00c2adb`) at `ed59903`. Substantive scope
assertion unchanged.

Disclosed beyond the contract's template: the whitelist edit at `ed59903`
also excludes the M1 gate-acceptance commit `f8fe895` (touches
`M1/evidence/state.md` only), which sits inside the range `cfda19f..HEAD`
and is governance, not M2 implementation. It is held in a separately named
`GOVERNANCE` set with its own comment, not folded into `EP5_FREEZE`.

## Halt-sentinel semantics (M2-AC-5 / 8 / 11)

The contract forbids partial PASS for these criteria. The sentinel tests do
not assert the criteria; they assert that (a) the AMB record is present and
complete in `M2/evidence/open-items.md` and (b) the halted scope stays
halted (no mechanism implemented without a resolution). Sentinel PASS =
halt intact. The criteria themselves remain **BLOCKED** pending human
resolution of AMB-003, AMB-004, AMB-005 respectively. For M2-AC-11 the
sentinel additionally asserts the derivable baseline (default-apply) is
live, so the halted portion is precisely delimited.

## Regression disclosure (legacy range-diff scope tests)

`m1-ac-14` and `m0-ac-10` are point-in-time gate assertions anchored at
their milestone-start commits with open-ended ranges (`baseline..HEAD`).
After M2 landed they fail on their diff-scope section by construction
(range now contains `M2/…` and EP-5.0 paths) — the same failure `m0-ac-10`
showed after M1 landed (M0 GATE: 9/10, 1 FAIL). All M1 behavioural tests
pass post-M2 (13/13; only m1-ac-14 fails). These tests were not modified:
editing `M1/` or `M0/` is outside M2's authorised diff scope and would
itself violate M2-AC-15. Their PASS at their own gates is recorded in
`M1/evidence/acceptance-map.md` and the M0 gate record.
