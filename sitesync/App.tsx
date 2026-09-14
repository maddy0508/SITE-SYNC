import React, { useEffect, useState } from 'react';
import { Pressable, SafeAreaView, StatusBar, StyleSheet, Text, View } from 'react-native';
import type { ApplicationContext } from './src/identity/projectContext';
import type { ProjectContextRecord, ProjectRosterRecord } from './src/domain/localPersistence';
import { M15QaScreen } from './src/qr/M15QaScreen';
import { M16QaScreen } from './src/attendance/M16QaScreen';
import { QrScannerScreen } from './src/qr/QrScannerScreen';
import { WorkerQrIdentityScreen } from './src/qr/WorkerQrIdentityScreen';
import { M2LiveAppShell } from './src/product/M2LiveAppShell';
import { loadM2OperationalSnapshot } from './src/product/m2RuntimeData';
import type { M2OperationalSnapshot } from './src/product/m2OperationalSnapshot';
import { initializeDatabase } from './src/database/localPersistence';
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
const qaResolver: QrRosterResolver = { async getRoster(projectId, personId) { return projectId === PROJECT_ID && personId === PERSON_ID ? rosterRecord : null; }, async getMembership(membershipId) { return membershipId === MEMBERSHIP_ID ? membershipRecord : null; } };

type Screen = 'product' | 'workerQr' | 'scanner' | 'qa' | 'm16qa';
export interface AppProps { syncLifecycle?: Pick<SyncLifecycle, 'start' | 'dispose'>; }

export default function App({ syncLifecycle }: AppProps = {}) {
  const [screen, setScreen] = useState<Screen>('product');
  const [snapshot, setSnapshot] = useState<M2OperationalSnapshot | null>(null);
  const [runtimeState, setRuntimeState] = useState<'LOADING' | 'READY' | 'EMPTY' | 'ERROR'>('LOADING');

  useEffect(() => { if (!syncLifecycle) return undefined; void syncLifecycle.start(); return () => { void syncLifecycle.dispose(); }; }, [syncLifecycle]);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        await initializeDatabase();
        const next = await loadM2OperationalSnapshot({ personId: PERSON_ID, workDateUtc: new Date().toISOString().slice(0, 10) });
        if (!active) return;
        setSnapshot(next);
        setRuntimeState(next ? 'READY' : 'EMPTY');
      } catch {
        if (active) setRuntimeState('ERROR');
      }
    })();
    return () => { active = false; };
  }, []);

  if (screen === 'product') {
    if (runtimeState === 'READY' && snapshot) return <M2LiveAppShell snapshot={snapshot} />;
    return <RuntimeState state={runtimeState} />;
  }
  if (screen === 'workerQr') return <SafeAreaView style={styles.root}><StatusBar barStyle="dark-content" backgroundColor="#F4F6FA" /><View style={styles.header}><Pressable onPress={() => setScreen('product')} hitSlop={12}><Text style={styles.back}>‹ BACK</Text></Pressable><Text style={styles.headerLabel}>M1.5 TEST</Text></View><WorkerQrIdentityScreen context={applicationContext} projectId={PROJECT_ID} projectName="TEST PROJECT" /></SafeAreaView>;
  if (screen === 'scanner') return <SafeAreaView style={styles.root}><StatusBar barStyle="dark-content" backgroundColor="#F4F6FA" /><View style={styles.scannerHeader}><Pressable onPress={() => setScreen('product')} hitSlop={12}><Text style={styles.back}>‹ BACK</Text></Pressable></View><QrScannerScreen context={scannerContext} resolver={qaResolver} online /></SafeAreaView>;
  if (screen === 'qa') return <SafeAreaView style={styles.root}><StatusBar barStyle="dark-content" backgroundColor="#F4F6FA" /><M15QaScreen onBack={() => setScreen('product')} /></SafeAreaView>;
  return <SafeAreaView style={styles.root}><StatusBar barStyle="dark-content" backgroundColor="#F4F6FA" /><M16QaScreen onBack={() => setScreen('product')} /></SafeAreaView>;
}

function RuntimeState({ state }: { state: 'LOADING' | 'READY' | 'EMPTY' | 'ERROR' }) {
  const title = state === 'LOADING' ? 'LOADING SITE-SYNC' : state === 'EMPTY' ? 'PROJECT DATA NOT AVAILABLE' : 'SITE-SYNC COULD NOT LOAD';
  const body = state === 'LOADING' ? 'Loading the local project projection.' : state === 'EMPTY' ? 'No project context and roster projection are currently available for the authenticated person. No demo operational metrics are shown.' : 'The local project projection could not be loaded. Existing QA surfaces remain isolated from the product shell.';
  return <SafeAreaView style={styles.root}><StatusBar barStyle="light-content" backgroundColor="#0D1733" /><View style={styles.state}><Text style={styles.stateBrand}>SITE-SYNC</Text><Text style={styles.stateTitle}>{title}</Text><Text style={styles.stateBody}>{body}</Text></View></SafeAreaView>;
}

const styles = StyleSheet.create({ root: { flex: 1, backgroundColor: '#F4F6FA' }, header: { paddingHorizontal: 20, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, scannerHeader: { paddingHorizontal: 20, paddingVertical: 8 }, back: { color: '#0D1733', fontSize: 11, fontWeight: '900', letterSpacing: 1 }, headerLabel: { color: '#65718A', fontSize: 10, fontWeight: '900', letterSpacing: 1.5 }, state: { flex: 1, backgroundColor: '#0D1733', padding: 28, justifyContent: 'center' }, stateBrand: { color: '#FFF', fontSize: 18, fontWeight: '900', letterSpacing: 2 }, stateTitle: { color: '#FFF', fontSize: 25, fontWeight: '900', marginTop: 28 }, stateBody: { color: '#B8C1D4', fontSize: 14, lineHeight: 21, marginTop: 10, maxWidth: 360 } });
