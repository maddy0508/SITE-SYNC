import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { ApplicationContext } from '../identity/projectContext';
import type { ProjectAssignment } from '../identity/identityService';
import { AttendanceService } from './attendanceService';
import { closeDatabase, getDb, initializeDatabase } from '../database/localPersistence';

type Result = { name: string; passed: boolean; detail: string };

function createFixture(runId: string): {
  org: string;
  company: string;
  project: string;
  person: string;
  assignment: ProjectAssignment;
  context: ApplicationContext;
} {
  const org = `org-m16-${runId}`;
  const company = `company-m16-${runId}`;
  const project = `project-m16-${runId}`;
  const person = `person-m16-${runId}`;
  const assignment: ProjectAssignment = {
    id: `assignment-m16-${runId}`,
    organisationId: org,
    projectId: project,
    companyId: company,
    companyMembershipId: `membership-m16-${runId}`,
    personId: person,
    projectRole: 'WORKER',
    status: 'ACTIVE',
  };
  const context: ApplicationContext = {
    userId: `user-m16-${runId}`,
    profile: { userId: `user-m16-${runId}`, organisationId: org, personId: person },
    person: { id: person, organisationId: org, displayName: 'M1.6 TEST WORKER' },
    organisation: { id: org, name: 'M1.6 TEST ORGANISATION' },
    memberships: [],
    activeProjectAssignments: [assignment],
    hasProjectAccess: true,
    device: null,
  };
  return { org, company, project, person, assignment, context };
}

async function runM16DeviceSuite(): Promise<Result[]> {
  // Database isolation is required, but the fixture identity is also unique so
  // a native database-name reuse cannot contaminate a later QA run.
  const runId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  const testDatabase = `m16-device-qa-${runId}.db`;
  const fixture = createFixture(runId);
  const workDateUtc = '2026-09-11';
  const checkInAt = `${workDateUtc}T08:00:00.000Z`;
  const rollbackAt = `${workDateUtc}T15:00:00.000Z`;
  const checkOutAt = `${workDateUtc}T16:00:00.000Z`;
  const commandIn = `m16-qa-${runId}-check-in`;
  const eventIn = `m16-qa-${runId}-event-in`;
  const commandRollback = `m16-qa-${runId}-rollback-command`;
  const commandOut = `m16-qa-${runId}-check-out`;
  const eventOut = `m16-qa-${runId}-event-out`;

  await closeDatabase();
  await initializeDatabase(testDatabase);

  const results: Result[] = [];
  const checkIn = await AttendanceService.checkIn({
    context: fixture.context,
    projectId: fixture.project,
    targetPersonId: fixture.person,
    targetAssignment: fixture.assignment,
    source: 'SELF',
    clientOccurredAt: checkInAt,
    online: false,
    commandId: commandIn,
    eventId: eventIn,
  });
  results.push({
    name: 'Offline check-in',
    passed: checkIn.state.state === 'CHECKED_IN' && checkIn.timesheet.syncStatus === 'OFFLINE_PENDING_VERIFICATION',
    detail: `${checkIn.state.state} · ${checkIn.timesheet.syncStatus}`,
  });

  const ledger = await getDb().execute('SELECT command_payload_json FROM command_ledger WHERE command_id = ?', [commandIn]);
  const payloadPresent = ledger.rows.length === 1 && typeof ledger.rows.item(0)?.command_payload_json === 'string';
  results.push({
    name: 'Durable command payload',
    passed: payloadPresent,
    detail: payloadPresent ? 'Payload persisted locally' : 'Payload missing',
  });

  await closeDatabase();
  await initializeDatabase(testDatabase);
  const restartState = await getDb().execute(
    'SELECT state, current_revision FROM attendance_state WHERE project_id = ? AND person_id = ? AND work_date_utc = ?',
    [fixture.project, fixture.person, workDateUtc],
  );
  const survived = restartState.rows.length === 1 && restartState.rows.item(0)?.state === 'CHECKED_IN' && restartState.rows.item(0)?.current_revision === 1;
  results.push({
    name: 'Restart durability',
    passed: survived,
    detail: survived ? 'Attendance state survived database close/reopen' : 'Attendance state did not survive restart',
  });

  try {
    await AttendanceService.checkOut({
      context: fixture.context,
      projectId: fixture.project,
      targetPersonId: fixture.person,
      targetAssignment: fixture.assignment,
      source: 'SELF',
      clientOccurredAt: rollbackAt,
      online: false,
      commandId: commandRollback,
      eventId: eventIn,
    });
    results.push({ name: 'Rollback on event failure', passed: false, detail: 'Unexpectedly accepted duplicate event ID' });
  } catch {
    const rollbackCount = await getDb().execute('SELECT COUNT(*) AS count FROM command_ledger WHERE command_id = ?', [commandRollback]);
    const rolledBack = rollbackCount.rows.item(0)?.count === 0;
    results.push({
      name: 'Rollback on event failure',
      passed: rolledBack,
      detail: rolledBack ? 'Command insert rolled back with failed event insert' : 'Partial command record remained',
    });
  }

  const checkOut = await AttendanceService.checkOut({
    context: fixture.context,
    projectId: fixture.project,
    targetPersonId: fixture.person,
    targetAssignment: fixture.assignment,
    source: 'SELF',
    clientOccurredAt: checkOutAt,
    online: false,
    commandId: commandOut,
    eventId: eventOut,
  });
  results.push({
    name: 'Offline check-out',
    passed: checkOut.state.state === 'CHECKED_OUT' && checkOut.timesheet.totalMinutes === 480 && checkOut.timesheet.status === 'COMPLETE',
    detail: `${checkOut.timesheet.status} · ${checkOut.timesheet.totalMinutes ?? 'null'} minutes`,
  });

  return results;
}

