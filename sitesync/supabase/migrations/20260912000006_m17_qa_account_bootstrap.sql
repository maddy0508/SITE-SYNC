-- M1.7 PHYSICAL QA ONLY.
-- This bootstrap is deliberately scoped to @example.test accounts and the
-- isolated M17 organisation/project/company. Do NOT promote this migration
-- into production. It creates application identity records after a normal
-- Supabase Auth sign-up; it never creates or mutates auth.users credentials.

CREATE OR REPLACE FUNCTION public.m17_qa_bootstrap_current_user(
    p_display_name TEXT DEFAULT 'M17 QA WORKER',
    p_role TEXT DEFAULT 'WORKER'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_email TEXT;
    v_org UUID := 'aaaaaaaa-aaaa-aaaa-aaaa-100000000001';
    v_company UUID := 'bbbbbbbb-bbbb-bbbb-bbbb-200000000001';
    v_project UUID := 'eeeeeeee-eeee-eeee-eeee-500000000001';
    v_person UUID;
    v_membership UUID;
    v_assignment UUID;
    v_name TEXT := COALESCE(NULLIF(TRIM(p_display_name), ''), 'M17 QA WORKER');
    v_role TEXT := UPPER(COALESCE(NULLIF(TRIM(p_role), ''), 'WORKER'));
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'AUTH_REQUIRED';
    END IF;

    SELECT email INTO v_email FROM auth.users WHERE id = v_user_id;
    IF v_email IS NULL OR LOWER(v_email) NOT LIKE '%@example.test' THEN
        RAISE EXCEPTION 'M17_QA_REQUIRES_EXAMPLE_TEST_EMAIL';
    END IF;

    IF v_role NOT IN ('WORKER', 'SUPERVISOR') THEN
        RAISE EXCEPTION 'INVALID_QA_ROLE';
    END IF;

    SELECT person_id INTO v_person
    FROM public.user_profiles
    WHERE user_id = v_user_id;

    IF v_person IS NOT NULL THEN
        SELECT id INTO v_membership
        FROM public.company_memberships
        WHERE organisation_id = v_org
          AND company_id = v_company
          AND person_id = v_person;

        SELECT id INTO v_assignment
        FROM public.project_assignments
        WHERE organisation_id = v_org
          AND project_id = v_project
          AND person_id = v_person;

        RETURN jsonb_build_object(
            'user_id', v_user_id,
            'person_id', v_person,
            'membership_id', v_membership,
            'assignment_id', v_assignment,
            'project_id', v_project,
            'role', v_role,
            'status', 'EXISTING'
        );
    END IF;

    INSERT INTO public.persons (organisation_id, display_name)
    VALUES (v_org, v_name)
    RETURNING id INTO v_person;

    INSERT INTO public.user_profiles (user_id, organisation_id, person_id)
    VALUES (v_user_id, v_org, v_person);

    INSERT INTO public.company_memberships (organisation_id, company_id, person_id, status)
    VALUES (v_org, v_company, v_person, 'ACTIVE')
    RETURNING id INTO v_membership;

    INSERT INTO public.project_company_participation (organisation_id, project_id, company_id, status)
    VALUES (v_org, v_project, v_company, 'ACTIVE')
    ON CONFLICT (organisation_id, project_id, company_id)
    DO UPDATE SET status = 'ACTIVE';

    INSERT INTO public.project_assignments (
        organisation_id, project_id, company_id, company_membership_id,
        person_id, project_role, status
    )
    VALUES (
        v_org, v_project, v_company, v_membership,
        v_person, v_role, 'ACTIVE'
    )
    RETURNING id INTO v_assignment;

    RETURN jsonb_build_object(
        'user_id', v_user_id,
        'person_id', v_person,
        'membership_id', v_membership,
        'assignment_id', v_assignment,
        'project_id', v_project,
        'role', v_role,
        'status', 'CREATED'
    );
END;
$$;

REVOKE ALL ON FUNCTION public.m17_qa_bootstrap_current_user(TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.m17_qa_bootstrap_current_user(TEXT, TEXT) TO authenticated;
