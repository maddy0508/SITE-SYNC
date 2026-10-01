# SITE-SYNC / Maddy Engineering OS — Agent Customization System Design

## Goal
Create a reusable VS Code/VSCodroid agent system that improves the reliability, continuity, speed, and verification quality of SITE-SYNC and future software projects without concentrating all behavior into one oversized prompt.

The system will use the VS Code customization layers as intended: always-on instructions for invariants, file-based instructions for scoped conventions, skills for repeatable workflows, custom agents for specialist roles and tool boundaries, hooks for deterministic safeguards, and MCP servers only where an external capability materially improves the workflow.

## Current Repository Context
SITE-SYNC is a React Native 0.86 application using TypeScript, Jest, Supabase JS, OP-SQLite, and native Android/iOS projects. The repository already contains `docs/superpowers/specs` and `docs/superpowers/plans`, and the latest recorded work is M1.4 identity, device registration, and project context. The M1.4 design establishes authoritative identity/project context, tenant isolation, device lifecycle rules, and verification requirements.

The current repository therefore needs an agent system that understands both application code and the existing evidence/specification/verification workflow, rather than treating the repository as an unstructured new React Native project.

## Design Principles

1. **Repository truth beats model memory.** The agent must inspect the current repository and authoritative project documents before making consequential claims.
2. **Evidence beats assumption.** Distinguish verified facts, inference, proposal, and unknowns.
3. **Never silently regress decisions.** Previously rejected approaches and explicit constraints remain active unless deliberately superseded.
4. **No false completion.** Designed, scaffolded, mocked, partially wired, locally tested, CI-tested, and release-verified are distinct states.
5. **Specialization beats persona inflation.** Use focused agents and skills rather than an enormous universal prompt.
6. **Deterministic controls belong in hooks.** Security blocks and mandatory checks must not depend on the model remembering an instruction.
7. **Least privilege.** Read-only agents should not receive write-capable tools; sensitive operations should require deliberate user approval.
8. **Minimal context.** Load detailed workflows only when relevant so the system improves reasoning without consuming unnecessary context on every turn.
9. **Verification is part of implementation.** Every change has an explicit verification path proportional to risk.
10. **Optimize for the user's actual workflow.** Direct answers, rapid iteration, coherent state tracking, and no unnecessary conversational ceremony.

## Customization Layers

### 1. Personal Engineering OS
A user-level instruction set for preferences that should travel across repositories:
- direct, concise, structured communication;
- accuracy/completeness/structural coherence before speed or polish;
- inspect before acting;
- preserve context across pivots;
- maintain project state;
- surface uncertainty rather than fabricate certainty;
- do not repeat rejected approaches;
- use the smallest correct change;
- verify before claiming completion.

This layer must remain project-agnostic.

### 2. SITE-SYNC Always-On Instructions
`.github/copilot-instructions.md` will contain only repository-wide invariants:
- React Native/TypeScript/Supabase/OP-SQLite stack;
- authoritative identity and tenant boundaries;
- architecture and persistence rules;
- security/RLS requirements;
- evidence/completion-state rules;
- required verification commands;
- documentation/specification conventions.

### 3. File-Based Instructions
Use `.github/instructions/` for targeted rules rather than bloating the global file:
- `typescript.instructions.md` — TypeScript conventions;
- `react-native.instructions.md` — component/state/navigation conventions;
- `supabase.instructions.md` — database/RLS/migration rules;
- `tests.instructions.md` — testing conventions;
- `android.instructions.md` — Android/native build constraints;
- `docs.instructions.md` — specs, plans, evidence and decision records.

Apply patterns by glob so irrelevant rules are not loaded.

### 4. Agent Skills
Initial skill set:

- `project-state` — reconstruct current project state from repository evidence before consequential work.
- `evidence-first-research` — investigate code/docs/external references and report claims with evidence.
- `feature-implementation` — inspect → design → implement → test → verify.
- `systematic-debugging` — reproduce → gather evidence → isolate root cause → fix → regression test → verify.
- `database-migration` — design, inspect, apply, verify and rollback-test Supabase migrations safely.
- `rls-security` — audit tenant/user isolation and authorization boundaries.
- `react-native-testing` — unit/component/device verification appropriate to change risk.
- `release-verification` — build/lint/test/signing/environment/release gate verification.
- `ui-review` — inspect actual UI against product requirements, interaction rules and visual system.
- `change-review` — adversarial post-change review focused on regressions, missing tests, scope creep and false completion.

Skills should contain procedures and supporting resources; they should not duplicate repository-wide instructions.

### 5. Custom Agents
Initial specialist agents:

