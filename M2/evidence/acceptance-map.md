# M2 Acceptance Map

Contract: KIMI/MILESTONES/M2_EXECUTION_CONTRACT.md v1.0.3 (installed at
EP-5.0; blueprint amended at EP-6.0 resolving AMB-003/004/005).
M2-start commit (comparison baseline): `cfda19f` (M1 final evidence commit).
Baseline run (phase 1): at test commit `6134b22` (T1, pre-implementation),
command `node M2/acceptance-tests/run-all.mjs`, verbatim output below.
Phase-2 baseline run: at test commit `b872cf6` (T3, phase-2 tests
test-first under EP-6.0, pre-implementation), same command, verbatim
output below.
Final run: at E3 HEAD (phase 2), same command — 15/15 present tests
passing, exit 0 (all fifteen substantive). Adversarial: `node
M2/evidence/adversarial-probes.mjs` — 14/14 PASS at phase 1; 17/17 PASS at
phase 2, exit 0.

Two-phase execution: phase 1 (EP-5.0) verified M2-AC-1/2/3/4/6/7/9/10/
12/13/14 strictly and recorded M2-AC-5/8/11 BLOCKED (AMB-004/003/005).
Phase 2 (EP-6.0, after human resolution) verified M2-AC-5/8/11 strictly
with new test-first cycles; the twelve phase-1 criteria were not
re-verified (their EP-5.0 verification stands; all twelve still PASS in
the phase-2 final run).

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

## Phase-2 baseline (T3 `b872cf6`, verbatim)

```
m2-ac-01.test.mjs: PASS
m2-ac-02.test.mjs: PASS
m2-ac-03.test.mjs: PASS
m2-ac-04.test.mjs: PASS
m2-ac-05.test.mjs: FAIL
    M2-AC-5: FAIL
      - SuspendSite rejected: {"commandId":"cmd-54","outcome":"server rejected","reason":"unknown command type: SuspendSite"}
      - site A not operationally suspended after SuspendSite: {"projectSuspended":false,"operational":"normal"}
      - site A lost its independent suspension after project resume: {"projectSuspended":false,"operational":"normal"}
      - UnsuspendSite rejected: {"commandId":"cmd-64","outcome":"server rejected","reason":"unknown command type: UnsuspendSite"}
      - expected 2 SiteOperationalSuspension facts, got 0
m2-ac-06.test.mjs: PASS
m2-ac-07.test.mjs: PASS
m2-ac-08.test.mjs: FAIL
    M2-AC-8: FAIL
      - TransferProject rejected: {"commandId":"cmd-77","outcome":"server rejected","reason":"unknown command type: TransferProject"}
      - no TransferEvent produced
      - new Project entity not found
      - expected 2 copied Sites, got 0
      - source ProjectAssignment not removed: assigned
      - removal reason: undefined
      - source SiteAssignment not removed: assigned
      - removal reason: undefined
      - expected 2 copied Requirements, got 0
      - copied site-scope Requirement does not point at a copied Site
m2-ac-09.test.mjs: PASS
m2-ac-10.test.mjs: PASS
m2-ac-11.test.mjs: FAIL
    M2-AC-11: FAIL
      - OptOutSiteRequirement rejected: {"commandId":"cmd-51","outcome":"server rejected","reason":"unknown command type: OptOutSiteRequirement"}
      - opt-out ineffective at A: {"ready":false,"failing":["ent-48"],"hasAssignment":true,"companyReady":true}
      - expected 1 SiteRequirementOptOut fact, got 0
      - RevokeSiteRequirementOptOut rejected: {"commandId":"cmd-55","outcome":"server rejected","reason":"unknown command type: RevokeSiteRequirementOptOut"}
m2-ac-12.test.mjs: PASS
m2-ac-13.test.mjs: PASS
m2-ac-14.test.mjs: PASS
m2-ac-15.test.mjs: FAIL
    M2-AC-15: FAIL
      - diff touches paths outside M2/: EP/EP-6.0.LOCK, EP/EP-6.0.json, MASTER_BLUEPRINT/MASTER_BLUEPRINT.md
---
11/15 present tests passing; 0 expected files absent
```

exit=1. The AC-5/8/11 baseline FAILs are the designed ABSENT-equivalent
condition under EP-6.0 (commands not yet implemented); AC-15's FAIL is the
designed pre-whitelist condition for the EP-6.0 freeze commits (see the
chronology disclosure).

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
| M2-AC-15 | m2-ac-15.test.mjs | 6134b22 (substantive) / ed59903 (EP-5.0 whitelist) / da983aa (EP-6.0 whitelist + catalogue) | comparative-negative | FAIL (designed; see disclosure) | da983aa | PASS | N/A |

Ancestry (INV-C): `git merge-base --is-ancestor 6134b22 891fa7a` (strict
tests → implementation): exit 0. `git merge-base --is-ancestor 6134b22
b33ff78` (sentinel tests → AMB evidence): exit 0. `git merge-base
--is-ancestor 6134b22 ed59903` (substantive AC-15 → whitelist): exit 0.
Phase 2: `git merge-base --is-ancestor b872cf6 35c99af` (phase-2 tests →
phase-2 implementation): exit 0.

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

Phase 2 (same category, same rule): the whitelist edit at `da983aa`
inserted the literal EP-6.0 freeze SHAs (`af06026` — blueprint amendment
resolving AMB-003/004/005; `cebd4ae` — manifest; `a764d4f` — lock) as
`EP6_FREEZE`. (The EP-6.0 evidence commit `b0498fe` touches only `M2/` and
needs no exclusion.) The same edit removed `TransferEvent` from the
prohibited-type list and added the five phase-2 commands to the expected
command catalogue — both consequences of the EP-6.0 blueprint amendment,
not scope expansion. Substantive assertions unchanged.

## Halt-sentinel semantics (M2-AC-5 / 8 / 11) — retired at EP-6.0

Phase 1: the contract forbade partial PASS for these criteria. The
sentinel tests did not assert the criteria; they asserted that (a) the AMB
record was present and complete in `M2/evidence/open-items.md` and (b) the
halted scope stayed halted (no mechanism implemented without a
resolution). Sentinel PASS = halt intact.

Phase 2: AMB-003/004/005 were resolved by human decision (Maddy McKellar,
2026-09-28; mechanism: EP-6.0 cut and tagged, superseding EP-5.0 — see
open-items.md). The sentinels were replaced at `b872cf6` by substantive
tests asserting the criteria themselves, test-first (baseline FAIL
verbatim above), with the implementation at `35c99af`. The criteria now
PASS under EP-6.0.

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
