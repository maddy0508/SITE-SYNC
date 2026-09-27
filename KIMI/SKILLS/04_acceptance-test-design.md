# Skill 04 — Acceptance Test Design

*This skill is addressed to the agent operating under the EP.
Where it says "you", it means you.*

## Purpose
Enforce INV-C: no implementation without a test that predates it.

## When invoked
- Before you write any code for a requirement.
- Before promoting any SALVAGE item.
- At every milestone's DoD verification.

## Authority basis
- §5 (Definition of Done, INV-C)
- §8 AC-ARCH-D2 (audit fields on every F record)
- Every §6 section's AC-* list
- M0 §M0.6 (acceptance criteria)

## Procedure

1. Identify the requirement.
   - Cite the specific §/INV/AC.
   - If no anchor exists, escalate. Do not design a test for an unanchored requirement.

2. Derive the acceptance criterion.
   - It must be observable.
   - It must be falsifiable.
   - It must be specific to a behaviour, not a general property.

3. Design the test before implementation.
   - What is the setup?
   - What is the action?
   - What is the observable outcome?
   - What is the negative case? (The case where the invariant must fail.)

4. The test must be executable against the baseline and must fail, or
   demonstrate the absence of the required behaviour, before the
   implementation is introduced.

   For code-level acceptance criteria, the test runs against the
   pre-implementation baseline (the commit before implementation begins) and
   must produce a FAIL result — either by assertion failure or by the
   required behaviour being absent.

   For architecture-level acceptance criteria (M0-AC-1 through M0-AC-10 and
   similar), the test is a structural or contract test against the produced
   artifacts. It must still be executable and falsifiable: for example, a
   script that parses `architecture.md`, checks that every E/F/C/D type in
   §7 has a named mechanism, and exits non-zero if any is missing.

   "Not yet applicable" is not a valid test state. If a test cannot be
   executed against something, it is not yet a test.

5. Commit the test.
   - Record the test's commit SHA.
   - Record the baseline result (`FAIL` or `ABSENT`).

6. Implement to satisfy the test.
   - Record the implementation commit's SHA.
   - The test must pass at the implementation commit.

7. Record the sequence.
       test_commit_sha: <sha>
       baseline_result: FAIL
       impl_commit_sha: <sha>
       implementation_result: PASS
       test_precedes_impl: YES

   `test_precedes_impl: NO` invalidates INV-C compliance for that AC.

## Required output format
    | AC | Requirement anchor | Test file | Test SHA | Baseline result | Impl SHA | Impl result | Precedes? |

Where:
- `baseline_result` ∈ { `FAIL`, `ABSENT` } — never `N/A`
- `impl_result` ∈ { `PASS`, `FAIL` }
- `precedes?` = `YES` iff `test_sha` is an ancestor of `impl_sha`

## Anti-patterns — do not accept these framings
- Writing a test that asserts current behaviour.
- Writing a test after seeing the implementation.
- Writing a test that would pass with or without the requirement.
- Writing a "negative test" that does not exercise the failure path.
- Writing tests that assert implementation details rather than behaviour.

## Self-check before completing work
- [ ] Every acceptance criterion has a test.
- [ ] Every test's SHA precedes its implementation's SHA.
- [ ] Every test is falsifiable.
- [ ] Negative cases exist for every invariant.
- [ ] No test was retro-fitted to bless implementation.
- [ ] Every code-level test's baseline result is `FAIL` or `ABSENT`.
- [ ] Every architecture-level test is a structural test against named artifacts.
- [ ] No test is recorded as "not yet applicable."
