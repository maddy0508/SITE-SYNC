# SITE-SYNC / Maddy Engineering OS Agent Customization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the approved VS Code/VSCodroid customization architecture as a version-controlled, least-privilege agent system for SITE-SYNC and a documented portable personal engineering layer.

**Architecture:** Keep project invariants in `.github/copilot-instructions.md`, scope technology-specific guidance through `.github/instructions/*.instructions.md`, package repeatable workflows as Agent Skills under `.github/skills/`, and define specialist roles under `.github/agents/`. Add hooks only for deterministic safety/verification and document MCP configuration rather than hard-coding secrets or unsafe server commands into the repository.

**Tech Stack:** VS Code Agent Customizations, GitHub Copilot custom instructions/agents/skills/hooks, React Native 0.86, TypeScript 5.8, Jest 29, Supabase JS 2.57, OP-SQLite 17, Android/iOS native projects.

**Spec:** `docs/superpowers/specs/2026-08-23-agent-customization-system-design.md`

## Global Constraints

- Repository truth beats model memory.
- Evidence beats assumption.
- Never silently regress decisions.
- Never describe a lower completion state as a higher completion state.
- Use least privilege for specialist agents.
- Do not weaken RLS or security controls to make tests pass.
- Do not automate production changes.
- Do not refactor SITE-SYNC application code as part of this customization project unless required to test the customization system.
- Existing `docs/superpowers/specs` and `docs/superpowers/plans` remain authoritative workflow artifacts.
- Required completion states are `proposed → designed → scaffolded → implemented → locally verified → CI verified → integration verified → release verified`.

---

## Task 1: Establish repository-wide agent instructions

**Files:**
- Create: `.github/copilot-instructions.md`
- Create: `.github/instructions/typescript.instructions.md`
- Create: `.github/instructions/react-native.instructions.md`
- Create: `.github/instructions/supabase.instructions.md`
- Create: `.github/instructions/tests.instructions.md`
- Create: `.github/instructions/android.instructions.md`
- Create: `.github/instructions/docs.instructions.md`

**Interfaces:**
- Consumes: current repository structure, `package.json`, M1.4 design, approved customization spec.
- Produces: always-on project invariants plus scoped technology/workflow rules automatically applied by matching globs.

- [ ] **Step 1: Write concise always-on invariants**
  - Declare the actual React Native/TypeScript/Supabase/OP-SQLite stack.
  - Require inspection of repository/spec/plan evidence before consequential work.
  - Define the completion-state vocabulary.
  - Define tenant/identity/RLS boundaries from M1.4.
  - Define verification expectations and documentation rules.
  - Explicitly forbid placeholder production data, security weakening, silent regression of rejected decisions, and false completion claims.

- [ ] **Step 2: Add scoped TypeScript and React Native instructions**
  - Use `applyTo` globs covering `sitesync/**/*.ts`, `sitesync/**/*.tsx`, and configuration files where appropriate.
  - Preserve existing project patterns before introducing abstractions.
  - Prefer focused changes and typed errors.
  - Require tests for behavior changes.

- [ ] **Step 3: Add scoped Supabase and test instructions**
  - Match `sitesync/supabase/**/*`, migration/test paths, and `sitesync/__tests__/**/*`.
  - Require migration review, RLS verification, negative authorization tests, and no client-trusted tenant identifiers.
  - Match test commands already defined by the repository.

- [ ] **Step 4: Add Android and documentation instructions**
  - Match `sitesync/android/**/*` for native Android constraints.
  - Match `docs/**/*.md` and `**/*spec*.md`/`**/*plan*.md` where useful.
  - Preserve Superpowers specification/plan workflow.

- [ ] **Step 5: Review instruction overlap**
  - Remove rules duplicated across files unless duplication is intentional for a safety-critical invariant.
  - Confirm every `applyTo` pattern matches the intended repository paths.

- [ ] **Step 6: Commit**
  - Commit as `chore: establish repository agent instructions`.

---

## Task 2: Build the project-state and evidence skills

**Files:**
- Create: `.github/skills/project-state/SKILL.md`
- Create: `.github/skills/evidence-first-research/SKILL.md`

