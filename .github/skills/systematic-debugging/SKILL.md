---
name: systematic-debugging
description: Diagnose failures through reproduction, evidence, isolation, root-cause testing, regression coverage, and verification.
---

# Systematic Debugging

Use this skill for crashes, failing tests, incorrect behavior, build failures, and regressions.

## Procedure

1. Reproduce the failure with the narrowest reliable command or interaction.
2. Capture the exact error, inputs, environment, and relevant logs.
3. Trace the failure to its boundary rather than editing the first suspicious line.
4. Form a small ranked set of hypotheses.
5. Test one hypothesis at a time and record the result.
6. Implement the smallest root-cause fix.
7. Add or strengthen regression coverage.
8. Rerun the original reproduction and relevant broader verification.

Do not repeatedly make speculative edits after a hypothesis fails. Distinguish application defects from environment/tooling failures.