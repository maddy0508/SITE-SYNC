# M1 State

## Repository state

- Final code commit: `62241d3f0699b46a55d169fcb72392db2a2f2eb5`
  (M1 domain core; parent chain: b79d312 → 1d2afc5 → 4739e9d (EP-3.0))
- Evidence bundle: this directory, committed immediately after 62241d3
  (see git log for the exact SHA; the bundle cannot contain its own commit SHA)
- Operative EP: EP-3.0 (tag `4739e9dc4dbd2b1545c8b4a8d1ed00c22d9ad696`)
- Tags EP-1.0 / EP-2.0 / EP-3.0: unmodified (verified post-commit:
  `git rev-parse EP-1.0 EP-2.0 EP-3.0` unchanged)
- Working tree: clean after evidence commit (`git status --short` → empty)

## CI status

The repository's `.github/workflows/` contains only legacy salvage-era
workflows (m15/m16/m17 android-build/verify), which target the pre-governance
AC-04 codebase, not M1. M1 introduces no CI workflow; M1 verification is the
local acceptance suite and probe suite:

```
node M1/acceptance-tests/run-all.mjs    # 12/12 present PASS, exit 0
node M1/evidence/adversarial-probes.mjs # ALL PROBES PASS, exit 0
```

## Migration head

None. M1 implements a pure-JS domain core with no external persistence; there
is no migration chain in M1 scope. (Decision record below.)

## §8.J implementation decisions taken in M1

§8.J leaves these open; M1 decides as follows (anchors in parentheses):

1. **Local storage engine** (§8.J): the M1 domain core runs against an
   in-memory store (`entities: Map`, `facts: append-only array`,
   `commandOutcomes: Map` idempotency index). A durable local engine is
   **not yet selected**: the only blueprint-classified offline-mutating M1
   command (AcknowledgeRequirement, §6.10.2) is deferred with the halted
   AC-11 scope (AMB-002), so no durable-intent obligation (OS-INV-3) is live
   in this build. Decision on the durable engine is due with AC-11.
2. **Sync algorithm** (§8.J): deferred with AC-11 (AMB-002). All M1 commands
   execute on the connectivity-required path: synchronous application against
   the single authority, exactly-once via CommandReceipt (M0 §G). No queue,
   retry, or reconciliation machinery is implemented, and none is required by
   the implemented command set.
3. **Conflict resolution mechanisms per entity class** (§8.J, using §6.10.3):
   M1's implemented classes admit exactly one overlapping-write surface —
   Worker profile same-field changes — resolved by the §6.10.3 declared rule
   (later timestamp wins, both recorded; probe P13). QR rotation races are
   resolved by single-authority command serialisation in this core; the
   distributed-arrival case is a sync-layer concern (M0 command-sync-model
   §5) and is DEFERRED to the first sync-executing milestone
   (adversarial.md P14). No other M1 class admits concurrent writes in this
   build. No global LWW default exists (AC-ARCH-C6).
4. **Physical DeviceInstallation representation** (§8.J): minimal Device
   (E, Platform) record, keyed by `deviceRef` equal to the command's
   deviceId, created on first accepted command from that device. This is
   attribution-only (M1 contract: "enough to attribute M1 facts"); it
   introduces no second identity (§7.15). Commands without an explicit
   deviceId execute under the single-device simulation default `dev-default`.
5. **Audit materialisation strategy** (§8.J): audit = the append-only fact
   stream itself (F ∪ CommandOutcome), deep-frozen at creation; no parallel
   audit store, no materialised audit projection. Audit queries filter the
   fact stream (DM-INV-9, AC-ARCH-D1). `commandOutcomes` is an idempotency
   index proven consistent with the CommandOutcome facts (probe P17), not a
   shadow store.

## M0 architecture refinements requested

None. M1 found no conflict between the inherited M0 architecture and the
blueprint within implemented scope. (AMB-002 is a blueprint defect, not an
M0-architecture defect.)

## Blueprint ambiguities raised

- **AMB-002** — `profile_complete(worker)` used by §4.4, defined nowhere.
  Halts M1-AC-9 and M1-AC-11. Full record: open-items.md.

## Salvage promoted

None (zero by default per M1 contract).

## Verification commands

```
git rev-parse EP-1.0 EP-2.0 EP-3.0     # tags unchanged
git status --short                      # clean
git log --oneline EP-3.0..HEAD          # M1 commits only, all under M1/
node M1/acceptance-tests/run-all.mjs    # 12/12 present PASS
node M1/evidence/adversarial-probes.mjs # ALL PROBES PASS
git merge-base --is-ancestor 1d2afc5 HEAD   # test precedes impl (exit 0)
git merge-base --is-ancestor b79d312 HEAD   # test precedes impl (exit 0)
```
