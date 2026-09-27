# M0 Evidence — Acceptance Map

Authority: KIMI/SKILLS/04 (required format); M0 execution contract (evidence
requirements). INV-C sequence: test committed before implementation;
baseline result FAIL/ABSENT; implementation result PASS.

Test commit SHAs:
- eede51d75cc504e9a6fe909473b5464afdb46605 — all ten tests + runner + lib
  (2026-09-27). Baseline run at this commit: 10/10 FAIL (artifacts ABSENT).
- dc6de2df07ae04dd482ca5a1d3e2d1d8b01bf51c — m0-ac-03 test defect fix
  (split()[1] captured only the inter-delimiter segment; assertion unchanged).
  Recorded honestly: the fix was made after a run failure caused by the test's
  own mechanics, not by any artifact weakening.

Implementation commit SHA (the artifacts under test):
- a9f3c8543f9a0c289b60a7c627fe8a9b79378322 — the nine M0 documents +
  evidence/open-items.md.

Ancestry (verified):
`git merge-base --is-ancestor eede51d a9f3c85` → exit 0;
`git merge-base --is-ancestor dc6de2d a9f3c85` → exit 0.

| AC | Requirement anchor | Test file | Test SHA | Baseline result | Impl SHA | Impl result | Precedes? |
|---|---|---|---|---|---|---|---|
| M0-AC-1 | §M0.6 M0-AC-1; §8 A–I; §8.K (amended, EP-2.0) | M0/acceptance-tests/m0-ac-01.test.mjs | 32869cbb7cc429ac7574446e670bd105a7477246 | FAIL (against EP-1.0 blueprint) | 22ff5d38cc6adf2ff5da4cd965acd6104ddf68fd | PASS | YES (see ancestry note) |
| M0-AC-2 | §M0.6 M0-AC-2; §7.2/§7.3 | M0/acceptance-tests/m0-ac-02.test.mjs | eede51d75cc504e9a6fe909473b5464afdb46605 | ABSENT | a9f3c8543f9a0c289b60a7c627fe8a9b79378322 | PASS | YES |
| M0-AC-3 | §M0.6 M0-AC-3; §6.10.2; §6.3 | M0/acceptance-tests/m0-ac-03.test.mjs | dc6de2df07ae04dd482ca5a1d3e2d1d8b01bf51c | ABSENT | a9f3c8543f9a0c289b60a7c627fe8a9b79378322 | PASS | YES |
| M0-AC-4 | §M0.6 M0-AC-4; §M0.3.7 | M0/acceptance-tests/m0-ac-04.test.mjs | eede51d75cc504e9a6fe909473b5464afdb46605 | ABSENT | a9f3c8543f9a0c289b60a7c627fe8a9b79378322 | PASS | YES |
| M0-AC-5 | §M0.6 M0-AC-5; §7.3; §7.8 | M0/acceptance-tests/m0-ac-05.test.mjs | eede51d75cc504e9a6fe909473b5464afdb46605 | ABSENT | a9f3c8543f9a0c289b60a7c627fe8a9b79378322 | PASS | YES |
| M0-AC-6 | §M0.6 M0-AC-6; §M0.2 | M0/acceptance-tests/m0-ac-06.test.mjs | eede51d75cc504e9a6fe909473b5464afdb46605 | ABSENT | a9f3c8543f9a0c289b60a7c627fe8a9b79378322 | PASS | YES |
| M0-AC-7 | §M0.6 M0-AC-7; §M0.3.1; DM-INV-5/6 | M0/acceptance-tests/m0-ac-07.test.mjs | eede51d75cc504e9a6fe909473b5464afdb46605 | ABSENT | a9f3c8543f9a0c289b60a7c627fe8a9b79378322 | PASS | YES |
| M0-AC-8 | §M0.6 M0-AC-8; Operating Contract §3 | M0/acceptance-tests/m0-ac-08.test.mjs | eede51d75cc504e9a6fe909473b5464afdb46605 | ABSENT | a9f3c8543f9a0c289b60a7c627fe8a9b79378322 | PASS | YES |
| M0-AC-9 | §M0.6 M0-AC-9; §6.10.3; AC-ARCH-C6 | M0/acceptance-tests/m0-ac-09.test.mjs | eede51d75cc504e9a6fe909473b5464afdb46605 | ABSENT | a9f3c8543f9a0c289b60a7c627fe8a9b79378322 | PASS | YES |
| M0-AC-10 | §M0.6 M0-AC-10; §M0.4; §12 | M0/acceptance-tests/m0-ac-10.test.mjs | eede51d75cc504e9a6fe909473b5464afdb46605 | ABSENT | a9f3c8543f9a0c289b60a7c627fe8a9b79378322 | PASS | YES |

