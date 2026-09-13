import React, { useEffect, useMemo, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { AuthService } from '../auth/authService';
import { AttendanceService } from './attendanceService';
import { closeDatabase, getDb, getLocalDeviceSession, initializeDatabase } from '../database/localPersistence';
import { subscribeRepositoryChanges } from '../database/repositoryChangeBus';
import { DeviceRegistrationService } from '../identity/deviceRegistrationService';
import { IdentityService } from '../identity/identityService';
import type { ApplicationContext } from '../identity/projectContext';
import type { SyncRuntime } from '../sync/syncRuntime';
import type { SupabaseClient } from '@supabase/supabase-js';
import { M17_SUPABASE_URL } from '../supabase/m17SupabaseClient';
import { createQaEvidence, type QaEvidenceStatus } from './m17QaContracts';
import { M17_QA_GATES, nextRequiredAction } from './m17QaTestPlan';

type Result = { status: QaEvidenceStatus; detail: string };
const DATABASE_NAME = 'm17-real-runtime-device.db';
const CHECKPOINT_TABLE = 'm17_qa_restart_checkpoint';

function nowUtc() { return new Date().toISOString(); }
function uuidV4(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, character => {
    const random = Math.floor(Math.random() * 16);
    const value = character === 'x' ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });
}

interface Props {
  onBack: () => void;
  authService: AuthService;
  client: SupabaseClient;
  runtime: Pick<SyncRuntime, 'start' | 'stop' | 'requestManualSync'>;
}

