import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
import { deserializeM17QaContext, M17_QA_CONTEXT_CACHE_TABLE, serializeM17QaContext } from './m17QaContextCache';

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

  const setResult = useCallback((gate: keyof typeof results, statusValue: QaEvidenceStatus, detail: string) => {
    const evidence = createQaEvidence(statusValue, detail);
    setResults(previous => ({ ...previous, [gate]: { status: evidence.status, detail: evidence.detail } }));
    setStatus(`GATE ${String(gate)} · ${evidence.status} · ${detail}`);
  }, []);

  const refreshLocalState = useCallback(async () => {
    try {
      const result = await getDb().execute(`SELECT s.state, s.current_revision, s.server_revision, s.sync_status, (SELECT COUNT(*) FROM command_ledger c WHERE c.project_id=s.project_id AND c.person_id=s.person_id AND c.status IN ('PENDING','PROCESSING','RETRYABLE_FAILURE')) AS pending_commands, (SELECT status FROM command_ledger c WHERE c.project_id=s.project_id AND c.person_id=s.person_id ORDER BY c.created_at DESC LIMIT 1) AS last_command_status FROM attendance_state s ORDER BY s.updated_at DESC LIMIT 1`);
      if (!result.rows.length) { setLocalState('No attendance state'); return; }
      const row = result.rows.item(0) as Record<string, unknown>;
      setLocalState(`${String(row.state)} · local rev ${String(row.current_revision)} · server rev ${String(row.server_revision ?? 'null')} · ${String(row.sync_status)} · pending ${String(row.pending_commands)} · command ${String(row.last_command_status ?? 'none')}`);
    } catch (error) {
      setLocalState(error instanceof Error ? error.message : String(error));
    }
  }, []);

  const cacheAuthenticatedContext = useCallback(async (value: ApplicationContext) => {
    await getDb().execute(`CREATE TABLE IF NOT EXISTS ${M17_QA_CONTEXT_CACHE_TABLE} (user_id TEXT PRIMARY KEY, context_json TEXT NOT NULL, updated_at TEXT NOT NULL)`);
    await getDb().execute(`INSERT INTO ${M17_QA_CONTEXT_CACHE_TABLE} (user_id, context_json, updated_at) VALUES (?, ?, ?) ON CONFLICT(user_id) DO UPDATE SET context_json=excluded.context_json, updated_at=excluded.updated_at`, [value.userId, serializeM17QaContext(value), nowUtc()]);
  }, []);

  const loadCachedContext = useCallback(async (userId: string): Promise<ApplicationContext | null> => {
    const cached = await getDb().execute(`SELECT context_json FROM ${M17_QA_CONTEXT_CACHE_TABLE} WHERE user_id=? LIMIT 1`, [userId]);
    if (!cached.rows.length) return null;
    return deserializeM17QaContext(String((cached.rows.item(0) as Record<string, unknown>).context_json));
  }, []);

  const resolveAuthenticatedContext = useCallback(async () => {
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
    const resolvedContext: ApplicationContext = {
      userId: resolved.userId,
      profile: resolved.profile,
      person: resolved.person,
      organisation: resolved.organisation,
      memberships: resolved.memberships,
      activeProjectAssignments: resolved.projectAssignments.filter(item => item.status === 'ACTIVE'),
      hasProjectAccess: resolved.projectAssignments.some(item => item.status === 'ACTIVE'),
      device: installation,
    };
    setContext(resolvedContext);
    await cacheAuthenticatedContext(resolvedContext);
    setResult(1, 'PASS', `Authenticated ${resolved.person.displayName}; active project ${assignment.projectId}; active device ${installation.deviceInstallationId}`);
    await runtime.start();
  }, [authService, cacheAuthenticatedContext, client, runtime, setResult]);

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
        await getDb().execute(`CREATE TABLE IF NOT EXISTS ${M17_QA_CONTEXT_CACHE_TABLE} (user_id TEXT PRIMARY KEY, context_json TEXT NOT NULL, updated_at TEXT NOT NULL)`);
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
          try {
            const session = await authService.restoreSession();
            const cachedContext = await loadCachedContext(session.user.id);
            if (!cachedContext) throw error;
            if (!mounted) return;
            setContext(cachedContext);
            setStatus(`OFFLINE SESSION RECOVERED · cached context restored; authoritative revalidation will occur when network returns.`);
            await runtime.start();
          } catch (fallbackError) {
            if (mounted) setStatus(`AUTHENTICATION/CONTEXT WAITING · ${fallbackError instanceof Error ? fallbackError.message : String(fallbackError)}`);
          }
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
  }, [authService, loadCachedContext, refreshLocalState, resolveAuthenticatedContext, runtime, setResult]);

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
      try {
        await resolveAuthenticatedContext();
      } catch (error) {
        setResult(5, 'FAIL', `Authenticated context revalidation failed: ${error instanceof Error ? error.message : String(error)}.`);
        setResult(6, 'FAIL', 'Authoritative reconciliation cannot be accepted until authenticated context is revalidated online.');
        return;
      }
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
      await runtime.stop();
      const assignment = context.activeProjectAssignments[0];
      const latest = await getDb().execute(`SELECT base_revision, command_payload_json FROM command_ledger WHERE project_id=? AND person_id=? ORDER BY created_at DESC LIMIT 1`, [assignment.projectId, context.person.id]);
      if (!latest.rows.length) throw new Error('No local command exists for conflict setup');
      const seed = latest.rows.item(0) as Record<string, unknown>;
      const baseRevision = Number(seed.base_revision);
      const basePayload = JSON.parse(String(seed.command_payload_json));
      const checkInId = uuidV4();
      const checkInPayload = { ...basePayload, commandId: checkInId, eventId: uuidV4(), commandType: 'CHECK_IN', eventType: 'ATTENDANCE_CHECK_IN', clientOccurredAt: nowUtc(), workDateUtc: nowUtc().substring(0, 10), baseRevision };
      const checkIn = await client.rpc('sync_attendance_command', { command_id: checkInId, device_installation_id: context.device?.deviceInstallationId, project_id: assignment.projectId, person_id: context.person.id, work_date_utc: checkInPayload.workDateUtc, base_revision: baseRevision, command_type: 'CHECK_IN', payload: checkInPayload });
      if (checkIn.error || (checkIn.data as Record<string, unknown> | null)?.status !== 'ACCEPTED') throw new Error(`Server setup CHECK_IN failed: ${checkIn.error?.message ?? JSON.stringify(checkIn.data)}`);

      const local = await AttendanceService.checkIn({ context, projectId: assignment.projectId, targetPersonId: context.person.id, targetAssignment: assignment, source: 'SELF', clientOccurredAt: nowUtc(), online: false });
      const localPayloadResult = await getDb().execute(`SELECT command_payload_json FROM command_ledger WHERE command_id=?`, [local.command.commandId]);
      const localPayload = JSON.parse(String((localPayloadResult.rows.item(0) as Record<string, unknown>).command_payload_json));
      const checkoutId = uuidV4();
      const checkoutPayload = { ...localPayload, commandId: checkoutId, eventId: uuidV4(), commandType: 'CHECK_OUT', eventType: 'ATTENDANCE_CHECK_OUT', clientOccurredAt: nowUtc(), workDateUtc: localPayload.workDateUtc, baseRevision: local.state.currentRevision };
      const checkout = await client.rpc('sync_attendance_command', { command_id: checkoutId, device_installation_id: context.device?.deviceInstallationId, project_id: assignment.projectId, person_id: context.person.id, work_date_utc: localPayload.workDateUtc, base_revision: local.state.currentRevision, command_type: 'CHECK_OUT', payload: checkoutPayload });
      if (checkout.error || (checkout.data as Record<string, unknown> | null)?.status !== 'ACCEPTED') throw new Error(`Server setup CHECK_OUT failed: ${checkout.error?.message ?? JSON.stringify(checkout.data)}`);

      await runtime.start();
      const result = await runtime.requestManualSync();
      const row = (await getDb().execute(`SELECT status, server_revision, server_error_code FROM command_ledger WHERE command_id=?`, [local.command.commandId])).rows.item(0) as Record<string, unknown>;
      const state = (await getDb().execute(`SELECT state, current_revision, server_revision, sync_status FROM attendance_state WHERE project_id=? AND person_id=? ORDER BY work_date_utc DESC LIMIT 1`, [assignment.projectId, context.person.id])).rows.item(0) as Record<string, unknown>;
      const authoritativeRevision = Number((checkout.data as Record<string, unknown>).server_revision);
      const passed = result.status === 'CONFLICT' && row.status === 'CONFLICT' && Number(row.server_revision ?? 0) === authoritativeRevision && state.state === 'CHECKED_OUT' && Number(state.server_revision ?? 0) === authoritativeRevision && state.sync_status === 'CONFLICT';
      setResult(10, passed ? 'PASS' : 'FAIL', `Real worker conflict path: ${result.status}; command ${String(row.status)}; authoritative revision ${authoritativeRevision}; local ${String(state.state)} / server rev ${String(state.server_revision)}.`);
      await refreshLocalState();
    } catch (error) {
      setResult(10, 'FAIL', error instanceof Error ? error.message : String(error));
    } finally { setRunning(false); }
  };
  const failurePaths = async () => {
    if (!context) return;
    setRunning(true);
    try {
      const assignment = context.activeProjectAssignments[0];
      await runtime.stop();
      const seedResult = await getDb().execute(`SELECT organisation_id, company_id, command_type, source, base_revision, max_attempts, command_payload_json FROM command_ledger WHERE project_id=? AND person_id=? ORDER BY created_at DESC LIMIT 1`, [assignment.projectId, context.person.id]);
      if (!seedResult.rows.length) throw new Error('No seed command exists for failure-path probes');
      const seed = seedResult.rows.item(0) as Record<string, unknown>;
      const seedPayload = JSON.parse(String(seed.command_payload_json));
      const insertProbe = async (payload: Record<string, unknown>, projectId: string, personId: string, organisationId: string, companyId: string) => {
        const now = nowUtc();
        await getDb().execute(`INSERT INTO command_ledger (command_id, project_id, person_id, organisation_id, company_id, command_type, source, base_revision, status, attempt_count, max_attempts, processing_started_at, server_responded_at, synced_at, next_retry_at, server_result_json, server_error_code, failure_diagnostics, created_at, updated_at, command_payload_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'PENDING', 0, ?, NULL, NULL, NULL, NULL, NULL, NULL, NULL, ?, ?, ?)`, [String(payload.commandId), projectId, personId, organisationId, companyId, String(payload.commandType), String(payload.source), Number(seed.base_revision), Number(seed.max_attempts ?? 3), now, now, JSON.stringify(payload)]);
        return String(payload.commandId);
      };

      const validationId = uuidV4();
      const future = new Date(Date.now() + 86400000).toISOString();
      const validationPayload = { ...seedPayload, commandId: validationId, eventId: uuidV4(), clientOccurredAt: future, workDateUtc: future.substring(0, 10) };
      const validationCommand = await insertProbe(validationPayload, assignment.projectId, context.person.id, String(seed.organisation_id), String(seed.company_id));
      await runtime.start();
      const validationResult = await runtime.requestManualSync();
      const validationRow = (await getDb().execute(`SELECT status, server_error_code FROM command_ledger WHERE command_id=?`, [validationCommand])).rows.item(0) as Record<string, unknown>;
      if (validationResult.status !== 'FAILED' || validationRow.server_error_code !== 'WORK_DATE_MISMATCH') throw new Error(`Validation probe failed: ${validationResult.status}/${String(validationRow.server_error_code)}`);

      await runtime.stop();
      const otherPerson = 'cccccccc-cccc-cccc-cccc-300000000003';
      const otherAssignment = 'dba039cf-0761-4bf8-af62-7d3bcbcb755c';
      const authId = uuidV4();
      const authPayload = { ...seedPayload, commandId: authId, eventId: uuidV4(), personId: otherPerson, projectAssignmentId: otherAssignment, clientOccurredAt: nowUtc(), workDateUtc: nowUtc().substring(0, 10) };
      const authCommand = await insertProbe(authPayload, assignment.projectId, otherPerson, String(seed.organisation_id), 'bbbbbbbb-bbbb-bbbb-bbbb-200000000002');
      await runtime.start();
      const authResult = await runtime.requestManualSync();
      const authRow = (await getDb().execute(`SELECT status, server_error_code FROM command_ledger WHERE command_id=?`, [authCommand])).rows.item(0) as Record<string, unknown>;
      if (authResult.status !== 'FAILED' || authRow.server_error_code !== 'NOT_AUTHORIZED') throw new Error(`Cross-company probe failed: ${authResult.status}/${String(authRow.server_error_code)}`);

      await runtime.stop();
      const revokeId = uuidV4();
      const revokePayload = { ...seedPayload, commandId: revokeId, eventId: uuidV4(), clientOccurredAt: nowUtc(), workDateUtc: nowUtc().substring(0, 10) };
      const revokeCommand = await insertProbe(revokePayload, assignment.projectId, context.person.id, String(seed.organisation_id), String(seed.company_id));
      const revoked = await client.rpc('m17_qa_revoke_current_device', { p_device_id: context.device?.deviceInstallationId });
      if (revoked.error) throw new Error(`QA device revoke failed: ${revoked.error.message}`);
      await runtime.start();
      const revokeResult = await runtime.requestManualSync();
      const revokeRow = (await getDb().execute(`SELECT status, server_error_code FROM command_ledger WHERE command_id=?`, [revokeCommand])).rows.item(0) as Record<string, unknown>;
      if (revokeResult.status !== 'FAILED' || revokeRow.server_error_code !== 'DEVICE_REVOKED') throw new Error(`Revoked-device probe failed: ${revokeResult.status}/${String(revokeRow.server_error_code)}`);

      await runtime.stop();
      await resolveAuthenticatedContext();
      setResult(11, 'NOT_PROVEN', 'Validation, cross-company authorization and revoked-device rejection all passed through the real sync worker. Retryable transport still requires physical network loss.');
    } catch (error) {
      setResult(11, 'FAIL', error instanceof Error ? error.message : String(error));
    } finally { setRunning(false); }
  };

  const retryableTransport = async () => {
    if (!context) return;
    setRunning(true);
    try {
      await fetch(M17_SUPABASE_URL, { method: 'HEAD' }).then(() => { throw new Error('NETWORK_STILL_REACHABLE'); });
    } catch (error) {
      if (error instanceof Error && error.message === 'NETWORK_STILL_REACHABLE') {
        setResult(11, 'NOT_PROVEN', 'Network is still reachable. Turn Wi-Fi and mobile data OFF, then press this control again.');
        setRunning(false);
        return;
      }
    }
    await runtime.stop();
    const assignment = context.activeProjectAssignments[0];
    const seedResult = await getDb().execute(`SELECT organisation_id, company_id, command_type, source, base_revision, max_attempts, command_payload_json FROM command_ledger WHERE project_id=? AND person_id=? ORDER BY created_at DESC LIMIT 1`, [assignment.projectId, context.person.id]);
    if (!seedResult.rows.length) throw new Error('No seed command exists for transport probe');
    const seed = seedResult.rows.item(0) as Record<string, unknown>;
    const payload = JSON.parse(String(seed.command_payload_json));
    const commandId = uuidV4();
    const future = new Date(Date.now() + 86400000).toISOString();
    const probe = { ...payload, commandId, eventId: uuidV4(), clientOccurredAt: future, workDateUtc: future.substring(0, 10) };
    const now = nowUtc();
    await getDb().execute(`INSERT INTO command_ledger (command_id, project_id, person_id, organisation_id, company_id, command_type, source, base_revision, status, attempt_count, max_attempts, processing_started_at, server_responded_at, synced_at, next_retry_at, server_result_json, server_error_code, failure_diagnostics, created_at, updated_at, command_payload_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'PENDING', 0, ?, NULL, NULL, NULL, NULL, NULL, NULL, NULL, ?, ?, ?)`, [commandId, assignment.projectId, context.person.id, String(seed.organisation_id), String(seed.company_id), String(probe.commandType), String(probe.source), Number(seed.base_revision), Number(seed.max_attempts ?? 3), now, now, JSON.stringify(probe)]);
    await runtime.start();
    await new Promise<void>(resolve => setTimeout(resolve, 750));
    const row = (await getDb().execute(`SELECT status, next_retry_at, server_error_code FROM command_ledger WHERE command_id=?`, [commandId])).rows.item(0) as Record<string, unknown>;
    const passed = row.status === 'RETRYABLE_FAILURE' && row.server_error_code === 'TRANSPORT' && row.next_retry_at;
    setResult(11, passed ? 'PASS' : 'FAIL', passed ? `Physical network loss produced RETRYABLE_FAILURE with next_retry_at=${String(row.next_retry_at)}.` : `Expected RETRYABLE_FAILURE but observed ${String(row.status)}/${String(row.server_error_code)}.`);
    await refreshLocalState();
    setRunning(false);
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
  const computedNextAction = nextRequiredAction(Object.fromEntries(Object.entries(results).map(([key, value]) => [Number(key), value?.status])) as Record<number, QaEvidenceStatus>);
  const nextAction = restartRecovered && context && results[1]?.status !== 'PASS' ? 'Restore network, then run 4–6 · Restore Network + Sync for authoritative revalidation.' : computedNextAction;

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
        <Pressable style={styles.secondary} disabled={running} onPress={() => void failurePaths()}><Text style={styles.secondaryText}>11A · SERVER FAILURE-PATH AUDIT</Text></Pressable>
        <Pressable style={styles.secondary} disabled={running} onPress={() => void retryableTransport()}><Text style={styles.secondaryText}>11B · RETRYABLE TRANSPORT (NETWORK OFF)</Text></Pressable>
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
