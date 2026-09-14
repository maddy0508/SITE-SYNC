from pathlib import Path
import re

path = Path('sitesync/src/attendance/M17RealRuntimeQaScreenV2.tsx')
text = path.read_text()

conflict = r'''  const conflictReplay = async () => {
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
'''

failure = r'''  const failurePaths = async () => {
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
    await new Promise(resolve => setTimeout(resolve, 750));
    const row = (await getDb().execute(`SELECT status, next_retry_at, server_error_code FROM command_ledger WHERE command_id=?`, [commandId])).rows.item(0) as Record<string, unknown>;
    const passed = row.status === 'RETRYABLE_FAILURE' && row.server_error_code === 'TRANSPORT' && row.next_retry_at;
    setResult(11, passed ? 'PASS' : 'FAIL', passed ? `Physical network loss produced RETRYABLE_FAILURE with next_retry_at=${String(row.next_retry_at)}.` : `Expected RETRYABLE_FAILURE but observed ${String(row.status)}/${String(row.server_error_code)}.`);
    await refreshLocalState();
    setRunning(false);
  };
'''

def replace_between(src, start, end, replacement):
    pattern = re.compile(re.escape(start) + r'.*?(?=\n' + re.escape(end) + r')', re.S)
    out, n = pattern.subn(replacement.rstrip(), src, count=1)
    if n != 1:
        raise RuntimeError(f'block not found: {start}')
    return out

text = replace_between(text, '  const conflictReplay = async () => {', '  const failurePaths = async () => {', conflict)
text = replace_between(text, '  const failurePaths = async () => {', '  const lifecycleStress = async () => {', failure)
old = '<Pressable style={styles.secondary} disabled={running} onPress={() => void failurePaths()}><Text style={styles.secondaryText}>11 · FAILURE-PATH AUDIT</Text></Pressable>'
new = '<Pressable style={styles.secondary} disabled={running} onPress={() => void failurePaths()}><Text style={styles.secondaryText}>11A · SERVER FAILURE-PATH AUDIT</Text></Pressable>\n        <Pressable style={styles.secondary} disabled={running} onPress={() => void retryableTransport()}><Text style={styles.secondaryText}>11B · RETRYABLE TRANSPORT (NETWORK OFF)</Text></Pressable>'
if old not in text:
    raise RuntimeError('button not found')
path.write_text(text.replace(old, new, 1))
