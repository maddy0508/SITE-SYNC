# SKILL 06: Audit and Evidence

Version: v1.0
Date: 2026-09-26

---

## Purpose

Ensure that every state change in SITE-SYNC is recorded as a fact with proper authority, timestamp, and evidence. The audit trail is the ultimate source of truth.

## Triggers

- Implementing any mutation
- Implementing any fact recording
- Implementing any evidence capture
- Reviewing any code that changes state
- Preparing any milestone report

## Process

1. Verify that every state change is recorded as a fact.
2. Verify that every fact has: fact_id, fact_type, entity_type, entity_id, actor_id, authority_scope, timestamp, payload, sync_state.
3. Verify that evidence is captured for operations that require it (per acceptance criteria).
4. Verify that evidence is hashed (SHA-256) at capture.
5. Verify that the audit trail is append-only and immutable.
6. Verify that audit trail access is logged.

## Rules

- Every state change is a fact. No exceptions.
- Facts are immutable. No modifications, no deletions.
- Facts carry authority scope. Facts recorded without valid authority are flagged.
- Evidence is hashed at capture. Hash verification is available at any time.
- The audit trail is append-only. No modifications, no deletions.
- Audit trail access requires appropriate authority. Access is logged as a fact.
- Milestone reports include fact counts, types, and key facts as evidence.

## Output

For each feature, produce:
- Facts recorded (types, counts).
- Evidence captured (types, hashes).
- Audit trail verification.
- Authority verification.

---

END OF SKILL 06