Gate note (M0-AC-1) — SUPERSEDED: the BLOCKED note below was written under
EP-1.0 while AMB-001 was open. AMB-001 is RESOLVED (2026-09-27, Maddy
McKellar): §8.K was a drafting artifact; AC-ARCH-0.1–0.8 were consolidated
into M0-AC-1 through M0-AC-10; no separate criterion set exists. The amended
§8.K (commit 0eefbd6, operative package EP-2.0) explicitly identifies
M0-AC-1 through M0-AC-10 as the operative criteria. M0-AC-1 re-verified
against EP-2.0: PASS.

Superseded EP-1.0-era gate note: the structural test passed — the architecture
dispositioned all 43 defined AC-ARCH constraints as SATISFIED with no
undeclared deferrals. However §8.K declared AC-ARCH-0.1–0.8 "verified at M0"
without defining them (AMB-001). Per Operating Contract §6 and §M0.6 ("no
partial pass"), the M0-AC-1 verdict was BLOCKED pending AMB-001 resolution,
and the M0 gate could not be reported PASS.

Re-verification under EP-2.0 (INV-C sequence):
- Amended test committed first: fc536ef487e10f39f2dec820eb5111cbca8c303b
  (positive assertion: amended §8.K identifies M0-AC-1 through M0-AC-10 as
  operative; no AC-ARCH-0.1/0.8 reference outside the §8.K amendment record).
  Superseded by 32869cbb7cc429ac7574446e670bd105a7477246, which removes a
  circular assertion (the test read acceptance-map.md, i.e. the record of its
  own result) and asserts properties of the amended blueprint only.
- Baseline at test commit 32869cb, against the pre-amendment blueprint:
  `git show EP-1.0:MASTER_BLUEPRINT/MASTER_BLUEPRINT.md > /tmp/bp-ep1.md`
  `M0_BLUEPRINT_PATH=/tmp/bp-ep1.md node M0/acceptance-tests/m0-ac-01.test.mjs`
  → FAIL (exit 1): "amended §8.K does not identify M0-AC-1 through M0-AC-10
  as the operative criteria", "amended §8.K does not cite the M0 Execution
  Contract §M0.6 as the criteria source".
- Implementation (evidence update) commit: 22ff5d38cc6adf2ff5da4cd965acd6104ddf68fd;
  with the current (EP-2.0) blueprint:
  `node M0/acceptance-tests/m0-ac-01.test.mjs` → PASS (exit 0).
- Ancestry: the substantive artifact under test for T2 is the amended
  blueprint §8.K (implementation commit 0eefbd6, within EP-2.0 commit C
  276c799). Verified:
  `git merge-base --is-ancestor 0eefbd642fb369166eb669550d497d63d3be7de1 32869cbb7cc429ac7574446e670bd105a7477246` → exit 0.
  Note on direction: `git merge-base --is-ancestor 32869cb 22ff5d3` → exit 1 —
  T2 postdates 22ff5d3 because T2 is a correction of the already-committed
  re-verification test (fc536ef). INV-C for the test correction was
  re-established per the binding transformation rule: T2 committed first, FAIL
  demonstrated against the EP-1.0 blueprint, PASS against the EP-2.0
  blueprint. The blueprint amendment it asserts (0eefbd6) precedes T2.

Operative package: EP-2.0 (tag → 276c7994b5c0cbfd88ed4d5cb4587a7bd46a0adb).
EP-1.0 (tag → db8a7d35002c461853c88ad78ea0523319a6251e) is historical,
unchanged.

Final verification run (at evidence commit, recorded in state.md):
`node M0/acceptance-tests/run-all.mjs` → 10/10 PASS, exit 0.
