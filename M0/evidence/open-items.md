# M0 Evidence — Open Items

Authority: KIMI/OPERATING_CONTRACT.md §6 (ambiguity protocol), §7 (evidence
discipline); M0 execution contract (evidence requirements).

## AMBIGUITY_RECORDs

### AMB-001 — AC-ARCH-0.1 through AC-ARCH-0.8 declared but never defined

- ID: AMB-001
- Detected in: MASTER_BLUEPRINT/MASTER_BLUEPRINT.md line 1519 (§8.K), during
  M0 §8 compliance verification.
- Statement of ambiguity: §8.K states "AC-ARCH-0.1 through AC-ARCH-0.8,
  verified at M0." No enumeration or definition of these eight acceptance
  criteria exists anywhere in the authoritative inputs. Exhaustive search
  evidence: `grep -n "AC-ARCH-0\." MASTER_BLUEPRINT/MASTER_BLUEPRINT.md`
  returns only line 1519; `grep -rn "ARCH-0" KIMI/ EP/` returns nothing; the
  uploaded EP artifact set contains the same single reference. §8.2 enumerates
  categories A–I only.
- Blueprint sections consulted: §8 (all), §8.2 (categories), §8.K, §M0.3,
  §M0.6, §0.1 (version register), KIMI/OPERATING_CONTRACT.md, KIMI/SKILLS/*,
  KIMI/MILESTONES/M0_EXECUTION_CONTRACT.md.
- Why each is insufficient: §8.K names the criteria without defining them;
  §M0.6 defines M0-AC-1..10, a different set (10 items, distinct identifiers);
  §M0.3.1–18 defines architecture requirements, not acceptance criteria;
  nothing maps "0.1–0.8" onto either set.
- Options considered (no recommendation bias):
  1. Treat AC-ARCH-0.1–0.8 as a dangling reference to a section lost before
     freeze; verify M0 against A–I only.
  2. Treat AC-ARCH-0.1–0.8 as aliases for an existing set (e.g., a subset of
     M0-AC or M0.3) — requires a human mapping decision.
  3. Treat §8.K as a requirement that eight new architecture acceptance
     criteria be drafted — requires blueprint amendment (new version).
- Scope affected: M0-AC-1 ("Every applicable §8 constraint satisfied") — the
  §8-verification completeness claim cannot be fully evidenced while eight
  declared §8 criteria are undefined. No other M0-AC is affected.
- Blocker: yes — for M0-AC-1 PASS. Recorded as BLK-001 in the M0 report.
- Date: 2026-09-27.
- Action taken per Operating Contract §6: no option selected; blueprint not
  amended; affected scope halted. All 43 defined AC-ARCH constraints are
  dispositioned SATISFIED in M0/architecture.md §8 Compliance Matrix;
  AC-ARCH-0.1–0.8 are marked UNVERIFIABLE — AMB-001.

## Deferred items (with target)

| Item | Reason | Target |
|---|---|---|
| §8.M open selections (local storage engine; sync algorithm; per-class conflict mechanisms; physical DeviceInstallation representation; server storage and tenancy mechanism; audit materialisation strategy) | §8.J leaves these unconstrained; choosing at M0 would be architecture improvisation | M1 (storage/tenancy), M10 (sync algorithm), per §11 |
| Prolonged-offline warning thresholds (24h/72h draft) | §6.10.8 OPEN | M10 |
| Capability set finalisation (draft: supervisor, first_aider, management_contact) | §6.3.9 OPEN | M1 |
| Retention windows | §7.15 DEFERRED to Platform retention policy | Platform policy milestone |
| §6.4/§6.8/§6.9/§6.11 extractions | §M0.5: do not block M0; block promotion | M5/M9 per §11; see M0/pending-extractions.md |

## Unresolved findings

- AMB-001 (above) — awaiting human decision.
- EVIDENCE/AC-04_BASELINE/ absent at EP-1.0 while declared PARTIAL in the M0
  contract input table — consistent with §M0.5; no action at M0.

## Salvage register state

Unchanged dispositions; zero promotions (§M0.4). Full register:
M0/salvage-register.md.
