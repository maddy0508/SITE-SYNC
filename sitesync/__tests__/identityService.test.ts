import { IdentityService, IdentityServiceError } from '../src/identity/identityService';

type Result = { data: unknown; error: { message: string } | null };

function createMockClient(rows: Record<string, Result>) {
  const from = jest.fn((table: string) => {
    const result = rows[table] ?? { data: [], error: null };
    const builder = {
      select: jest.fn(() => builder),
      eq: jest.fn(() => builder),
      maybeSingle: jest.fn(async () => result),
      then: (resolve: (value: Result) => unknown) => Promise.resolve(result).then(resolve),
    };
    return builder;
  });
  return { from };
}

const USER_ID = '11111111-1111-4111-8111-111111111111';
const ORG_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const PERSON_ID = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const COMPANY_ID = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const MEMBERSHIP_ID = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';
const PROJECT_ID = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';
const ASSIGNMENT_ID = 'ffffffff-ffff-4fff-8fff-ffffffffffff';

describe('IdentityService', () => {
  it('resolves the authoritative identity chain', async () => {
    const client = createMockClient({
      user_profiles: { data: { user_id: USER_ID, organisation_id: ORG_ID, person_id: PERSON_ID }, error: null },
      persons: { data: { id: PERSON_ID, organisation_id: ORG_ID, display_name: 'ORG A WORKER' }, error: null },
      organisations: { data: { id: ORG_ID, name: 'Organisation A' }, error: null },
      company_memberships: { data: [{ id: MEMBERSHIP_ID, organisation_id: ORG_ID, company_id: COMPANY_ID, person_id: PERSON_ID, status: 'ACTIVE' }], error: null },
      project_assignments: { data: [{ id: ASSIGNMENT_ID, organisation_id: ORG_ID, project_id: PROJECT_ID, company_id: COMPANY_ID, company_membership_id: MEMBERSHIP_ID, person_id: PERSON_ID, project_role: 'WORKER', status: 'ACTIVE' }], error: null },
    });

    const identity = await new IdentityService(client as never).resolve(USER_ID);

    expect(identity.userId).toBe(USER_ID);
    expect(identity.organisation.id).toBe(ORG_ID);
    expect(identity.person.id).toBe(PERSON_ID);
    expect(identity.memberships).toHaveLength(1);
    expect(identity.projectAssignments).toHaveLength(1);
    expect(identity.projectAssignments[0].projectId).toBe(PROJECT_ID);
  });

  it('rejects a missing user profile', async () => {
    const client = createMockClient({
      user_profiles: { data: null, error: null },
    });

    await expect(new IdentityService(client as never).resolve(USER_ID)).rejects.toMatchObject({
      code: 'IDENTITY_UNRESOLVED',
    });
  });

  it('rejects cross-tenant person data', async () => {
    const client = createMockClient({
      user_profiles: { data: { user_id: USER_ID, organisation_id: ORG_ID, person_id: PERSON_ID }, error: null },
      persons: { data: { id: PERSON_ID, organisation_id: '99999999-9999-4999-8999-999999999999', display_name: 'WRONG TENANT' }, error: null },
    });

    await expect(new IdentityService(client as never).resolve(USER_ID)).rejects.toMatchObject({
      code: 'CROSS_TENANT_DATA',
    });
  });

  it('does not invent project access when there are no active assignments', async () => {
    const client = createMockClient({
      user_profiles: { data: { user_id: USER_ID, organisation_id: ORG_ID, person_id: PERSON_ID }, error: null },
      persons: { data: { id: PERSON_ID, organisation_id: ORG_ID, display_name: 'ORG A WORKER' }, error: null },
      organisations: { data: { id: ORG_ID, name: 'Organisation A' }, error: null },
      company_memberships: { data: [{ id: MEMBERSHIP_ID, organisation_id: ORG_ID, company_id: COMPANY_ID, person_id: PERSON_ID, status: 'ACTIVE' }], error: null },
      project_assignments: { data: [], error: null },
    });

    const identity = await new IdentityService(client as never).resolve(USER_ID);

    expect(identity.projectAssignments).toEqual([]);
  });

  it('preserves Supabase query errors as typed identity errors', async () => {
    const client = createMockClient({
      user_profiles: { data: null, error: { message: 'permission denied' } },
    });

    await expect(new IdentityService(client as never).resolve(USER_ID)).rejects.toEqual(
      expect.objectContaining<Partial<IdentityServiceError>>({
        code: 'IDENTITY_UNRESOLVED',
        message: 'permission denied',
      }),
    );
  });
});
