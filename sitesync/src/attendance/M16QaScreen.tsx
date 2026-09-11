import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { ApplicationContext } from '../identity/projectContext';
import type { ProjectAssignment } from '../identity/identityService';
import { AttendanceService } from './attendanceService';
import { closeDatabase, getDb, initializeDatabase } from '../database/localPersistence';

const ORG = 'org-m16';
const COMPANY = 'company-m16';
const PROJECT = 'project-m16';
const PERSON = 'person-m16';
const ASSIGNMENT = 'assignment-m16';

const assignment: ProjectAssignment = {
  id: ASSIGNMENT,
  organisationId: ORG,
  projectId: PROJECT,
  companyId: COMPANY,
  companyMembershipId: 'membership-m16',
  personId: PERSON,
  projectRole: 'WORKER',
  status: 'ACTIVE',
};

const context: ApplicationContext = {
  userId: 'user-m16',
  profile: { userId: 'user-m16', organisationId: ORG, personId: PERSON },
  person: { id: PERSON, organisationId: ORG, displayName: 'M1.6 TEST WORKER' },
  organisation: { id: ORG, name: 'M1.6 TEST ORGANISATION' },
  memberships: [],
  activeProjectAssignments: [assignment],
  hasProjectAccess: true,
  device: null,
};

type Result = { name: string; passed: boolean; detail: string };

async function runM16DeviceSuite(): Promise<Result[]> {
  // Each run gets a fresh isolated database. This prevents a previous QA run's
  // checked-out state from contaminating the fixed fixture timestamps below.
  const testDatabase = `m16-device-qa-${Date.now().toString(36)}.db`;
  await closeDatabase();
  await initializeDatabase(testDatabase);

  const results: Result[] = [];
  const checkIn = await AttendanceService.checkIn({
    context,
    projectId: PROJECT,
    targetPersonId: PERSON,
    targetAssignment: assignment,
    source: 'SELF',
    clientOccurredAt: '2026-09-11T08:00:00.000Z',
    online: false,
    commandId: 'm16-qa-check-in',
    eventId: 'm16-qa-event-in',
  });
  results.push({
    name: 'Offline check-in',
    passed: checkIn.state.state === 'CHECKED_IN' && checkIn.timesheet.syncStatus === 'OFFLINE_PENDING_VERIFICATION',
    detail: `${checkIn.state.state} · ${checkIn.timesheet.syncStatus}`,
  });

  const ledger = await getDb().execute('SELECT command_payload_json FROM command_ledger WHERE command_id = ?', ['m16-qa-check-in']);
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
    [PROJECT, PERSON, '2026-09-11'],
  );
  const survived = restartState.rows.length === 1 && restartState.rows.item(0)?.state === 'CHECKED_IN' && restartState.rows.item(0)?.current_revision === 1;
  results.push({
    name: 'Restart durability',
    passed: survived,
    detail: survived ? 'Attendance state survived database close/reopen' : 'Attendance state did not survive restart',
  });

  try {
    await AttendanceService.checkOut({
      context,
      projectId: PROJECT,
      targetPersonId: PERSON,
      targetAssignment: assignment,
      source: 'SELF',
      clientOccurredAt: '2026-09-11T15:00:00.000Z',
      online: false,
      commandId: 'm16-qa-rollback-command',
      eventId: 'm16-qa-event-in',
    });
    results.push({ name: 'Rollback on event failure', passed: false, detail: 'Unexpectedly accepted duplicate event ID' });
  } catch {
    const rollbackCount = await getDb().execute('SELECT COUNT(*) AS count FROM command_ledger WHERE command_id = ?', ['m16-qa-rollback-command']);
    const rolledBack = rollbackCount.rows.item(0)?.count === 0;
    results.push({
      name: 'Rollback on event failure',
      passed: rolledBack,
      detail: rolledBack ? 'Command insert rolled back with failed event insert' : 'Partial command record remained',
    });
  }

  const checkOut = await AttendanceService.checkOut({
    context,
    projectId: PROJECT,
    targetPersonId: PERSON,
    targetAssignment: assignment,
    source: 'SELF',
    clientOccurredAt: '2026-09-11T16:00:00.000Z',
    online: false,
    commandId: 'm16-qa-check-out',
    eventId: 'm16-qa-event-out',
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
        <Text style={styles.cardBody}>Uses an isolated local SQLite database. No production data or Supabase mutation is performed.</Text>
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
