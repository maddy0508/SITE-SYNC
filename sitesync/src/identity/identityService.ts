import type { SupabaseClient } from '@supabase/supabase-js';

export interface UserProfile {
  userId: string;
  organisationId: string;
  personId: string;
}

export interface Person {
  id: string;
  organisationId: string;
  displayName: string;
}

export interface Organisation {
  id: string;
  name: string;
}

export interface CompanyMembership {
  id: string;
  organisationId: string;
  companyId: string;
  personId: string;
  status: 'ACTIVE' | 'INACTIVE';
}

export interface ProjectAssignment {
  id: string;
  organisationId: string;
  projectId: string;
  companyId: string;
  companyMembershipId: string;
  personId: string;
  projectRole: 'WORKER' | 'SUPERVISOR' | 'ADMIN';
  status: 'ACTIVE' | 'INACTIVE';
}

export interface AuthenticatedIdentity {
  userId: string;
  profile: UserProfile;
  person: Person;
  organisation: Organisation;
  memberships: CompanyMembership[];
  projectAssignments: ProjectAssignment[];
}

export type IdentityErrorCode =
  | 'IDENTITY_UNRESOLVED'
  | 'PERSON_UNRESOLVED'
  | 'ORGANISATION_UNRESOLVED'
  | 'MEMBERSHIP_UNRESOLVED'
  | 'PROJECT_ASSIGNMENT_UNRESOLVED'
  | 'CROSS_TENANT_DATA';

export class IdentityServiceError extends Error {
  readonly code: IdentityErrorCode;

  constructor(code: IdentityErrorCode, message: string) {
    super(message);
    this.name = 'IdentityServiceError';
    this.code = code;
  }
}

type Row = Record<string, unknown>;

type QueryResult<T> = { data: T | null; error: { message: string } | null };

export class IdentityService {
  constructor(private readonly client: SupabaseClient) {}

  async resolve(userId: string): Promise<AuthenticatedIdentity> {
    if (!userId) throw new IdentityServiceError('IDENTITY_UNRESOLVED', 'Authenticated user id is required');

    const profileResult = await this.client
      .from('user_profiles')
      .select('user_id, organisation_id, person_id')
      .eq('user_id', userId)
      .maybeSingle() as unknown as QueryResult<Row>;

    if (profileResult.error) {
      throw new IdentityServiceError('IDENTITY_UNRESOLVED', profileResult.error.message);
    }
    if (!profileResult.data) {
      throw new IdentityServiceError('IDENTITY_UNRESOLVED', 'No user profile exists for authenticated user');
    }

    const profile: UserProfile = {
      userId: String(profileResult.data.user_id),
      organisationId: String(profileResult.data.organisation_id),
      personId: String(profileResult.data.person_id),
    };

    if (profile.userId !== userId) {
      throw new IdentityServiceError('IDENTITY_UNRESOLVED', 'Resolved profile does not belong to authenticated user');
    }

    const personResult = await this.client
      .from('persons')
      .select('id, organisation_id, display_name')
      .eq('id', profile.personId)
      .eq('organisation_id', profile.organisationId)
      .maybeSingle() as unknown as QueryResult<Row>;

    if (personResult.error) {
      throw new IdentityServiceError('PERSON_UNRESOLVED', personResult.error.message);
    }
    if (!personResult.data) {
      throw new IdentityServiceError('PERSON_UNRESOLVED', 'Authoritative person record could not be resolved');
    }

    const person: Person = {
      id: String(personResult.data.id),
      organisationId: String(personResult.data.organisation_id),
      displayName: String(personResult.data.display_name),
    };

    if (person.organisationId !== profile.organisationId) {
      throw new IdentityServiceError('CROSS_TENANT_DATA', 'Person organisation does not match profile organisation');
    }

    const organisationResult = await this.client
      .from('organisations')
      .select('id, name')
      .eq('id', profile.organisationId)
      .maybeSingle() as unknown as QueryResult<Row>;

    if (organisationResult.error) {
      throw new IdentityServiceError('ORGANISATION_UNRESOLVED', organisationResult.error.message);
    }
    if (!organisationResult.data) {
      throw new IdentityServiceError('ORGANISATION_UNRESOLVED', 'Authoritative organisation could not be resolved');
    }

    const organisation: Organisation = {
      id: String(organisationResult.data.id),
      name: String(organisationResult.data.name),
    };

    const membershipsResult = await this.client
      .from('company_memberships')
      .select('id, organisation_id, company_id, person_id, status')
      .eq('organisation_id', profile.organisationId)
      .eq('person_id', profile.personId)
      .eq('status', 'ACTIVE') as unknown as QueryResult<Row[]>;

    if (membershipsResult.error) {
      throw new IdentityServiceError('MEMBERSHIP_UNRESOLVED', membershipsResult.error.message);
    }

    const memberships = (membershipsResult.data ?? []).map((row): CompanyMembership => ({
      id: String(row.id),
      organisationId: String(row.organisation_id),
      companyId: String(row.company_id),
      personId: String(row.person_id),
      status: row.status as CompanyMembership['status'],
    }));

    if (memberships.some((membership) => membership.organisationId !== profile.organisationId || membership.personId !== profile.personId)) {
      throw new IdentityServiceError('CROSS_TENANT_DATA', 'Membership contains data outside the authenticated tenant');
    }

    const assignmentsResult = await this.client
      .from('project_assignments')
      .select('id, organisation_id, project_id, company_id, company_membership_id, person_id, project_role, status')
      .eq('organisation_id', profile.organisationId)
      .eq('person_id', profile.personId)
      .eq('status', 'ACTIVE') as unknown as QueryResult<Row[]>;

    if (assignmentsResult.error) {
      throw new IdentityServiceError('PROJECT_ASSIGNMENT_UNRESOLVED', assignmentsResult.error.message);
    }

    const projectAssignments = (assignmentsResult.data ?? []).map((row): ProjectAssignment => ({
      id: String(row.id),
      organisationId: String(row.organisation_id),
      projectId: String(row.project_id),
      companyId: String(row.company_id),
      companyMembershipId: String(row.company_membership_id),
      personId: String(row.person_id),
      projectRole: row.project_role as ProjectAssignment['projectRole'],
      status: row.status as ProjectAssignment['status'],
    }));

    if (projectAssignments.some((assignment) => assignment.organisationId !== profile.organisationId || assignment.personId !== profile.personId)) {
      throw new IdentityServiceError('CROSS_TENANT_DATA', 'Project assignment contains data outside the authenticated tenant');
    }

    return {
      userId,
      profile,
      person,
      organisation,
      memberships,
      projectAssignments,
    };
  }
}
