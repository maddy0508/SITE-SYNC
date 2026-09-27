// M0-AC-7 — Tenancy and Site boundaries enforced structurally, testable before M1.
// Anchor: MASTER_BLUEPRINT §M0.6 M0-AC-7; §M0.3.1 (RLS clarification: bypass
// paths must be addressed); §7 DM-INV-5/6; §8 AC-ARCH-B1–B4.
// Structural contract: architecture.md §A must name the storage-level enforcement
// mechanism with an explicit bypass-path analysis; persistence-model.md must
// scope every Company-owned and Site-owned type from §7.4 at storage; a pre-M1
// verification test must be named.
import { readArtifact, report } from './lib.mjs';

const failures = [];
const arch = readArtifact('architecture.md');
if (!arch) {
  failures.push('ABSENT: M0/architecture.md');
} else {
  if (!/tenancy and scope isolation/i.test(arch)) {
    failures.push('architecture.md lacks §A Tenancy and scope isolation');
  }
  if (!/bypass/i.test(arch)) {
    failures.push('bypass-path analysis absent (§M0.3.1: "we use RLS" is not satisfaction)');
  }
  if (!/AC-ARCH-B1/.test(arch) || !/AC-ARCH-B2/.test(arch)) {
    failures.push('B1/B2 anchors not cited');
  }
  if (!/DM-INV-5/.test(arch) || !/DM-INV-6/.test(arch)) {
    failures.push('DM-INV-5/6 anchors not cited');
  }
  if (!/testable before M1|pre-M1 (verification )?test/i.test(arch)) {
    failures.push('no pre-M1 structural verification test named');
  }
}
const pers = readArtifact('persistence-model.md');
if (!pers) {
  failures.push('ABSENT: M0/persistence-model.md');
} else {
  const COMPANY_OWNED = ['Worker', 'ExternalParty', 'WorkerQrIdentity', 'Crew', 'CrewMembership'];
  const SITE_OWNED = ['WorkArea', 'Asset', 'SiteAssignment', 'CrewSiteAssociation', 'PreStartContent', 'PreStart'];
  for (const t of COMPANY_OWNED) {
    if (!new RegExp(`${t}[^\\n]*Company|Company[^\\n]*${t}`).test(pers)) {
      failures.push(`persistence-model.md does not scope ${t} to Company at storage`);
    }
  }
  for (const t of SITE_OWNED) {
    if (!new RegExp(`${t}[^\\n]*Site|Site[^\\n]*${t}`).test(pers)) {
      failures.push(`persistence-model.md does not scope ${t} to Site at storage`);
    }
  }
  if (!/company_id|tenant/i.test(pers)) {
    failures.push('persistence-model.md names no storage-level tenancy key');
  }
}
report('M0-AC-7', failures);
