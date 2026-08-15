-- ==========================================
-- M1.2 RLS helpers, policies, write restrictions.
-- Visibility: workers self-only; supervisors/admins project-scoped.
-- ==========================================

DROP FUNCTION IF EXISTS public.visible_project_ids();
DROP FUNCTION IF EXISTS public.visible_company_ids();

CREATE OR REPLACE FUNCTION public.current_person_id()
RETURNS UUID LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
    SELECT person_id FROM public.user_profiles WHERE user_id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.current_organisation_id()
RETURNS UUID LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
    SELECT organisation_id FROM public.user_profiles WHERE user_id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.is_project_supervisor_or_admin(p_project_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.project_assignments pa
        WHERE pa.project_id = p_project_id
          AND pa.person_id = public.current_person_id()
          AND pa.status = 'ACTIVE'
          AND pa.project_role IN ('SUPERVISOR', 'ADMIN')
    );
$$;

ALTER FUNCTION public.current_person_id() OWNER TO postgres;
ALTER FUNCTION public.current_organisation_id() OWNER TO postgres;
ALTER FUNCTION public.is_project_supervisor_or_admin(UUID) OWNER TO postgres;

REVOKE EXECUTE ON FUNCTION public.current_person_id() FROM public, anon;
REVOKE EXECUTE ON FUNCTION public.current_organisation_id() FROM public, anon;
REVOKE EXECUTE ON FUNCTION public.is_project_supervisor_or_admin(UUID) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.current_person_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_organisation_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_project_supervisor_or_admin(UUID) TO authenticated;

CREATE POLICY user_profiles_select_own ON public.user_profiles FOR SELECT TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY organisations_select_own ON public.organisations FOR SELECT TO authenticated
    USING (id = public.current_organisation_id());

CREATE POLICY companies_select_self_or_supervisor ON public.companies FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.company_memberships cm
            WHERE cm.company_id = companies.id
              AND cm.person_id = public.current_person_id()
              AND cm.status = 'ACTIVE'
        )
        OR EXISTS (
            SELECT 1 FROM public.project_company_participation pcp
            WHERE pcp.company_id = companies.id
              AND pcp.status = 'ACTIVE'
              AND public.is_project_supervisor_or_admin(pcp.project_id)
        )
    );

CREATE POLICY persons_select_self_or_supervisor ON public.persons FOR SELECT TO authenticated
    USING (
        id = public.current_person_id()
        OR EXISTS (
            SELECT 1 FROM public.project_assignments pa
            WHERE pa.person_id = persons.id
              AND pa.status = 'ACTIVE'
              AND public.is_project_supervisor_or_admin(pa.project_id)
        )
    );

CREATE POLICY company_memberships_select_self_or_supervisor ON public.company_memberships FOR SELECT TO authenticated
    USING (
        person_id = public.current_person_id()
        OR EXISTS (
            SELECT 1 FROM public.project_assignments pa
            WHERE pa.company_membership_id = company_memberships.id
              AND pa.status = 'ACTIVE'
              AND public.is_project_supervisor_or_admin(pa.project_id)
        )
    );

CREATE POLICY projects_select_self_or_supervisor ON public.projects FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.project_assignments pa
            WHERE pa.project_id = projects.id
              AND pa.person_id = public.current_person_id()
              AND pa.status = 'ACTIVE'
        )
        OR public.is_project_supervisor_or_admin(projects.id)
    );

CREATE POLICY project_company_participation_select_self_or_supervisor
    ON public.project_company_participation FOR SELECT TO authenticated
    USING (
        (
            EXISTS (
                SELECT 1 FROM public.project_assignments pa
                WHERE pa.project_id = project_company_participation.project_id
                  AND pa.person_id = public.current_person_id()
                  AND pa.status = 'ACTIVE'
            )
            AND EXISTS (
                SELECT 1 FROM public.company_memberships cm
                WHERE cm.company_id = project_company_participation.company_id
                  AND cm.person_id = public.current_person_id()
                  AND cm.status = 'ACTIVE'
            )
        )
        OR public.is_project_supervisor_or_admin(project_company_participation.project_id)
    );