- `orchestrator` — classifies work and delegates to the smallest suitable specialist.
- `architect` — read-heavy architecture and design analysis; no implementation by default.
- `implementer` — focused implementation following an approved design/task.
- `debugger` — evidence-driven root-cause investigation and targeted fixes.
- `reviewer` — adversarial review; assumes the implementation may be wrong until verified.
- `security-auditor` — authorization, tenant isolation, secrets, trust boundaries and attack paths.
- `database-engineer` — Supabase/Postgres schema, migrations, RLS and persistence correctness.
- `release-engineer` — build, CI, signing, environment and release gates.
- `ux-critic` — product/UI critique against explicit requirements and visual consistency.
- `researcher` — repository and external research with read-only behavior.

The orchestrator should not automatically invoke every specialist. It should route only the relevant roles.

### 6. Hooks
Hooks are reserved for deterministic controls.

Recommended initial hooks:
- `PreToolUse`: block obvious destructive database commands and dangerous filesystem operations when they are not explicitly authorized.
- `PostToolUse`: run lightweight formatting/validation only where safe and cheap; avoid running the entire test suite after every edit.
- `SessionStart`: validate that the repository contains expected project-state documents and expose current branch/status information when practical.
- `PreCompact`: persist critical working-state information if a project-state mechanism is implemented.
- `Stop`: produce a concise verification/status summary when a meaningful implementation session ends.

Hooks must be conservative. They should never silently mutate production systems, weaken security, or auto-approve high-impact operations.

### 7. MCP Servers
Use MCP only where it adds real capability. Initial candidates:
- GitHub — repository, issues, pull requests, CI and review context;
- Supabase — database/schema/migration inspection and controlled operations;
- Playwright — browser/UI verification where applicable;
- Linear — project/task state if actively used.

Do not install redundant MCP servers merely because they are available. Review and trust every server before enabling it because local MCP servers can execute arbitrary code.

## Project-State Model

The agent system should treat the following as the minimum persistent state model:

- objective;
- source of truth;
- confirmed requirements;
- hard constraints;
- architecture;
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

This state should live in repository documentation where appropriate, not solely in chat context.

## Completion-State Model

The agents must use explicit status language:

`proposed → designed → scaffolded → implemented → locally verified → CI verified → integration verified → release verified`

A lower state must never be described as a higher state. If evidence is unavailable, the agent must say so.

## Delegation Model

For consequential work:

1. Orchestrator identifies task type and risk.
2. Researcher/Architect gathers context when needed.
3. Implementer changes code.
4. Relevant specialist verifies the changed boundary.
5. Reviewer performs adversarial review.
6. Release Engineer is involved only for release-impacting changes.
7. Final response reports changed files, tests run, verification evidence, unresolved issues and current completion state.

The same agent should not be the sole authority for both implementation and high-risk verification when an independent review is practical.

## Security Model

High-risk operations include:
- production database changes;
- destructive migrations;
- credential/secret changes;
- authentication/RLS changes;
- release signing;
- deleting large portions of the repository;
- external side effects affecting real users/data.

These require explicit confirmation or a repository policy that clearly authorizes the operation. Agents must never bypass RLS, disable security controls, invent credentials, or substitute production systems for test systems to make a verification pass.

## Testing Model

The system should select tests based on changed boundaries rather than blindly running everything for every edit. Minimum expectations:
- TypeScript/unit changes → targeted tests + lint;
- UI changes → targeted tests plus device/emulator verification when behavior is visual/native;
- Supabase changes → migration validation + RLS/tenant-isolation verification;
- authentication/authorization → negative-path and cross-tenant tests;
- native Android/iOS changes → platform build/test verification;
- release changes → complete release gate.

## Documentation Model

Existing `docs/superpowers/specs` and `docs/superpowers/plans` remain authoritative workflow artifacts. New architectural work should continue to use the Superpowers specification/plan process. Agents should link to existing relevant specifications rather than restating them from memory.

## Definition of Done for This Customization System

The system is considered implemented only when:

1. Personal/global instructions are configured.
2. SITE-SYNC repository instructions are configured.
3. Targeted file instructions are configured and glob-tested.
4. Core skills load correctly and are discoverable.
5. Specialist agents exist with appropriate tool boundaries.
6. Hooks execute correctly and block/allow the intended operations.
7. Required MCP servers are configured and trusted.
8. A representative SITE-SYNC change passes through the intended workflow.
9. The agent correctly distinguishes repository evidence from assumptions.
10. The resulting configuration is documented and version-controlled.

## Non-Goals

- Do not create a single giant prompt containing every workflow.
- Do not create dozens of narrowly differentiated agents before usage evidence justifies them.
- Do not automate production changes.
- Do not replace human approval for consequential operations.
- Do not add tooling solely because it is available.
- Do not refactor SITE-SYNC application code as part of this customization project unless required to test the customization system.

## Recommended Rollout

Phase 1: always-on instructions + project-state skill + researcher/architect/implementer/reviewer agents.

Phase 2: debugging, database/RLS, testing and release skills/agents.

Phase 3: deterministic hooks and MCP integrations.

Phase 4: evaluate real agent sessions, inspect debug logs, remove redundant instructions, and promote proven workflows into a reusable personal plugin/package.
