import fs from 'node:fs';

const input = fs.readFileSync(0, 'utf8');
let event;
try {
  event = JSON.parse(input);
} catch {
  console.log(JSON.stringify({ continue: true, systemMessage: 'Agent security hook received invalid JSON; operation was not evaluated.' }));
  process.exit(0);
}

const toolName = String(event.tool_name ?? '');
const rawToolInput = event.tool_input ?? {};
const command = typeof rawToolInput === 'string'
  ? rawToolInput
  : String(rawToolInput.command ?? rawToolInput.cmd ?? rawToolInput.input ?? '');

const dangerous = [
  /\brm\s+-rf\b/i,
  /\bDROP\s+(DATABASE|SCHEMA|TABLE)\b/i,
  /\bTRUNCATE\s+(TABLE|SCHEMA)\b/i,
  /\bDELETE\s+FROM\b/i,
  /\bterraform\s+destroy\b/i,
  /\bgit\s+reset\s+--hard\b/i,
  /\bgit\s+clean\s+-fd/i,
];

if (/terminal|shell|command/i.test(toolName) && dangerous.some((pattern) => pattern.test(command))) {
  process.stdout.write(JSON.stringify({
    hookSpecificOutput: {
      permissionDecision: 'ask',
      permissionDecisionReason: 'Potentially destructive command detected. Explicit user approval is required.',
    },
  }));
  process.exit(0);
}

process.stdout.write(JSON.stringify({ continue: true }));