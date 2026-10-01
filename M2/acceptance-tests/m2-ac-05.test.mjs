// M2-AC-5 [strict] — Resume semantics, both portions (EP-6.0; AMB-004
// resolved):
// (a) Project overlay resume: Sites whose only operational suspension was
//     the Project overlay return to their underlying lifecycle state's
//     normal operation.
// (b) Independent-suspension persistence: a Site independently suspended
//     (SiteOperationalSuspension fact, §6.1.3 amended) before the Project
//     was suspended remains independently suspended after the Project
//     resumes.
// Anchor: §6.1.3 (amended at EP-6.0), DM-INV-3 (derived, no stored status).
import { requireCore, report, SRC_DIR, buildBase } from './lib.mjs';

const absent = requireCore();
if (absent) report('M2-AC-5', absent);

const m2 = await import(`${SRC_DIR}/domain.js`);
const failures = [];

const { m1, store, admin, project, siteA, siteB } = await buildBase();
const A = { workerId: admin.id };

// Setup: activate project, bring both sites to active.
m2.execute(store, { type: 'ActivateProject', actor: A, payload: { projectId: project.id } });
m2.execute(store, { type: 'MobiliseSite', actor: A, payload: { siteId: siteA.id } });
m2.execute(store, { type: 'ActivateSite', actor: A, payload: { siteId: siteA.id } });
m2.execute(store, { type: 'MobiliseSite', actor: A, payload: { siteId: siteB.id } });
m2.execute(store, { type: 'ActivateSite', actor: A, payload: { siteId: siteB.id } });

// Baseline: neither site operationally suspended.
for (const s of [siteA, siteB]) {
  const v = m2.siteOperationalStatus(store, s.id);
  if (v.projectSuspended || v.operational !== 'normal') failures.push(`pre-condition failed for ${s.id}: ${JSON.stringify(v)}`);
}

// (b) Independently suspend Site A via SiteOperationalSuspension (activated).
// Site B is left alone — it will only ever carry the Project overlay.
let r = m2.execute(store, { type: 'SuspendSite', actor: A, payload: { siteId: siteA.id, reason: 'weather' } });
if (r.outcome !== 'server accepted') failures.push(`SuspendSite rejected: ${JSON.stringify(r)}`);

const vA1 = m2.siteOperationalStatus(store, siteA.id);
if (vA1.operational !== 'suspended') failures.push(`site A not operationally suspended after SuspendSite: ${JSON.stringify(vA1)}`);
if (vA1.projectSuspended) failures.push('site A shows project overlay before project is suspended');
if (m2.siteLifecycleState(store, siteA.id) !== 'active') failures.push('site A lifecycle state changed by operational suspension');

// Suspend the Project — overlay now covers both sites.
m2.execute(store, { type: 'SuspendProject', actor: A, payload: { projectId: project.id, reason: 'client hold' } });
const vA2 = m2.siteOperationalStatus(store, siteA.id);
const vB2 = m2.siteOperationalStatus(store, siteB.id);
if (!vA2.projectSuspended || vA2.operational !== 'suspended') failures.push(`overlay missing on A during project suspension: ${JSON.stringify(vA2)}`);
if (!vB2.projectSuspended || vB2.operational !== 'suspended') failures.push(`overlay missing on B during project suspension: ${JSON.stringify(vB2)}`);

// Resume the Project.
m2.execute(store, { type: 'ResumeProject', actor: A, payload: { projectId: project.id } });

// (a) Site B — only ever carried the overlay — returns to normal.
const vB3 = m2.siteOperationalStatus(store, siteB.id);
if (vB3.projectSuspended || vB3.operational !== 'normal') failures.push(`site B did not return to normal after resume: ${JSON.stringify(vB3)}`);

// (b) Site A — independently suspended before the project suspension —
//     remains operationally suspended after the project resumes.
const vA3 = m2.siteOperationalStatus(store, siteA.id);
if (vA3.operational !== 'suspended') failures.push(`site A lost its independent suspension after project resume: ${JSON.stringify(vA3)}`);
if (m2.siteLifecycleState(store, siteA.id) !== 'active') failures.push('site A lifecycle state altered across suspend/resume');

// Deactivating the independent suspension returns Site A to normal.
r = m2.execute(store, { type: 'UnsuspendSite', actor: A, payload: { siteId: siteA.id, reason: 'weather cleared' } });
if (r.outcome !== 'server accepted') failures.push(`UnsuspendSite rejected: ${JSON.stringify(r)}`);
const vA4 = m2.siteOperationalStatus(store, siteA.id);
if (vA4.operational !== 'normal') failures.push(`site A not restored after UnsuspendSite: ${JSON.stringify(vA4)}`);

// Fact discipline: independent suspension uses F-class
// SiteOperationalSuspension facts with subtype events, not lifecycle events.
const sosFacts = store.facts.filter((f) => f.type === 'SiteOperationalSuspension' && f.subject === siteA.id);
if (sosFacts.length !== 2) failures.push(`expected 2 SiteOperationalSuspension facts, got ${sosFacts.length}`);
else {
  if (sosFacts[0].payload.event !== 'activated') failures.push(`first subtype event: ${sosFacts[0].payload.event}`);
  if (sosFacts[1].payload.event !== 'deactivated') failures.push(`second subtype event: ${sosFacts[1].payload.event}`);
  if (sosFacts[0].reason !== 'weather' || sosFacts[1].reason !== 'weather cleared') failures.push('SiteOperationalSuspension facts missing mandatory reason (§6.1.3 amended)');
  for (const f of sosFacts) {
    for (const k of ['id', 'commandId', 'actor', 'deviceId', 'deviceTimestamp', 'serverTimestamp']) {
      if (f[k] === undefined || f[k] === null) failures.push(`SiteOperationalSuspension ${f.id} missing §7.8 field ${k}`);
    }
  }
}
// No SiteLifecycleEvent was produced by independent suspension.
const newLifecycle = store.facts.filter((f) => f.type === 'SiteLifecycleEvent' && f.subject === siteA.id).map((f) => f.payload.event);
if (JSON.stringify(newLifecycle) !== JSON.stringify(['mobilising', 'activated'])) {
  failures.push(`independent suspension produced SiteLifecycleEvent(s): ${JSON.stringify(newLifecycle)}`);
}

report('M2-AC-5', failures);
