# SKILL 05: Offline-Sync Engineering

Version: v1.0
Date: 2026-09-26

---

## Purpose

Ensure SITE-SYNC's offline-first model is implemented correctly, without introducing hidden online assumptions. Offline is the default, not the exception.

## Triggers

- Implementing any feature that records facts
- Implementing any feature that reads state
- Implementing any sync functionality
- Implementing any conflict resolution
- Reviewing any code that touches the network

## Process

1. Identify whether the operation is offline-capable or connectivity-required (per §7.2 of the blueprint).
2. If offline-capable: verify that the operation works without network. Verify that the fact is recorded locally. Verify that the fact is queued for sync.
3. If connectivity-required: verify that the operation fails gracefully offline. Verify that the failure reason is clear to the user.
4. Verify that sync is deterministic: same facts, same state, regardless of order.
5. Verify that conflict resolution follows the rules in §7.4 of the blueprint.
6. Verify that sync retry follows the backoff schedule in AC-SYNC-6.

## Rules

- All daily operations must work offline. No exceptions.
- Facts recorded offline are queued for sync. They are not lost.
- Sync is bidirectional and deterministic.
- Conflict resolution follows the blueprint rules. No ad-hoc resolution.
- Sync retry is automatic with exponential backoff.
- Sync notification is via WebSocket after server confirmation.
- Local read models are computed from the local fact store. They are disposable and rebuildable.
- Server-computed read models are cached and marked with freshness.

## Output

For each feature, produce:
- Offline capability classification (offline-capable or connectivity-required).
- Offline behavior verification.
- Sync behavior verification.
- Conflict resolution verification (if applicable).
- Test results.

---

END OF SKILL 05
