# Skill 05 — Offline Sync Engineering

*This skill is addressed to the agent operating under the EP.
Where it says "you", it means you.*

## Purpose
Ensure SITE-SYNC's offline-first model is implemented correctly, without
compromising the invariants in §6.10, §7, and §8.

## When invoked
- Any time you implement an offline-capable mutation.
- Any time you design a command, queue, sync, conflict, or reconciliation mechanism.
- Any time you implement a read-only offline capability.

## Authority basis
- §6.10 (Offline / Sync)
- §7.10 (two-sided source-of-truth)
- §8 AC-ARCH-C1 through C10, E1 through E4, F1 through F4, G1 through G5
- M0 §M0.3.6 through §M0.3.11

## Procedure

1. Classify the operation.
   | Class | Requirement |
   |---|---|
   | Offline-mutating | Durable local commit + command identity + queue |
   | Offline read-only | Cached read model + freshness state |
   | Connectivity-required | Reject locally when offline, with reason |

2. For offline-mutating operations, verify:
   - [ ] Local commit is durable before user confirmation (C1).
   - [ ] Command identity is client-generated, stable across retry, restart, duplicate (C2).
   - [ ] Local commit and local F record(s) are atomic (C3).
   - [ ] Command outcome is one of accepted/rejected/failed/conflicted (C5).
   - [ ] Locally-rejected commands are terminal, not queued (C5+).
   - [ ] Per-entity ordering is enforced (C4).
   - [ ] Conflict rule is declared per entity class (C6).
   - [ ] Reconciliation converges or discloses (C7).
   - [ ] Two-sided source-of-truth preserved (C8).
   - [ ] Local/server identities match (A2).

3. For offline read-only operations, verify:
   - [ ] Named cache/read model exists.
   - [ ] Freshness state is exposed (E2).
   - [ ] Stale data is not presented as current.
   - [ ] Read does not write to F (E3).

4. For connectivity-required operations, verify:
   - [ ] Attempts fail locally with a specific reason.
   - [ ] No partial queue entry is created.

5. Test adversarial cases (see Skill 07).

## Anti-patterns — do not accept these framings
- "We'll queue everything and figure it out." Rejected by C6.
- "LWW everywhere." Rejected by C6.
- "The client is a cache." Rejected by C8.
- "Server is authoritative for everything." Rejected by C8.
- "Local commits are best-effort." Rejected by C1.
- "Dual-keying with client UUID and server UUID." Rejected by A2.
- "We don't need per-entity conflict rules." Rejected by C6.

## Self-check before completing work
- [ ] Every offline mutation has durable intent + identity + atomicity.
- [ ] Every offline read has cache + freshness.
- [ ] Every connectivity-required operation fails locally with reason.
- [ ] Per-entity conflict rules are declared.
- [ ] No second source of truth.
- [ ] No silent loss.
- [ ] Command outcome vocabulary is `accepted/rejected/failed/conflicted`.
