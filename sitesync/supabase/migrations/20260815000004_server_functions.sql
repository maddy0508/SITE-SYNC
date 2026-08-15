-- ==========================================
-- M1.2 Server functions / trust boundary
-- ==========================================

ALTER TABLE public.processed_commands
    DROP CONSTRAINT IF EXISTS processed_commands_pkey;

ALTER TABLE public.processed_commands
    ALTER COLUMN actor_user_id SET NOT NULL;

ALTER TABLE public.processed_commands
    ADD PRIMARY KEY (command_id, actor_user_id);

CREATE OR REPLACE FUNCTION public.finalize_failed_command(
    p_command_id UUID,
    p_command_type TEXT,
    p_aggregate_id TEXT,
    p_actor_user_id UUID,
    p_device_installation_id UUID,
    p_organisation_id UUID,
    p_project_id UUID,
    p_company_id UUID,
    p_person_id UUID,
    p_error_reason TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_result JSONB;
BEGIN
    v_result := jsonb_build_object(
        'status', 'PERMISSION_DENIED',
        'error_reason', p_error_reason
    );

    INSERT INTO public.processed_commands (
        command_id,
        command_type,
        aggregate_id,
        actor_user_id,
        device_installation_id,
        organisation_id,
        project_id,
        company_id,
        person_id,
        result
    )
    VALUES (
        p_command_id,
        p_command_type,
        p_aggregate_id,
        p_actor_user_id,
        p_device_installation_id,
        p_organisation_id,
        p_project_id,
        p_company_id,
        p_person_id,
        v_result
    )
    ON CONFLICT (command_id, actor_user_id)
    DO NOTHING;

    INSERT INTO public.audit_events (
        command_id,
        actor_user_id,
        device_installation_id,
        organisation_id,
        project_id,
        company_id,
        target_person_id,
        action,
        entity_type,
        entity_id,
        error_reason
    )
    VALUES (
        p_command_id,
        p_actor_user_id,
        p_device_installation_id,
        p_organisation_id,
        p_project_id,
        p_company_id,
        p_person_id,
        'COMMAND_DENIED',
        'COMMAND',
        p_command_id,
        p_error_reason
    );

    RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION public.register_device_installation(
    p_installation_key TEXT,
    p_device_name TEXT DEFAULT NULL,
    p_app_version TEXT DEFAULT NULL,
    p_os_version TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_person_id UUID;
    v_installation public.device_installations%ROWTYPE;
BEGIN
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object(
            'status', 'PERMISSION_DENIED',
            'error_reason', 'AUTHENTICATION_REQUIRED'
        );
    END IF;

    IF p_installation_key IS NULL
       OR length(trim(p_installation_key)) = 0 THEN
        RETURN jsonb_build_object(
            'status', 'INVALID',
            'error_reason', 'INSTALLATION_KEY_REQUIRED'
        );
    END IF;

    SELECT up.person_id
    INTO v_person_id
    FROM public.user_profiles up
    WHERE up.user_id = v_user_id;

    IF v_person_id IS NULL THEN
        RETURN jsonb_build_object(
            'status', 'PERMISSION_DENIED',
            'error_reason', 'USER_PROFILE_NOT_FOUND'
        );
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM public.company_memberships cm
        WHERE cm.person_id = v_person_id
          AND cm.status = 'ACTIVE'
    ) THEN
        RETURN jsonb_build_object(
            'status', 'PERMISSION_DENIED',
            'error_reason', 'ACTIVE_MEMBERSHIP_REQUIRED'
        );
    END IF;

    SELECT *
    INTO v_installation
    FROM public.device_installations di
    WHERE di.user_id = v_user_id
      AND di.installation_key = trim(p_installation_key)
    FOR UPDATE;

    IF FOUND THEN
        IF v_installation.status = 'REVOKED' THEN
            RETURN jsonb_build_object(
                'status', 'DEVICE_REVOKED',
                'error_reason', 'INSTALLATION_REVOKED',
                'device_installation_id', v_installation.id
            );
        END IF;

        UPDATE public.device_installations
        SET
            device_name = p_device_name,
            app_version = p_app_version,
            os_version = p_os_version,
            last_seen_at = NOW()
        WHERE id = v_installation.id
        RETURNING * INTO v_installation;
    ELSE
        INSERT INTO public.device_installations (
            user_id,
            installation_key,
            device_name,
            app_version,
            os_version
        )
        VALUES (
            v_user_id,
            trim(p_installation_key),
            p_device_name,
            p_app_version,
            p_os_version
        )
        RETURNING * INTO v_installation;
    END IF;

    RETURN jsonb_build_object(
        'status', 'REGISTERED',
        'device_installation_id', v_installation.id,
        'installation_key', v_installation.installation_key,
        'device_name', v_installation.device_name,
        'app_version', v_installation.app_version,
        'os_version', v_installation.os_version,
        'last_seen_at', v_installation.last_seen_at
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.process_command(
    p_command JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_actor_user_id UUID := auth.uid();
    v_command_id UUID;
    v_command_type TEXT;
    v_base_revision INTEGER;
    v_organisation_id UUID;
    v_project_id UUID;
    v_company_id UUID;
    v_person_id UUID;
    v_device_installation_id UUID;
    v_occurred_at_utc TIMESTAMPTZ;
    v_device_time_utc TIMESTAMPTZ;
    v_work_date DATE;
    v_assignment_id UUID;
    v_assignment_status TEXT;
    v_membership_status TEXT;
    v_participation_status TEXT;
    v_current_state public.attendance_states%ROWTYPE;
    v_current_revision INTEGER;
    v_new_revision INTEGER;
    v_event_id UUID;
    v_start_utc TIMESTAMPTZ;
    v_finish_utc TIMESTAMPTZ;
    v_total_minutes INTEGER;
    v_device_status TEXT;
    v_result JSONB;
    v_existing_result JSONB;
BEGIN
    IF v_actor_user_id IS NULL THEN
        RETURN jsonb_build_object('status','PERMISSION_DENIED','error_reason','AUTHENTICATION_REQUIRED');
    END IF;

    BEGIN
        v_command_id := NULLIF(p_command->>'command_id','')::UUID;
        v_command_type := NULLIF(p_command->>'command_type','');
        v_base_revision := COALESCE((p_command->>'base_revision')::INTEGER,0);
        v_organisation_id := NULLIF(p_command->>'organisation_id','')::UUID;
        v_project_id := NULLIF(p_command->>'project_id','')::UUID;
        v_company_id := NULLIF(p_command->>'company_id','')::UUID;
        v_person_id := NULLIF(p_command->>'person_id','')::UUID;
        v_device_installation_id := NULLIF(p_command->>'device_installation_id','')::UUID;
        v_occurred_at_utc := NULLIF(p_command->>'occurred_at_utc','')::TIMESTAMPTZ;
        v_device_time_utc := NULLIF(p_command->>'device_time_utc','')::TIMESTAMPTZ;
        v_work_date := NULLIF(p_command->>'work_date','')::DATE;
    EXCEPTION WHEN OTHERS THEN
        RETURN jsonb_build_object('status','INVALID','error_reason','MALFORMED_COMMAND');
    END;

    IF v_command_id IS NULL OR v_command_type IS NULL OR v_organisation_id IS NULL
       OR v_project_id IS NULL OR v_company_id IS NULL OR v_person_id IS NULL
       OR v_device_installation_id IS NULL OR v_occurred_at_utc IS NULL OR v_work_date IS NULL THEN
        RETURN jsonb_build_object('status','INVALID','error_reason','REQUIRED_FIELD_MISSING');
    END IF;

    IF v_command_type NOT IN ('ATTENDANCE_CHECK_IN','ATTENDANCE_CHECK_OUT') THEN
        RETURN jsonb_build_object('status','INVALID','error_reason','UNSUPPORTED_COMMAND_TYPE');
    END IF;

    IF v_base_revision < 0 THEN
        RETURN jsonb_build_object('status','INVALID','error_reason','INVALID_BASE_REVISION');
    END IF;

    IF v_work_date <> (v_occurred_at_utc AT TIME ZONE 'UTC')::DATE THEN
        RETURN jsonb_build_object('status','INVALID','error_reason','WORK_DATE_MISMATCH');
    END IF;

    SELECT pc.result
    INTO v_existing_result
    FROM public.processed_commands pc
    WHERE pc.command_id = v_command_id
      AND pc.actor_user_id = v_actor_user_id;

    IF FOUND THEN
        RETURN v_existing_result;
    END IF;

    SELECT di.status INTO v_device_status
    FROM public.device_installations di
    WHERE di.id = v_device_installation_id
      AND di.user_id = v_actor_user_id;

    IF v_device_status IS NULL THEN
        RETURN public.finalize_failed_command(v_command_id,v_command_type,v_command_id::TEXT,v_actor_user_id,v_device_installation_id,v_organisation_id,v_project_id,v_company_id,v_person_id,'DEVICE_NOT_REGISTERED');
    END IF;

    IF v_device_status = 'REVOKED' THEN
        RETURN public.finalize_failed_command(v_command_id,v_command_type,v_command_id::TEXT,v_actor_user_id,v_device_installation_id,v_organisation_id,v_project_id,v_company_id,v_person_id,'DEVICE_REVOKED');
    END IF;

    IF v_person_id <> public.current_person_id() THEN
        IF NOT EXISTS (
            SELECT 1
            FROM public.project_assignments actor_pa
            JOIN public.project_assignments target_pa ON target_pa.project_id = actor_pa.project_id
            WHERE actor_pa.person_id = public.current_person_id()
              AND actor_pa.project_id = v_project_id
              AND actor_pa.status = 'ACTIVE'
              AND actor_pa.project_role IN ('SUPERVISOR','ADMIN')
              AND target_pa.person_id = v_person_id
              AND target_pa.status = 'ACTIVE'
        ) THEN
            RETURN public.finalize_failed_command(v_command_id,v_command_type,v_command_id::TEXT,v_actor_user_id,v_device_installation_id,v_organisation_id,v_project_id,v_company_id,v_person_id,'WORKER_CANNOT_ACT_FOR_OTHER');
        END IF;
    END IF;

    SELECT pa.id, pa.status, cm.status, pcp.status
    INTO v_assignment_id, v_assignment_status, v_membership_status, v_participation_status
    FROM public.project_assignments pa
    JOIN public.company_memberships cm
      ON cm.organisation_id = pa.organisation_id
     AND cm.id = pa.company_membership_id
     AND cm.company_id = pa.company_id
     AND cm.person_id = pa.person_id
    JOIN public.project_company_participation pcp
      ON pcp.organisation_id = pa.organisation_id
     AND pcp.project_id = pa.project_id
     AND pcp.company_id = pa.company_id
    WHERE pa.organisation_id = v_organisation_id
      AND pa.project_id = v_project_id
      AND pa.company_id = v_company_id
      AND pa.person_id = v_person_id
    FOR UPDATE OF pa;

    IF v_assignment_id IS NULL THEN
        RETURN public.finalize_failed_command(v_command_id,v_command_type,v_command_id::TEXT,v_actor_user_id,v_device_installation_id,v_organisation_id,v_project_id,v_company_id,v_person_id,'TARGET_ASSIGNMENT_NOT_FOUND');
    END IF;

    IF v_membership_status <> 'ACTIVE' THEN
        RETURN public.finalize_failed_command(v_command_id,v_command_type,v_command_id::TEXT,v_actor_user_id,v_device_installation_id,v_organisation_id,v_project_id,v_company_id,v_person_id,'MEMBERSHIP_INACTIVE');
    END IF;

    IF v_assignment_status <> 'ACTIVE' THEN
        RETURN public.finalize_failed_command(v_command_id,v_command_type,v_command_id::TEXT,v_actor_user_id,v_device_installation_id,v_organisation_id,v_project_id,v_company_id,v_person_id,'ASSIGNMENT_INACTIVE');
    END IF;

    IF v_participation_status <> 'ACTIVE' THEN
        RETURN public.finalize_failed_command(v_command_id,v_command_type,v_command_id::TEXT,v_actor_user_id,v_device_installation_id,v_organisation_id,v_project_id,v_company_id,v_person_id,'PROJECT_COMPANY_INACTIVE');
    END IF;

    SELECT * INTO v_current_state
    FROM public.attendance_states
    WHERE organisation_id=v_organisation_id
      AND project_id=v_project_id
      AND company_id=v_company_id
      AND person_id=v_person_id
      AND work_date=v_work_date
    FOR UPDATE;

    IF FOUND THEN
        v_current_revision := v_current_state.current_revision;
        IF v_base_revision <> v_current_revision THEN
            RETURN public.finalize_failed_command(v_command_id,v_command_type,v_command_id::TEXT,v_actor_user_id,v_device_installation_id,v_organisation_id,v_project_id,v_company_id,v_person_id,'REVISION_CONFLICT');
        END IF;
    ELSE
        v_current_revision := 0;
        IF v_base_revision <> 0 THEN
            RETURN public.finalize_failed_command(v_command_id,v_command_type,v_command_id::TEXT,v_actor_user_id,v_device_installation_id,v_organisation_id,v_project_id,v_company_id,v_person_id,'REVISION_CONFLICT');
        END IF;
    END IF;

    IF v_command_type='ATTENDANCE_CHECK_IN' THEN
        IF FOUND AND v_current_state.status='CHECKED_IN' THEN
            RETURN public.finalize_failed_command(v_command_id,v_command_type,v_command_id::TEXT,v_actor_user_id,v_device_installation_id,v_organisation_id,v_project_id,v_company_id,v_person_id,'ALREADY_CHECKED_IN');
        END IF;
    ELSE
        IF NOT FOUND OR v_current_state.status<>'CHECKED_IN' THEN
            RETURN public.finalize_failed_command(v_command_id,v_command_type,v_command_id::TEXT,v_actor_user_id,v_device_installation_id,v_organisation_id,v_project_id,v_company_id,v_person_id,'NOT_CHECKED_IN');
        END IF;
    END IF;

    v_new_revision := v_current_revision + 1;

    INSERT INTO public.attendance_events (
        command_id, organisation_id, project_id, company_id, person_id,
        project_assignment_id, event_type, occurred_at_utc,
        device_time_utc, device_installation_id, created_by_user_id
    ) VALUES (
        v_command_id, v_organisation_id, v_project_id, v_company_id, v_person_id,
        v_assignment_id, v_command_type, v_occurred_at_utc,
        v_device_time_utc, v_device_installation_id, v_actor_user_id
    ) RETURNING id INTO v_event_id;

    INSERT INTO public.attendance_states (
        organisation_id, project_id, company_id, person_id, work_date,
        status, current_revision, last_command_id, updated_at
    ) VALUES (
        v_organisation_id, v_project_id, v_company_id, v_person_id, v_work_date,
        CASE WHEN v_command_type='ATTENDANCE_CHECK_IN' THEN 'CHECKED_IN' ELSE 'CHECKED_OUT' END,
        v_new_revision, v_command_id, NOW()
    )
    ON CONFLICT (project_id, person_id, work_date)
    DO UPDATE SET
        status=EXCLUDED.status,
        current_revision=EXCLUDED.current_revision,
        last_command_id=EXCLUDED.last_command_id,
        updated_at=EXCLUDED.updated_at;

    SELECT MIN(CASE WHEN ae.event_type='ATTENDANCE_CHECK_IN' THEN ae.occurred_at_utc END),
           MAX(CASE WHEN ae.event_type='ATTENDANCE_CHECK_OUT' THEN ae.occurred_at_utc END)
    INTO v_start_utc, v_finish_utc
    FROM public.attendance_events ae
    WHERE ae.organisation_id=v_organisation_id
      AND ae.project_id=v_project_id
      AND ae.company_id=v_company_id
      AND ae.person_id=v_person_id
      AND (ae.occurred_at_utc AT TIME ZONE 'UTC')::DATE=v_work_date;

    IF v_start_utc IS NOT NULL AND v_finish_utc IS NOT NULL THEN
        v_total_minutes := FLOOR(EXTRACT(EPOCH FROM (v_finish_utc-v_start_utc))/60)::INTEGER;
        IF v_total_minutes < 0 THEN
            RAISE EXCEPTION 'negative attendance duration' USING ERRCODE='SB002';
        END IF;

        INSERT INTO public.timesheets (
            organisation_id, project_id, company_id, person_id, work_date,
            start_utc, finish_utc, total_minutes, status,
            derivation_policy, source_attendance_state_revision, updated_at
        ) VALUES (
            v_organisation_id, v_project_id, v_company_id, v_person_id, v_work_date,
            v_start_utc, v_finish_utc, v_total_minutes, 'COMPLETE',
            'M1_FIRST_IN_LAST_OUT_UTC', v_new_revision, NOW()
        )
        ON CONFLICT (project_id, person_id, work_date)
        DO UPDATE SET
            start_utc=EXCLUDED.start_utc,
            finish_utc=EXCLUDED.finish_utc,
            total_minutes=EXCLUDED.total_minutes,
            status=EXCLUDED.status,
            derivation_policy=EXCLUDED.derivation_policy,
            source_attendance_state_revision=EXCLUDED.source_attendance_state_revision,
            updated_at=EXCLUDED.updated_at;
    ELSE
        INSERT INTO public.timesheets (
            organisation_id, project_id, company_id, person_id, work_date,
            start_utc, finish_utc, total_minutes, status,
            derivation_policy, source_attendance_state_revision, updated_at
        ) VALUES (
            v_organisation_id, v_project_id, v_company_id, v_person_id, v_work_date,
            v_start_utc, v_finish_utc, NULL, 'INCOMPLETE',
            'M1_FIRST_IN_LAST_OUT_UTC', v_new_revision, NOW()
        )
        ON CONFLICT (project_id, person_id, work_date)
        DO UPDATE SET
            start_utc=EXCLUDED.start_utc,
            finish_utc=EXCLUDED.finish_utc,
            total_minutes=EXCLUDED.total_minutes,
            status=EXCLUDED.status,
            derivation_policy=EXCLUDED.derivation_policy,
            source_attendance_state_revision=EXCLUDED.source_attendance_state_revision,
            updated_at=EXCLUDED.updated_at;
    END IF;

    v_result := jsonb_build_object(
        'status','ACCEPTED',
        'command_id',v_command_id,
        'event_id',v_event_id,
        'revision',v_new_revision,
        'project_id',v_project_id,
        'company_id',v_company_id,
        'person_id',v_person_id,
        'work_date',v_work_date,
        'event_type',v_command_type
    );

    INSERT INTO public.processed_commands (
        command_id, command_type, aggregate_id, actor_user_id,
        device_installation_id, organisation_id, project_id,
        company_id, person_id, result
    ) VALUES (
        v_command_id, v_command_type, v_person_id::TEXT, v_actor_user_id,
        v_device_installation_id, v_organisation_id, v_project_id,
        v_company_id, v_person_id, v_result
    );

    INSERT INTO public.audit_events (
        command_id, actor_user_id, device_installation_id,
        organisation_id, project_id, company_id, target_person_id,
        action, entity_type, entity_id, after_state
    ) VALUES (
        v_command_id, v_actor_user_id, v_device_installation_id,
        v_organisation_id, v_project_id, v_company_id, v_person_id,
        'COMMAND_ACCEPTED', 'ATTENDANCE_EVENT', v_event_id, v_result
    );

    RETURN v_result;
EXCEPTION
    WHEN unique_violation THEN
        SELECT pc.result
        INTO v_existing_result
        FROM public.processed_commands pc
        WHERE pc.command_id=v_command_id
          AND pc.actor_user_id=v_actor_user_id;

        IF v_existing_result IS NOT NULL THEN
            RETURN v_existing_result;
        END IF;

        RAISE;
END;
$$;

ALTER FUNCTION public.finalize_failed_command(UUID,TEXT,TEXT,UUID,UUID,UUID,UUID,UUID,UUID,TEXT) OWNER TO postgres;
ALTER FUNCTION public.register_device_installation(TEXT,TEXT,TEXT,TEXT) OWNER TO postgres;
ALTER FUNCTION public.process_command(JSONB) OWNER TO postgres;

REVOKE ALL ON FUNCTION public.finalize_failed_command(UUID,TEXT,TEXT,UUID,UUID,UUID,UUID,UUID,UUID,TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.register_device_installation(TEXT,TEXT,TEXT,TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.process_command(JSONB) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.register_device_installation(TEXT,TEXT,TEXT,TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.process_command(JSONB) TO authenticated;
