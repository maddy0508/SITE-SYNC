# SKILL 01: Blueprint Governance

Version: v1.0
Date: 2026-09-26

---

## Purpose

Ensure that all work on SITE-SYNC aligns with the Master Blueprint. The blueprint is the authoritative source. No work may contradict it.

## Triggers

- Starting any milestone
- Making any architectural decision
- Adding or modifying any feature
- Changing any data model
- Changing any API
- Changing any UI flow

## Process

1. Read the Master Blueprint section relevant to the work.
2. Identify applicable invariants, constraints, and acceptance criteria.
3. Verify that the proposed work aligns with the blueprint.
4. If there is a conflict, STOP and report to the human approver.
5. If there is no conflict, proceed and document the alignment.

## Rules

- The blueprint is authoritative. Code that contradicts the blueprint is wrong, regardless of how well it works.
- Invariants are non-negotiable. They are listed in §2.4 of the blueprint.
- Constraints are non-negotiable. They are listed in §15 of the blueprint.
- Acceptance criteria are the definition of done. They are listed in Part C of the blueprint.
- If the blueprint is ambiguous, report the ambiguity. Do not guess.
- If the blueprint is silent, report the gap. Do not assume.

## Output

For each work item, produce:
- Blueprint sections consulted.
- Invariants and constraints verified.
- Acceptance criteria applicable.
- Conflicts or ambiguities found (if any).
- Alignment statement.

---

END OF SKILL 01
