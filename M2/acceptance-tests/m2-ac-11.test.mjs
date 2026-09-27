// M2-AC-11 [strict] — Requirement scope precedence: a Project-scope
// Requirement applies to all its contained Sites by default. BLOCKED pending
// AMB-005: §6.1.3 states a Project-scope Requirement applies to all Sites
// "unless explicitly opted out at Site scope", but the blueprint defines no
// opt-out mechanism. The M2 contract directs: raise AMB-005 and halt AC-11
// rather than invent a mechanism. No partial PASS is permitted.
//
// This file is a HALT SENTINEL, not the criterion's acceptance test. It
// verifies (a) the AMB-005 record is present and complete in
// M2/evidence/open-items.md, (b) the default-apply rule IS live (a
// Project-scope Requirement gates every contained Site's readiness — the
// derivable baseline the opt-out would modify), and (c) no opt-out mechanism
// has been implemented without a resolution. A PASS here means the halt is
// intact — it does NOT satisfy M2-AC-11.
import { requireCore, report, SRC_DIR, M2_DIR, buildBase } from './lib.mjs';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const failures = [];

// (a) AMB-005 formally recorded.
const openItemsPath = join(M2_DIR, 'evidence', 'open-items.md');
if (!existsSync(openItemsPath)) {
  failures.push('ABSENT: M2/evidence/open-items.md (AMB-005 record not created)');
} else {
  const oi = readFileSync(openItemsPath, 'utf8');
  for (const needle of ['AMB-005', 'opt-out', 'Blocker: yes']) {
    if (!oi.includes(needle)) failures.push(`open-items.md AMB-005 record missing: "${needle}"`);
  }
}

const absent = requireCore();
if (absent) report('M2-AC-11 (BLOCKED pending AMB-005 — halt sentinel)', absent);

const m2 = await import(`${SRC_DIR}/domain.js`);

// (b) Default-apply baseline (§6.1.3 "Default: apply"): a Project-scope
//     requirement gates readiness at every contained Site.
const { m1, store, admin, project, siteA, siteB, worker } = await buildBase();
const A = { workerId: admin.id };
m1.execute(store, { type: 'AssignWorkerToSite', actor: A, payload: { workerId: worker.id, siteId: siteA.id } });
m1.execute(store, { type: 'AssignWorkerToSite', actor: A, payload: { workerId: worker.id, siteId: siteB.id } });
m1.execute(store, {
  type: 'CreateRequirement', actor: A,
  payload: { scope: 'project', projectId: project.id, reqType: 'induction', title: 'P Induction', appliesTo: { kind: 'all_workers' }, requiresVerification: false, expiry: { kind: 'none' } },
});
const pReq = [...store.entities.values()].find((e) => e.type === 'Requirement' && e.title === 'P Induction');
for (const s of [siteA, siteB]) {
  const sr = m2.siteReady(store, worker.id, s.id);
  if (sr.ready !== false || !sr.failing.includes(pReq.id)) {
    failures.push(`project-scope requirement does not default-apply at site ${s.id}: ${JSON.stringify(sr)}`);
  }
}

// (c) No opt-out mechanism exists while AMB-005 is unresolved.
const src = readFileSync(join(SRC_DIR, 'domain.js'), 'utf8')
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/(^|[^:"'`])\/\/[^\n]*/g, '$1');
for (const banned of ['optOut', 'opt_out', 'OptOut', 'optedOut']) {
  if (new RegExp(`\\b${banned}\\b`).test(src)) {
    failures.push(`opt-out artifact '${banned}' present in M2 core while AMB-005 is unresolved`);
  }
}

report('M2-AC-11 (BLOCKED pending AMB-005 — halt sentinel)', failures);
