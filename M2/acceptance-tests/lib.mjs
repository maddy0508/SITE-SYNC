// Shared helpers for M2 acceptance tests.
// M2 tests are behavioural (strict form) per KIMI/MILESTONES/M2_EXECUTION_CONTRACT.md:
// they exercise the M2 domain core at M2/src/, fail on the pre-implementation
// baseline (ABSENT), and pass at the implementation commit. M2-AC-5/8/11 are
// halt sentinels (criteria BLOCKED pending AMB-004/003/005); M2-AC-15 is
// comparative-negative against the M2 execution baseline cfda19f.
// Run from anywhere; paths resolve relative to this file.
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { existsSync } from 'node:fs';
import { execSync } from 'node:child_process';

const HERE = dirname(fileURLToPath(import.meta.url));
export const M2_DIR = join(HERE, '..');
export const REPO_ROOT = join(HERE, '..', '..');
export const SRC_DIR = process.env.M2_SRC_OVERRIDE ?? join(M2_DIR, 'src');
export const M1_SRC_DIR = join(REPO_ROOT, 'M1', 'src');

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

// Standard absent-failure helper: strict tests call this first; if the M2
// domain core is absent, the test fails ABSENT (baseline condition).
export function requireCore() {
  if (srcAbsent('domain.js')) {
    return ['ABSENT: M2/src/domain.js (M2 domain core not implemented)'];
  }
  return null;
}

// Standard M2 scenario scaffold: Company with founder-admin, one Project
// (draft), two Sites (planned) under it, and a second invited+accepted Worker
// with no capabilities. Returns live entity references for customisation.
// Only M1-established commands are used here (M1 inheritance); M2 commands
// under test are issued by the test bodies themselves.
export async function buildBase() {
  const m1 = await import(`${M1_SRC_DIR}/domain.js`);
  const store = m1.createStore();
  m1.execute(store, { type: 'CreateCompany', actor: { personRef: { email: 'founder@example.com', name: 'Founder' } }, payload: { companyName: 'M2 Co' } });
  const company = [...store.entities.values()].find((e) => e.type === 'Company');
  const admin = [...store.entities.values()].find((e) => e.type === 'Worker');
  m1.execute(store, { type: 'CreateProject', actor: { workerId: admin.id }, payload: { companyId: company.id, name: 'P1' } });
  const project = [...store.entities.values()].find((e) => e.type === 'Project');
  m1.execute(store, { type: 'CreateSite', actor: { workerId: admin.id }, payload: { projectId: project.id, name: 'Site A' } });
  m1.execute(store, { type: 'CreateSite', actor: { workerId: admin.id }, payload: { projectId: project.id, name: 'Site B' } });
  const [siteA, siteB] = [...store.entities.values()].filter((e) => e.type === 'Site');
  m1.execute(store, { type: 'CreateInvitation', actor: { workerId: admin.id }, payload: { email: 'w@example.com', name: 'W' } });
  const inv = store.facts.find((f) => f.type === 'Invitation' && f.state === 'pending');
  m1.execute(store, { type: 'AcceptInvitation', actor: { personRef: { email: 'w@example.com', name: 'W' } }, payload: { invitationId: inv.invitationId } });
  const worker = [...store.entities.values()].find((e) => e.type === 'Worker' && e.id !== admin.id);
  return { m1, store, company, admin, project, siteA, siteB, worker };
}
