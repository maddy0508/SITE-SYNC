import fs from 'node:fs';
import path from 'node:path';

const input = fs.readFileSync(0, 'utf8');
let event = {};
try {
  event = JSON.parse(input);
} catch {
  console.log(JSON.stringify({ continue: true, systemMessage: 'Customization verification hook received invalid event JSON.' }));
  process.exit(0);
}

const raw = event.tool_input ?? {};
const candidates = [];
const collect = (value) => {
  if (typeof value === 'string') candidates.push(value);
  else if (Array.isArray(value)) value.forEach(collect);
  else if (value && typeof value === 'object') Object.values(value).forEach(collect);
};
collect(raw);

const files = [...new Set(candidates.filter((value) => /\.github\/(copilot-instructions\.md|instructions\/.*\.instructions\.md|agents\/.*\.agent\.md|skills\/.*\/SKILL\.md|hooks\/.*\.json)$/.test(value)))];
const failures = [];

for (const file of files) {
  const absolute = path.resolve(file);
  if (!fs.existsSync(absolute)) continue;
  const content = fs.readFileSync(absolute, 'utf8');
  if (file.endsWith('.json')) {
    try {
      JSON.parse(content);
    } catch {
      failures.push(`${file}: invalid JSON`);
    }
  }
  if (file.endsWith('.agent.md') || file.endsWith('.instructions.md') || file.endsWith('SKILL.md')) {
    if (content.startsWith('---')) {
      const closing = content.indexOf('\n---', 3);
      if (closing === -1) failures.push(`${file}: malformed YAML frontmatter`);
    }
  }
}

if (failures.length) {
  process.stdout.write(JSON.stringify({
    hookSpecificOutput: {
      permissionDecision: 'deny',
      permissionDecisionReason: failures.join('; '),
    },
  }));
} else {
  process.stdout.write(JSON.stringify({ continue: true }));
}