**Interfaces:**
- Consumes: repository files, Superpowers specs/plans, git state and test evidence.
- Produces: structured state/evidence reports that downstream agents can use without inventing context.

- [ ] **Step 1: Define `project-state` skill**
  - Require reconstruction of objective, source of truth, requirements, constraints, architecture, decisions, rejected approaches, completed/current/unresolved work, dependencies, verification evidence, assumptions, unverified claims, and definition of done.
  - Require citing exact repository files/sections in findings.
  - Require an explicit distinction between observed state and inferred state.

- [ ] **Step 2: Define `evidence-first-research` skill**
  - Require read-only investigation first.
  - Trace behavior through source, tests, migrations and docs.
  - Record claim → evidence → confidence/unknown rather than presenting inference as fact.
  - For external research, identify source and date and distinguish official documentation from community material.

- [ ] **Step 3: Validate skill frontmatter**
  - Each skill directory contains exactly one discoverable `SKILL.md`.
  - Keep reusable workflow detail in the skill rather than in always-on instructions.

- [ ] **Step 4: Commit**
  - Commit as `feat: add project-state and evidence skills`.

---

## Task 3: Build the core implementation, debugging and review skills

**Files:**
- Create: `.github/skills/feature-implementation/SKILL.md`
- Create: `.github/skills/systematic-debugging/SKILL.md`
- Create: `.github/skills/change-review/SKILL.md`

**Interfaces:**
- Consumes: project-state/evidence findings and an approved task/spec.
- Produces: focused code changes, reproducible debugging records, and adversarial review results.

- [ ] **Step 1: Define `feature-implementation`**
  - Workflow: inspect → identify constraints → write/confirm tests → implement smallest correct change → targeted verification → broader verification proportional to risk → report evidence.
  - Explicitly prohibit speculative refactors and completion claims without verification.

- [ ] **Step 2: Define `systematic-debugging`**
  - Workflow: reproduce → capture exact failure → isolate boundary → form ranked hypotheses → test one hypothesis at a time → fix root cause → add regression coverage → rerun verification.
  - Prevent repeated blind edits after a failed hypothesis.

- [ ] **Step 3: Define `change-review`**
  - Review as if implementation may be wrong.
  - Inspect diff, requirements, tests, security boundaries, scope creep, regressions and completion-state evidence.
  - Report blocking defects before stylistic suggestions.

- [ ] **Step 4: Commit**
  - Commit as `feat: add implementation debugging and review skills`.

---

## Task 4: Build database, security, testing and release skills

**Files:**
- Create: `.github/skills/database-migration/SKILL.md`
- Create: `.github/skills/rls-security/SKILL.md`
- Create: `.github/skills/react-native-testing/SKILL.md`
- Create: `.github/skills/release-verification/SKILL.md`
- Create: `.github/skills/ui-review/SKILL.md`

**Interfaces:**
- Consumes: changed boundaries and repository evidence.
- Produces: specialized verification procedures and explicit pass/fail/blocked results.

- [ ] **Step 1: Define `database-migration`**
  - Inspect current schema/migrations before writing changes.
  - Require forward migration, verification, isolation testing and rollback strategy appropriate to the repository.
  - Never bypass RLS.

- [ ] **Step 2: Define `rls-security`**
  - Audit auth identity, tenant isolation, user/device ownership, RLS policy reachability, `SECURITY DEFINER` functions and fixed search paths.
  - Require negative tests for cross-tenant and anonymous access.

- [ ] **Step 3: Define `react-native-testing`**
  - Select tests by changed boundary.
  - Distinguish Jest/unit/component testing from emulator/device/native build verification.
  - Use the repository's actual scripts rather than inventing commands.

- [ ] **Step 4: Define `release-verification`**
  - Verify lint, tests, Android/iOS build state, environment configuration, signing state and release blockers.
  - Never infer release readiness from a successful debug build alone.

- [ ] **Step 5: Define `ui-review`**
  - Evaluate actual rendered behavior against explicit product requirements, visual hierarchy, interaction states, accessibility and platform behavior.
  - Distinguish screenshot/mockup review from running-app verification.

