// M1-AC-7 [strict] — InductionCompletion lifecycle: not_started →
// in_progress → completed → expired | superseded.
// Anchor: §4.3.
import { requireCore, report, SRC_DIR } from './lib.mjs';

const absent = requireCore();
if (absent) report('M1-AC-7', absent);

const { createStore, execute, tick, satisfactionState } = await import(`${SRC_DIR}/domain.js`);
const failures = [];

const DAY = 24 * 60 * 60 * 1000;
const s = createStore();
const t0 = s.clock;

execute(s, { type: 'CreateCompany', actor: { personRef: { email: 'founder@example.com', name: 'Founder' } }, payload: { companyName: 'Induction Co' } });
const company = [...s.entities.values()].find((e) => e.type === 'Company');
const admin = [...s.entities.values()].find((e) => e.type === 'Worker');
execute(s, { type: 'CreateInvitation', actor: { workerId: admin.id }, payload: { email: 'w@example.com', name: 'W' } });
const inv = s.facts.find((f) => f.type === 'Invitation' && f.state === 'pending');
execute(s, { type: 'AcceptInvitation', actor: { personRef: { email: 'w@example.com', name: 'W' } }, payload: { invitationId: inv.invitationId } });
const worker = [...s.entities.values()].find((e) => e.type === 'Worker' && e.id !== admin.id);

execute(s, {
  type: 'CreateRequirement', actor: { workerId: admin.id },
  payload: { scope: 'company', companyId: company.id, reqType: 'induction', title: 'Company Induction', appliesTo: { kind: 'all_workers' }, requiresVerification: false, expiry: { kind: 'duration', days: 365 } },
});
const req = [...s.entities.values()].find((e) => e.type === 'Requirement' && e.title === 'Company Induction');
const stateOf = () => satisfactionState(s, worker.id, req.id).state;

if (stateOf() !== 'not_started') failures.push(`initial: ${stateOf()} (expected not_started)`);

// Invalid: complete before start.
let r = execute(s, { type: 'CompleteInduction', actor: { workerId: worker.id }, payload: { workerId: worker.id, requirementId: req.id } });
if (r.outcome !== 'server rejected') failures.push(`complete before start: ${r.outcome} (expected server rejected)`);

r = execute(s, { type: 'StartInduction', actor: { workerId: worker.id }, payload: { workerId: worker.id, requirementId: req.id } });
if (r.outcome !== 'server accepted') failures.push(`StartInduction: ${r.outcome} ${r.reason ?? ''}`);
if (stateOf() !== 'in_progress') failures.push(`after start: ${stateOf()}`);

r = execute(s, { type: 'CompleteInduction', actor: { workerId: worker.id }, payload: { workerId: worker.id, requirementId: req.id } });
if (r.outcome !== 'server accepted') failures.push(`CompleteInduction: ${r.outcome} ${r.reason ?? ''}`);
if (stateOf() !== 'completed') failures.push(`after complete: ${stateOf()}`);

// superseded by a new requirement revision (§4.6).
r = execute(s, { type: 'ReviseRequirement', actor: { workerId: admin.id }, payload: { requirementId: req.id } });
if (r.outcome !== 'server accepted') failures.push(`ReviseRequirement: ${r.outcome} ${r.reason ?? ''}`);
if (stateOf() !== 'superseded') failures.push(`after revision: ${stateOf()} (expected superseded)`);
const supFact = s.facts.find((f) => f.type === 'InductionCompletion' && f.subject === worker.id && f.state === 'superseded');
if (!supFact) failures.push('no superseded InductionCompletion fact recorded (INV-3)');

// New revision starts afresh: not_started → in_progress → completed.
const req2 = [...s.entities.values()].find((e) => e.type === 'Requirement' && e.title === 'Company Induction' && e.revision === 2);
if (!req2) failures.push('revision 2 requirement not found');
else {
  if (satisfactionState(s, worker.id, req2.id).state !== 'not_started') failures.push('revision 2 not at not_started');
  execute(s, { type: 'StartInduction', actor: { workerId: worker.id }, payload: { workerId: worker.id, requirementId: req2.id } });
  execute(s, { type: 'CompleteInduction', actor: { workerId: worker.id }, payload: { workerId: worker.id, requirementId: req2.id } });
  if (satisfactionState(s, worker.id, req2.id).state !== 'completed') failures.push('revision 2 did not reach completed');

  // expired by time (duration_from_satisfaction, 365 days).
  tick(s, t0 + 370 * DAY);
  if (satisfactionState(s, worker.id, req2.id).state !== 'expired') failures.push(`at +370d: ${satisfactionState(s, worker.id, req2.id).state} (expected expired)`);
}

// Lifecycle facts are F records with audit identity (INV-3).
const facts = s.facts.filter((f) => f.type === 'InductionCompletion' && f.subject === worker.id);
if (facts.length < 5) failures.push(`expected >=5 InductionCompletion facts, found ${facts.length}`);
for (const f of facts) {
  if (!f.id || !f.commandId || !f.actor) failures.push(`InductionCompletion fact missing audit identity: ${f.id ?? '(no id)'}`);
}

report('M1-AC-7', failures);
