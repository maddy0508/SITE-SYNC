---
name: change-review
description: Perform an adversarial post-change review for correctness, regressions, missing tests, security boundaries, scope creep, and false completion.
---

# Change Review

Assume the implementation may be wrong until evidence establishes otherwise.

## Review order

1. Read the governing requirement/spec/plan.
2. Inspect the complete diff, not only the files mentioned in the summary.
3. Check behavior against requirements and existing architecture.
4. Check tests for meaningful coverage and missing negative paths.
5. Check authentication, authorization, tenant isolation, persistence, lifecycle, and data-integrity boundaries when relevant.
6. Check for unrelated changes, dependency churn, dead code, placeholders, and regressions.
7. Check completion-state claims against actual evidence.

Report blocking defects first, then material risks, then non-blocking improvements. Do not silently repair unrelated issues during review.