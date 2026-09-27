# Skill 02 — Architecture Contract

*This skill is addressed to the agent operating under the EP.
Where it says "you", it means you.*

## Purpose
Translate the locked blueprint into an architecture that satisfies §8 without
introducing a second source of truth, stored domain booleans, hidden lifecycle,
or any rejected pattern.

## When invoked
- At every milestone where architecture is required (M0, and any milestone
  introducing new mechanisms).
- Whenever a mechanism must be named for an E/F/C/D type.

## Authority basis
- §7 (Conceptual Data Model)
- §8 (Architectural Constraints), all of A through I
- M0 §M0.3.1 through §M0.3.18
- M0 §M0.6 acceptance criteria

## Procedure

1. Enumerate blueprint obligations for the milestone.
   - For each §6 section in scope, list its E, F, C, D types.
   - For each, list the invariants it must satisfy.

2. Map each E/F/C/D type to a mechanism.
   - E: identity storage + creation fact + applicable domain facts.
   - F: write-once storage; no update path.
   - C: authoritative current-value storage.
   - D: recomputable projection; materialisation optional.

3. Identify authority boundaries.
   - Which operations are local-authoritative.
   - Which are server-authoritative (§6.10, DM-INV-10).
   - Which are declared per-entity-class conflicts (§6.10.3).

4. Identify offline requirements.
   - Which mutations are offline-capable (§6.10.2 and each section's
     offline sub-list).
   - Durable-intent mechanism per mutation.
   - Local cache / read model for offline reads.
   - Freshness exposure.

5. Identify conflict semantics.
   - Per-entity-class, not global.
   - Name the rule for each entity class that can conflict.

6. Detect second sources of truth.
   - Audit must derive from F ∪ CommandOutcome.
   - Reports must be D only.
   - Communication must be context-only, no facts.
   - Admin must produce canonical domain F records, no parallel admin log.

7. Produce the architecture document naming every mechanism.

## Required output format
    M0/architecture.md
      §A. Tenancy and scope isolation (with bypass analysis)
      §B. Identity
      §C. E/F/C/D persistence
      §D. Immutable facts
      §E. Derived state
      §F. Command processing + CommandOutcome (with local/server distinction)
      §G. Idempotency
      §H. Offline durable intent
      §I. Sync and reconciliation
      §J. Per-entity conflict rules
      §K. Audit
      §L. Freshness
      §M. Authorization
      §N. Device identity
      §O. Retention destruction
      §P. Android / local persistence
      §Q. Server persistence

## Anti-patterns — do not accept these framings
- "We'll figure out the D model later." D must be recomputable from day one.
- "The audit table is our source of truth." Audit derives from F.
- "We store a status column for speed." Permitted only as a materialisation.
- "We handle all conflicts with LWW." Rejected by AC-ARCH-C6.
- "The client and server do the same thing." Rejected by AC-ARCH-C3.
- "Admin has its own audit log." Rejected by AD-INV-2.

## Self-check before completing work
- [ ] Every E/F/C/D type has a named mechanism.
- [ ] Every §8 constraint is satisfied or formally deferred (with target).
- [ ] Local/server distinction is explicit for every command outcome.
- [ ] Per-entity conflict rules are declared.
- [ ] No second source of truth exists.
- [ ] No stored domain boolean is authoritative.
- [ ] Audit derives from F ∪ CommandOutcome only.
