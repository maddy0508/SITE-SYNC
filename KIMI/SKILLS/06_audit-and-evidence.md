# Skill 06 — Audit and Evidence

*This skill is addressed to the agent operating under the EP.
Where it says "you", it means you.*

## Purpose
Ensure every claim you make is evidenced, every milestone produces an
evidence bundle, and every artifact is verifiable.

## When invoked
- At the end of every milestone.
- Whenever you claim "done".
- Whenever you record the adversarial auditor's findings.

## Authority basis
- §5 (DoD)
- M0 evidence bundle specification
- §7.8 (audit trail as projection)
- §8 AC-ARCH-D1 through D6

## Procedure

1. Enumerate every claim made during the milestone.
   - "X is implemented."
   - "Y satisfies Z."
   - "W is compatible with §8."

2. For each claim, provide evidence:
   - file path + line range (where applicable)
   - commit SHA
   - command run
   - exact output
   - which AC the claim satisfies
   - which test proves it

3. Produce the evidence bundle:
       M<n>/evidence/
         claims.md            — every claim with anchor + evidence
         acceptance-map.md    — each M<n>-AC mapped to test + evidence
         adversarial.md       — findings, dispositions, unresolved
         open-items.md        — unresolved, deferred, escalated
         state.md             — commit SHA, CI status, migration state

4. Ensure no claim is unevidenced.
   - "Trust me" is not evidence.
   - "The tests pass" alone is not evidence (must name which tests).
   - "It should work" is never evidence.

5. Record what was NOT done and why.
   - Deferred items, their reasons, and their target milestones.

6. Record unresolved findings.
   - Adversarial findings not resolved.
   - Ambiguities not yet resolved.
   - Pending extractions not yet performed.

## Required output format
    | Claim | Anchor | Test | Test SHA | Impl SHA | Command | Output |

## Anti-patterns — do not accept these framings
- Claims without anchors.
- Tests without SHAs.
- "Tests pass" without naming the tests.
- Hidden deferred items.
- Hidden unresolved findings.
- Evidence that cannot be reproduced.

## Self-check before completing work
- [ ] Every claim has an anchor and evidence.
- [ ] Every AC has a passing test with SHAs.
- [ ] Every unresolved finding is explicit.
- [ ] Every deferred item names a target milestone.
- [ ] The evidence bundle is reproducible by a third party.
