---
name: evidence-first-research
description: Investigate repository or external sources and produce evidence-backed findings without converting assumptions into facts.
---

# Evidence-First Research

Use this skill whenever implementation depends on understanding existing behavior, documentation, APIs, security boundaries, or external references.

## Procedure

1. Define the exact question and what evidence would answer it.
2. Start with repository sources when the question concerns the current project.
3. Trace behavior through implementation, tests, configuration, migrations, and documentation.
4. For external research, prefer authoritative primary documentation and record source/date.
5. Record findings as `claim → evidence → interpretation → unknowns`.
6. Actively search for contradictory evidence before settling on a conclusion.
7. Do not modify code while performing read-only research.

## Output

Separate verified facts, strong inferences, proposals, and unknowns. Identify the exact files, symbols, tests, or external sources supporting important claims. If evidence is insufficient, say what remains unverified.