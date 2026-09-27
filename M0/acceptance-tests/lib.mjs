// Shared helpers for M0 architecture-level acceptance tests.
// Per KIMI/SKILLS/04_acceptance-test-design.md: each test is a structural/contract
// test against the produced M0 artifacts; executable and falsifiable; exits non-zero
// on any failure. Run from anywhere; paths resolve relative to this file.
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { execSync } from 'node:child_process';

const HERE = dirname(fileURLToPath(import.meta.url));
export const M0_DIR = join(HERE, '..');
export const REPO_ROOT = join(HERE, '..', '..');

export function artifactPath(name) {
  return join(M0_DIR, name);
}

export function readArtifact(name) {
  const p = artifactPath(name);
  if (!existsSync(p)) return null;
  return readFileSync(p, 'utf8');
}

// Find markdown table rows (lines starting with '|') that contain `name` as a
// standalone cell entry, and return them.
export function tableRowsContaining(text, name) {
  if (!text) return [];
  return text
    .split('\n')
    .filter((l) => l.trim().startsWith('|'))
    .filter((l) => l.split('|').some((c) => c.trim() === name || c.trim().startsWith(name + ' ')));
}

export function lineContaining(text, needle) {
  if (!text) return null;
  return text.split('\n').find((l) => l.includes(needle)) ?? null;
}

export function git(args) {
  return execSync(`git ${args}`, { cwd: REPO_ROOT, encoding: 'utf8' }).trim();
}

export function report(testName, failures) {
  if (failures.length === 0) {
    console.log(`${testName}: PASS`);
    process.exit(0);
  }
  console.log(`${testName}: FAIL`);
  for (const f of failures) console.log(`  - ${f}`);
  process.exit(1);
}