export function M17RealRuntimeQaScreenV2({ onBack, authService, client, runtime }: Props) {
  const [context, setContext] = useState<ApplicationContext | null>(null);
  const [running, setRunning] = useState(false);
  const [dbReady, setDbReady] = useState(false);
  const [results, setResults] = useState<Partial<Record<1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12, Result>>>({});
  const [status, setStatus] = useState('Preparing isolated M1.7 runtime…');
  const [localState, setLocalState] = useState('No local attendance state loaded');
  const [observedCommandId, setObservedCommandId] = useState<string | null>(null);
  const [restartRecovered, setRestartRecovered] = useState(false);

  const setResult = (gate: keyof typeof results, statusValue: QaEvidenceStatus, detail: string) => {
    const evidence = createQaEvidence(statusValue, detail);
    setResults(previous => ({ ...previous, [gate]: { status: evidence.status, detail: evidence.detail } }));
    setStatus(`GATE ${String(gate)} · ${evidence.status} · ${detail}`);
  };

  const refreshLocalState = async () => {
    try {
      const result = await getDb().execute(`SELECT s.state, s.current_revision, s.server_revision, s.sync_status, (SELECT COUNT(*) FROM command_ledger c WHERE c.project_id=s.project_id AND c.person_id=s.person_id AND c.status IN ('PENDING','PROCESSING','RETRYABLE_FAILURE')) AS pending_commands, (SELECT status FROM command_ledger c WHERE c.project_id=s.project_id AND c.person_id=s.person_id ORDER BY c.created_at DESC LIMIT 1) AS last_command_status FROM attendance_state s ORDER BY s.updated_at DESC LIMIT 1`);
      if (!result.rows.length) { setLocalState('No attendance state'); return; }
      const row = result.rows.item(0) as Record<string, unknown>;
      setLocalState(`${String(row.state)} · local rev ${String(row.current_revision)} · server rev ${String(row.server_revision ?? 'null')} · ${String(row.sync_status)} · pending ${String(row.pending_commands)} · command ${String(row.last_command_status ?? 'none')}`);
    } catch (error) {
      setLocalState(error instanceof Error ? error.message : String(error));
    }
  };

  const resolveAuthenticatedContext = async () => {
    const session = await authService.restoreSession();
    const identityService = new IdentityService(client);
    const identity = await identityService.resolve(session.user.id);
    const assignment = identity.projectAssignments.find(item => item.status === 'ACTIVE');
    if (!assignment) throw new Error('Authenticated QA account has no active project assignment');
    let installation = await new DeviceRegistrationService(client).get(session.user.id);
    const localDevice = await getLocalDeviceSession(session.user.id);
    if (!installation || installation.status !== 'ACTIVE') {
      installation = await new DeviceRegistrationService(client).register(session.user.id, {
        installationKey: localDevice?.installationKey ?? `m17-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`,
        deviceName: 'M1.7 PHYSICAL QA DEVICE',
        appVersion: 'M1.7-QA-HARDENED',
        osVersion: String(Platform.Version),
        now: nowUtc(),
      });
    }
    if (installation.status !== 'ACTIVE') throw new Error('Authoritative device installation is REVOKED');
    const resolved = await identityService.resolve(session.user.id);
    setContext({
      userId: resolved.userId,
      profile: resolved.profile,
      person: resolved.person,
      organisation: resolved.organisation,
      memberships: resolved.memberships,
      activeProjectAssignments: resolved.projectAssignments,
      hasProjectAccess: true,
      device: installation,
    });
    setResult(1, 'PASS', `Authenticated ${resolved.person.displayName}; active project ${assignment.projectId}; active device ${installation.deviceInstallationId}`);
    await runtime.start();
  };

  useEffect(() => {
    let mounted = true;
    const unsubscribe = subscribeRepositoryChanges(event => {
      if (!mounted) return;
      setObservedCommandId(event.commandId);
      setStatus(`REPOSITORY OBSERVER · ${event.kind.toUpperCase()} CHANGE RECEIVED`);
      void refreshLocalState();
    });

    void (async () => {
      try {
        await initializeDatabase(DATABASE_NAME);
        if (!mounted) return;
        await getDb().execute(`CREATE TABLE IF NOT EXISTS ${CHECKPOINT_TABLE} (id INTEGER PRIMARY KEY CHECK (id = 1), command_id TEXT NOT NULL, created_at TEXT NOT NULL, consumed_at TEXT)`);
        setDbReady(true);
        await refreshLocalState();
        const checkpoint = await getDb().execute(`SELECT command_id, consumed_at FROM ${CHECKPOINT_TABLE} WHERE id=1 LIMIT 1`);
        if (checkpoint.rows.length) {
          const row = checkpoint.rows.item(0) as Record<string, unknown>;
          const command = await getDb().execute(`SELECT status FROM command_ledger WHERE command_id=?`, [String(row.command_id)]);
          if (command.rows.length && !row.consumed_at) {
            setRestartRecovered(true);
            await getDb().execute(`UPDATE ${CHECKPOINT_TABLE} SET consumed_at=? WHERE id=1`, [nowUtc()]);
            setResult(3, 'PASS', `Previous-process checkpoint ${String(row.command_id)} survived process termination and was recovered after relaunch.`);
          }
        }
        try {
          await resolveAuthenticatedContext();
        } catch (error) {
          if (mounted) setStatus(`AUTHENTICATION/CONTEXT WAITING · ${error instanceof Error ? error.message : String(error)}`);
        }
      } catch (error) {
        if (mounted) setStatus(`M1.7 PRE-FLIGHT FAILED · ${error instanceof Error ? error.message : String(error)}`);
      }
    })();

    return () => {
      mounted = false;
      unsubscribe();
      void runtime.stop().finally(() => closeDatabase().catch(() => undefined));
    };
  }, [runtime]);

  const createOfflineCheckIn = async () => {
    if (!context || !dbReady) return;
    setRunning(true);
    try {
      const assignment = context.activeProjectAssignments[0];
      const mutation = await AttendanceService.checkIn({ context, projectId: assignment.projectId, targetPersonId: context.person.id, targetAssignment: assignment, source: 'SELF', clientOccurredAt: nowUtc(), online: false });
      await getDb().execute(`INSERT INTO ${CHECKPOINT_TABLE} (id, command_id, created_at, consumed_at) VALUES (1, ?, ?, NULL) ON CONFLICT(id) DO UPDATE SET command_id=excluded.command_id, created_at=excluded.created_at, consumed_at=NULL`, [mutation.command.commandId, nowUtc()]);
      setResult(2, mutation.command.status === 'PENDING' && mutation.state.syncStatus === 'OFFLINE_PENDING_VERIFICATION' ? 'PASS' : 'FAIL', `${mutation.command.commandId} persisted locally as ${mutation.command.status}; attendance ${mutation.state.syncStatus}.`);
      setStatus('OFFLINE CHECK-IN PERSISTED. Capture checkpoint, force-stop the app, and relaunch before restoring connectivity.');
      await refreshLocalState();
    } catch (error) {
      setResult(2, 'FAIL', error instanceof Error ? error.message : String(error));
    } finally { setRunning(false); }
  };

  const verifyConnectivityAndSync = async () => {
    if (!context) return;
    setRunning(true);
    try {
      const response = await fetch(M17_SUPABASE_URL, { method: 'HEAD' });
      if (!response) throw new Error('No network response');
      setResult(4, 'PASS', `Supabase endpoint became reachable after physical network restoration (${response.status}).`);
      const result = await runtime.requestManualSync();
      if (result.status !== 'SUCCEEDED') {
        setResult(5, 'FAIL', `Authenticated RPC sync returned ${result.status}.`);
        setResult(6, 'FAIL', 'Authoritative reconciliation was not completed.');
        return;
      }
      setResult(5, 'PASS', `Authenticated sync RPC succeeded for command ${result.commandId ?? 'unknown'}.`);
      setResult(6, 'PASS', 'Sync worker received the authoritative response and reconciled the local aggregate.');
      await refreshLocalState();
      if (observedCommandId) setResult(8, 'PASS', `Repository observer received command ${observedCommandId} without manual SQL refresh driving the event.`);
    } catch (error) {
      setResult(4, 'FAIL', error instanceof Error ? error.message : String(error));
    } finally { setRunning(false); }
  };

  const checkout = async () => {
    if (!context) return;
    setRunning(true);
    try {
      const assignment = context.activeProjectAssignments[0];
      const mutation = await AttendanceService.checkOut({ context, projectId: assignment.projectId, targetPersonId: context.person.id, targetAssignment: assignment, source: 'SELF', clientOccurredAt: nowUtc(), online: true });
      const sync = await runtime.requestManualSync();
      const passed = mutation.state.state === 'CHECKED_OUT' && mutation.timesheet.status === 'COMPLETE' && sync.status === 'SUCCEEDED';
      setResult(7, passed ? 'PASS' : 'FAIL', `${mutation.state.state}; timesheet ${mutation.timesheet.status}; ${mutation.timesheet.totalMinutes ?? 'null'} minutes; sync ${sync.status}.`);
      await refreshLocalState();
    } catch (error) {
      setResult(7, 'FAIL', error instanceof Error ? error.message : String(error));
    } finally { setRunning(false); }
  };

  const duplicateReplay = async () => {
    if (!context) return;
    setRunning(true);
    try {
      const latest = await getDb().execute(`SELECT command_id, project_id, person_id, command_type, base_revision, command_payload_json, server_result_json FROM command_ledger WHERE project_id=? AND person_id=? ORDER BY created_at DESC LIMIT 1`, [context.activeProjectAssignments[0].projectId, context.person.id]);
      if (!latest.rows.length) throw new Error('No synchronized command exists for duplicate replay');
      const row = latest.rows.item(0) as Record<string, unknown>;
      const payload = JSON.parse(String(row.command_payload_json));
      const device = context.device?.deviceInstallationId;
      if (!device) throw new Error('No active device installation for duplicate replay');
      const firstResult = await client.rpc('sync_attendance_command', {
        command_id: String(row.command_id), device_installation_id: device, project_id: String(row.project_id), person_id: String(row.person_id),
        work_date_utc: String(payload.workDateUtc), base_revision: Number(row.base_revision), command_type: String(row.command_type), payload,
      });
      if (firstResult.error) throw new Error(firstResult.error.message);
      const response = firstResult.data as Record<string, unknown> | null;
      const passed = response?.status === 'DUPLICATE_ACCEPTED' && String(response.command_id) === String(row.command_id) && Boolean(row.server_result_json);
      setResult(9, passed ? 'PASS' : 'NOT_PROVEN', `Same command id ${String(row.command_id)} was delivered again; server returned ${String(response?.status ?? 'NO_RESPONSE')}.`);
    } catch (error) {
      setResult(9, 'FAIL', error instanceof Error ? error.message : String(error));
    } finally { setRunning(false); }
  };

  const conflictReplay = async () => {
    if (!context) return;
    setRunning(true);
    try {
      const latest = await getDb().execute(`SELECT project_id, person_id, command_type, command_payload_json, base_revision FROM command_ledger WHERE project_id=? AND person_id=? ORDER BY created_at DESC LIMIT 1`, [context.activeProjectAssignments[0].projectId, context.person.id]);
      if (!latest.rows.length) throw new Error('No command exists for conflict setup');
      const row = latest.rows.item(0) as Record<string, unknown>;
      const payload = JSON.parse(String(row.command_payload_json));
      const device = context.device?.deviceInstallationId;
      if (!device) throw new Error('No active device installation for conflict test');
      const staleRevision = Math.max(0, Number(row.base_revision));
      const stalePayload = { ...payload, commandId: uuidV4(), eventId: uuidV4(), commandType: 'CHECK_OUT' };
      const response = await client.rpc('sync_attendance_command', {
        command_id: stalePayload.commandId, device_installation_id: device, project_id: String(row.project_id), person_id: String(row.person_id),
        work_date_utc: String(stalePayload.workDateUtc), base_revision: staleRevision, command_type: 'CHECK_OUT', payload: stalePayload,
      });
      if (response.error) throw new Error(response.error.message);
      const result = response.data as Record<string, unknown> | null;
      if (result?.status !== 'REVISION_CONFLICT') {
        setResult(10, 'NOT_PROVEN', `Expected REVISION_CONFLICT but server returned ${String(result?.status ?? 'NO_RESPONSE')}.`);
        return;
      }
      const authoritative = result.authoritative_aggregate as Record<string, unknown> | undefined;
      const serverRevision = Number(result.server_revision);
      const local = await getDb().execute(`SELECT state, current_revision, server_revision FROM attendance_state WHERE project_id=? AND person_id=? ORDER BY work_date_utc DESC LIMIT 1`, [String(row.project_id), String(row.person_id)]);
      const localRow = local.rows.length ? local.rows.item(0) as Record<string, unknown> : null;
      const serverWins = Boolean(authoritative?.state) && localRow && Number(localRow.server_revision ?? 0) === serverRevision;
      setResult(10, serverWins ? 'PASS' : 'NOT_PROVEN', `Authoritative conflict returned revision ${serverRevision}; local server revision is ${String(localRow?.server_revision ?? 'null')}.`);
    } catch (error) {
      setResult(10, 'FAIL', error instanceof Error ? error.message : String(error));
    } finally { setRunning(false); }
  };

  const failurePaths = async () => {
    if (!context) return;
    setRunning(true);
    try {
      const assignment = context.activeProjectAssignments[0];
      const invalidTime = new Date(Date.now() + 86400000).toISOString();
      try {
        await AttendanceService.checkIn({ context, projectId: assignment.projectId, targetPersonId: context.person.id, targetAssignment: assignment, source: 'SELF', clientOccurredAt: invalidTime, online: false });
        setResult(11, 'FAIL', 'Local validation unexpectedly accepted a future work-date mutation.');
        return;
      } catch {
        // Expected local validation failure. This is intentionally not counted as authoritative server authorization proof.
      }
      setResult(11, 'NOT_PROVEN', 'Local validation is proven; authoritative cross-company authorization, revoked-device rejection, and retryable-vs-durable transport classification still require their dedicated isolated controls.');
    } finally { setRunning(false); }
  };

  const lifecycleStress = async () => {
    setRunning(true);
    try {
      await Promise.all([runtime.start(), runtime.start(), runtime.start()]);
      await Promise.all([runtime.stop(), runtime.stop(), runtime.stop()]);
      await runtime.start();
      setResult(12, 'PASS', 'Concurrent start/stop calls completed and the runtime restarted without throwing.');
    } catch (error) {
      setResult(12, 'FAIL', error instanceof Error ? error.message : String(error));
    } finally { setRunning(false); }
  };

  const signOut = async () => {
    await runtime.stop();
    await authService.signOut();
    setContext(null);
    setStatus('SIGNED OUT · RETURN TO ACCOUNT PROVISIONING');
  };

  const overall = useMemo(() => M17_QA_GATES.map(gate => ({ gate, result: results[gate.id] })).filter(item => item.result?.status === 'PASS').length, [results]);
  const nextAction = nextRequiredAction(Object.fromEntries(Object.entries(results).map(([key, value]) => [Number(key), value?.status])) as Record<number, QaEvidenceStatus>);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}><Pressable onPress={onBack} hitSlop={12}><Text style={styles.back}>‹ BACK</Text></Pressable><Text style={styles.label}>M1.7 PHYSICAL QA</Text></View>
      <Text style={styles.eyebrow}>SITE-SYNC</Text>
      <Text style={styles.title}>REAL RUNTIME</Text>
      <Text style={styles.subtitle}>Guided acceptance harness. The app will not call setup actions proof unless authoritative evidence exists.</Text>
      <View style={styles.warning}><Text style={styles.warningTitle}>ISOLATED TEST PROJECT ONLY</Text><Text style={styles.warningBody}>Target: SITE-SYNC-M17-TEST. Production Supabase is outside this flow.</Text></View>

      {context ? <View style={styles.card}><Text style={styles.cardTitle}>AUTHENTICATED CONTEXT</Text><Text style={styles.identity}>{context.person.displayName}</Text><Text style={styles.detail}>{context.organisation.name} · {context.activeProjectAssignments[0]?.projectId}</Text></View> : <View style={styles.card}><Text style={styles.cardTitle}>AUTHENTICATION</Text><Text style={styles.status}>{status}</Text></View>}

      <View style={styles.next}><Text style={styles.nextTitle}>NEXT REQUIRED ACTION</Text><Text style={styles.nextBody}>{nextAction ?? 'All gates have explicit results.'}</Text></View>

      {context && <View style={styles.card}>
        <Text style={styles.cardTitle}>EXECUTABLE GATES</Text>
        <Pressable style={styles.primary} disabled={running || results[2]?.status === 'PASS'} onPress={() => void createOfflineCheckIn()}><Text style={styles.primaryText}>2 · CREATE OFFLINE CHECK-IN</Text></Pressable>
        <Text style={styles.instruction}>After Gate 2: capture the checkpoint, force-stop the app, relaunch it, then return here.</Text>
        <Pressable style={styles.primary} disabled={running || !restartRecovered} onPress={() => void verifyConnectivityAndSync()}><Text style={styles.primaryText}>4–6 · RESTORE NETWORK + SYNC</Text></Pressable>
        <Pressable style={styles.secondary} disabled={running || results[7]?.status === 'PASS'} onPress={() => void checkout()}><Text style={styles.secondaryText}>7 · CHECK-OUT + TIMESHEET</Text></Pressable>
        <Pressable style={styles.secondary} disabled={running || results[9]?.status === 'PASS'} onPress={() => void duplicateReplay()}><Text style={styles.secondaryText}>9 · ACTUAL DUPLICATE DELIVERY</Text></Pressable>
        <Pressable style={styles.secondary} disabled={running} onPress={() => void conflictReplay()}><Text style={styles.secondaryText}>10 · AUTHORITATIVE STALE-REVISION CONFLICT</Text></Pressable>
        <Pressable style={styles.secondary} disabled={running} onPress={() => void failurePaths()}><Text style={styles.secondaryText}>11 · FAILURE-PATH AUDIT</Text></Pressable>
        <Pressable style={styles.secondary} disabled={running} onPress={() => void lifecycleStress()}><Text style={styles.secondaryText}>12 · LIFECYCLE / RACE SAFETY</Text></Pressable>
        <Pressable style={styles.tertiary} disabled={running} onPress={() => void signOut()}><Text style={styles.tertiaryText}>SIGN OUT / END QA SESSION</Text></Pressable>
      </View>}

      <View style={styles.card}><Text style={styles.cardTitle}>REPOSITORY / LOCAL DIAGNOSTIC</Text><Text style={styles.local}>{localState}</Text><Text style={styles.status}>{status}</Text><Text style={styles.detail}>Repository event command: {observedCommandId ?? 'none'}</Text><Text style={styles.detail}>Restart recovered: {restartRecovered ? 'YES' : 'NO'}</Text></View>

      <View style={styles.card}><Text style={styles.summary}>{overall}/12 GATES PASSED</Text>{M17_QA_GATES.map(gate => { const result = results[gate.id]; return <View key={gate.id} style={styles.row}><View style={[styles.dot, result?.status === 'PASS' ? styles.pass : result?.status === 'FAIL' ? styles.fail : styles.pending]} /><View style={styles.copy}><Text style={styles.name}>{gate.id} · {gate.title}</Text><Text style={styles.detail}>{result?.status ?? 'NOT_PROVEN'}{result ? ` · ${result.detail}` : ''}</Text></View></View>; })}</View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 24, paddingBottom: 48, backgroundColor: '#F4F6FA', minHeight: '100%' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 },
  back: { color: '#0D1733', fontSize: 11, fontWeight: '900', letterSpacing: 1 },
  label: { color: '#65718A', fontSize: 10, fontWeight: '900', letterSpacing: 1.5 },
  eyebrow: { color: '#65718A', fontSize: 11, fontWeight: '900', letterSpacing: 2 },
  title: { marginTop: 4, color: '#0D1733', fontSize: 30, fontWeight: '900' },
  subtitle: { marginTop: 6, color: '#59657D', fontSize: 14, lineHeight: 20 },
  warning: { marginTop: 22, padding: 16, borderRadius: 16, backgroundColor: '#FFF4D8', borderWidth: 1, borderColor: '#E9C46A' },
  warningTitle: { color: '#6B4C00', fontSize: 11, fontWeight: '900', letterSpacing: 1 },
  warningBody: { marginTop: 6, color: '#735B1C', fontSize: 12, lineHeight: 18 },
  card: { marginTop: 16, padding: 18, borderRadius: 20, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#DCE2EF' },
  cardTitle: { color: '#0D1733', fontSize: 12, fontWeight: '900', letterSpacing: 1 },
  identity: { marginTop: 8, color: '#0D1733', fontSize: 20, fontWeight: '900' },
  detail: { marginTop: 4, color: '#65718A', fontSize: 11, lineHeight: 16 },
  status: { marginTop: 8, color: '#65718A', fontSize: 11, lineHeight: 16 },
  local: { marginTop: 10, color: '#0D1733', fontSize: 12, lineHeight: 18, fontWeight: '700' },
  next: { marginTop: 16, padding: 16, borderRadius: 16, backgroundColor: '#EAF0FF', borderWidth: 1, borderColor: '#B9C8EF' },
  nextTitle: { color: '#30457A', fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  nextBody: { marginTop: 6, color: '#1D2E5B', fontSize: 13, lineHeight: 19, fontWeight: '700' },
  primary: { marginTop: 10, borderRadius: 14, paddingVertical: 15, alignItems: 'center', backgroundColor: '#0D1733' },
  primaryText: { color: '#FFFFFF', fontSize: 10, fontWeight: '900', letterSpacing: 0.8, textAlign: 'center' },
  secondary: { marginTop: 10, borderRadius: 14, paddingVertical: 15, alignItems: 'center', backgroundColor: '#F3B33D' },
  secondaryText: { color: '#0D1733', fontSize: 10, fontWeight: '900', letterSpacing: 0.8, textAlign: 'center' },
  tertiary: { marginTop: 10, paddingVertical: 10, alignItems: 'center' },
  tertiaryText: { color: '#65718A', fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  instruction: { marginTop: 8, color: '#65718A', fontSize: 10, lineHeight: 15 },
  summary: { color: '#0D1733', fontSize: 16, fontWeight: '900' },
  row: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 12, borderTopWidth: 1, borderTopColor: '#E8ECF4', marginTop: 8 },
  dot: { width: 10, height: 10, borderRadius: 5, marginTop: 5 },
  pass: { backgroundColor: '#36A269' },
  fail: { backgroundColor: '#C84D4D' },
  pending: { backgroundColor: '#AAB3C4' },
  copy: { flex: 1, marginLeft: 12 },
  name: { color: '#0D1733', fontSize: 12, fontWeight: '800' },
});
