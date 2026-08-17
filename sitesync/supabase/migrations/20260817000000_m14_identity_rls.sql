-- M1.4 identity and tenancy RLS boundary
--
-- RLS is intentionally expressed in terms of auth.uid() -> user_profiles ->
-- organisation/person, with project access gated by active membership and
-- assignment. No client-supplied organisation or project identifier is trusted.

CREATE OR REPLACE FUNCTION public.current_user_profile()
RETURNS TABLE (
    user_id UUID,
    organisation_id UUID,
    person_id UUID
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT up.user_id, up.organisation_id, up.person_id
    FROM public.user_profiles AS up
    WHERE up.user_id = auth.uid()
    LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.current_user_profile() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.current_user_profile() TO authenticated;

-- user_profiles: a user may only see their own authoritative identity link.
CREATE POLICY user_profiles_select_self
ON public.user_profiles
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Organisation is the tenant root. Users can only see their own tenant.
CREATE POLICY organisations_select_current_tenant
ON public.organisations
FOR SELECT
TO authenticated
USING (
    id = (SELECT organisation_id FROM public.current_user_profile())
);

-- Persons: only people in the caller's tenant are visible.
CREATE POLICY persons_select_current_tenant
ON public.persons
FOR SELECT
TO authenticated
USING (
    organisation_id = (SELECT organisation_id FROM public.current_user_profile())
);

-- Companies: tenant scoped.
CREATE POLICY companies_select_current_tenant
ON public.companies
FOR SELECT
TO authenticated
USING (
    organisation_id = (SELECT organisation_id FROM public.current_user_profile())
);

-- Memberships: tenant scoped, with the caller able to resolve their own
-- membership. Other tenant members are not exposed across organisations.
CREATE POLICY company_memberships_select_current_tenant
ON public.company_memberships
FOR SELECT
TO authenticated
USING (
    organisation_id = (SELECT organisation_id FROM public.current_user_profile())
);

-- Projects: only projects belonging to the caller's tenant and participating
-- in at least one active company relationship are visible.
CREATE POLICY projects_select_authorised
ON public.projects
FOR SELECT
TO authenticated
USING (
    organisation_id = (SELECT organisation_id FROM public.current_user_profile())
    AND EXISTS (
        SELECT 1
        FROM public.project_assignments AS pa
        WHERE pa.organisation_id = projects.organisation_id
          AND pa.project_id = projects.id
          AND pa.person_id = (SELECT person_id FROM public.current_user_profile())
          AND pa.status = 'ACTIVE'
    )
);

-- Project/company participation is visible only for an authorised project.
CREATE POLICY project_company_participation_select_authorised
ON public.project_company_participation
FOR SELECT
TO authenticated
USING (
    organisation_id = (SELECT organisation_id FROM public.current_user_profile())
    AND EXISTS (
        SELECT 1
        FROM public.project_assignments AS pa
        WHERE pa.organisation_id = project_company_participation.organisation_id
          AND pa.project_id = project_company_participation.project_id
          AND pa.person_id = (SELECT person_id FROM public.current_user_profile())
          AND pa.status = 'ACTIVE'
    )
);

-- Project assignments are visible only inside the caller's tenant and for
-- projects to which the caller is actively assigned.
CREATE POLICY project_assignments_select_authorised
ON public.project_assignments
FOR SELECT
TO authenticated
USING (
    organisation_id = (SELECT organisation_id FROM public.current_user_profile())
    AND EXISTS (
        SELECT 1
        FROM public.project_assignments AS own_assignment
        WHERE own_assignment.organisation_id = project_assignments.organisation_id
          AND own_assignment.project_id = project_assignments.project_id
          AND own_assignment.person_id = (SELECT person_id FROM public.current_user_profile())
          AND own_assignment.status = 'ACTIVE'
    )
);

-- Device installations are scoped to the authenticated user. This prevents
-- one authenticated user from reading another user's device registrations.
CREATE POLICY device_installations_select_self
ON public.device_installations
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY device_installations_insert_self
ON public.device_installations
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY device_installations_update_self
ON public.device_installations
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- No DELETE policies are provided intentionally. Device registrations are
-- revoked rather than deleted, preserving the audit trail.

-- Explicitly deny anonymous access by leaving all tables without anon
-- policies. RLS remains enabled from the foundation migrations.
