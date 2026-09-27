# M0 Evidence — State

Authority: M0 execution contract (state.md must record final commit SHA, CI
status, migration state, blueprint version); Operating Contract §8 (state
tracking).

## Repository state

- Repository: maddy0508/SITE-SYNC
- Branch: main
- Baseline commit: f90b77ab73cb7ae20b1084ad94fb5bc159afa841 (unchanged)
- Operative EP: EP-2.0
- EP-2.0 tag resolution: 276c7994b5c0cbfd88ed4d5cb4587a7bd46a0adb
- EP-1.0 tag resolution: db8a7d35002c461853c88ad78ea0523319a6251e
  (historical, unchanged)
- Test commits: eede51d75cc504e9a6fe909473b5464afdb46605 (tests),
  dc6de2df07ae04dd482ca5a1d3e2d1d8b01bf51c (ac-03 test defect fix),
  fc536ef487e10f39f2dec820eb5111cbca8c303b (m0-ac-01 transformed for EP-2.0)
- Implementation (artifact) commit: a9f3c8543f9a0c289b60a7c627fe8a9b79378322
- Evidence commit: c468dd8761b1fdcfd88685d6f5b74b52b0fed4d4
- AMB-001 re-verification evidence commit: 22ff5d38cc6adf2ff5da4cd965acd6104ddf68fd
- Working tree: clean at every commit boundary (verified with
  `git status --porcelain` → empty).

## Acceptance test state

`node M0/acceptance-tests/run-all.mjs` at a9f3c85: 10/10 PASS (exit 0).
Baseline at eede51d: 0/10 PASS, 10 FAIL (all ABSENT) — INV-C sequence
satisfied (test SHAs are ancestors of the implementation SHA).

## CI status

No CI workflow covers M0 artifacts. Existing workflows
(.github/workflows/m15–m17, 7 files) are AC-04 legacy, register item SR-004
(SALVAGE — mechanics only). M0 verification is the local structural suite
above; execution transcripts are quoted in claims.md and acceptance-map.md.
No CI result is claimed.

## Migration state

No migration added, modified, or deleted by M0 (schema migration is prohibited
by the M0 contract). Verified:
`git diff --name-only EP-1.0..HEAD -- sitesync/supabase/migrations/` → empty.
Migration head remains 20260912000007_m17_sync_uuid_validation_compat.sql
(AC-04 legacy; SR-001.13 FREEZE).

## Blueprint version

MASTER_BLUEPRINT v1.0 LOCKED. §8.K amended at commit 0eefbd6 to
identify M0-AC-1 through M0-AC-10 as the operative acceptance
criteria; §0.1 register updated v0.8.1 → v0.8.2. No other blueprint
changes.

Blueprint modified only by the human-authorised amendment at
0eefbd6. Verified no M0 evidence commit touches the governed inputs
(the range a9f3c85..HEAD contains the EP-2.0 freeze commits, which are
excluded because they are the authorised amendment, not M0 evidence):

    git log --format=%H a9f3c85..HEAD | grep -vxF \
      -e 0eefbd642fb369166eb669550d497d63d3be7de1 \
      -e 7f4fd06934731b63bcc91d21ff5c332240ec78c9 \
      -e 276c7994b5c0cbfd88ed4d5cb4587a7bd46a0adb \
      | xargs -I{} git diff-tree --no-commit-id --name-only -r {} \
      | grep -E '^(MASTER_BLUEPRINT|KIMI|EP|EVIDENCE|sitesync)/'

→ empty

## Milestone / gate state

- Current milestone: M0 — gate: PASS. M0-AC-1 through M0-AC-10 PASS under the
  operative package EP-2.0 (§8.K amended; AMB-001 RESOLVED).
- Unresolved ambiguities: none. AMB-001 RESOLVED 2026-09-27 (see
  open-items.md).
- Unresolved adversarial findings: none EXPOSED; DEFERRED probes named with
  target milestones in adversarial.md.
- Pending extractions: §6.4, §6.8, §6.9, §6.11 (§M0.5 — non-blocking for M0;
  blocking for promotion).
- Salvage register: full register at M0/salvage-register.md; zero promotions.
- Next milestone: M1 execution contract may be drafted (M0 gate PASS per
  §M0.6); M1 implementation begins only after the M1 execution contract is
  approved (contract Transition).
