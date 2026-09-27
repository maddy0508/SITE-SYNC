// M1-AC-2 [strict] — Person continuity: a Person who is a Worker in Company A
// and is later invited to Company B is the same Person identity; two distinct
// Worker identities reference it.
// Anchor: WC-INV-1, WC-INV-3, §7.6.
import { requireCore, report, SRC_DIR } from './lib.mjs';

const absent = requireCore();
if (absent) report('M1-AC-2', absent);

const { createStore, execute } = await import(`${SRC_DIR}/domain.js`);
const failures = [];

const s = createStore();

// Two Companies, established by two different founders.
const rA = execute(s, { type: 'CreateCompany', actor: { personRef: { email: 'founder-a@example.com', name: 'Founder A' } }, payload: { companyName: 'Alpha Constructions' } });
const rB = execute(s, { type: 'CreateCompany', actor: { personRef: { email: 'founder-b@example.com', name: 'Founder B' } }, payload: { companyName: 'Beta Civil' } });
if (rA.outcome !== 'server accepted') failures.push(`CreateCompany A: ${rA.outcome}`);
if (rB.outcome !== 'server accepted') failures.push(`CreateCompany B: ${rB.outcome}`);

const companyA = [...s.entities.values()].find((e) => e.type === 'Company' && e.name === 'Alpha Constructions');
const companyB = [...s.entities.values()].find((e) => e.type === 'Company' && e.name === 'Beta Civil');
const adminA = [...s.entities.values()].find((e) => e.type === 'Worker' && e.companyId === companyA?.id);
const adminB = [...s.entities.values()].find((e) => e.type === 'Worker' && e.companyId === companyB?.id);
if (!adminA || !adminB) failures.push('founder Workers not established for both Companies');

// Same human (same email) invited to Company A, accepts.
const invA = execute(s, { type: 'CreateInvitation', actor: { workerId: adminA?.id }, payload: { email: 'sam@example.com', name: 'Sam' } });
if (invA.outcome !== 'server accepted') failures.push(`CreateInvitation A: ${invA.outcome} ${invA.reason ?? ''}`);
const invAFact = s.facts.find((f) => f.type === 'Invitation' && f.payload.email === 'sam@example.com' && f.state === 'pending');
const accA = execute(s, { type: 'AcceptInvitation', actor: { personRef: { email: 'sam@example.com', name: 'Sam' } }, payload: { invitationId: invAFact?.invitationId } });
if (accA.outcome !== 'server accepted') failures.push(`AcceptInvitation A: ${accA.outcome} ${accA.reason ?? ''}`);

// Same human later invited to Company B, accepts.
const invB = execute(s, { type: 'CreateInvitation', actor: { workerId: adminB?.id }, payload: { email: 'sam@example.com', name: 'Sam' } });
if (invB.outcome !== 'server accepted') failures.push(`CreateInvitation B: ${invB.outcome} ${invB.reason ?? ''}`);
const invBFact = s.facts.filter((f) => f.type === 'Invitation' && f.payload.email === 'sam@example.com' && f.state === 'pending')
  .find((f) => f.companyId === companyB?.id);
const accB = execute(s, { type: 'AcceptInvitation', actor: { personRef: { email: 'sam@example.com', name: 'Sam' } }, payload: { invitationId: invBFact?.invitationId } });
if (accB.outcome !== 'server accepted') failures.push(`AcceptInvitation B: ${accB.outcome} ${accB.reason ?? ''}`);

// Exactly one Person identity for the human (WC-INV-3: no duplicate human identity).
const persons = [...s.entities.values()].filter((e) => e.type === 'Person' && e.email === 'sam@example.com');
if (persons.length !== 1) failures.push(`expected exactly 1 Person for sam@example.com, found ${persons.length}`);

// Two distinct Worker identities, both referencing the same Person (WC-INV-1/2).
const workers = [...s.entities.values()].filter((e) => e.type === 'Worker' && e.personId === persons[0]?.id);
if (workers.length !== 2) failures.push(`expected 2 Worker memberships for the Person, found ${workers.length}`);
else {
  const [w1, w2] = workers;
  if (w1.id === w2.id) failures.push('Worker identities are not distinct');
  const companies = new Set(workers.map((w) => w.companyId));
  if (!companies.has(companyA?.id) || !companies.has(companyB?.id)) {
    failures.push('Worker memberships not scoped one-per-Company');
  }
}

report('M1-AC-2', failures);
