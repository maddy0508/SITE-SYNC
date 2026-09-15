import React, { useEffect, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { AuthService } from '../auth/authService';
import { AttendanceService } from './attendanceService';
import { closeDatabase, getDb, initializeDatabase, getLocalDeviceSession } from '../database/localPersistence';
import { subscribeRepositoryChanges } from '../database/repositoryChangeBus';
import { DeviceRegistrationService } from '../identity/deviceRegistrationService';
import { IdentityService } from '../identity/identityService';
import type { ApplicationContext } from '../identity/projectContext';
import type { SyncRuntime } from '../sync/syncRuntime';
import type { SupabaseClient } from '@supabase/supabase-js';

type QaResult = { id: number; label: string; detail: string; passed: boolean };
const DATABASE_NAME = 'm17-real-runtime-device.db';

function nowUtc(): string { return new Date().toISOString(); }
function uuidV4(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, character => {
    const random = Math.floor(Math.random() * 16);
    const value = character === 'x' ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });
}
function makeInstallationKey(): string { return `m17-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`; }
function requireDevice(context: ApplicationContext): NonNullable<ApplicationContext['device']> {
  if (!context.device) throw new Error('Authoritative QA device is unavailable');
  return context.device;
}

interface M17RealRuntimeQaScreenProps {
  onBack: () => void;
  authService: AuthService;
  client: SupabaseClient;
  runtime: Pick<SyncRuntime, 'start' | 'stop' | 'requestManualSync'>;
}

