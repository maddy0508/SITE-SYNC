// M2-AC-6 [strict] — ExternalParty entity exists as a Company-scoped E
// record; Company Admin can create, update, and archive.
// Anchor: §6.1.2, PS-INV-6 (external parties are first-class entities, not
// free-text fields).
import { requireCore, report, SRC_DIR, buildBase } from './lib.mjs';

const absent = requireCore();
if (absent) report('M2-AC-6', absent);

const m2 = await import(`${SRC_DIR}/domain.js`);
const failures = [];

const { m1, store, company, admin, worker } = await buildBase();
const A = { workerId: admin.id };

// Create: Company-scoped E record (PS-INV-6).
let r = m2.execute(store, { type: 'CreateExternalParty', actor: A, payload: { name: 'Client Pty', partyType: 'epc_client', contact: { email: 'c@example.com' } } });
if (r.outcome !== 'server accepted') failures.push(`CreateExternalParty rejected: ${JSON.stringify(r)}`);
const ep = [...store.entities.values()].find((e) => e.type === 'ExternalParty');
if (!ep) failures.push('no ExternalParty entity created');
else {
  if (ep.scope !== 'Company' || ep.companyId !== company.id) failures.push(`ExternalParty not Company-scoped: ${JSON.stringify({ scope: ep.scope, companyId: ep.companyId })}`);
  if (m2.externalPartyState(store, ep.id) !== 'active') failures.push('new ExternalParty not active');
}
// partyType vocabulary (§6.1.2: EPC/client and subcontractor).
r = m2.execute(store, { type: 'CreateExternalParty', actor: A, payload: { name: 'X', partyType: 'supplier' } });
if (r.outcome !== 'server rejected') failures.push('unknown partyType accepted (§6.1.2 names EPC/client and subcontractor)');
r = m2.execute(store, { type: 'CreateExternalParty', actor: A, payload: { name: 'Sub Co', partyType: 'subcontractor' } });
if (r.outcome !== 'server accepted') failures.push(`subcontractor creation rejected: ${JSON.stringify(r)}`);

// Non-admin cannot create (§6.11.2: ExternalParty administration is a
// Company Admin surface).
r = m2.execute(store, { type: 'CreateExternalParty', actor: { workerId: worker.id }, payload: { name: 'Nope', partyType: 'epc_client' } });
if (r.outcome !== 'server rejected') failures.push('non-admin created an ExternalParty');

// Update: attribute change is an immutable domain fact; current
// representation derives (WC-INV-6 analogue, §7.5).
r = m2.execute(store, { type: 'UpdateExternalParty', actor: A, payload: { externalPartyId: ep.id, changes: { contact: { email: 'new@example.com', phone: '+61…' } } } });
if (r.outcome !== 'server accepted') failures.push(`UpdateExternalParty rejected: ${JSON.stringify(r)}`);
const prof = m2.externalPartyProfile(store, ep.id);
if (prof.contact?.email !== 'new@example.com') failures.push(`update not reflected in derived profile: ${JSON.stringify(prof)}`);
if (ep.contact?.email !== 'c@example.com') failures.push('creation fact mutated on update (E genesis must be immutable)');
const updFacts = store.facts.filter((f) => f.type === 'LifecycleEvent' && f.subject === ep.id && f.payload.event === 'updated');
if (updFacts.length !== 1) failures.push(`expected 1 update fact, got ${updFacts.length}`);

// Archive: terminal; further updates rejected.
r = m2.execute(store, { type: 'ArchiveExternalParty', actor: A, payload: { externalPartyId: ep.id } });
if (r.outcome !== 'server accepted') failures.push(`ArchiveExternalParty rejected: ${JSON.stringify(r)}`);
if (m2.externalPartyState(store, ep.id) !== 'archived') failures.push('archived state not derived');
r = m2.execute(store, { type: 'UpdateExternalParty', actor: A, payload: { externalPartyId: ep.id, changes: { name: 'Renamed' } } });
if (r.outcome !== 'server rejected') failures.push('archived ExternalParty accepted an update');
r = m2.execute(store, { type: 'ArchiveExternalParty', actor: A, payload: { externalPartyId: ep.id } });
if (r.outcome !== 'server rejected') failures.push('double archive accepted');

// Tenancy (DM-INV-5): a second company's admin cannot touch it.
m1.execute(store, { type: 'CreateCompany', actor: { personRef: { email: 'other@example.com', name: 'O' } }, payload: { companyName: 'Other Co' } });
const otherAdmin = [...store.entities.values()].find((e) => e.type === 'Worker' && e.companyId !== company.id);
r = m2.execute(store, { type: 'UpdateExternalParty', actor: { workerId: otherAdmin.id }, payload: { externalPartyId: ep.id, changes: { name: 'Hijack' } } });
if (r.outcome !== 'server rejected' || !/cross-tenant|not found/.test(r.reason ?? '')) {
  failures.push(`cross-tenant ExternalParty update not rejected: ${JSON.stringify(r)}`);
}
// Storage-layer read boundary.
if (m1.readForCompany(store, otherAdmin.companyId, ep.id) !== null) failures.push('ExternalParty readable across tenancy boundary');

report('M2-AC-6', failures);
