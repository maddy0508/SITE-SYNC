// M1-AC-8 [strict] — Acknowledgement lifecycle: required → presented →
// acknowledged → superseded | expired. `presented` and `acknowledged` are
// distinct, auditable facts.
// Anchor: §4.3.
import { requireCore, report, SRC_DIR } from './lib.mjs';

const absent = requireCore();
if (absent) report('M1-AC-8', absent);

const { createStore, execute, tick, satisfactionState } = await import(`${SRC_DIR}/domain.js`);
const failures = [];

const DAY = 24 * 60 * 60 * 1000;
const s = createStore();
const t0 = s.clock;

execute(s, { type: 'CreateCompany', actor: { personRef: { email: 'founder@example.com', name: 'Founder' } }, payload: { companyName: 'Ack Co' } });
const company = [...s.entities.values()].find((e) => e.type === 'Company');
const admin = [...s.entities.values()].find((e) => e.type === 'Worker');
execute(s, { type: 'CreateInvitation', actor: { workerId: admin.id }, payload: { email: 'w@example.com', name: 'W' } });
const inv = s.facts.find((f) => f.type === 'Invitation' && f.state === 'pending');
execute(s, { type: 'AcceptInvitation', actor: { personRef: { email: 'w@example.com', name: 'W' } }, payload: { invitationId: inv.invitationId } });
const worker = [...s.entities.values()].find((e) => e.type === 'Worker' && e.id !== admin.id);

execute(s, {
  type: 'CreateRequirement', actor: { workerId: admin.id },
  payload: { scope: 'company', companyId: company.id, reqType: 'acknowledgement', title: 'Safety Policy', appliesTo: { kind: 'all_workers' }, requiresVerification: false, expiry: { kind: 'duration', days: 365 } },
});
const req = [...s.entities.values()].find((e) => e.type === 'Requirement' && e.title === 'Safety Policy');
const stateOf = (reqId = req.id) => satisfactionState(s, worker.id, reqId).state;

// Applicable acknowledgement with no facts is in `required` state.
if (stateOf() !== 'required') failures.push(`initial: ${stateOf()} (expected required)`);

// Invalid: acknowledge before presented.
let r = execute(s, { type: 'AcknowledgeRequirement', actor: { workerId: worker.id }, payload: { workerId: worker.id, requirementId: req.id, signature: 'sig-1' } });
if (r.outcome !== 'server rejected') failures.push(`acknowledge before presented: ${r.outcome} (expected server rejected)`);

r = execute(s, { type: 'PresentAcknowledgement', actor: { workerId: worker.id }, payload: { workerId: worker.id, requirementId: req.id } });
if (r.outcome !== 'server accepted') failures.push(`PresentAcknowledgement: ${r.outcome} ${r.reason ?? ''}`);
if (stateOf() !== 'presented') failures.push(`after present: ${stateOf()}`);

r = execute(s, { type: 'AcknowledgeRequirement', actor: { workerId: worker.id }, payload: { workerId: worker.id, requirementId: req.id, signature: 'sig-1' } });
if (r.outcome !== 'server accepted') failures.push(`AcknowledgeRequirement: ${r.outcome} ${r.reason ?? ''}`);
if (stateOf() !== 'acknowledged') failures.push(`after acknowledge: ${stateOf()}`);

// `presented` and `acknowledged` are distinct auditable facts (§4.3).
const presentedFact = s.facts.find((f) => f.type === 'Acknowledgement' && f.subject === worker.id && f.state === 'presented');
const acknowledgedFact = s.facts.find((f) => f.type === 'Acknowledgement' && f.subject === worker.id && f.state === 'acknowledged');
if (!presentedFact) failures.push('no distinct `presented` fact recorded');
if (!acknowledgedFact) failures.push('no distinct `acknowledged` fact recorded');
if (presentedFact && acknowledgedFact) {
  if (presentedFact.id === acknowledgedFact.id) failures.push('presented and acknowledged share one fact identity');
  if (presentedFact.commandId === acknowledgedFact.commandId) failures.push('presented and acknowledged share one command identity');
  for (const f of [presentedFact, acknowledgedFact]) {
    if (!f.actor || !f.deviceId || f.deviceTimestamp == null) failures.push(`${f.state} fact missing §7.8 audit fields`);
  }
}

// superseded by a new requirement revision (§4.6).
execute(s, { type: 'ReviseRequirement', actor: { workerId: admin.id }, payload: { requirementId: req.id } });
if (stateOf() !== 'superseded') failures.push(`after revision: ${stateOf()} (expected superseded)`);

// expired by time: complete the new revision, then advance beyond expiry.
const req2 = [...s.entities.values()].find((e) => e.type === 'Requirement' && e.title === 'Safety Policy' && e.revision === 2);
if (!req2) failures.push('revision 2 not found');
else {
  execute(s, { type: 'PresentAcknowledgement', actor: { workerId: worker.id }, payload: { workerId: worker.id, requirementId: req2.id } });
  execute(s, { type: 'AcknowledgeRequirement', actor: { workerId: worker.id }, payload: { workerId: worker.id, requirementId: req2.id, signature: 'sig-2' } });
  if (stateOf(req2.id) !== 'acknowledged') failures.push('revision 2 did not reach acknowledged');
  tick(s, t0 + 370 * DAY);
  if (stateOf(req2.id) !== 'expired') failures.push(`at +370d: ${stateOf(req2.id)} (expected expired)`);
}

report('M1-AC-8', failures);
