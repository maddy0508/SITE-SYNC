import { AttendanceError, AttendanceService } from '../src/attendance/attendanceService';
import { closeDatabase, getDb, initializeDatabase } from '../src/database/localPersistence';
import type { ApplicationContext } from '../src/identity/projectContext';
import type { ProjectAssignment } from '../src/identity/identityService';

let testDatabaseName = '';
const ORG = 'org-1';
const COMPANY = 'company-1';
const PROJECT = 'project-1';
const PERSON = 'person-1';
const ASSIGNMENT = 'assignment-1';

const assignment: ProjectAssignment = {
  id: ASSIGNMENT,
  organisationId: ORG,
  projectId: PROJECT,
  companyId: COMPANY,
  companyMembershipId: 'membership-1',
  personId: PERSON,
  projectRole: 'WORKER',
  status: 'ACTIVE',
};

function context(): ApplicationContext {
  return {
    userId: 'user-1',
    profile: { userId: 'user-1', organisationId: ORG, personId: PERSON },
    person: { id: PERSON, organisationId: ORG, displayName: 'WORKER' },
    organisation: { id: ORG, name: 'Organisation' },
    memberships: [],
    activeProjectAssignments: [assignment],
    hasProjectAccess: true,
    device: null,
  };
}

function request(overrides: Partial<Parameters<typeof AttendanceService.checkIn>[0]> = {}) {
  return {
    context: context(),
    projectId: PROJECT,
    targetPersonId: PERSON,
    targetAssignment: assignment,
    source: 'SELF' as const,
    clientOccurredAt: '2026-09-11T08:00:00.000Z',
    online: false,
    ...overrides,
  };
}

