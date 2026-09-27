# SKILL 04: Acceptance Test Design

Version: v1.0.1
Date: 2026-09-26

---

## Purpose

Design acceptance tests from the Master Blueprint's acceptance criteria. Every acceptance criterion must have at least one test. Tests are the executable definition of done.

## Triggers

- Starting any milestone
- Before implementing any feature
- After any acceptance criterion is added or modified

## Process

1. Read the acceptance criteria relevant to the milestone.
2. For each criterion, design one or more tests.
3. Tests must be executable, not aspirational.
4. Tests must verify the criterion, not just exercise the code.
5. Tests must be independent of implementation details.
6. Tests must cover the Given/When/Then structure of the criterion.
7. Tests must specify the evidence they produce.

## Rules

- Every acceptance criterion must have at least one test.
- Tests are written before or alongside implementation (test-first or test-alongside).
- Tests must be automated. Manual tests are acceptable only for criteria that cannot be automated (e.g., usability).
- Tests must produce evidence: pass/fail, coverage, screenshots, performance measurements.
- Tests must be deterministic. Flaky tests are not acceptable.
- Tests must be maintainable. Tests that are harder to maintain than the code they test are not acceptable.

## Test types

- **Unit tests**: test individual functions and methods.
- **Integration tests**: test component interactions, API endpoints, database operations.
- **E2E tests**: test complete user flows.
- **Offline tests**: test operations without network connectivity.
- **Sync tests**: test sync conflict resolution, deterministic sync, sync ordering.
- **Performance tests**: test performance acceptance criteria.
- **Security tests**: test security acceptance criteria.

## Output

For each acceptance criterion, produce:
- Test description.
- Test type.
- Given/When/Then mapping.
- Expected evidence.
- Test file path.

---

END OF SKILL 04
