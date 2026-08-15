\set ON_ERROR_STOP on

BEGIN;

DO $$
DECLARE
    v_event_id UUID;
    v_audit_id UUID;
    v_command_id UUID := 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1';
BEGIN
    IF current_user <> 'postgres' THEN
        RAISE EXCEPTION 'FAIL: phase2_append_only.sql must run as postgres';
    END IF;

    INSERT INTO public.attendance_events (
        command_id, organisation_id, project_id, company_id, person_id,
        project_assignment_id, event_type, occurred_at_utc
    ) VALUES (
        'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2',
        '00000000-0000-4000-8000-000000000001',
        '00000000-0000-4000-8000-000000000020',
        '00000000-0000-4000-8000-000000000010',
        '00000000-0000-4000-8000-000000000013',
        '33333333-3333-4333-8333-333333333334',
        'ATTENDANCE_CHECK_IN',
        '2099-02-20 08:00:00+00'
    ) RETURNING id INTO v_event_id;

    BEGIN
        UPDATE public.attendance_events SET event_type='ATTENDANCE_CHECK_OUT' WHERE id=v_event_id;
        RAISE EXCEPTION 'FAIL: attendance_events UPDATE was allowed';
    EXCEPTION WHEN SQLSTATE 'SB001' THEN NULL;
    END;

    BEGIN
        DELETE FROM public.attendance_events WHERE id=v_event_id;
        RAISE EXCEPTION 'FAIL: attendance_events DELETE was allowed';
    EXCEPTION WHEN SQLSTATE 'SB001' THEN NULL;
    END;

    INSERT INTO public.processed_commands (
        command_id, actor_user_id, command_type, aggregate_id, result
    ) VALUES (
        v_command_id,
        '11111111-1111-4111-8111-111111111112',
        'TEST_COMMAND',
        'phase2:append-only',
        jsonb_build_object('status','ACCEPTED')
    );

    BEGIN
        UPDATE public.processed_commands
        SET result=jsonb_build_object('status','HACKED')
        WHERE command_id=v_command_id
          AND actor_user_id='11111111-1111-4111-8111-111111111112';
        RAISE EXCEPTION 'FAIL: processed_commands UPDATE was allowed';
    EXCEPTION WHEN SQLSTATE 'SB001' THEN NULL;
    END;

    BEGIN
        DELETE FROM public.processed_commands
        WHERE command_id=v_command_id
          AND actor_user_id='11111111-1111-4111-8111-111111111112';
        RAISE EXCEPTION 'FAIL: processed_commands DELETE was allowed';
    EXCEPTION WHEN SQLSTATE 'SB001' THEN NULL;
    END;

    INSERT INTO public.audit_events (action, entity_type, entity_id)
    VALUES ('TEST_AUDIT_EVENT','TEST','cccccccc-cccc-4ccc-8ccc-ccccccccccc1')
    RETURNING id INTO v_audit_id;

    BEGIN
        UPDATE public.audit_events SET action='HACKED_AUDIT' WHERE id=v_audit_id;
        RAISE EXCEPTION 'FAIL: audit_events UPDATE was allowed';
    EXCEPTION WHEN SQLSTATE 'SB001' THEN NULL;
    END;

    BEGIN
        DELETE FROM public.audit_events WHERE id=v_audit_id;
        RAISE EXCEPTION 'FAIL: audit_events DELETE was allowed';
    EXCEPTION WHEN SQLSTATE 'SB001' THEN NULL;
    END;
END $$;

ROLLBACK;

DO $$
DECLARE
    v_sqlstate TEXT;
BEGIN
    BEGIN
        EXECUTE 'SET LOCAL ROLE authenticated';
        UPDATE public.audit_events SET action='HACKED' WHERE false;
        RAISE EXCEPTION 'FAIL: authenticated UPDATE on audit_events was allowed';
    EXCEPTION WHEN insufficient_privilege THEN NULL;
    END;

    BEGIN
        EXECUTE 'SET LOCAL ROLE authenticated';
        DELETE FROM public.audit_events WHERE false;
        RAISE EXCEPTION 'FAIL: authenticated DELETE on audit_events was allowed';
    EXCEPTION WHEN insufficient_privilege THEN NULL;
    END;

    BEGIN
        EXECUTE 'SET LOCAL ROLE authenticated';
        UPDATE public.processed_commands SET result='{}'::jsonb WHERE false;
        RAISE EXCEPTION 'FAIL: authenticated UPDATE on processed_commands was allowed';
    EXCEPTION WHEN insufficient_privilege THEN NULL;
    END;

    BEGIN
        EXECUTE 'SET LOCAL ROLE authenticated';
        DELETE FROM public.processed_commands WHERE false;
        RAISE EXCEPTION 'FAIL: authenticated DELETE on processed_commands was allowed';
    EXCEPTION WHEN insufficient_privilege THEN NULL;
    END;

    BEGIN
        EXECUTE 'SET LOCAL ROLE authenticated';
        UPDATE public.attendance_events SET event_type='ATTENDANCE_CHECK_OUT' WHERE false;
        RAISE EXCEPTION 'FAIL: authenticated UPDATE on attendance_events was allowed';
    EXCEPTION WHEN insufficient_privilege THEN NULL;
    END;

    BEGIN
        EXECUTE 'SET LOCAL ROLE authenticated';
        DELETE FROM public.attendance_events WHERE false;
        RAISE EXCEPTION 'FAIL: authenticated DELETE on attendance_events was allowed';
    EXCEPTION WHEN insufficient_privilege THEN NULL;
    END;
END $$;

SELECT 'phase2_append_only: PASS' AS result;
