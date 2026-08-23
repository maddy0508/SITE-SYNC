# Agent customization validation

## Configuration checks

1. Open **Chat: Open Customizations** and confirm the repository instructions, agents, skills, and hooks are discovered.
2. Use the customization diagnostics view to confirm there are no malformed instruction, agent, or skill files.
3. Confirm the seven repository instruction files use valid `applyTo` patterns.
4. Confirm each `.github/skills/*/SKILL.md` has valid Agent Skills frontmatter.
5. Confirm each `.github/agents/*.agent.md` has valid frontmatter and only intended tools/agents.
6. Confirm `.github/hooks/*.json` parses as JSON.
7. Open Agent Debug Logs and confirm `SessionStart`, `PreToolUse`, and `PostToolUse` hooks load without errors.

## Representative workflow

Use a low-risk SITE-SYNC task and verify the following sequence:

1. **Researcher** reconstructs current behavior and cites repository evidence without editing.
2. **Architect** identifies the affected boundary, constraints, files, implementation approach, and verification gates.
3. **Implementer** makes a focused change and reports tests/evidence.
4. **Reviewer** independently checks the diff, requirements, tests, security boundaries, scope, and completion state.
5. If a failure occurs, **Debugger** reproduces and isolates it before modifying code.
6. If the change touches Supabase/RLS, **Database Engineer** and/or **Security Auditor** verify the boundary.
7. If it changes release behavior, **Release Engineer** verifies the release gates.
8. If it changes rendered UI, **UX Critic** evaluates the actual behavior against explicit requirements.

## SITE-SYNC baseline

From `sitesync/` the current repository baseline commands are:

```bash
npm run lint
npm test -- --runInBand --no-cache
```

Do not label these as passing until they are actually executed in the relevant environment.

## Known environment limitation

The repository configuration can be version-controlled here, but VSCodroid must discover and execute the customization files locally. The final state therefore has two verification layers:

- **Repository verified:** files, paths, frontmatter, JSON, and policy content are correct.
- **VSCodroid verified:** the local customization diagnostics show the files loaded and representative agent/hook behavior actually executes.

A repository commit cannot substitute for the second layer.