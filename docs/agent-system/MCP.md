# MCP policy

MCP servers are external capabilities, not project instructions. Enable only servers that materially improve a workflow and review their permissions before trusting them.

## Recommended integrations

| Server | Use | Policy |
|---|---|---|
| GitHub | Repository, issues, PRs, CI and review context | Preferred for source-control context. Keep write operations deliberate. |
| Supabase | Schema, migrations, RLS and controlled test-environment operations | Prefer test projects; production mutations require explicit approval. |
| Playwright | Browser/UI verification where applicable | Use for rendered behavior, not as a substitute for native device verification. |
| Linear | Project/task context | Enable only if the project actively uses Linear for current work. |

## Security rules

- Never commit MCP credentials or tokens.
- Do not give a read-only research agent write-capable MCP tools.
- Review any server that can execute arbitrary code or commands.
- Prefer narrow tool access over entire-server access when the environment supports it.
- Keep production database operations behind explicit approval.
- Do not add an MCP server merely because it is available.

## Configuration

MCP configuration is environment-specific and should be configured through the VSCodroid/VS Code MCP interface or the user's approved settings. This repository deliberately does not contain credentials or a production MCP configuration.