- [ ] **Step 6: Commit**
  - Commit as `feat: add database security testing release and ui skills`.

---

## Task 5: Create the first specialist agent layer

**Files:**
- Create: `.github/agents/orchestrator.agent.md`
- Create: `.github/agents/researcher.agent.md`
- Create: `.github/agents/architect.agent.md`
- Create: `.github/agents/implementer.agent.md`
- Create: `.github/agents/reviewer.agent.md`

**Interfaces:**
- Consumes: repository instructions and skills.
- Produces: routed research/design/implementation/review work with explicit handoffs.

- [ ] **Step 1: Define `researcher` as read-only**
  - Limit tools to search/read/research capabilities available in the environment.
  - Do not give it edit or destructive terminal access.
  - Return evidence-backed findings.

- [ ] **Step 2: Define `architect` as design-first**
  - Inspect repository and relevant specs before proposing architecture.
  - No implementation by default.
  - Handoff to `implementer` only after producing a coherent design/task.

- [ ] **Step 3: Define `implementer`**
  - Focus on an approved task.
  - Require minimal edits, tests and verification.
  - Handoff to `reviewer` after implementation.

- [ ] **Step 4: Define `reviewer`**
  - Perform adversarial review independently of implementation reasoning.
  - Require explicit evidence for completion claims.
  - Handoff to debugger or specialist when defects are found rather than silently fixing unrelated issues.

- [ ] **Step 5: Define `orchestrator`**
  - Classify task type/risk.
  - Invoke only relevant specialists.
  - Never route every task through every agent.
  - For consequential changes, prefer Research/Architecture → Implementation → Review.

- [ ] **Step 6: Add handoffs**
  - Researcher → Architect/Implementer where appropriate.
  - Architect → Implementer.
  - Implementer → Reviewer.
  - Reviewer → Debugger only after the debugger exists in Task 6.

- [ ] **Step 7: Commit**
  - Commit as `feat: add core specialist agents`.

---

## Task 6: Add specialist security, database, debugging, release and UX agents

**Files:**
- Create: `.github/agents/debugger.agent.md`
- Create: `.github/agents/security-auditor.agent.md`
- Create: `.github/agents/database-engineer.agent.md`
- Create: `.github/agents/release-engineer.agent.md`
- Create: `.github/agents/ux-critic.agent.md`

**Interfaces:**
- Consumes: changed code and the corresponding specialized skill.
- Produces: independent boundary-specific verification or diagnosis.

- [ ] **Step 1: Define debugger** with targeted diagnosis and regression-test requirements.
- [ ] **Step 2: Define security auditor** as read-heavy/adversarial and prohibit security weakening.
- [ ] **Step 3: Define database engineer** around Supabase/Postgres/migrations/RLS.
- [ ] **Step 4: Define release engineer** around complete release gates and environment separation.
- [ ] **Step 5: Define UX critic** around actual UI requirements and rendered behavior.
- [ ] **Step 6: Add appropriate handoffs without creating circular autonomous delegation.**
- [ ] **Step 7: Commit**
  - Commit as `feat: add specialist verification agents`.

---

## Task 7: Add deterministic hooks

**Files:**
- Create: `.github/hooks/security-guard.json`
- Create: `.github/hooks/session-state.json`
- Create: `.github/hooks/verification.json`
- Create: `scripts/agent-hooks/check-dangerous-command.mjs`
- Create: `scripts/agent-hooks/report-session-state.mjs`
- Create: `scripts/agent-hooks/verify-agent-change.mjs`

**Interfaces:**
- Consumes: VS Code hook JSON input on supported lifecycle events.
- Produces: deterministic allow/block/validation outcomes without relying on model memory.

- [ ] **Step 1: Implement conservative pre-tool security guard**
  - Block obvious destructive database/filesystem operations unless explicitly authorized.
  - Do not attempt to parse arbitrary shell perfectly; fail closed only for high-confidence dangerous patterns.
  - Never expose secrets in logs.

- [ ] **Step 2: Implement session-state reporting**
  - Report branch/status and expected project-state artifacts where the environment exposes this information.
  - Do not mutate application code.

