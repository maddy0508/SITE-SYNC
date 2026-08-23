---
name: project-state
description: Reconstruct the current project state from repository evidence before consequential work, preserving requirements, decisions, rejected approaches, verification evidence, and unresolved issues.
---

# Project State

Use this skill before consequential work when current architecture, prior decisions, or completion state matters.

## Procedure

1. Inspect the repository structure and the files directly relevant to the task.
2. Read the newest relevant specifications and plans under `docs/superpowers/`.
3. Inspect implementation, tests, migrations, and recent history where they answer the question.
4. Produce a state map with:
   - objective;
   - source of truth;
   - confirmed requirements;
   - hard constraints;
   - architecture and boundaries;
   - decisions;
   - rejected approaches;
   - completed work;
   - current work;
   - unresolved issues;
   - dependencies;
   - verification evidence;
   - assumptions;
   - unverified claims;
   - definition of done.
5. Label each important statement as observed, inferred, proposed, assumed, or unknown.
6. Identify contradictions between code, docs, tests, and recent history instead of silently choosing one.

## Output

Return a compact evidence-backed state report. Cite exact repository paths and relevant sections. Never fill missing state from memory when the repository can be inspected.