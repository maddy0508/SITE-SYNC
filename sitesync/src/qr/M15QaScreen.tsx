import React, { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { ProjectContextRecord, ProjectRosterRecord } from '../domain/localPersistence';
import { encodeWorkerQrPayload, parseWorkerQrPayload, QrParseError } from './qrPayload';
import { QrScanController } from './qrScanController';
import { QrValidationService } from './qrValidation';
import type { QrRosterResolver, TrustedMembershipRecord } from './qrValidation';

const ORG_A = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const ORG_B = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const PROJECT = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';
const PROJECT_OTHER = 'ffffffff-ffff-4fff-8fff-ffffffffffff';
const PERSON_SELF = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const PERSON_OTHER = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';
const PERSON_UNASSIGNED = '99999999-9999-4999-8999-999999999999';
const COMPANY_A = 'company-1';
const COMPANY_B = 'company-2';
const MEMBERSHIP_SELF = 'membership-1';
const MEMBERSHIP_OTHER_COMPANY = 'membership-2';
const MEMBERSHIP_OTHER_SAME_COMPANY = 'membership-4';
const MEMBERSHIP_UNASSIGNED = 'membership-3';
const MEMBERSHIP_INACTIVE = 'membership-inactive';

const context: ProjectContextRecord = {
  personId: PERSON_SELF,
  projectId: PROJECT,
  organisationId: ORG_A,
  companyId: COMPANY_A,
  companyMembershipId: MEMBERSHIP_SELF,
  projectRole: 'WORKER',
  selectedAt: '2026-09-11T00:00:00.000Z',
  updatedAt: '2026-09-11T00:00:00.000Z',
};

const selfRoster: ProjectRosterRecord = {
  projectId: PROJECT,
  personId: PERSON_SELF,
  organisationId: ORG_A,
  companyId: COMPANY_A,
  displayName: 'ORG A WORKER',
  projectRole: 'WORKER',
  assignmentStatus: 'ACTIVE',
  membershipStatus: 'ACTIVE',
  syncedAt: '2026-09-11T00:00:00.000Z',
};

const otherRoster: ProjectRosterRecord = {
  ...selfRoster,
  personId: PERSON_OTHER,
  displayName: 'OTHER WORKER',
};

const selfMembership: TrustedMembershipRecord = {
  id: MEMBERSHIP_SELF,
  organisationId: ORG_A,
  companyId: COMPANY_A,
  personId: PERSON_SELF,
  status: 'ACTIVE',
};

const otherCompanyMembership: TrustedMembershipRecord = {
  id: MEMBERSHIP_OTHER_COMPANY,
  organisationId: ORG_A,
  companyId: COMPANY_B,
  personId: PERSON_OTHER,
  status: 'ACTIVE',
};

const otherSameCompanyMembership: TrustedMembershipRecord = {
  id: MEMBERSHIP_OTHER_SAME_COMPANY,
  organisationId: ORG_A,
  companyId: COMPANY_A,
  personId: PERSON_OTHER,
  status: 'ACTIVE',
};

const unassignedMembership: TrustedMembershipRecord = {
  id: MEMBERSHIP_UNASSIGNED,
  organisationId: ORG_A,
  companyId: COMPANY_A,
  personId: PERSON_UNASSIGNED,
  status: 'ACTIVE',
};

const inactiveMembership: TrustedMembershipRecord = {
  id: MEMBERSHIP_INACTIVE,
  organisationId: ORG_A,
  companyId: COMPANY_A,
  personId: PERSON_SELF,
  status: 'INACTIVE',
};

const qaResolver: QrRosterResolver = {
  async getRoster(projectId, personId) {
    if (projectId !== PROJECT) return null;
    if (personId === PERSON_SELF) return selfRoster;
    if (personId === PERSON_OTHER) return otherRoster;
    return null;
  },
  async getMembership(membershipId) {
    if (membershipId === MEMBERSHIP_SELF) return selfMembership;
    if (membershipId === MEMBERSHIP_OTHER_COMPANY) return otherCompanyMembership;
    if (membershipId === MEMBERSHIP_OTHER_SAME_COMPANY) return otherSameCompanyMembership;
    if (membershipId === MEMBERSHIP_UNASSIGNED) return unassignedMembership;
    if (membershipId === MEMBERSHIP_INACTIVE) return inactiveMembership;
    return null;
  },
};

const validSelf = encodeWorkerQrPayload({
  version: 1,
  organisationId: ORG_A,
  companyId: COMPANY_A,
  personId: PERSON_SELF,
  membershipId: MEMBERSHIP_SELF,
  projectId: PROJECT,
});

const validOtherCompany = encodeWorkerQrPayload({
  version: 1,
  organisationId: ORG_A,
  companyId: COMPANY_B,
  personId: PERSON_OTHER,
  membershipId: MEMBERSHIP_OTHER_COMPANY,
  projectId: PROJECT,
});

const validOtherPersonSameCompany = encodeWorkerQrPayload({
  version: 1,
  organisationId: ORG_A,
  companyId: COMPANY_A,
  personId: PERSON_OTHER,
  membershipId: MEMBERSHIP_OTHER_SAME_COMPANY,
  projectId: PROJECT,
});

const unassignedWorker = encodeWorkerQrPayload({
  version: 1,
  organisationId: ORG_A,
  companyId: COMPANY_A,
  personId: PERSON_UNASSIGNED,
  membershipId: MEMBERSHIP_UNASSIGNED,
  projectId: PROJECT,
});

const inactiveWorker = encodeWorkerQrPayload({
  version: 1,
  organisationId: ORG_A,
  companyId: COMPANY_A,
  personId: PERSON_SELF,
  membershipId: MEMBERSHIP_INACTIVE,
  projectId: PROJECT,
});

const malformed = 'SITE-SYNC:1|org=' + ORG_A + '|company=' + COMPANY_A + '|person=' + PERSON_SELF;
const wrongOrganisation = encodeWorkerQrPayload({
  version: 1,
  organisationId: ORG_B,
  companyId: COMPANY_A,
  personId: PERSON_SELF,
  membershipId: MEMBERSHIP_SELF,
  projectId: PROJECT,
});
const wrongProject = encodeWorkerQrPayload({
  version: 1,
  organisationId: ORG_A,
  companyId: COMPANY_A,
  personId: PERSON_SELF,
  membershipId: MEMBERSHIP_SELF,
  projectId: PROJECT_OTHER,
});
const unknownMembership = encodeWorkerQrPayload({
  version: 1,
  organisationId: ORG_A,
  companyId: COMPANY_A,
  personId: PERSON_SELF,
  membershipId: 'membership-unknown',
  projectId: PROJECT,
});
const unsupportedVersion = validSelf.replace('SITE-SYNC:1', 'SITE-SYNC:2');

export type M15QaResult = {
  name: string;
  expected: string;
  actual: string;
  passed: boolean;
};

export async function runM15QaSuite(): Promise<M15QaResult[]> {
  const validation = new QrValidationService(qaResolver);
  const results: M15QaResult[] = [];

  const addValidation = async (
    name: string,
    raw: string,
    expected: string,
    online = true,
  ) => {
    try {
      const payload = parseWorkerQrPayload(raw);
      const result = await validation.validate(payload, context, { online });
      const actual = result.status === 'BLOCKED' ? `BLOCKED:${result.reason}` : result.status;
      results.push({ name, expected, actual, passed: actual === expected });
    } catch (error: unknown) {
      const actual = error instanceof QrParseError ? `PARSE:${error.code}` : 'ERROR';
      results.push({ name, expected, actual, passed: actual === expected });
    }
  };

  await addValidation('Valid self QR', validSelf, 'VALID');
  await addValidation('Malformed payload', malformed, 'PARSE:MISSING_FIELD');
  await addValidation('Wrong organisation', wrongOrganisation, 'BLOCKED:ORG_MISMATCH');
  await addValidation('Wrong company', validOtherCompany, 'BLOCKED:COMPANY_MISMATCH');
  await addValidation('Unassigned worker', unassignedWorker, 'BLOCKED:PERSON_UNASSIGNED');
  await addValidation('Inactive membership', inactiveWorker, 'BLOCKED:MEMBERSHIP_INVALID');
  await addValidation('Wrong project', wrongProject, 'BLOCKED:PROJECT_UNASSIGNED');
  await addValidation('Unauthorised worker scan', validOtherPersonSameCompany, 'BLOCKED:ACTOR_NOT_PERMITTED');
  await addValidation('Unknown membership online', unknownMembership, 'BLOCKED:MEMBERSHIP_INVALID');
  await addValidation('Unknown membership offline', unknownMembership, 'BLOCKED:ROSTER_UNVERIFIABLE', false);
  await addValidation('Valid self QR offline', validSelf, 'PROVISIONAL', false);
  await addValidation('Unsupported QR version', unsupportedVersion, 'PARSE:UNSUPPORTED_VERSION');

  const duplicateClock = { value: 1000 };
  const controller = new QrScanController(750, () => duplicateClock.value);
  const first = controller.accept(validSelf);
  const duplicate = controller.accept(validSelf);
  duplicateClock.value += 751;
  const afterWindow = controller.accept(validSelf);
  results.push({ name: 'Duplicate suppression', expected: 'true,false,true', actual: `${first},${duplicate},${afterWindow}`, passed: first && !duplicate && afterWindow });

  return results;
}

export function M15QaScreen({ onBack }: { onBack: () => void }) {
  const [results, setResults] = useState<M15QaResult[] | null>(null);
  const [running, setRunning] = useState(false);
  const run = useCallback(async () => {
    setRunning(true);
    try {
      setResults(await runM15QaSuite());
    } finally {
      setRunning(false);
    }
  }, []);
  const passed = useMemo(() => results?.filter((result) => result.passed).length ?? 0, [results]);

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Pressable onPress={onBack} hitSlop={12}><Text style={styles.back}>‹ BACK</Text></Pressable>
        <Text style={styles.label}>M1.5 QA</Text>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.eyebrow}>SITE-SYNC</Text>
        <Text style={styles.title}>M1.5 QA SUITE</Text>
        <Text style={styles.subtitle}>Self-contained validation tests — no second phone, printed QR or external display required.</Text>
        <View style={styles.note}>
          <Text style={styles.noteTitle}>WHAT THIS TESTS</Text>
          <Text style={styles.noteBody}>The physical camera test proves the native camera + QR detection path. This suite exercises the same parser, validation service and duplicate-scan controller with controlled fixtures so rejection and offline cases can be tested on this device.</Text>
        </View>
        <Pressable style={styles.button} onPress={run} disabled={running}>
          <Text style={styles.buttonText}>{running ? 'RUNNING…' : 'RUN ALL M1.5 TESTS'}</Text>
        </Pressable>
        {results ? (
          <View style={styles.summary}>
            <Text style={styles.summaryTitle}>{passed}/{results.length} TESTS PASSED</Text>
            {results.map((result) => (
              <View key={result.name} style={styles.resultRow}>
                <View style={[styles.dot, result.passed ? styles.pass : styles.fail]} />
                <View style={styles.resultCopy}>
                  <Text style={styles.resultName}>{result.name}</Text>
                  <Text style={styles.resultDetail}>Expected {result.expected} · Got {result.actual}</Text>
                </View>
              </View>
            ))}
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F4F6FA' },
  header: { paddingHorizontal: 20, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  back: { color: '#0D1733', fontSize: 11, fontWeight: '900', letterSpacing: 1 },
  label: { color: '#65718A', fontSize: 10, fontWeight: '900', letterSpacing: 1.5 },
  content: { padding: 24, paddingBottom: 40 },
  eyebrow: { color: '#65718A', fontSize: 11, fontWeight: '900', letterSpacing: 2 },
  title: { marginTop: 4, color: '#0D1733', fontSize: 30, fontWeight: '900' },
  subtitle: { marginTop: 6, color: '#59657D', fontSize: 14, lineHeight: 20 },
  note: { marginTop: 22, padding: 18, borderRadius: 18, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#DCE2EF' },
  noteTitle: { color: '#0D1733', fontSize: 11, fontWeight: '900', letterSpacing: 1.2 },
  noteBody: { marginTop: 8, color: '#59657D', fontSize: 13, lineHeight: 19 },
  button: { marginTop: 16, borderRadius: 14, paddingVertical: 16, alignItems: 'center', backgroundColor: '#0D1733' },
  buttonText: { color: '#FFFFFF', fontSize: 12, fontWeight: '900', letterSpacing: 1 },
  summary: { marginTop: 16, padding: 18, borderRadius: 18, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#DCE2EF' },
  summaryTitle: { color: '#0D1733', fontSize: 17, fontWeight: '900', marginBottom: 12 },
  resultRow: { flexDirection: 'row', paddingVertical: 9, borderTopWidth: 1, borderTopColor: '#EEF1F6' },
  dot: { width: 10, height: 10, borderRadius: 5, marginTop: 4, marginRight: 10 },
  pass: { backgroundColor: '#2E9B61' },
  fail: { backgroundColor: '#C34A4A' },
  resultCopy: { flex: 1 },
  resultName: { color: '#0D1733', fontSize: 13, fontWeight: '800' },
  resultDetail: { marginTop: 2, color: '#65718A', fontSize: 11, lineHeight: 16 },
});