export function M16QaScreen({ onBack }: { onBack: () => void }) {
  const [results, setResults] = useState<Result[]>([]);
  const [running, setRunning] = useState(false);

  const run = async () => {
    setRunning(true);
    try {
      setResults(await runM16DeviceSuite());
    } catch (error) {
      setResults([{ name: 'M1.6 suite execution', passed: false, detail: error instanceof Error ? error.message : String(error) }]);
    } finally {
      setRunning(false);
    }
  };

  const passed = results.filter((result) => result.passed).length;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={onBack} hitSlop={12}><Text style={styles.back}>‹ BACK</Text></Pressable>
        <Text style={styles.label}>M1.6 QA</Text>
      </View>
      <Text style={styles.eyebrow}>SITE-SYNC</Text>
      <Text style={styles.title}>M1.6 ATTENDANCE</Text>
      <Text style={styles.subtitle}>Offline mutation, durable ledger, restart and rollback verification.</Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>SELF-CONTAINED DEVICE SUITE</Text>
        <Text style={styles.cardBody}>Uses an isolated local SQLite database and unique fixture identity per run. No production data or Supabase mutation is performed.</Text>
      </View>

      <Pressable style={styles.primary} disabled={running} onPress={run}>
        <Text style={styles.primaryText}>{running ? 'RUNNING…' : 'RUN M1.6 DEVICE SUITE'}</Text>
      </Pressable>

      {results.length > 0 && (
        <View style={styles.results}>
          <Text style={styles.summary}>{passed}/{results.length} TESTS PASSED</Text>
          {results.map((result) => (
            <View key={result.name} style={styles.row}>
              <View style={[styles.dot, result.passed ? styles.pass : styles.fail]} />
              <View style={styles.copy}>
                <Text style={styles.name}>{result.name}</Text>
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
  container: { padding: 24, paddingBottom: 40, backgroundColor: '#F4F6FA', minHeight: '100%' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 },
  back: { color: '#0D1733', fontSize: 11, fontWeight: '900', letterSpacing: 1 },
  label: { color: '#65718A', fontSize: 10, fontWeight: '900', letterSpacing: 1.5 },
  eyebrow: { color: '#65718A', fontSize: 11, fontWeight: '900', letterSpacing: 2 },
  title: { marginTop: 4, color: '#0D1733', fontSize: 30, fontWeight: '900' },
  subtitle: { marginTop: 6, color: '#59657D', fontSize: 14, lineHeight: 20 },
  card: { marginTop: 24, padding: 20, borderRadius: 20, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#DCE2EF' },
  cardTitle: { color: '#0D1733', fontSize: 13, fontWeight: '900', letterSpacing: 1 },
  cardBody: { marginTop: 8, color: '#59657D', fontSize: 13, lineHeight: 19 },
  primary: { marginTop: 16, borderRadius: 14, paddingVertical: 16, alignItems: 'center', backgroundColor: '#0D1733' },
  primaryText: { color: '#FFFFFF', fontSize: 12, fontWeight: '900', letterSpacing: 1 },
  results: { marginTop: 18, borderRadius: 20, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#DCE2EF', padding: 18 },
  summary: { color: '#0D1733', fontSize: 17, fontWeight: '900', marginBottom: 6 },
  row: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 13, borderTopWidth: 1, borderTopColor: '#E8ECF4' },
  dot: { width: 10, height: 10, borderRadius: 5, marginTop: 5 },
  pass: { backgroundColor: '#36A269' },
  fail: { backgroundColor: '#C84D4D' },
  copy: { flex: 1, marginLeft: 12 },
  name: { color: '#0D1733', fontSize: 13, fontWeight: '800' },
  detail: { marginTop: 3, color: '#65718A', fontSize: 11, lineHeight: 16 },
});