describe('M1.6 transactional attendance service', () => {
  beforeEach(async () => {
    await closeDatabase();
    testDatabaseName = `m16-attendance-${Date.now()}-${Math.random().toString(36).slice(2)}.db`;
    await initializeDatabase(testDatabaseName);
  });

  afterAll(async () => {
    await closeDatabase();
  });

  test('offline check-in atomically creates command, event, state and incomplete timesheet', async () => {
    const result = await AttendanceService.checkIn({
      ...request(),
      commandId: 'cmd-in',
      eventId: 'event-in',
    });

    expect(result.command.status).toBe('PENDING');
    expect(result.event.eventType).toBe('ATTENDANCE_CHECK_IN');
    expect(result.state.state).toBe('CHECKED_IN');
    expect(result.state.currentRevision).toBe(1);
    expect(result.state.syncStatus).toBe('OFFLINE_PENDING_VERIFICATION');
    expect(result.timesheet).toMatchObject({
      firstInUtc: '2026-09-11T08:00:00.000Z',
      lastOutUtc: null,
      totalMinutes: null,
      status: 'INCOMPLETE',
      sourceStateRevision: 1,
      syncStatus: 'OFFLINE_PENDING_VERIFICATION',
    });

    const db = getDb();
    const ledger = await db.execute('SELECT command_payload_json as payload FROM command_ledger WHERE command_id = ?', ['cmd-in']);
    expect(JSON.parse(String(ledger.rows.item(0)?.payload))).toMatchObject({
      commandId: 'cmd-in',
      eventId: 'event-in',
      eventType: 'ATTENDANCE_CHECK_IN',
      workDateUtc: '2026-09-11',
    });

    const counts = await db.execute(`
      SELECT
        (SELECT COUNT(*) FROM command_ledger WHERE command_id = 'cmd-in') AS commands,
        (SELECT COUNT(*) FROM attendance_event WHERE event_id = 'event-in') AS events,
        (SELECT COUNT(*) FROM attendance_state WHERE project_id = ? AND person_id = ? AND work_date_utc = '2026-09-11') AS states,
        (SELECT COUNT(*) FROM timesheet WHERE project_id = ? AND person_id = ? AND work_date_utc = '2026-09-11') AS timesheets`,
      [PROJECT, PERSON, PROJECT, PERSON],
    );
    expect(counts.rows.item(0)).toMatchObject({ commands: 1, events: 1, states: 1, timesheets: 1 });
  });

  test('check-out appends an event, advances revision and completes first-in/last-out timesheet', async () => {
    await AttendanceService.checkIn({
      ...request(),
      commandId: 'cmd-in',
      eventId: 'event-in',
    });

    const result = await AttendanceService.checkOut({
      ...request({
        clientOccurredAt: '2026-09-11T16:30:00.000Z',
        commandId: 'cmd-out',
        eventId: 'event-out',
      }),
    });

    expect(result.state.state).toBe('CHECKED_OUT');
    expect(result.state.currentRevision).toBe(2);
    expect(result.event.eventType).toBe('ATTENDANCE_CHECK_OUT');
    expect(result.timesheet).toMatchObject({
      firstInUtc: '2026-09-11T08:00:00.000Z',
      lastOutUtc: '2026-09-11T16:30:00.000Z',
      totalMinutes: 510,
      status: 'COMPLETE',
      sourceStateRevision: 2,
    });

    const count = await getDb().execute(
      `SELECT COUNT(*) AS count FROM attendance_event WHERE project_id = ? AND person_id = ? AND work_date_utc = '2026-09-11'`,
      [PROJECT, PERSON],
    );
    expect(count.rows.item(0)?.count).toBe(2);
  });

  test('duplicate command id rolls back the entire attempted check-out', async () => {
    await AttendanceService.checkIn({
      ...request(),
      commandId: 'duplicate-command',
      eventId: 'event-in',
    });

    await expect(AttendanceService.checkOut({
      ...request({
        clientOccurredAt: '2026-09-11T16:30:00.000Z',
        commandId: 'duplicate-command',
        eventId: 'event-out',
      }),
    })).rejects.toThrow();

    const db = getDb();
    const result = await db.execute(`
      SELECT
        (SELECT COUNT(*) FROM command_ledger WHERE command_id = 'duplicate-command') AS commands,
        (SELECT COUNT(*) FROM attendance_event WHERE event_id = 'event-out') AS outEvents,
        (SELECT state FROM attendance_state WHERE project_id = ? AND person_id = ? AND work_date_utc = '2026-09-11') AS state,
        (SELECT COUNT(*) FROM timesheet WHERE project_id = ? AND person_id = ? AND work_date_utc = '2026-09-11') AS timesheets`,
      [PROJECT, PERSON, PROJECT, PERSON],
    );
    expect(result.rows.item(0)).toMatchObject({ commands: 1, outEvents: 0, state: 'CHECKED_IN', timesheets: 1 });
  });

  test('event primary-key failure rolls back the command and state transition', async () => {
    await AttendanceService.checkIn({
      ...request(),
      commandId: 'cmd-in',
      eventId: 'event-shared',
    });

    await expect(AttendanceService.checkOut({
      ...request({
        clientOccurredAt: '2026-09-11T16:30:00.000Z',
        commandId: 'cmd-out',
        eventId: 'event-shared',
      }),
    })).rejects.toThrow();

    const db = getDb();
    const result = await db.execute(`
      SELECT
        (SELECT COUNT(*) FROM command_ledger WHERE command_id = 'cmd-out') AS commands,
        (SELECT COUNT(*) FROM attendance_event WHERE command_id = 'cmd-out') AS events,
        (SELECT current_revision FROM attendance_state WHERE project_id = ? AND person_id = ? AND work_date_utc = '2026-09-11') AS revision,
        (SELECT state FROM attendance_state WHERE project_id = ? AND person_id = ? AND work_date_utc = '2026-09-11') AS state`,
      [PROJECT, PERSON, PROJECT, PERSON],
    );
    expect(result.rows.item(0)).toMatchObject({ commands: 0, events: 0, revision: 1, state: 'CHECKED_IN' });
  });

  test('authorization failure occurs before any local mutation', async () => {
    await expect(AttendanceService.checkIn({
      ...request({
        context: { ...context(), hasProjectAccess: false, activeProjectAssignments: [] },
        commandId: 'unauthorized-command',
        eventId: 'unauthorized-event',
      }),
    })).rejects.toMatchObject({ code: 'INVALID_CONTEXT' });

    const db = getDb();
    const result = await db.execute('SELECT COUNT(*) AS count FROM command_ledger');
    expect(result.rows.item(0)?.count).toBe(0);
  });

  test('restart preserves the offline check-in and permits a later offline check-out', async () => {
    await AttendanceService.checkIn({
      ...request(),
      commandId: 'restart-in',
      eventId: 'restart-event-in',
    });

    await closeDatabase();
    await initializeDatabase(testDatabaseName);

    const result = await AttendanceService.checkOut({
      ...request({
        clientOccurredAt: '2026-09-11T16:00:00.000Z',
        commandId: 'restart-out',
        eventId: 'restart-event-out',
      }),
    });

    expect(result.state.state).toBe('CHECKED_OUT');
    expect(result.state.currentRevision).toBe(2);
    expect(result.timesheet.totalMinutes).toBe(480);

    const db = getDb();
    const counts = await db.execute(`
      SELECT
        (SELECT COUNT(*) FROM command_ledger WHERE project_id = ? AND person_id = ?) AS commands,
        (SELECT COUNT(*) FROM attendance_event WHERE project_id = ? AND person_id = ?) AS events`,
      [PROJECT, PERSON, PROJECT, PERSON],
    );
    expect(counts.rows.item(0)).toMatchObject({ commands: 2, events: 2 });
  });

  test('rejects check-out without an active local check-in', async () => {
    await expect(AttendanceService.checkOut({
      ...request(),
      commandId: 'invalid-out',
      eventId: 'invalid-out-event',
    })).rejects.toBeInstanceOf(AttendanceError);
    await expect(AttendanceService.checkOut({
      ...request(),
      commandId: 'invalid-out-2',
      eventId: 'invalid-out-event-2',
    })).rejects.toMatchObject({ code: 'NOT_CHECKED_IN' });
  });
});