export function M17RealRuntimeQaScreen({ onBack, authService, client, runtime }: M17RealRuntimeQaScreenProps) {
  const [context, setContext] = useState<ApplicationContext | null>(null);
  const [running, setRunning] = useState(false);
  const [dbReady, setDbReady] = useState(false);
  const [results, setResults] = useState<QaResult[]>([]);
  const [status, setStatus] = useState('Initialising isolated M1.7 runtime…');
  const [localState, setLocalState] = useState('No local attendance state loaded');
  const [observedAt, setObservedAt] = useState<string | null>(null);
  const [restartCheckpoint, setRestartCheckpoint] = useState('Not captured');

  const addResult = (label: string, detail: string, passed: boolean) => {
    setResults(previous => [...previous, { id: Date.now() + previous.length, label, detail, passed }]);
  };

  const refreshLocalState = async () => {
    try {
      const result = await getDb().execute(`SELECT s.state, s.current_revision, s.server_revision, s.sync_status, (SELECT COUNT(*) FROM command_ledger c WHERE c.project_id=s.project_id AND c.person_id=s.person_id AND c.status IN ('PENDING','PROCESSING','RETRYABLE_FAILURE')) AS pending_commands, (SELECT status FROM command_ledger c WHERE c.project_id=s.project_id AND c.person_id=s.person_id ORDER BY c.created_at DESC LIMIT 1) AS last_command_status FROM attendance_state s ORDER BY s.updated_at DESC LIMIT 1`);
      if (result.rows.length === 0) {
        setLocalState('No attendance state');
        return;
      }
      const row = result.rows.item(0) as Record<string, unknown>;
      setLocalState(`${String(row.state)} · local rev ${String(row.current_revision)} · server rev ${String(row.server_revision ?? 'null')} · ${String(row.sync_status)} · pending ${String(row.pending_commands)} · command ${String(row.last_command_status ?? 'none')}`);
    } catch (error) {
      setLocalState(error instanceof Error ? error.message : String(error));
    }
  };

  useEffect(() => {
    let mounted = true;
    const unsubscribe = subscribeRepositoryChanges(event => {
      if (!mounted) return;
      setObservedAt(event.at);
      setStatus(`REPOSITORY OBSERVER · ${event.kind.toUpperCase()} CHANGE RECEIVED`);
      void refreshLocalState();
    });

    void initializeDatabase(DATABASE_NAME)
      .then(async () => {
        if (!mounted) return;
        setDbReady(true);
        const session = await authService.restoreSession();
        const identityService = new IdentityService(client);
        const identity = await identityService.resolve(session.user.id);
        const activeAssignment = identity.projectAssignments.find(assignment => assignment.status === 'ACTIVE');
        if (!activeAssignment) throw new Error('Authenticated QA identity has no active project assignment');

        const deviceService = new DeviceRegistrationService(client);
        let installation = await deviceService.get(session.user.id);
        const localDevice = await getLocalDeviceSession(session.user.id);
        if (!installation) {
          installation = await deviceService.register(session.user.id, {
            installationKey: localDevice?.installationKey ?? makeInstallationKey(),
            deviceName: 'M1.7 PHYSICAL QA DEVICE',
            appVersion: 'M1.7-QA',
            osVersion: String(Platform.Version),
            now: nowUtc(),
          });
        }
        if (installation.status !== 'ACTIVE') throw new Error('Authoritative QA device is REVOKED; restore a clean test device before pre-flight');

        const resolved = await identityService.resolve(session.user.id);
        if (!resolved.projectAssignments.some(assignment => assignment.status === 'ACTIVE')) throw new Error('Active project assignment disappeared during identity resolution');
        if (!mounted) return;
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
        setStatus(`READY · ${resolved.person.displayName} · ${activeAssignment.projectId} · device ${installation.id}`);
        addResult('1 · Automatic identity/context/device provisioning', 'Restored the existing authenticated session, resolved authoritative identity/project access, and verified or registered the isolated QA device without tester-entered credentials.', true);
        await refreshLocalState();
      })
      .catch(error => {
        if (!mounted) return;
        setDbReady(false);
        addResult('1 · Automatic identity/context/device provisioning', error instanceof Error ? error.message : String(error), false);
        setStatus('PRE-FLIGHT FAILED');
      });

    return () => {
      mounted = false;
      unsubscribe();
      void runtime.stop().finally(() => closeDatabase().catch(() => undefined));
    };
  }, [authService, client, runtime]);

  const createCheckIn = async () => {
    if (!context) { setStatus('Pre-flight has not established context'); return; }
    const assignment = context.activeProjectAssignments.find(item => item.status === 'ACTIVE');
    if (!assignment) { setStatus('No active assignment'); return; }
    setRunning(true);
    try {
      const mutation = await AttendanceService.checkIn({ context, projectId: assignment.projectId, targetPersonId: context.person.id, targetAssignment: assignment, source: 'SELF', clientOccurredAt: nowUtc(), online: false });
      const passed = mutation.command.status === 'PENDING' && mutation.state.syncStatus === 'OFFLINE_PENDING_VERIFICATION';
      addResult('2 · Offline durable attendance command', `${mutation.command.commandId} · ${mutation.command.status} · ${mutation.state.syncStatus}`, passed);
      setStatus(passed ? 'OFFLINE COMMAND DURABLY PERSISTED' : 'OFFLINE COMMAND DID NOT ENTER REQUIRED STATE');
      await refreshLocalState();
    } catch (error) {
      addResult('2 · Offline durable attendance command', error instanceof Error ? error.message : String(error), false);
    } finally { setRunning(false); }
  };

  const captureRestartCheckpoint = async () => {
    try {
      const result = await getDb().execute(`SELECT command_id, status, attempt_count FROM command_ledger ORDER BY created_at DESC LIMIT 1`);
      if (result.rows.length === 0) throw new Error('No durable command exists before restart checkpoint');
      const row = result.rows.item(0) as Record<string, unknown>;
      const checkpoint = `${String(row.command_id)} · ${String(row.status)} · attempts ${String(row.attempt_count)}`;
      setRestartCheckpoint(checkpoint);
      addResult('3 · Process-termination persistence checkpoint', `SQLite checkpoint captured: ${checkpoint}. Physically terminate and reopen the app before running SYNC.`, true);
      setStatus('RESTART CHECKPOINT CAPTURED');
    } catch (error) {
      addResult('3 · Process-termination persistence checkpoint', error instanceof Error ? error.message : String(error), false);
    }
  };

  const syncPending = async (label = '4 · Real RPC sync / retry / reconciliation') => {
    if (!context) { setStatus('Pre-flight has not established context'); return; }
    setRunning(true);
    try {
      await runtime.start();
      const result = await runtime.requestManualSync();
      const passed = result.status === 'SUCCEEDED';
      addResult(label, JSON.stringify(result), passed);
      setStatus(passed ? 'AUTHORITATIVE SERVER STATE RECONCILED INTO SQLITE' : 'SYNC DID NOT SUCCEED');
      await refreshLocalState();
    } catch (error) {
      addResult(label, error instanceof Error ? error.message : String(error), false);
      setStatus('SYNC FAILED');
    } finally { setRunning(false); }
  };

  const checkout = async () => {
    if (!context) { setStatus('Pre-flight has not established context'); return; }
    const assignment = context.activeProjectAssignments.find(item => item.status === 'ACTIVE');
    if (!assignment) return;
    setRunning(true);
    try {
      const mutation = await AttendanceService.checkOut({ context, projectId: assignment.projectId, targetPersonId: context.person.id, targetAssignment: assignment, source: 'SELF', clientOccurredAt: nowUtc(), online: false });
      const passed = mutation.state.state === 'CHECKED_OUT' && mutation.timesheet.status === 'COMPLETE';
      addResult('5 · Check-out and timesheet derivation', `${mutation.state.state} · timesheet ${mutation.timesheet.status} · ${mutation.timesheet.totalMinutes ?? 'null'} minutes · ${mutation.timesheet.syncStatus}`, passed);
      await refreshLocalState();
    } catch (error) {
      addResult('5 · Check-out and timesheet derivation', error instanceof Error ? error.message : String(error), false);
    } finally { setRunning(false); }
  };

  const latestCommand = async () => {
    const result = await getDb().execute(`SELECT command_id, project_id, person_id, work_date_utc, base_revision, command_type, command_payload_json, status, server_result_json FROM command_ledger ORDER BY created_at DESC LIMIT 1`);
    if (result.rows.length === 0) throw new Error('No command exists in local ledger');
    return result.rows.item(0) as Record<string, unknown>;
  };

  const rpc = async (args: Record<string, unknown>) => {
    const response = await client.rpc('sync_attendance_command', args);
    if (response.error) throw new Error(`${response.error.code ?? 'RPC_ERROR'}: ${response.error.message}`);
    if (!response.data || typeof response.data !== 'object') throw new Error('RPC returned no structured response');
    return response.data as Record<string, unknown>;
  };

  const duplicateReplay = async () => {
    if (!context) return;
    setRunning(true);
    try {
      const row = await latestCommand();
      if (String(row.status) !== 'SUCCEEDED') throw new Error(`Latest command is ${String(row.status)}; sync a command successfully before replay`);
      const payload = JSON.parse(String(row.command_payload_json)) as Record<string, unknown>;
      const response = await rpc({
        command_id: String(row.command_id),
        device_installation_id: requireDevice(context).id,
        project_id: String(row.project_id),
        person_id: String(row.person_id),
        work_date_utc: String(row.work_date_utc),
        base_revision: Number(row.base_revision),
        command_type: String(row.command_type),
        payload,
      });
      const passed = response.status === 'DUPLICATE_ACCEPTED' && response.command_id === row.command_id;
      addResult('6 · Same-command duplicate replay', JSON.stringify(response), passed);
      setStatus(passed ? 'REAL RPC DUPLICATE ACCEPTED WITH ORIGINAL COMMAND ID' : 'DUPLICATE REPLAY NOT PROVEN');
    } catch (error) {
      addResult('6 · Same-command duplicate replay', error instanceof Error ? error.message : String(error), false);
    } finally { setRunning(false); }
  };

  const revisionConflict = async () => {
    if (!context) return;
    setRunning(true);
    try {
      const row = await latestCommand();
      const payload = JSON.parse(String(row.command_payload_json)) as Record<string, unknown>;
      const currentRevision = Number(row.base_revision) + 1;
      const staleRevision = Math.max(0, currentRevision - 1);
      const commandId = uuidV4();
      const eventId = uuidV4();
      const conflictPayload = { ...payload, commandId, eventId, baseRevision: staleRevision };
      const response = await rpc({
        command_id: commandId,
        device_installation_id: requireDevice(context).id,
        project_id: String(row.project_id),
        person_id: String(row.person_id),
        work_date_utc: String(row.work_date_utc),
        base_revision: staleRevision,
        command_type: String(row.command_type),
        payload: conflictPayload,
      });
      const passed = response.status === 'REVISION_CONFLICT' && response.command_id === commandId;
      addResult('7 · Server-side revision conflict', JSON.stringify(response), passed);
      setStatus(passed ? 'REAL SERVER CONFLICT RETURNED — AUTHORITATIVE STATE PRESERVED' : 'REVISION CONFLICT NOT PROVEN');
    } catch (error) {
      addResult('7 · Server-side revision conflict', error instanceof Error ? error.message : String(error), false);
    } finally { setRunning(false); }
  };

  const serverValidation = async () => {
    if (!context) return;
    setRunning(true);
    try {
      const row = await latestCommand();
      const payload = JSON.parse(String(row.command_payload_json)) as Record<string, unknown>;
      const commandId = uuidV4();
      const invalidPayload = { ...payload, commandId: uuidV4(), eventId: uuidV4() };
      const response = await rpc({
        command_id: commandId,
        device_installation_id: requireDevice(context).id,
        project_id: String(row.project_id),
        person_id: String(row.person_id),
        work_date_utc: String(row.work_date_utc),
        base_revision: Number(row.base_revision),
        command_type: String(row.command_type),
        payload: invalidPayload,
      });
      const passed = response.status === 'VALIDATION_REJECTED';
      addResult('8 · Server-side payload validation', JSON.stringify(response), passed);
      setStatus(passed ? 'SERVER REJECTED INVALID PAYLOAD' : 'SERVER VALIDATION REJECTION NOT PROVEN');
    } catch (error) {
      addResult('8 · Server-side payload validation', error instanceof Error ? error.message : String(error), false);
    } finally { setRunning(false); }
  };

  const authorizationProbe = async () => {
    if (!context) return;
    setRunning(true);
    try {
      const assignment = context.activeProjectAssignments.find(item => item.status === 'ACTIVE');
      if (!assignment) throw new Error('No active project assignment');
      const commandId = uuidV4();
      const eventId = uuidV4();
      const targetPersonId = uuidV4();
      const payload = {
        commandId,
        eventId,
        projectId: assignment.projectId,
        personId: targetPersonId,
        workDateUtc: new Date().toISOString().slice(0, 10),
        commandType: 'CHECK_IN',
        projectAssignmentId: uuidV4(),
        source: 'SELF',
        clientOccurredAt: nowUtc(),
        baseRevision: 0,
      };
      const response = await rpc({
        command_id: commandId,
        device_installation_id: requireDevice(context).id,
        project_id: assignment.projectId,
        person_id: targetPersonId,
        work_date_utc: payload.workDateUtc,
        base_revision: 0,
        command_type: 'CHECK_IN',
        payload,
      });
      const passed = response.status === 'AUTHORIZATION_REJECTED';
      addResult('9 · Server authorization boundary', JSON.stringify(response), passed);
      setStatus(passed ? 'SERVER REJECTED UNAUTHORIZED TARGET AGGREGATE' : 'AUTHORIZATION REJECTION NOT PROVEN');
    } catch (error) {
      addResult('9 · Server authorization boundary', error instanceof Error ? error.message : String(error), false);
    } finally { setRunning(false); }
  };

  const lifecycleStress = async () => {
    setRunning(true);
    try {
      await Promise.all([runtime.start(), runtime.start(), runtime.start()]);
      await Promise.all([runtime.stop(), runtime.stop(), runtime.stop()]);
      await runtime.start();
      addResult('10 · Sync lifecycle/race safety', 'Concurrent start/stop calls completed without throwing and the runtime restarted successfully.', true);
    } catch (error) {
      addResult('10 · Sync lifecycle/race safety', error instanceof Error ? error.message : String(error), false);
    } finally { setRunning(false); }
  };

  const revokeAndProbe = async () => {
    if (!context) return;
    setRunning(true);
    try {
      const service = new DeviceRegistrationService(client);
      const localDevice = await getLocalDeviceSession(context.userId);
      if (!localDevice) throw new Error('No authoritative local device session exists');
      const revoked = await service.revoke(context.userId, localDevice.revision, nowUtc());
      const row = await latestCommand();
      const payload = JSON.parse(String(row.command_payload_json)) as Record<string, unknown>;
      const response = await rpc({
        command_id: uuidV4(),
        device_installation_id: revoked.id,
        project_id: String(row.project_id),
        person_id: String(row.person_id),
        work_date_utc: String(row.work_date_utc),
        base_revision: Number(row.base_revision),
        command_type: String(row.command_type),
        payload: { ...payload, commandId: uuidV4(), eventId: uuidV4() },
      });
      const passed = response.status === 'DEVICE_REVOKED';
      addResult('11 · Revoked-device server enforcement', `Device=${revoked.id} · RPC=${JSON.stringify(response)}`, passed);
      setStatus(passed ? 'REAL RPC REJECTED THE REVOKED DEVICE' : 'REVOKED-DEVICE ENFORCEMENT NOT PROVEN');
    } catch (error) {
      addResult('11 · Revoked-device server enforcement', error instanceof Error ? error.message : String(error), false);
    } finally { setRunning(false); }
  };

  const signOut = async () => {
    await runtime.stop();
    await authService.signOut();
    setContext(null);
    setStatus('SIGNED OUT');
  };

  const passed = results.filter(result => result.passed).length;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={onBack} hitSlop={12}><Text style={styles.back}>‹ BACK</Text></Pressable>
        <Text style={styles.label}>M1.7 PHYSICAL QA</Text>
      </View>
      <Text style={styles.eyebrow}>SITE-SYNC</Text>
      <Text style={styles.title}>REAL RUNTIME</Text>
      <Text style={styles.subtitle}>Acceptance harness using the authenticated app session, durable local state and the real isolated Supabase RPC boundary.</Text>
      <View style={styles.warning}>
        <Text style={styles.warningTitle}>ISOLATED TEST PROJECT ONLY</Text>
        <Text style={styles.warningBody}>This harness never contains production credentials and never uses the production Supabase project. Authentication is inherited from the app session.</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>PRE-FLIGHT</Text>
        <Text style={styles.identity}>{context ? context.person.displayName : 'Restoring authenticated session…'}</Text>
        <Text style={styles.detail}>{context ? `${context.organisation.name} · ${context.activeProjectAssignments[0]?.projectId} · device ${requireDevice(context).id}` : status}</Text>
        <Text style={styles.detail}>{dbReady ? 'SQLite ready' : 'SQLite initialising'}</Text>
      </View>

      {context && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>EXECUTABLE ACCEPTANCE CONTROLS</Text>
          <Pressable style={styles.primary} disabled={running} onPress={createCheckIn}><Text style={styles.primaryText}>2 · CREATE OFFLINE CHECK-IN</Text></Pressable>
          <Pressable style={styles.secondary} disabled={running} onPress={captureRestartCheckpoint}><Text style={styles.secondaryText}>3 · CAPTURE RESTART CHECKPOINT</Text></Pressable>
          <Pressable style={styles.primary} disabled={running} onPress={() => void syncPending()}><Text style={styles.primaryText}>4 · REAL RPC SYNC / RECONCILE</Text></Pressable>
          <Pressable style={styles.secondary} disabled={running} onPress={checkout}><Text style={styles.secondaryText}>5 · OFFLINE CHECK-OUT / TIMESHEET</Text></Pressable>
          <Pressable style={styles.secondary} disabled={running} onPress={duplicateReplay}><Text style={styles.secondaryText}>6 · SAME-COMMAND DUPLICATE REPLAY</Text></Pressable>
          <Pressable style={styles.secondary} disabled={running} onPress={revisionConflict}><Text style={styles.secondaryText}>7 · SERVER REVISION CONFLICT</Text></Pressable>
          <Pressable style={styles.secondary} disabled={running} onPress={serverValidation}><Text style={styles.secondaryText}>8 · SERVER PAYLOAD VALIDATION</Text></Pressable>
          <Pressable style={styles.secondary} disabled={running} onPress={authorizationProbe}><Text style={styles.secondaryText}>9 · SERVER AUTHORIZATION REJECTION</Text></Pressable>
          <Pressable style={styles.secondary} disabled={running} onPress={lifecycleStress}><Text style={styles.secondaryText}>10 · LIFECYCLE START / STOP RACE</Text></Pressable>
          <Pressable style={styles.secondary} disabled={running} onPress={revokeAndProbe}><Text style={styles.secondaryText}>11 · REVOKE DEVICE / VERIFY RPC REJECTION</Text></Pressable>
          <Pressable style={styles.tertiary} disabled={running} onPress={signOut}><Text style={styles.tertiaryText}>SIGN OUT / STOP RUNTIME</Text></Pressable>
        </View>
      )}

      <View style={styles.card}>
        <Text style={styles.cardTitle}>REPOSITORY-DRIVEN OBSERVATION</Text>
        <Text style={styles.local}>{localState}</Text>
        <Text style={styles.status}>{status}</Text>
        <Text style={styles.detail}>Restart checkpoint: {restartCheckpoint}</Text>
        {observedAt && <Text style={styles.detail}>Last repository event: {observedAt}</Text>}
      </View>

      {results.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.summary}>{passed}/{results.length} OBSERVATIONS PASSED</Text>
          {results.map(result => (
            <View key={result.id} style={styles.row}>
              <View style={[styles.dot, result.passed ? styles.pass : styles.fail]} />
              <View style={styles.copy}>
                <Text style={styles.name}>{result.label}</Text>
                <Text style={styles.detail}>{result.detail}</Text>
              </View>
            </View>
          ))}
        </View>
      )}
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
  primary: { marginTop: 10, borderRadius: 14, paddingVertical: 15, alignItems: 'center', backgroundColor: '#0D1733' },
  primaryText: { color: '#FFFFFF', fontSize: 10, fontWeight: '900', letterSpacing: 0.8, textAlign: 'center' },
  secondary: { marginTop: 10, borderRadius: 14, paddingVertical: 15, alignItems: 'center', backgroundColor: '#F3B33D' },
  secondaryText: { color: '#0D1733', fontSize: 10, fontWeight: '900', letterSpacing: 0.8, textAlign: 'center' },
  tertiary: { marginTop: 10, paddingVertical: 10, alignItems: 'center' },
  tertiaryText: { color: '#65718A', fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  identity: { marginTop: 8, color: '#0D1733', fontSize: 20, fontWeight: '900' },
  detail: { marginTop: 4, color: '#65718A', fontSize: 11, lineHeight: 16 },
  local: { marginTop: 10, color: '#0D1733', fontSize: 12, lineHeight: 18, fontWeight: '700' },
  status: { marginTop: 8, color: '#65718A', fontSize: 11, lineHeight: 16 },
  summary: { color: '#0D1733', fontSize: 16, fontWeight: '900' },
  row: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 12, borderTopWidth: 1, borderTopColor: '#E8ECF4', marginTop: 8 },
  dot: { width: 10, height: 10, borderRadius: 5, marginTop: 5 },
  pass: { backgroundColor: '#36A269' },
  fail: { backgroundColor: '#C84D4D' },
  copy: { flex: 1, marginLeft: 12 },
  name: { color: '#0D1733', fontSize: 12, fontWeight: '800' },
});