- [ ] **Step 3: Implement lightweight post-tool verification**
  - Validate changed project customization files for obvious syntax/frontmatter errors.
  - Do not run the full application test suite after every edit.

- [ ] **Step 4: Verify hook configuration against current VS Code hook schema**
  - Ensure commands are local and reviewable.
  - Keep hook scripts outside files the agent is expected to rewrite during normal work.

- [ ] **Step 5: Commit**
  - Commit as `chore: add deterministic agent safety hooks`.

---

## Task 8: Document MCP and personal-layer configuration

**Files:**
- Create: `docs/agent-system/MADDY-ENGINEERING-OS.md`
- Create: `docs/agent-system/MCP.md`
- Create: `docs/agent-system/VALIDATION.md`

**Interfaces:**
- Consumes: approved design and implemented repository configuration.
- Produces: human-readable setup, security and validation documentation.

- [ ] **Step 1: Document the portable Maddy Engineering OS**
  - Provide the user-level customization text for `~/.copilot/instructions` or the VSCodroid Customizations UI.
  - Keep it project-agnostic.

- [ ] **Step 2: Document MCP recommendations**
  - GitHub: preferred repository/CI/review context.
  - Supabase: controlled database/schema operations.
  - Playwright: UI verification where applicable.
  - Linear: only if actively used.
  - Explicitly state that secrets/configuration belong in the user's environment, not committed files.

- [ ] **Step 3: Document validation procedure**
  - List customization diagnostics, skill discovery, agent discovery, hook debug logs, representative workflow and repository tests.
  - Record known limitations of VSCodroid/mobile editing versus desktop VS Code.

- [ ] **Step 4: Commit**
  - Commit as `docs: document engineering os and agent integrations`.

---

## Task 9: Run representative validation

**Files:**
- Modify: `docs/agent-system/VALIDATION.md`
- Test: repository customization discovery plus existing SITE-SYNC verification commands.

**Interfaces:**
- Consumes: complete customization system.
- Produces: evidence that customization files are syntactically valid, discoverable and behaviorally coherent.

- [ ] **Step 1: Validate repository customization paths**
  - Confirm `.github/copilot-instructions.md` exists.
  - Confirm all targeted instruction files have valid frontmatter.
  - Confirm all skills contain `SKILL.md`.
  - Confirm all agents use `.agent.md` and valid frontmatter.
  - Confirm hooks are valid JSON.

- [ ] **Step 2: Validate actual SITE-SYNC baseline**
  - Run `npm run lint` from `sitesync/`.
  - Run `npm test -- --runInBand --no-cache` from `sitesync/`.
  - Do not label failures caused by environment/tooling as application defects without evidence.

- [ ] **Step 3: Exercise the workflow conceptually against a low-risk representative task**
  - Researcher reconstructs current state.
  - Architect identifies files/constraints.
  - Implementer proposes a minimal change path.
  - Reviewer checks evidence and completion state.
  - Record what can and cannot be executed in the available VSCodroid environment.

- [ ] **Step 4: Record completion state**
  - Mark each layer separately as implemented/verified/blocked.
  - Do not claim release verification for the customization system unless the actual release path is tested.

- [ ] **Step 5: Commit**
  - Commit as `test: validate agent customization system`.

---

## Task 10: Final review and handoff

**Files:**
- Review: all files created under `.github/`, `scripts/agent-hooks/`, `docs/agent-system/`, and this plan.

- [ ] **Step 1: Run a configuration audit**
  - Search for duplicate rules, contradictory instructions, placeholder text, invented commands, unsafe tool access and secrets.

- [ ] **Step 2: Review against the approved spec**
  - Verify all ten definition-of-done conditions are either evidenced or explicitly marked blocked/not yet possible.
  - Verify all non-goals were respected.

- [ ] **Step 3: Produce final status**
  - Report changed files, commits, validation results, unresolved limitations and exact user action required in VSCodroid.

- [ ] **Step 4: Prepare integration**
  - Create a draft PR from `codex/agent-customization-system` into `main` after verification.
  - Do not merge automatically.
