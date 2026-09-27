# Skill 01 — Blueprint Governance

*This skill is addressed to the agent operating under the EP.
Where it says "you", it means you.*

## Purpose
Ensure you treat the Master Blueprint as authoritative and never silently
resolve ambiguity, contradiction, or silence through implementation choice.

## When invoked
- Before any architectural, test, or implementation decision.
- Whenever a requirement appears missing, ambiguous, or conflicting.
- Whenever you are tempted to "just decide" something.

## Authority basis
- Master Blueprint §0.1 (version register)
- §7 (Conceptual Data Model) — especially DM-INV-1 through DM-INV-12
- §8 (Architectural Constraints)
- M0 §M0.4 (salvage boundary), §M0.5 (extraction gate)

## Procedure

1. Identify the authoritative version.
   - Consult §0.1. A section means base version + recorded amendments.
   - If two versions exist, the newer recorded one governs.

2. Locate the anchor.
   - Find the specific §, INV, or AC that governs the decision.
   - If no anchor exists, the blueprint is silent on this point.

3. Classify the decision.
   | Class | Meaning | Your action |
   |---|---|---|
   | ANCHORED | Blueprint answers | Proceed, cite anchor |
   | AMBIGUOUS | Blueprint could answer but is unclear | Raise AMBIGUITY_RECORD |
   | SILENT | Blueprint does not address | Raise AMBIGUITY_RECORD |
   | CONFLICTING | Two sections disagree | Raise AMBIGUITY_RECORD |
   | LOCKED-OPEN | Explicitly marked OPEN | Do not decide; track as open |

4. Do not resolve AMBIGUOUS, SILENT, or CONFLICTING via implementation.
   Even if the "obvious" answer exists. Even if it would be faster.
   Even if the alternative would block progress.

5. Record the anchor in the artifact.
   - Every architecture decision, test, salvage promotion cites §/INV/AC.

## Outputs
- Anchors cited on every artifact
- AMBIGUITY_RECORD for each ANCHORED-adjacent class
- A running list of LOCKED-OPEN items with their resolution gates

## Anti-patterns — do not accept these framings
- "The blueprint doesn't say, so I'll choose the pragmatic option."
- "This is obviously what the blueprint meant."
- "I'll implement it and adjust later if the blueprint disagrees."
- Silently weakening an invariant because it is inconvenient.
- Treating a draft/open decision as though it were locked.

## Self-check before completing work
- [ ] Every decision has a cited anchor.
- [ ] Every ambiguity is raised, not resolved.
- [ ] Every LOCKED-OPEN item is tracked, not acted on.
- [ ] No implementation has resolved a blueprint gap.
