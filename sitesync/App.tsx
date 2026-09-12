import React, { useEffect, useState } from 'react';
import { AppState, Pressable, SafeAreaView, StatusBar, StyleSheet, Text, View } from 'react-native';
import type { ApplicationContext } from './src/identity/projectContext';
import type { ProjectContextRecord, ProjectRosterRecord } from './src/domain/localPersistence';
import { M15QaScreen } from './src/qr/M15QaScreen';
import { M16QaScreen } from './src/attendance/M16QaScreen';
import { QrScannerScreen } from './src/qr/QrScannerScreen';
import { WorkerQrIdentityScreen } from './src/qr/WorkerQrIdentityScreen';
import type { QrRosterResolver, TrustedMembershipRecord } from './src/qr/qrValidation';
import type { SyncLifecycle } from './src/sync/syncLifecycle';
import { SyncLifecycle as DefaultSyncLifecycle } from './src/sync/syncLifecycle';
import type { SyncRuntime } from './src/sync/syncRuntime';
import { AuthService } from './src/auth/authService';
import { createAuthenticatedSyncRuntime } from './src/sync/syncRuntime';
import { createM17SupabaseClient } from './src/supabase/m17SupabaseClient';
import type { SupabaseClient } from '@supabase/supabase-js';

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

type Screen = 'home' | 'workerQr' | 'scanner' | 'qa' | 'm16qa' | 'm17qa';

type M17QaScreenComponent = React.ComponentType<{
  onBack: () => void;
  authService: AuthService;
  client: SupabaseClient;
  runtime: Pick<SyncRuntime, 'start' | 'stop' | 'requestManualSync'>;
}>;

export interface AppProps {
  syncLifecycle?: Pick<SyncLifecycle, 'start' | 'dispose'>;
}

interface M17Composition {
  client: SupabaseClient;
  authService: AuthService;
  runtime: SyncRuntime;
  lifecycle: DefaultSyncLifecycle;
}

