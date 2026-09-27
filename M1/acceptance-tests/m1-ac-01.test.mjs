// M1-AC-1 [strict] — Company creation establishes a Company E record and
// associates the creating Person via a Worker E membership and a Company Admin
// CapabilityGrant, atomically within the authority boundary.
// Anchor: §6.11.3, §6.11.4, §6.3.2, §7.3, WC-INV-1, WC-INV-2.
import { requireCore, report, SRC_DIR } from './lib.mjs';

const absent = requireCore();
if (absent) report('M1-AC-1', absent);

const { createStore, execute } = await import(`${SRC_DIR}/domain.js`);
const failures = [];

const s = createStore();
const r = execute(s, {
  type: 'CreateCompany',
  actor: { personRef: { email: 'founder@example.com', name: 'Founder' } },
  payload: { companyName: 'Acme Civil' },
});

// Outcome must be server accepted (structural op, connectivity-required path
// simulated server-side at command execution).
if (r.outcome !== 'server accepted') failures.push(`CreateCompany outcome: ${r.outcome}`);

// Company E record exists.
const company = [...s.entities.values()].find((e) => e.type === 'Company');
if (!company) failures.push('no Company E record created');

// Creating Person established (did not exist before).
const person = [...s.entities.values()].find((e) => e.type === 'Person');
if (!person) failures.push('no Person E record for founder');
else if (person.scope !== 'Platform') failures.push('Person is not Platform-scoped (WC-INV-1)');

// Worker membership for that Person in that Company.
const worker = [...s.entities.values()].find((e) => e.type === 'Worker');
if (!worker) failures.push('no Worker E membership created');
else {
  if (worker.personId !== person?.id) failures.push('Worker does not reference founder Person');
  if (worker.companyId !== company?.id) failures.push('Worker not scoped to the new Company (WC-INV-2)');
  if (worker.scope !== 'Company') failures.push('Worker not Company-scoped');
}

// Company Admin capability grant exists and is an F record.
const grant = s.facts.find((f) => f.type === 'CapabilityGrant' && f.payload.capability === 'company_admin');
if (!grant) failures.push('no company_admin CapabilityGrant F record');
else if (grant.subject !== worker?.id) failures.push('CapabilityGrant not attributed to the founder Worker');

// Atomicity: a failing CreateCompany (missing name) commits no domain state.
// CommandOutcome/CommandReceipt records are audit substrate retained
// independently of domain fact production (AC-ARCH-C9); G4's no-partial-
// mutation property applies to domain state, so the comparison excludes them.
const s2 = createStore();
execute(s2, { type: 'CreateCompany', actor: { personRef: { email: 'a@b.c', name: 'A' } }, payload: { companyName: 'DupCo' } });
const domainState = (st) => st.facts.filter((f) => f.type !== 'CommandOutcome' && f.type !== 'CommandReceipt').length + st.entities.size;
const before = domainState(s2);
const r2 = execute(s2, { type: 'CreateCompany', actor: { personRef: { email: 'x@y.z', name: 'X' } }, payload: { companyName: '' } });
const after = domainState(s2);
if (r2.outcome !== 'server rejected') failures.push(`invalid CreateCompany outcome: ${r2.outcome} (expected server rejected)`);
if (after !== before) failures.push('rejected CreateCompany mutated domain state (atomicity violated, AC-ARCH-G4)');
if (!s2.facts.some((f) => f.type === 'CommandOutcome' && f.payload.outcome === 'server rejected')) {
  failures.push('rejected CreateCompany produced no CommandOutcome audit record (AC-ARCH-C9)');
}

// CommandReceipt present (idempotency substrate).
if (!s.facts.some((f) => f.type === 'CommandReceipt')) failures.push('no CommandReceipt recorded');
// CommandOutcome present.
if (!s.facts.some((f) => f.type === 'CommandOutcome')) failures.push('no CommandOutcome recorded');

report('M1-AC-1', failures);
