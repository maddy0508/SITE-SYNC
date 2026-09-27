# Skill 03 — Repository Archaeology

*This skill is addressed to the agent operating under the EP.
Where it says "you", it means you.*

## Purpose
Inspect the existing repository without allowing historical implementation
assumptions to leak into the new architecture.

## When invoked
- Whenever a pending extraction is performed.
- Whenever salvage of AC-04 code is considered.
- Whenever a prior mechanism is proposed as reusable.

## Authority basis
- §12 (Salvage register)
- M0 §M0.4 (salvage boundary), M0 §M0.5 (extraction gate)
- INV-C (test predates implementation)
- §8 (all constraints)

## Baseline
- Repository: maddy0508/SITE-SYNC
- Baseline commit: f90b77ab73cb7ae20b1084ad94fb5bc159afa841

## Procedure

1. Establish the exact baseline SHA.
   - Inspect only that SHA. Not later commits, not branches.

2. Enumerate artifacts in the extraction scope.
   - Filenames, paths, categories (migration / service / test / workflow / doc).

3. For each artifact, determine:
   - What does it actually do? (Read the code. Not the name.)
   - What assumptions does it encode?
   - Does a test exist for it?
   - Did the test predate the implementation?

4. Apply the naming-fallacy guard.
   - A file named `identityService.ts` is not necessarily the Person/Worker model.
   - A `COMPLETE` constant is not necessarily progress completion.
   - A `claim` function is not necessarily a CompletionClaim.
   - A `block` in Gradle config is not necessarily a §6.2 Block.

5. Classify against blueprint anchors.
   - Find the specific §/INV/AC the artifact would serve.
   - If no anchor exists, it cannot promote.

6. Apply one of five dispositions.
   | Disposition | Meaning |
   |---|---|
   | RETAIN | Serves a blueprint requirement, compatible, tested, low risk |
   | SALVAGE | Partially serves; needs refactor + new predating test |
   | REFERENCE | Informs but does not enter implementation |
   | FREEZE | Cannot classify yet; blueprint section incomplete |
   | DISCARD | Serves no requirement or encodes rejected assumption |

7. Record findings in the salvage register.

## Disposition rules (binding)
- No RETAIN without a predating test (INV-C strict).
- No RETAIN/SALVAGE for code encoding an unmade implementation choice.
- No promotion by name resemblance.
- No promotion because "it works."
- Freeze any item whose anchor is stubbed or open.

## Required output format
    | Artifact | Behaviour | Anchor | Test? | Test predates? | Disposition | Reason |

For any SALVAGE candidate, additionally record:
- reusable mechanism
- what must change
- what must be discarded
- required new test
- whether the original assumptions leak

## Anti-patterns — do not accept these framings
- "This file works so it must be reusable."
- "It's called identity so it's the identity model."
- "The tests pass so it's tested."
- "It's mostly what we need; we'll adapt it."
- "Let's port it and fix it later."

## Self-check before completing work
- [ ] Every artifact classified.
- [ ] No promotion without anchor + predating test + §8 compliance.
- [ ] Naming-fallacy guard applied to every match.
- [ ] Leak analysis recorded for every SALVAGE candidate.
- [ ] No promotion based on "it works."
