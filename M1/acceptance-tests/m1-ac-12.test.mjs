// M1-AC-12 [strict] — Tenant isolation: no M1 code path allows Company A to
// read or write Company B's data. Verified by test and by adversarial bypass
// analysis (M1/evidence/adversarial.md).
// Anchor: DM-INV-5, AC-ARCH-B1, INV-E (AD-INV-9).
import { requireCore, report, SRC_DIR } from './lib.mjs';

const absent = requireCore();
if (absent) report('M1-AC-12', absent);

const { createStore, execute, readForCompany, listForCompany, deriveProfile } = await import(`${SRC_DIR}/domain.js`);
const failures = [];

const s = createStore();

// Two tenants with one worker each.
execute(s, { type: 'CreateCompany', actor: { personRef: { email: 'fa@example.com', name: 'FA' } }, payload: { companyName: 'Tenant A' } });
execute(s, { type: 'CreateCompany', actor: { personRef: { email: 'fb@example.com', name: 'FB' } }, payload: { companyName: 'Tenant B' } });
const companyA = [...s.entities.values()].find((e) => e.type === 'Company' && e.name === 'Tenant A');
const companyB = [...s.entities.values()].find((e) => e.type === 'Company' && e.name === 'Tenant B');
const adminA = [...s.entities.values()].find((e) => e.type === 'Worker' && e.companyId === companyA.id);
const adminB = [...s.entities.values()].find((e) => e.type === 'Worker' && e.companyId === companyB.id);

execute(s, { type: 'CreateInvitation', actor: { workerId: adminB.id }, payload: { email: 'wb@example.com', name: 'WB' } });
const invB = s.facts.find((f) => f.type === 'Invitation' && f.state === 'pending' && f.companyId === companyB.id);
execute(s, { type: 'AcceptInvitation', actor: { personRef: { email: 'wb@example.com', name: 'WB' } }, payload: { invitationId: invB.invitationId } });
const workerB = [...s.entities.values()].find((e) => e.type === 'Worker' && e.companyId === companyB.id && e.id !== adminB.id);

// 1. Storage-level read isolation: Company A cannot read Company B's Worker.
const read = readForCompany(s, companyA.id, workerB.id);
if (read !== null) failures.push('Company A read Company B Worker entity (DM-INV-5 violated)');

// 2. Enumeration isolation: listing Workers for Company A returns no B records.
const listA = listForCompany(s, companyA.id, 'Worker');
if (listA.some((e) => e.companyId !== companyA.id)) failures.push('listForCompany(A) returned foreign-tenant entities');
if (listA.some((e) => e.id === workerB.id)) failures.push('listForCompany(A) exposed Company B Worker');

// 3. Write isolation: admin of A cannot mutate B's Worker (profile).
const r1 = execute(s, { type: 'ChangeWorkerProfile', actor: { workerId: adminA.id }, payload: { workerId: workerB.id, changes: { displayName: 'Hijacked' } } });
if (r1.outcome !== 'server rejected') failures.push(`cross-tenant profile change: ${r1.outcome} (expected server rejected)`);
const profB = deriveProfile(s, workerB.id);
if (profB?.displayName === 'Hijacked') failures.push('cross-tenant profile change mutated Company B state');

// 4. Write isolation: admin of A cannot grant capabilities to B's Worker.
const r2 = execute(s, { type: 'GrantCapability', actor: { workerId: adminA.id }, payload: { workerId: workerB.id, capability: 'supervisor' } });
if (r2.outcome !== 'server rejected') failures.push(`cross-tenant capability grant: ${r2.outcome} (expected server rejected)`);

// 5. Write isolation: admin of A cannot act on B's Requirement lifecycle.
execute(s, {
  type: 'CreateRequirement', actor: { workerId: adminB.id },
  payload: { scope: 'company', companyId: companyB.id, reqType: 'document', title: 'B Licence', appliesTo: { kind: 'all_workers' }, requiresVerification: true, expiry: { kind: 'none' } },
});
const reqB = [...s.entities.values()].find((e) => e.type === 'Requirement' && e.companyId === companyB.id);
const r3 = execute(s, { type: 'VerifyDocument', actor: { workerId: adminA.id }, payload: { workerId: workerB.id, requirementId: reqB.id } });
if (r3.outcome !== 'server rejected') failures.push(`cross-tenant verification: ${r3.outcome} (expected server rejected)`);

// 6. Cross-tenant entity references are not resolvable through M1 reads even
// for shared Platform-scope identities: a Person visible to B only is not
// visible to A (§7.15: visible only to Companies the Person is a member of).
const personB = s.entities.get(workerB.personId);
const personRead = readForCompany(s, companyA.id, personB.id);
if (personRead !== null) failures.push('Company A read a Person with no membership in A (§7.15)');
const personReadB = readForCompany(s, companyB.id, personB.id);
if (personReadB === null) failures.push('Company B cannot read its own member Person');

// 7. Tenant keying at storage: every Company-scoped entity and fact carries
// the owning Company identity (AC-ARCH-B1: enforced at storage).
for (const e of s.entities.values()) {
  if (e.scope === 'Company' && !e.companyId) failures.push(`Company-scoped entity ${e.id} (${e.type}) lacks companyId`);
}
for (const f of s.facts) {
  if (['WorkerProfileChange', 'WorkerLifecycleEvent', 'Invitation', 'CapabilityGrant', 'DocumentRevision', 'InductionCompletion', 'Acknowledgement', 'WorkerQrIdentityEvent'].includes(f.type) && !f.companyId) {
    failures.push(`Company-scoped fact ${f.id} (${f.type}) lacks companyId`);
  }
}

report('M1-AC-12', failures);