CREATE POLICY project_assignments_select_self_or_supervisor ON public.project_assignments FOR SELECT TO authenticated
    USING (person_id = public.current_person_id() OR public.is_project_supervisor_or_admin(project_id));

CREATE POLICY device_installations_select_own ON public.device_installations FOR SELECT TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY attendance_events_select_self_or_supervisor ON public.attendance_events FOR SELECT TO authenticated
    USING (person_id = public.current_person_id() OR public.is_project_supervisor_or_admin(project_id));

CREATE POLICY attendance_states_select_self_or_supervisor ON public.attendance_states FOR SELECT TO authenticated
    USING (person_id = public.current_person_id() OR public.is_project_supervisor_or_admin(project_id));

CREATE POLICY timesheets_select_self_or_supervisor ON public.timesheets FOR SELECT TO authenticated
    USING (person_id = public.current_person_id() OR public.is_project_supervisor_or_admin(project_id));

REVOKE ALL ON public.organisations FROM PUBLIC;
REVOKE ALL ON public.companies FROM PUBLIC;
REVOKE ALL ON public.persons FROM PUBLIC;
REVOKE ALL ON public.user_profiles FROM PUBLIC;
REVOKE ALL ON public.company_memberships FROM PUBLIC;
REVOKE ALL ON public.projects FROM PUBLIC;
REVOKE ALL ON public.project_company_participation FROM PUBLIC;
REVOKE ALL ON public.project_assignments FROM PUBLIC;
REVOKE ALL ON public.device_installations FROM PUBLIC;
REVOKE ALL ON public.attendance_events FROM PUBLIC;
REVOKE ALL ON public.attendance_states FROM PUBLIC;
REVOKE ALL ON public.timesheets FROM PUBLIC;
REVOKE ALL ON public.processed_commands FROM PUBLIC;
REVOKE ALL ON public.audit_events FROM PUBLIC;

REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.organisations FROM authenticated, anon;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.companies FROM authenticated, anon;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.persons FROM authenticated, anon;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.user_profiles FROM authenticated, anon;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.company_memberships FROM authenticated, anon;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.projects FROM authenticated, anon;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.project_company_participation FROM authenticated, anon;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.project_assignments FROM authenticated, anon;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.device_installations FROM authenticated, anon;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.attendance_events FROM authenticated, anon;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.attendance_states FROM authenticated, anon;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.timesheets FROM authenticated, anon;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.processed_commands FROM authenticated, anon;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.audit_events FROM authenticated, anon;

GRANT SELECT ON public.organisations TO authenticated;
GRANT SELECT ON public.companies TO authenticated;
GRANT SELECT ON public.persons TO authenticated;
GRANT SELECT ON public.user_profiles TO authenticated;
GRANT SELECT ON public.company_memberships TO authenticated;
GRANT SELECT ON public.projects TO authenticated;
GRANT SELECT ON public.project_company_participation TO authenticated;
GRANT SELECT ON public.project_assignments TO authenticated;
GRANT SELECT ON public.device_installations TO authenticated;
GRANT SELECT ON public.attendance_events TO authenticated;
GRANT SELECT ON public.attendance_states TO authenticated;
GRANT SELECT ON public.timesheets TO authenticated;

-- service_role is the privileged backend/test role. PUBLIC access was revoked above,
-- so its privileges must be explicit rather than inherited through PUBLIC.
GRANT ALL ON public.organisations TO service_role;
GRANT ALL ON public.companies TO service_role;
GRANT ALL ON public.persons TO service_role;
GRANT ALL ON public.user_profiles TO service_role;
GRANT ALL ON public.company_memberships TO service_role;
GRANT ALL ON public.projects TO service_role;
GRANT ALL ON public.project_company_participation TO service_role;
GRANT ALL ON public.project_assignments TO service_role;
GRANT ALL ON public.device_installations TO service_role;
GRANT ALL ON public.attendance_events TO service_role;
GRANT ALL ON public.attendance_states TO service_role;
GRANT ALL ON public.timesheets TO service_role;
GRANT ALL ON public.processed_commands TO service_role;
GRANT ALL ON public.audit_events TO service_role;