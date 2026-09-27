# SKILL 03: Repository Archaeology

Version: v1.0
Date: 2026-09-26

---

## Purpose

Inspect the existing repository without allowing historical implementation decisions to constrain the target architecture. The repository is evidence, not authority.

## Triggers

- Starting M0 (repository archaeology milestone)
- Before any refactoring
- Before any migration
- When encountering unexpected code

## Process

1. Clone or read the repository at the specified baseline commit.
2. Inventory all files, directories, and their purposes.
3. Identify what exists: features, tests, documentation, configuration.
4. Identify what works: passing tests, running services, deployed components.
5. Identify what is broken: failing tests, broken features, dead code.
6. Identify what is missing: features not implemented, tests not written, documentation gaps.
7. Document findings without judgement. The repository is what it is.

## Rules

- Repository: maddy0508/SITE-SYNC
- Baseline commit: specified in the milestone contract
- The repository is evidence, not authority. The Master Blueprint is authority.
- Do not fix anything during archaeology. Document, don't repair.
- Do not delete anything during archaeology. Document, don't clean.
- Do not refactor during archaeology. Document, don't improve.

## Output

Produce a repository archaeology report containing:
- File inventory (path, purpose, size, last modified).
- Feature inventory (what exists, what works, what is broken, what is missing).
- Test inventory (what tests exist, what passes, what fails, what is missing).
- Documentation inventory (what documentation exists, what is accurate, what is outdated, what is missing).
- Configuration inventory (what is configured, what is correct, what is incorrect, what is missing).
- Dependency inventory (what dependencies exist, what versions, what vulnerabilities).
- Gap analysis (blueprint vs. repository).

---

END OF SKILL 03
