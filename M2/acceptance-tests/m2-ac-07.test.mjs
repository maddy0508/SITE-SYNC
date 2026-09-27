// M2-AC-7 [strict] — ProjectExternalParty lifecycle follows the §7.5
// relationship-entity rule: creation fact (associated), removal fact
// (removed), current state derived. No independent lifecycle vocabulary.
// A removed association is not reactivated; a new association is a new
// identity.
// Anchor: §6.1.2, §7.5.
import { requireCore, report, SRC_DIR, buildBase } from './lib.mjs';

const absent = requireCore();
if (absent) report('M2-AC-7', absent);

const m2 = await import(`${SRC_DIR}/domain.js`);
const failures = [];

const { m1, store, company, admin, project } = await buildBase();
const A = { workerId: admin.id };

// Setup: a Company-scoped ExternalParty (AC-6 surface).
let r = m2.execute(store, { type: 'CreateExternalParty', actor: A, payload: { name: 'Client Pty', partyType: 'epc_client', contact: { email: 'c@example.com' } } });
if (r.outcome !== 'server accepted') failures.push(`setup CreateExternalParty rejected: ${JSON.stringify(r)}`);
const ep = [...store.entities.values()].find((e) => e.type === 'ExternalParty');

// Creation fact: association comes into existence `associated` (§7.5).
r = m2.execute(store, { type: 'AssociateExternalParty', actor: A, payload: { projectId: project.id, externalPartyId: ep.id } });
if (r.outcome !== 'server accepted') failures.push(`AssociateExternalParty rejected: ${JSON.stringify(r)}`);
const pxp1 = [...store.entities.values()].find((e) => e.type === 'ProjectExternalParty');
if (!pxp1) failures.push('no ProjectExternalParty entity created');
else {
  if (pxp1.scope !== 'Project' || pxp1.projectId !== project.id || pxp1.externalPartyId !== ep.id || pxp1.companyId !== company.id) {
    failures.push(`ProjectExternalParty genesis wrong: ${JSON.stringify({ scope: pxp1.scope, projectId: pxp1.projectId, externalPartyId: pxp1.externalPartyId, companyId: pxp1.companyId })}`);
  }
  if (m2.projectExternalPartyState(store, pxp1.id) !== 'associated') failures.push('new association not derived associated');
}

// Duplicate active association of the same party to the same project is
// rejected (one active association per (Project, ExternalParty); disclosed
// M2 decision, M2/evidence/state.md).
r = m2.execute(store, { type: 'AssociateExternalParty', actor: A, payload: { projectId: project.id, externalPartyId: ep.id } });
if (r.outcome !== 'server rejected') failures.push('duplicate active association accepted');

// Removal fact: `removed`. §7.5 mandates no reason here (reason discipline
// is AC-3; the mandatory-reason set is not expanded).
r = m2.execute(store, { type: 'RemoveProjectExternalParty', actor: A, payload: { projectExternalPartyId: pxp1.id } });
if (r.outcome !== 'server accepted') failures.push(`RemoveProjectExternalParty rejected: ${JSON.stringify(r)}`);
if (m2.projectExternalPartyState(store, pxp1.id) !== 'removed') failures.push('removed state not derived');
// Removed is terminal: no second removal, no reactivation vocabulary.
r = m2.execute(store, { type: 'RemoveProjectExternalParty', actor: A, payload: { projectExternalPartyId: pxp1.id } });
if (r.outcome !== 'server rejected') failures.push('removed association accepted a second removal');

// Re-association is a NEW identity; the removed record stays removed.
r = m2.execute(store, { type: 'AssociateExternalParty', actor: A, payload: { projectId: project.id, externalPartyId: ep.id } });
if (r.outcome !== 'server accepted') failures.push(`re-association rejected: ${JSON.stringify(r)}`);
const pxp2 = [...store.entities.values()].find((e) => e.type === 'ProjectExternalParty' && e.id !== pxp1.id);
if (!pxp2) failures.push('re-association produced no new ProjectExternalParty identity');
else {
  if (pxp2.id === pxp1.id) failures.push('re-association reused the removed identity (§7.5: new identity required)');
  if (m2.projectExternalPartyState(store, pxp2.id) !== 'associated') failures.push('new association not associated');
}
if (m2.projectExternalPartyState(store, pxp1.id) !== 'removed') failures.push('removed association resurrected by re-association');

// Fact vocabulary (AC-ARCH-I3): association lifecycle rides the catalogued
// generic LifecycleEvent; exactly one associated and one removed fact on
// pxp1, one associated fact on pxp2. No other lifecycle verbs exist.
const lc = (id, ev) => store.facts.filter((f) => f.type === 'LifecycleEvent' && f.subject === id && f.payload.event === ev);
if (lc(pxp1.id, 'associated').length !== 1) failures.push(`pxp1 associated facts: ${lc(pxp1.id, 'associated').length}`);
if (lc(pxp1.id, 'removed').length !== 1) failures.push(`pxp1 removed facts: ${lc(pxp1.id, 'removed').length}`);
if (lc(pxp2?.id, 'associated').length !== 1) failures.push(`pxp2 associated facts: ${lc(pxp2?.id, 'associated').length}`);
const otherVerbs = store.facts.filter((f) => f.type === 'LifecycleEvent' && (f.subject === pxp1.id || f.subject === pxp2?.id)
  && !['associated', 'removed'].includes(f.payload.event));
if (otherVerbs.length > 0) failures.push(`independent ProjectExternalParty lifecycle vocabulary introduced: ${otherVerbs.map((f) => f.payload.event).join(', ')}`);

// An archived ExternalParty cannot be newly associated.
m2.execute(store, { type: 'CreateExternalParty', actor: A, payload: { name: 'Old Co', partyType: 'subcontractor' } });
const epArchived = [...store.entities.values()].filter((e) => e.type === 'ExternalParty').find((e) => e.id !== ep.id);
m2.execute(store, { type: 'ArchiveExternalParty', actor: A, payload: { externalPartyId: epArchived.id } });
r = m2.execute(store, { type: 'AssociateExternalParty', actor: A, payload: { projectId: project.id, externalPartyId: epArchived.id } });
if (r.outcome !== 'server rejected') failures.push('archived ExternalParty newly associated');

// Tenancy (DM-INV-5): associations cannot span Companies in either direction.
m1.execute(store, { type: 'CreateCompany', actor: { personRef: { email: 'other@example.com', name: 'O' } }, payload: { companyName: 'Other Co' } });
const otherAdmin = [...store.entities.values()].find((e) => e.type === 'Worker' && e.companyId !== company.id);
m2.execute(store, { type: 'CreateExternalParty', actor: { workerId: otherAdmin.id }, payload: { name: 'Their EP', partyType: 'epc_client' } });
const epOther = [...store.entities.values()].find((e) => e.type === 'ExternalParty' && e.companyId !== company.id);
r = m2.execute(store, { type: 'AssociateExternalParty', actor: A, payload: { projectId: project.id, externalPartyId: epOther.id } });
if (r.outcome !== 'server rejected' || !/cross-tenant|not found/.test(r.reason ?? '')) failures.push(`foreign ExternalParty associated into our Project: ${JSON.stringify(r)}`);
r = m2.execute(store, { type: 'AssociateExternalParty', actor: { workerId: otherAdmin.id }, payload: { projectId: project.id, externalPartyId: ep.id } });
if (r.outcome !== 'server rejected' || !/cross-tenant|not found/.test(r.reason ?? '')) failures.push(`foreign admin associated into our Project: ${JSON.stringify(r)}`);

report('M2-AC-7', failures);
