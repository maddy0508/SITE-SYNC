# Skill 07 — Adversarial Audit

*This skill is addressed to the agent operating under the EP.
Where it says "you", it means you.*

## Purpose
Systematically ask how the implementation could *appear* correct while
violating the blueprint.

## When invoked
- At every milestone's closure.
- Whenever an invariant is asserted.
- Whenever a mechanism is claimed to satisfy §8.

## Authority basis
- §8 (all constraints), especially A4, B1, C3, C6, C8, D1, E3, H1, H5
- §7 (DM-INV-1 through DM-INV-12)
- Each section's INV list

## Procedure

For each invariant claimed to be satisfied, ask the adversarial question.

### Tenancy and isolation (§8.B1)
- Can a privileged DB role bypass tenant isolation?
- Can an application-layer path access another Company's data?
- Can a cross-Company reference be created indirectly?

### Identity and dual-keying (§8.A2)
- Can two commands produce two entities for one logical action?
- Can an entity's identity change across local/server?
- Can a successor identity be re-used?

### Immutability (§8.D4, §7 DM-INV-2)
- Can any user path edit an F record?
- Can an F record be deleted via cascade?
- Can retention destruction be triggered from a user action?

### Derived vs authoritative (§8.A4, §8.E3, §7 DM-INV-3)
- Can a stored D value become authoritative?
- Can an F record read a D value as input?
- Can a D value and its source disagree silently?

### Offline durability (§8.C1, §8.G3)
- Can a committed action disappear after restart?
- Can a queued action be dropped without disclosure?
- Can a local rejection be queued anyway?

### Idempotency (§8.G1)
- Can duplicate delivery of the same command apply twice?
- Can a server-assigned identity undermine client identity?

### Conflict semantics (§8.C6)
- Can two entities resolve conflicts by different rules than declared?
- Can a conflict resolve silently?
- Can a conflict resolution be lost?

### Audit (§8.D1)
- Can a rejected command disappear from the audit trail?
- Can a domain mutation occur without an F record?
- Can an audit entry exist without a corresponding fact?

### Second source of truth (§8.A1, M0-AC-6)
- Is there a reporting layer that is authoritative?
- Is there an admin log separate from F?
- Is there a messaging store that becomes a fact?
- Is there a "shadow" state updated independently of F?

### Offline reads (§8.F1, §8.E2)
- Is stale data presented as current?
- Is freshness indicated?
- Is a locally committed fact presented as server-confirmed?

### QR and identity (§6.3)
- Can an old QR still create attendance?
- Can a retired QR be re-used?
- Can two active QRs exist?
- Can zero active QRs exist for an active Worker?

### Progress and completion (§6.6)
- Can an asset store `complete = true` as authority?
- Can a claim be verified twice?
- Can a claim survive reversal as if nothing happened?
- Can a CRITICAL blocker be bypassed at claim or verification?

### Attendance (§6.5)
- Can a check-out precede its check-in?
- Can a shift overlap another shift?
- Can a readiness gate be bypassed offline?
- Can a work date be computed differently offline and online?

### Archive/retention (§8.H)
- Can an archived Site receive new facts?
- Can a hard-delete be reached from a user path?
- Can RetentionDestructionEvent be destroyed by the retention it caused?

## Required output format

    M<n>/evidence/adversarial.md

    | # | Attack | Section | Result | Evidence | Disposition |

Dispositions:
- MITIGATED — invariant holds, evidence provided
- EXPOSED — invariant can be violated; raises BLOCKER_RECORD
- DEFERRED — cannot yet be tested; named milestone

## Anti-patterns — do not accept these framings
- Asking "does this work?" instead of "how could this fail?"
- Accepting "the tests pass" as adversarial evidence.
- Skipping an invariant because it "seems fine."
- Failing to record an exposed finding.

## Self-check before completing work
- [ ] Every §8 constraint has been adversarially tested.
- [ ] Every exposed finding is a BLOCKER_RECORD.
- [ ] Every deferred test names its target milestone.
- [ ] The adversarial log is part of the evidence bundle.
