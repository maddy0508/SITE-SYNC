# M0 EXECUTION CONTRACT

Version: v1.0
Date: 2026-09-26
Milestone: M0 — Repository Archaeology and Baseline

---

## 1. Scope

### 1.1 Included

- Clone the repository at the baseline commit.
- Inventory all files, directories, and their purposes.
- Identify what exists: features, tests, documentation, configuration.
- Identify what works: passing tests, running services, deployed components.
- Identify what is broken: failing tests, broken features, dead code.
- Identify what is missing: features not implemented, tests not written, documentation gaps.
- Document the gap between the Master Blueprint and the repository.
- Produce a repository archaeology report.

### 1.2 Excluded

- No new features.
- No bug fixes.
- No refactoring.
- No deletion of existing code.
- No modification of existing code.
- No implementation of blueprint requirements.

---

## 2. Dependencies

Baseline repository: maddy0508/SITE-SYNC
Baseline commit: f90b77ab73cb7ae20b1084ad94fb5bc159afa841
Master Blueprint: v1.0 (EP-1.0)

---

## 3. Acceptance criteria

### AC-M0-1: Repository cloned
Given the baseline commit, when the repository is cloned, then the clone is successful and the working tree is clean.

### AC-M0-2: File inventory complete
Given the cloned repository, when the file inventory is produced, then every file is listed with path, purpose, size, and last modified date.

### AC-M0-3: Feature inventory complete
Given the cloned repository, when the feature inventory is produced, then every feature is identified as existing, working, broken, or missing.

### AC-M0-4: Test inventory complete
Given the cloned repository, when the test inventory is produced, then every test is identified as existing, passing, failing, or missing.

### AC-M0-5: Documentation inventory complete
Given the cloned repository, when the documentation inventory is produced, then every documentation file is identified as existing, accurate, outdated, or missing.

### AC-M0-6: Gap analysis complete
Given the Master Blueprint and the repository, when the gap analysis is produced, then every blueprint requirement is mapped to its repository status (implemented, partially implemented, not implemented, or contradicted).

### AC-M0-7: Report complete
Given all inventories and the gap analysis, when the report is produced, then it contains all required sections and is reviewed by the human approver.

---

## 4. Test requirements

- No new tests are written in M0.
- Existing tests are run and results are documented.
- Test coverage is measured and documented.

---

## 5. Evidence requirements

- Repository clone log.
- File inventory (complete list).
- Feature inventory (with status).
- Test inventory (with results).
- Documentation inventory (with status).
- Gap analysis (blueprint vs. repository).
- Test coverage report.
- Repository archaeology report.

---

## 6. Definition of done

M0 is complete when:
1. All acceptance criteria are met.
2. All evidence is provided.
3. The repository archaeology report is complete.
4. The human approver has reviewed and approved the report.

---

## 7. Report requirements

Final M0 report contains:
- Baseline commit verified.
- File inventory summary (total files, total size).
- Feature inventory summary (existing, working, broken, missing counts).
- Test inventory summary (existing, passing, failing, missing counts, coverage).
- Documentation inventory summary (existing, accurate, outdated, missing counts).
- Gap analysis summary (implemented, partially implemented, not implemented, contradicted counts).
- Key findings (top 10 most important discoveries).
- Recommendations for M1.

---

## 8. Prohibited actions

- No code modification.
- No code deletion.
- No new features.
- No bug fixes.
- No refactoring.
- No judgment of code quality (document, don't evaluate).

---

## 9. Completion

M1 execution contract is drafted only after M0 reports PASS.

---

END OF M0 EXECUTION CONTRACT
