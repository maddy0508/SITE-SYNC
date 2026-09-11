---
name: feature-implementation
description: Implement approved changes using inspect-design-test-verify discipline and the smallest correct change.
---

# Feature Implementation

Use this skill for feature work, behavior changes, and focused refactors.

## Procedure

1. Reconstruct relevant project state and read the governing spec/plan.
2. Identify affected boundaries, constraints, existing patterns, and definition of done.
3. Define or update the smallest useful failing test when behavior is changing.
4. Implement the minimum coherent change.
5. Run targeted verification first.
6. Run broader verification proportional to risk.
7. Inspect the final diff for unrelated changes and accidental regressions.
8. Report changed files, tests, verification evidence, unresolved issues, and completion state.

Do not introduce speculative refactors or claim completion without evidence.