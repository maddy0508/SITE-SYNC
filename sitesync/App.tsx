import React, { useState } from 'react';
import { Pressable, SafeAreaView, StatusBar, StyleSheet, Text, View } from 'react-native';
import type { ApplicationContext } from './src/identity/projectContext';
import type { ProjectContextRecord, ProjectRosterRecord } from './src/domain/localPersistence';
import { QrScannerScreen } from './src/qr/QrScannerScreen';
import { WorkerQrIdentityScreen } from './src/qr/WorkerQrIdentityScreen';
import type { QrRosterResolver, TrustedMembershipRecord } from './src/qr/qrValidation';

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
  memberships: [{
    id: MEMBERSHIP_ID,
    organisationId: ORG_ID,
    companyId: COMPANY_ID,
    personId: PERSON_ID,
    status: 'ACTIVE',
  }],
  activeProjectAssignments: [{
    id: 'assignment-1',
    organisationId: ORG_ID,
    projectId: PROJECT_ID,
    companyId: COMPANY_ID,
    companyMembershipId: MEMBERSHIP_ID,
    personId: PERSON_ID,
    projectRole: 'WORKER',
    status: 'ACTIVE',
  }],
  hasProjectAccess: true,
  device: null,
};

const scannerContext: ProjectContextRecord = {
  personId: PERSON_ID,
  projectId: PROJECT_ID,
  organisationId: ORG_ID,
  companyId: COMPANY_ID,
  companyMembershipId: MEMBERSHIP_ID,
  projectRole: 'WORKER',
  selectedAt: '2026-09-11T00:00:00.000Z',
  updatedAt: '2026-09-11T00:00:00.000Z',
};

const rosterRecord: ProjectRosterRecord = {
  projectId: PROJECT_ID,
  personId: PERSON_ID,
  organisationId: ORG_ID,
  companyId: COMPANY_ID,
  displayName: 'ORG A WORKER',
  projectRole: 'WORKER',
  assignmentStatus: 'ACTIVE',
  membershipStatus: 'ACTIVE',
  syncedAt: '2026-09-11T00:00:00.000Z',
};

const membershipRecord: TrustedMembershipRecord = {
  id: MEMBERSHIP_ID,
  organisationId: ORG_ID,
  companyId: COMPANY_ID,
  personId: PERSON_ID,
  status: 'ACTIVE',
};

const qaResolver: QrRosterResolver = {
  async getRoster(projectId, personId) {
    return projectId === PROJECT_ID && personId === PERSON_ID ? rosterRecord : null;
  },
  async getMembership(membershipId) {
    return membershipId === MEMBERSHIP_ID ? membershipRecord : null;
  },
};

type Screen = 'home' | 'workerQr' | 'scanner';

export default function App() {
  const [screen, setScreen] = useState<Screen>('home');

  if (screen === 'workerQr') {
    return (
      <SafeAreaView style={styles.root}>
        <StatusBar barStyle="dark-content" backgroundColor="#F4F6FA" />
        <View style={styles.header}>
          <Pressable onPress={() => setScreen('home')} hitSlop={12}>
            <Text style={styles.back}>‹ BACK</Text>
          </Pressable>
          <Text style={styles.headerLabel}>M1.5 TEST</Text>
        </View>
        <WorkerQrIdentityScreen context={applicationContext} projectId={PROJECT_ID} projectName="TEST PROJECT" />
      </SafeAreaView>
    );
  }

  if (screen === 'scanner') {
    return (
      <SafeAreaView style={styles.root}>
        <StatusBar barStyle="dark-content" backgroundColor="#F4F6FA" />
        <View style={styles.scannerHeader}>
          <Pressable onPress={() => setScreen('home')} hitSlop={12}>
            <Text style={styles.back}>‹ BACK</Text>
          </Pressable>
        </View>
        <QrScannerScreen context={scannerContext} resolver={qaResolver} online />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor="#F4F6FA" />
      <View style={styles.home}>
        <Text style={styles.eyebrow}>SITE-SYNC</Text>
        <Text style={styles.title}>M1.5 QR TEST</Text>
        <Text style={styles.subtitle}>Standalone device verification</Text>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>QR ATTENDANCE</Text>
          <Text style={styles.cardBody}>This test build exposes the M1.5 worker QR and camera scanner directly so the native flow can be verified on a physical device.</Text>
        </View>

        <Pressable style={styles.primary} onPress={() => setScreen('scanner')}>
          <Text style={styles.primaryText}>SCAN WORKER QR</Text>
        </Pressable>
        <Pressable style={styles.secondary} onPress={() => setScreen('workerQr')}>
          <Text style={styles.secondaryText}>SHOW WORKER QR</Text>
        </Pressable>

        <View style={styles.footer}>
          <Text style={styles.footerTitle}>TEST CONTEXT</Text>
          <Text style={styles.footerText}>Organisation A · Test Project · Worker identity fixture</Text>
          <Text style={styles.footerText}>No attendance mutation is performed by M1.5.</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F4F6FA' },
  home: { flex: 1, padding: 24, justifyContent: 'center' },
  eyebrow: { color: '#65718A', fontSize: 11, fontWeight: '900', letterSpacing: 2 },
  title: { marginTop: 4, color: '#0D1733', fontSize: 30, fontWeight: '900', letterSpacing: 0.5 },
  subtitle: { marginTop: 5, color: '#59657D', fontSize: 14 },
  card: { marginTop: 28, padding: 20, borderRadius: 20, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#DCE2EF' },
  cardTitle: { color: '#0D1733', fontSize: 14, fontWeight: '900', letterSpacing: 1 },
  cardBody: { marginTop: 8, color: '#59657D', fontSize: 13, lineHeight: 19 },
  primary: { marginTop: 18, borderRadius: 14, paddingVertical: 16, alignItems: 'center', backgroundColor: '#0D1733' },
  primaryText: { color: '#FFFFFF', fontSize: 12, fontWeight: '900', letterSpacing: 1 },
  secondary: { marginTop: 10, borderRadius: 14, paddingVertical: 16, alignItems: 'center', backgroundColor: '#F3B33D' },
  secondaryText: { color: '#0D1733', fontSize: 12, fontWeight: '900', letterSpacing: 1 },
  footer: { marginTop: 26 },
  footerTitle: { color: '#65718A', fontSize: 10, fontWeight: '900', letterSpacing: 1.4 },
  footerText: { marginTop: 4, color: '#7A8499', fontSize: 11, lineHeight: 16 },
  header: { paddingHorizontal: 20, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  scannerHeader: { paddingHorizontal: 20, paddingVertical: 8 },
  back: { color: '#0D1733', fontSize: 11, fontWeight: '900', letterSpacing: 1 },
  headerLabel: { color: '#65718A', fontSize: 10, fontWeight: '900', letterSpacing: 1.5 },
});