export default function App({ syncLifecycle }: AppProps = {}) {
  const [screen, setScreen] = useState<Screen>('home');
  const [m17, setM17] = useState<M17Composition | null>(null);
  const [m17QaScreen, setM17QaScreen] = useState<M17QaScreenComponent | null>(null);
  const [m17Loading, setM17Loading] = useState(false);
  const [m17LoadError, setM17LoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!syncLifecycle) return undefined;
    void syncLifecycle.start();
    return () => { void syncLifecycle.dispose(); };
  }, [syncLifecycle]);

  useEffect(() => {
    if (screen !== 'm17qa' || !m17) return undefined;
    return () => { void m17.lifecycle.dispose(); };
  }, [m17, screen]);

  const openM17Qa = async () => {
    setM17Loading(true);
    setM17LoadError(null);
    try {
      let composition = m17;
      if (!composition) {
        const client = createM17SupabaseClient();
        const authService = new AuthService(client);
        const runtime = createAuthenticatedSyncRuntime(authService, client);
        const lifecycle = new DefaultSyncLifecycle(runtime, AppState, undefined, authService);
        composition = { client, authService, runtime, lifecycle };
        setM17(composition);
      }

      if (!m17QaScreen) {
        const module = await import('./src/attendance/M17RealRuntimeQaScreen');
        setM17QaScreen(() => module.M17RealRuntimeQaScreen);
      }
      setScreen('m17qa');
    } catch (error) {
      setM17LoadError(error instanceof Error ? error.message : String(error));
    } finally {
      setM17Loading(false);
    }
  };

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

  if (screen === 'qa') {
    return (
      <SafeAreaView style={styles.root}>
        <StatusBar barStyle="dark-content" backgroundColor="#F4F6FA" />
        <M15QaScreen onBack={() => setScreen('home')} />
      </SafeAreaView>
    );
  }

  if (screen === 'm16qa') {
    return (
      <SafeAreaView style={styles.root}>
        <StatusBar barStyle="dark-content" backgroundColor="#F4F6FA" />
        <M16QaScreen onBack={() => setScreen('home')} />
      </SafeAreaView>
    );
  }

  if (screen === 'm17qa') {
    if (!m17 || !m17QaScreen) return null;
    const M17RealRuntimeQaScreen = m17QaScreen;
    return (
      <SafeAreaView style={styles.root}>
        <StatusBar barStyle="dark-content" backgroundColor="#F4F6FA" />
        <M17RealRuntimeQaScreen
          onBack={() => setScreen('home')}
          authService={m17.authService}
          client={m17.client}
          runtime={m17.runtime}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor="#F4F6FA" />
      <View style={styles.home}>
        <Text style={styles.eyebrow}>SITE-SYNC</Text>
        <Text style={styles.title}>M1.6 ATTENDANCE TEST</Text>
        <Text style={styles.subtitle}>Standalone device verification</Text>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>OFFLINE ATTENDANCE</Text>
          <Text style={styles.cardBody}>M1.6 exercises local check-in/check-out, durable command history, restart persistence and transactional rollback without touching production Supabase.</Text>
        </View>

        <Pressable style={styles.primary} disabled={m17Loading} onPress={() => void openM17Qa()}>
          <Text style={styles.primaryText}>{m17Loading ? 'LOADING M1.7 QA…' : 'RUN M1.7 REAL RUNTIME QA'}</Text>
        </Pressable>
        {m17LoadError && <Text style={styles.error}>M1.7 QA could not be loaded: {m17LoadError}</Text>}
        <Pressable style={styles.primary} onPress={() => setScreen('m16qa')}>
          <Text style={styles.primaryText}>RUN M1.6 DEVICE SUITE</Text>
        </Pressable>
        <Pressable style={styles.secondary} onPress={() => setScreen('qa')}>
          <Text style={styles.secondaryText}>RUN M1.5 QR SUITE</Text>
        </Pressable>
        <Pressable style={styles.secondary} onPress={() => setScreen('scanner')}>
          <Text style={styles.secondaryText}>SCAN WORKER QR</Text>
        </Pressable>
        <Pressable style={styles.qaButton} onPress={() => setScreen('workerQr')}>
          <Text style={styles.qaButtonText}>SHOW WORKER QR</Text>
        </Pressable>

        <View style={styles.footer}>
          <Text style={styles.footerTitle}>TEST CONTEXT</Text>
          <Text style={styles.footerText}>M1.7 uses isolated Supabase + local SQLite</Text>
          <Text style={styles.footerText}>Production Supabase remains untouched.</Text>
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
  primary: { marginTop: 12, borderRadius: 14, paddingVertical: 16, alignItems: 'center', backgroundColor: '#0D1733' },
  primaryText: { color: '#FFFFFF', fontSize: 12, fontWeight: '900', letterSpacing: 1 },
  secondary: { marginTop: 10, borderRadius: 14, paddingVertical: 16, alignItems: 'center', backgroundColor: '#F3B33D' },
  secondaryText: { color: '#0D1733', fontSize: 12, fontWeight: '900', letterSpacing: 1 },
  qaButton: { marginTop: 10, borderRadius: 14, paddingVertical: 14, alignItems: 'center', backgroundColor: '#E8ECF4', borderWidth: 1, borderColor: '#CBD3E3' },
  qaButtonText: { color: '#0D1733', fontSize: 11, fontWeight: '900', letterSpacing: 1 },
  error: { marginTop: 8, color: '#B42318', fontSize: 11, lineHeight: 16 },
  footer: { marginTop: 22 },
  footerTitle: { color: '#65718A', fontSize: 10, fontWeight: '900', letterSpacing: 1.4 },
  footerText: { marginTop: 4, color: '#7A8499', fontSize: 11, lineHeight: 16 },
  header: { paddingHorizontal: 20, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  scannerHeader: { paddingHorizontal: 20, paddingVertical: 8 },
  back: { color: '#0D1733', fontSize: 11, fontWeight: '900', letterSpacing: 1 },
  headerLabel: { color: '#65718A', fontSize: 10, fontWeight: '900', letterSpacing: 1.5 },
});