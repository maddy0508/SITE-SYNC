import { createClient } from '@supabase/supabase-js';
import { AuthService } from '../src/auth/authService';
import { AttendanceService } from '../src/attendance/attendanceService';
import { closeDatabase, getDb, initializeDatabase } from '../src/database/localPersistence';
import { DeviceRegistrationService } from '../src/identity/deviceRegistrationService';
import { IdentityService } from '../src/identity/identityService';
import { createAuthenticatedSyncRuntime } from '../src/sync/syncRuntime';

const env = (globalThis as unknown as { process?: { env?: Record<string, string | undefined> } }).process?.env ?? {};
const url = env.M17_SUPABASE_URL;
const publishableKey = env.M17_SUPABASE_PUBLISHABLE_KEY;
const email = env.M17_SUPABASE_EMAIL;
const password = env.M17_SUPABASE_PASSWORD;

const hasRealServerCredentials = Boolean(url && publishableKey && email && password);

describe('M1.7 real Supabase application runtime boundary', () => {
  afterEach(async () => {
    await closeDatabase();
  });

  it(hasRealServerCredentials
    ? 'persists an offline command, submits it through the real RPC, and reconciles authoritative state into SQLite'
    : 'requires isolated Supabase credentials for real-server execution',
    async () => {
      if (!hasRealServerCredentials) {
        return;
      }

      const client = createClient(url!, publishableKey!, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false,
        },
      });

      const { data, error } = await client.auth.signInWithPassword({ email: email!, password: password! });
      expect(error).toBeNull();
      expect(data.session?.user.id).toBeTruthy();

      const userId = data.session!.user.id;
      await initializeDatabase(`m17-real-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.db`);

      const identityService = new IdentityService(client);
      const identity = await identityService.resolve(userId);
      const assignment = identity.projectAssignments.find(item => item.status === 'ACTIVE');
      expect(assignment).toBeDefined();

      const context = {
        userId,
        profile: identity.profile,
        person: identity.person,
        organisation: identity.organisation,
        memberships: identity.memberships,
        activeProjectAssignments: identity.projectAssignments.filter(item => item.status === 'ACTIVE'),
        hasProjectAccess: true,
        device: null,
      };

      const deviceRegistration = new DeviceRegistrationService(client);
      const installation = await deviceRegistration.register(userId, {
        installationKey: `m17-real-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
        deviceName: 'M1.7 Android Runtime Test',
        appVersion: 'M1.7-real-runtime',
        osVersion: 'CI/Node integration boundary',
        now: new Date().toISOString(),
      });
      expect(installation.status).toBe('ACTIVE');

      const workDateUtc = new Date().toISOString().slice(0, 10);
      const checkInAt = `${workDateUtc}T08:00:00.000Z`;
      const commandId = `m17-real-${Date.now()}-check-in`;
      const eventId = `${commandId}-event`;

      const localMutation = await AttendanceService.checkIn({
        context,
        projectId: assignment!.projectId,
        targetPersonId: identity.person.id,
        targetAssignment: assignment,
        source: 'SELF',
        clientOccurredAt: checkInAt,
        online: false,
        commandId,
        eventId,
      });

      expect(localMutation.command.status).toBe('PENDING');
      expect(localMutation.state.syncStatus).toBe('OFFLINE_PENDING_VERIFICATION');

      const authService = new AuthService(client);
      const runtime = createAuthenticatedSyncRuntime(authService, client);
      await runtime.start();

      const result = await runtime.requestManualSync();
      expect(result.status).toBe('SUCCEEDED');
      expect(result.commandId).toBe(commandId);

      const command = await getDb().execute(
        'SELECT status, server_result_json, server_error_code FROM command_ledger WHERE command_id = ?',
        [commandId],
      );
      expect(command.rows.item(0)?.status).toBe('SUCCEEDED');
      expect(command.rows.item(0)?.server_error_code).toBeNull();

      const state = await getDb().execute(
        `SELECT state, sync_status, server_revision, current_revision
         FROM attendance_state WHERE project_id = ? AND person_id = ? AND work_date_utc = ?`,
        [assignment!.projectId, identity.person.id, workDateUtc],
      );
      expect(state.rows.length).toBe(1);
      expect(state.rows.item(0)?.state).toBe('CHECKED_IN');
      expect(state.rows.item(0)?.sync_status).toBe('ONLINE_VERIFIED');
      expect(Number(state.rows.item(0)?.server_revision)).toBeGreaterThan(0);
      expect(Number(state.rows.item(0)?.current_revision)).toBe(1);

      await runtime.stop();
    },
  );
});
