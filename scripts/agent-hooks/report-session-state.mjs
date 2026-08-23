import { execFileSync } from 'node:child_process';
import fs from 'node:fs';

const run = (command, args) => {
  try {
    return execFileSync(command, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch {
    return 'unavailable';
  }
};

const packagePath = 'sitesync/package.json';
let project = 'SITE-SYNC';
try {
  const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
  project = `${pkg.name ?? project} v${pkg.version ?? 'unknown'}`;
} catch {
  // Keep the context hook non-blocking if package metadata is unavailable.
}

const branch = run('git', ['branch', '--show-current']);
const status = run('git', ['status', '--short']);
const statusSummary = status === 'unavailable' ? 'git status unavailable' : (status ? 'working tree has changes' : 'working tree clean');

process.stdout.write(JSON.stringify({
  hookSpecificOutput: {
    hookEventName: 'SessionStart',
    additionalContext: [
      `Project: ${project}`,
      `Branch: ${branch || 'unknown'}`,
      `Working tree: ${statusSummary}`,
      'Before consequential work, inspect docs/superpowers/specs and docs/superpowers/plans.',
    ].join(' | '),
  },
}));