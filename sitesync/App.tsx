import React, { useEffect, useState } from 'react';
import { Pressable, SafeAreaView, StatusBar, StyleSheet, Text, View } from 'react-native';
import type { ApplicationContext } from './src/identity/projectContext';
import type { ProjectContextRecord, ProjectRosterRecord } from './src/domain/localPersistence';
import { M15QaScreen } from './src/qr/M15QaScreen';
import { M16QaScreen } from './src/attendance/M16QaScreen';
import { QrScannerScreen } from './src/qr/QrScannerScreen';
import { WorkerQrIdentityScreen } from './src/qr/WorkerQrIdentityScreen';
import { M2AppShell } from './src/product/M2AppShell';
import type { QrRosterResolver, TrustedMembershipRecord } from './src/qr/qrValidation';
import type { SyncLifecycle } from './src/sync/syncLifecycle';

const USER_ID = '11111111-1111-4111-8111-111111111111';
const ORG_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const PERSON_ID = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const PROJECT_ID = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';
const COMPANY_ID = 'company-1';
const MEMBERSHIP_ID = 'membership-1';

const applicationContext: ApplicationContext = {
  userId: USER_ID,
  profile: { userId: USER_ID, organisationId: ORG_ID, personId: PERSON_ID },
  person: { id: PERSON_ID, organisationId: ORG_ID, displayName: 'ORG A WORKER' },
  organisation: { id: ORG_ID, name: 'Organisation A' },
  memberships: [{ id: MEMBERSHIP_ID, organisationId: ORG_ID, companyId: COMPANY_ID, personId: PERSON_ID, status: 'ACTIVE' }],
  activeProjectAssignments: [{ id: 'assignment-1', organisationId: ORG_ID, projectId: PROJECT_ID, companyId: COMPANY_ID, companyMembershipId: MEMBERSHIP_ID, personId: PERSON_ID, projectRole: 'WORKER', status: 'ACTIVE' }],
  hasProjectAccess: true,
  device: null,
};

const scannerContext: ProjectContextRecord = { personId: PERSON_ID, projectId: PROJECT_ID, organisationId: ORG_ID, companyId: COMPANY_ID, companyMembershipId: MEMBERSHIP_ID, projectRole: 'WORKER', selectedAt: '2026-09-11T00:00:00.000Z', updatedAt: '2026-09-11T00:00:00.000Z' };
const rosterRecord: ProjectRosterRecord = { projectId: PROJECT_ID, personId: PERSON_ID, organisationId: ORG_ID, companyId: COMPANY_ID, displayName: 'ORG A WORKER', projectRole: 'WORKER', assignmentStatus: 'ACTIVE', membershipStatus: 'ACTIVE', syncedAt: '2026-09-11T00:00:00.000Z' };
const membershipRecord: TrustedMembershipRecord = { id: MEMBERSHIP_ID, organisationId: ORG_ID, companyId: COMPANY_ID, personId: PERSON_ID, status: 'ACTIVE' };
const qaResolver: QrRosterResolver = {
  async getRoster(projectId, personId) { return projectId === PROJECT_ID && personId === PERSON_ID ? rosterRecord : null; },
  async getMembership(membershipId) { return membershipId === MEMBERSHIP_ID ? membershipRecord : null; },
};

type Screen = 'product' | 'workerQr' | 'scanner' | 'qa' | 'm16qa';
export interface AppProps { syncLifecycle?: Pick<SyncLifecycle, 'start' | 'dispose'>; }

export default function App({ syncLifecycle }: AppProps = {}) {
  const [screen, setScreen] = useState<Screen>('product');
  useEffect(() => { if (!syncLifecycle) return undefined; void syncLifecycle.start(); return () => { void syncLifecycle.dispose(); }; }, [syncLifecycle]);

  if (screen === 'product') return <M2AppShell context={{ projectName: 'TEST PROJECT', siteName: 'SITE A', workerName: 'ORG A WORKER', workerRole: 'WORKER', companyName: 'COMPANY A', attendanceState: 'CHECKED_IN' }} />;
  if (screen === 'workerQr') return <SafeAreaView style={styles.root}><StatusBar barStyle="dark-content" backgroundColor="#F4F6FA" /><View style={styles.header}><Pressable onPress={() => setScreen('product')} hitSlop={12}><Text style={styles.back}>‹ BACK</Text></Pressable><Text style={styles.headerLabel}>M1.5 TEST</Text></View><WorkerQrIdentityScreen context={applicationContext} projectId={PROJECT_ID} projectName="TEST PROJECT" /></SafeAreaView>;
  if (screen === 'scanner') return <SafeAreaView style={styles.root}><StatusBar barStyle="dark-content" backgroundColor="#F4F6FA" /><View style={styles.scannerHeader}><Pressable onPress={() => setScreen('product')} hitSlop={12}><Text style={styles.back}>‹ BACK</Text></Pressable></View><QrScannerScreen context={scannerContext} resolver={qaResolver} online /></SafeAreaView>;
  if (screen === 'qa') return <SafeAreaView style={styles.root}><StatusBar barStyle="dark-content" backgroundColor="#F4F6FA" /><M15QaScreen onBack={() => setScreen('product')} /></SafeAreaView>;
  return <SafeAreaView style={styles.root}><StatusBar barStyle="dark-content" backgroundColor="#F4F6FA" /><M16QaScreen onBack={() => setScreen('product')} /></SafeAreaView>;
}

const styles = StyleSheet.create({ root: { flex: 1, backgroundColor: '#F4F6FA' }, header: { paddingHorizontal: 20, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, scannerHeader: { paddingHorizontal: 20, paddingVertical: 8 }, back: { color: '#0D1733', fontSize: 11, fontWeight: '900', letterSpacing: 1 }, headerLabel: { color: '#65718A', fontSize: 10, fontWeight: '900', letterSpacing: 1.5 } });
