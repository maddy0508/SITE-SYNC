// Shared helpers for M1 acceptance tests.
// M1 tests are behavioural (strict form) per KIMI/MILESTONES/M1_EXECUTION_CONTRACT.md:
// they exercise the M1 domain core at M1/src/, fail on the pre-implementation
// baseline (ABSENT), and pass at the implementation commit.
// Run from anywhere; paths resolve relative to this file.
// M1_BLUEPRINT_PATH is unused by M1 tests (behavioural), but M1_SRC_OVERRIDE
// allows baseline substitution if needed.
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { existsSync } from 'node:fs';
import { execSync } from 'node:child_process';

const HERE = dirname(fileURLToPath(import.meta.url));
export const M1_DIR = join(HERE, '..');
export const REPO_ROOT = join(HERE, '..', '..');
export const SRC_DIR = process.env.M1_SRC_OVERRIDE ?? join(M1_DIR, 'src');

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

export function srcAbsent(name) {
  return !existsSync(join(SRC_DIR, name));
}

// Standard absent-failure helper: strict tests call this first; if the M1
// domain core is absent, the test fails ABSENT (baseline condition).
export function requireCore() {
  if (srcAbsent('domain.js')) {
    return ['ABSENT: M1/src/domain.js (M1 domain core not implemented)'];
  }
  return null;
}
