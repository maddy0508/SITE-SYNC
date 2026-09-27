# OPERATING CONTRACT

Applies to: all work on SITE-SYNC
Version: v1.0
Date: 2026-09-26
Owner: Maddy McKellar

---

## 1. Purpose

This contract defines how work on SITE-SYNC is executed. It is binding on all contributors — human and AI. It exists to ensure that work is systematic, auditable, and aligned with the Master Blueprint.

---

## 2. Authority

This contract derives its authority from the Master Blueprint. In case of conflict, the Master Blueprint prevails.

---

## 3. Roles

### 3.1 Human approver
The human approver (Maddy McKellar) has final authority over:
- Blueprint changes
- Milestone contract approval
- Milestone completion sign-off
- Scope changes
- Architecture changes

### 3.2 AI executor
The AI executor (Kimi) is responsible for:
- Executing milestone contracts
- Writing code, tests, and documentation
- Recording facts
- Providing evidence
- Reporting progress

The AI executor does not have authority to:
- Change the blueprint
- Change milestone scope without approval
- Merge code without passing all quality gates
- Mark a milestone as complete without human sign-off

### 3.3 Supporting roles
- repository archaeologist
- architecture guardian
- test engineer
- security auditor
- adversarial reviewer

---

## 4. Execution rules

### 4.1 Contract-first
No work begins without a milestone contract. The contract defines scope, acceptance criteria, test requirements, and definition of done.

### 4.2 Fact-sourced progress
Progress is measured by facts, not by subjective assessment. Every state change is a fact. Every milestone completion is verified by evidence.

### 4.3 Test-first
Tests are written before or alongside implementation. No code is merged without passing tests.

### 4.4 Audit-first
Every operation is auditable. The audit trail is the ultimate source of truth.

### 4.5 Offline-first
All features are designed for offline operation first. Connectivity-dependent features are explicitly listed in the blueprint.

---

## 5. Communication rules

### 5.1 Direct communication
Communication is direct, concise, and factual. No filler, no reassurance, no unnecessary questions.

### 5.2 Blocked reporting
A blocked milestone is reported, not worked around. The blocker is documented with specific details and proposed resolutions.

### 5.3 Progress reporting
Progress is reported at milestone boundaries, not continuously. Interim progress is available on request.

### 5.4 Evidence-based claims
All claims are backed by evidence: code, tests, facts, or documentation. Unsupported claims are identified as such.

---

## 6. Quality gates

### 6.1 Code quality
- All code passes linting.
- All code passes type checking.
- All code has adequate test coverage.
- No TODO comments in merged code.

### 6.2 Security quality
- No known vulnerabilities in dependencies.
- All inputs are validated.
- All outputs are sanitized.
- Authentication and authorization are enforced.

### 6.3 Performance quality
- All performance acceptance criteria are met.
- No memory leaks.
- No unnecessary network requests.
- Efficient database queries.

### 6.4 Usability quality
- All usability acceptance criteria are met.
- UI is consistent with design system.
- Error messages are clear and actionable.
- Offline behavior is transparent to the user.

---

## 7. Change management

### 7.1 Blueprint changes
Changes to the Master Blueprint require human approval and a new version. The old version is archived but remains accessible.

### 7.2 Scope changes
Scope changes require a new milestone contract or an amendment to the existing contract. Amendments require human approval.

### 7.3 Architecture changes
Architecture changes require an updated architecture contract. Changes are documented as facts.

---

## 8. Milestone execution

### 8.1 Milestone start
A milestone starts when:
1. The previous milestone is complete and signed off.
2. The milestone contract is approved.
3. Dependencies are verified as complete.

### 8.2 Milestone execution
During execution:
1. Work follows the contract.
2. Facts are recorded for all state changes.
3. Tests are written and run.
4. Evidence is captured.
5. Blockers are reported immediately.

### 8.3 Milestone completion
A milestone is complete when:
1. All acceptance criteria are met and verified.
2. All tests pass.
3. All evidence is provided.
4. The milestone report is complete.
5. The code is merged to main.
6. The deployment is successful.
7. The human approver has signed off.

---

## 9. Reporting

### 9.1 Milestone report
Every milestone's final report includes:
- Facts recorded (count, types, key facts).
- Acceptance criteria met (list with evidence).
- Test results (pass/fail counts, coverage).
- Evidence provided (list with references).
- Deviations from contract (if any, with rationale).
- Lessons learned.
- Recommendations for next milestone.

### 9.2 Blocked report
A blocked milestone report includes:
- What was attempted.
- What is blocking progress.
- Specific error messages or evidence.
- Proposed resolutions.
- What is needed to unblock.

---

## 10. Prohibited actions

The following are prohibited:
- Modifying the blueprint without human approval.
- Changing milestone scope without human approval.
- Merging code that fails quality gates.
- Marking a milestone as complete without human sign-off.
- Deleting or modifying facts.
- Bypassing the audit trail.
- Introducing connectivity dependencies not listed in the blueprint.
- Creating parallel audit, reporting, messaging, notification, or admin layers outside the fact model.
- Using mutable entity state as the sole authority for any state.
- Presenting derived values as the source of truth.

---

## 11. Amendments

This contract may be amended with human approval. Amendments are versioned and archived.

---

END OF OPERATING CONTRACT
