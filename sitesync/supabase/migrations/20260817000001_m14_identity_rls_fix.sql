-- M1.4 RLS safety fix: helper functions prevent recursive policy evaluation.

CREATE OR REPLACE FUNCTION public.current_user_project_ids()
RETURNS SETOF UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT pa.project_id
    FROM public.project_assignments AS pa
    WHERE pa.organisation_id = (
        SELECT organisation_id FROM public.current_user_profile()
    )
      AND pa.person_id = (
        SELECT person_id FROM public.current_user_profile()
    )
      AND pa.status = 'ACTIVE';
$$;

CREATE OR REPLACE FUNCTION public.current_user_company_ids()
RETURNS SETOF UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT DISTINCT cm.company_id
    FROM public.company_memberships AS cm
    WHERE cm.organisation_id = (
        SELECT organisation_id FROM public.current_user_profile()
    )
      AND cm.person_id = (
        SELECT person_id FROM public.current_user_profile()
    )
      AND cm.status = 'ACTIVE';
$$;

REVOKE ALL ON FUNCTION public.current_user_project_ids() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.current_user_company_ids() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.current_user_project_ids() TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_user_company_ids() TO authenticated;

DROP POLICY IF EXISTS projects_select_authorised ON public.projects;
CREATE POLICY projects_select_authorised
ON public.projects
FOR SELECT
TO authenticated
USING (
    organisation_id = (SELECT organisation_id FROM public.current_user_profile())
    AND id IN (SELECT project_id FROM public.current_user_project_ids())
);

DROP POLICY IF EXISTS project_company_participation_select_authorised ON public.project_company_participation;
CREATE POLICY project_company_participation_select_authorised
ON public.project_company_participation
FOR SELECT
TO authenticated
USING (
    organisation_id = (SELECT organisation_id FROM public.current_user_profile())
    AND project_id IN (SELECT project_id FROM public.current_user_project_ids())
);

DROP POLICY IF EXISTS project_assignments_select_authorised ON public.project_assignments;
CREATE POLICY project_assignments_select_authorised
ON public.project_assignments
FOR SELECT
TO authenticated
USING (
    organisation_id = (SELECT organisation_id FROM public.current_user_profile())
    AND project_id IN (SELECT project_id FROM public.current_user_project_ids())
);

DROP POLICY IF EXISTS companies_select_authorised ON public.companies;
CREATE POLICY companies_select_authorised
ON public.companies
FOR SELECT
TO authenticated
USING (
    organisation_id = (SELECT organisation_id FROM public.current_user_profile())
    AND id IN (SELECT company_id FROM public.current_user_company_ids())
);
