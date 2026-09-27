# SKILL 07: Adversarial Audit

Version: v1.0
Date: 2026-09-26

---

## Purpose

Adversarially audit SITE-SYNC implementation to find gaps, contradictions, inefficiencies, and violations of the Master Blueprint. The adversarial auditor's job is to find problems, not to confirm that everything is fine.

## Triggers

- After any milestone completion
- Before any deployment
- After any significant refactoring
- When requested by the human approver

## Process

1. Read the Master Blueprint.
2. Read the milestone contract.
3. Read the implementation.
4. Look for gaps: blueprint requirements not implemented.
5. Look for contradictions: implementation that contradicts the blueprint.
6. Look for violations: implementation that violates invariants or constraints.
7. Look for inefficiencies: implementation that is unnecessarily complex or slow.
8. Look for security issues: implementation that has vulnerabilities.
9. Look for test gaps: acceptance criteria without tests, or tests that don't verify the criterion.
10. Report all findings with specific evidence.

## Questions to answer

- Does every acceptance criterion have a passing test?
- Does every state change record a fact?
- Does every fact carry authority scope?
- Does every evidence file have a verifiable hash?
- Does every offline-capable operation work offline?
- Does every connectivity-required operation fail gracefully offline?
- Is the audit trail append-only and immutable?
- Is tenant isolation enforced?
- Is sync deterministic?
- Is conflict resolution correct?
- Are there any hidden online assumptions?
- Are there any bypass mechanisms?
- Are there any parallel audit, reporting, or admin layers?
- Is there a reporting layer that is authoritative?
- Are derived values presented as the source of truth?

## Rules

- The adversarial auditor is not the implementer. The auditor reviews, the implementer builds.
- The adversarial auditor reports findings, not fixes. Fixes are the implementer's responsibility.
- All findings must be backed by specific evidence: code references, test results, or behavior demonstrations.
- Findings are classified by severity: critical (blueprint violation), major (functional gap), minor (inefficiency or inconsistency).
- The adversarial auditor does not approve or reject milestones. The human approver approves or rejects.

## Output

Produce an adversarial audit report containing:
- Findings (classified by severity, with specific evidence).
- Questions answered (yes/no with evidence).
- Recommendations for fixes.
- Overall assessment.

---

END OF SKILL 07
