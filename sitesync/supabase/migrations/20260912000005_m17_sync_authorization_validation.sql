-- M1.7 adversarial hardening.
-- This migration closes authorization bypasses and ensures rejected commands are non-mutating.

CREATE OR REPLACE FUNCTION public.sitesync_sync_authorized(
    p_device_installation_id UUID,
    p_project_id UUID,
    p_person_id UUID
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
    SELECT auth.uid() IS NOT NULL
       AND EXISTS (
           SELECT 1
           FROM public.device_installations d
           WHERE d.id = p_device_installation_id
             AND d.user_id = auth.uid()
             AND d.status = 'ACTIVE'
       )
       AND EXISTS (
           SELECT 1
           FROM public.user_profiles up
           JOIN public.project_assignments actor_pa
             ON actor_pa.organisation_id = up.organisation_id
            AND actor_pa.person_id = up.person_id
            AND actor_pa.project_id = p_project_id
            AND actor_pa.status = 'ACTIVE'
           JOIN public.project_company_participation actor_pcp
             ON actor_pcp.organisation_id = actor_pa.organisation_id
            AND actor_pcp.project_id = actor_pa.project_id
            AND actor_pcp.company_id = actor_pa.company_id
            AND actor_pcp.status = 'ACTIVE'
           JOIN public.company_memberships actor_cm
             ON actor_cm.organisation_id = actor_pa.organisation_id
            AND actor_cm.id = actor_pa.company_membership_id
            AND actor_cm.company_id = actor_pa.company_id
            AND actor_cm.person_id = actor_pa.person_id
            AND actor_cm.status = 'ACTIVE'
           JOIN public.projects p
             ON p.id = p_project_id
            AND p.organisation_id = up.organisation_id
           JOIN public.project_assignments target_pa
             ON target_pa.organisation_id = up.organisation_id
            AND target_pa.project_id = p_project_id
            AND target_pa.person_id = p_person_id
            AND target_pa.status = 'ACTIVE'
            AND target_pa.company_id = actor_pa.company_id
           JOIN public.project_company_participation target_pcp
             ON target_pcp.organisation_id = target_pa.organisation_id
            AND target_pcp.project_id = target_pa.project_id
            AND target_pcp.company_id = target_pa.company_id
            AND target_pcp.status = 'ACTIVE'
           JOIN public.company_memberships target_cm
             ON target_cm.organisation_id = target_pa.organisation_id
            AND target_cm.id = target_pa.company_membership_id
            AND target_cm.company_id = target_pa.company_id
            AND target_cm.person_id = target_pa.person_id
            AND target_cm.status = 'ACTIVE'
           WHERE up.user_id = auth.uid()
       );
$$;

REVOKE ALL ON FUNCTION public.sitesync_sync_authorized(UUID, UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.sitesync_sync_authorized(UUID, UUID, UUID) TO authenticated;

-- A revoked installation is a monotonic security state. The owner may update
-- metadata, but an already-revoked installation cannot be reactivated through
-- the ordinary table API.
CREATE OR REPLACE FUNCTION public.sitesync_prevent_device_reactivation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    IF OLD.status = 'REVOKED' AND NEW.status = 'ACTIVE' THEN
        RAISE EXCEPTION 'Revoked device installations cannot be reactivated';
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS device_installations_no_reactivation ON public.device_installations;
CREATE TRIGGER device_installations_no_reactivation
BEFORE UPDATE ON public.device_installations
FOR EACH ROW EXECUTE FUNCTION public.sitesync_prevent_device_reactivation();

ALTER FUNCTION public.sitesync_prevent_device_reactivation() SET search_path = public, pg_temp;
REVOKE ALL ON FUNCTION public.sitesync_prevent_device_reactivation() FROM PUBLIC;

CREATE OR REPLACE FUNCTION public.sync_attendance_command(
    command_id UUID,
    device_installation_id UUID,
    project_id UUID,
    person_id UUID,
    work_date_utc DATE,
    base_revision BIGINT,
    command_type TEXT,
    payload JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    actor UUID := auth.uid();
    actor_org UUID;
    actor_person UUID;
    actor_assignment public.project_assignments%ROWTYPE;
    target_assignment public.project_assignments%ROWTYPE;
    aggregate public.sitesync_attendance_day%ROWTYPE;
    receipt public.sitesync_sync_command_receipt%ROWTYPE;
    new_revision BIGINT;
    event_type TEXT;
    occurred_at TIMESTAMPTZ;
    event_id UUID;
    result JSONB;
    payload_assignment TEXT;
    payload_source TEXT;
BEGIN
    IF actor IS NULL THEN
        RETURN jsonb_build_object('status','AUTHORIZATION_REJECTED','code','UNAUTHENTICATED','message','Authentication required');
    END IF;

    IF command_id IS NULL OR device_installation_id IS NULL OR project_id IS NULL OR person_id IS NULL
       OR work_date_utc IS NULL OR base_revision IS NULL OR command_type IS NULL OR payload IS NULL THEN
        RETURN jsonb_build_object('status','VALIDATION_REJECTED','code','REQUIRED_FIELD','message','Required sync field is missing');
    END IF;
    IF base_revision < 0 OR command_type NOT IN ('CHECK_IN','CHECK_OUT') THEN
        RETURN jsonb_build_object('status','VALIDATION_REJECTED','code','INVALID_COMMAND','message','Invalid command or revision');
    END IF;

    SELECT d.status INTO STRICT actor_assignment
    FROM public.device_installations d
    WHERE d.id = device_installation_id AND d.user_id = actor;
    -- The STRICT target above is intentionally not used for the status value;
    -- resolve the status separately so missing rows map to a stable authorization result.
    EXCEPTION WHEN NO_DATA_FOUND THEN
        RETURN jsonb_build_object('status','AUTHORIZATION_REJECTED','code','DEVICE_NOT_REGISTERED','message','Device is not registered to the authenticated user');
END;
$$;

-- Replace the temporary function body above with the complete hardened implementation.
CREATE OR REPLACE FUNCTION public.sync_attendance_command(
    command_id UUID,
    device_installation_id UUID,
    project_id UUID,
    person_id UUID,
    work_date_utc DATE,
    base_revision BIGINT,
    command_type TEXT,
    payload JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    actor UUID := auth.uid();
    device_status TEXT;
    actor_org UUID;
    actor_person UUID;
    actor_assignment public.project_assignments%ROWTYPE;
    target_assignment public.project_assignments%ROWTYPE;
    aggregate public.sitesync_attendance_day%ROWTYPE;
    receipt public.sitesync_sync_command_receipt%ROWTYPE;
    new_revision BIGINT;
    event_type TEXT;
    occurred_at TIMESTAMPTZ;
    event_id UUID;
    result JSONB;
    payload_assignment TEXT;
    payload_source TEXT;
BEGIN
    IF actor IS NULL THEN
        RETURN jsonb_build_object('status','AUTHORIZATION_REJECTED','code','UNAUTHENTICATED','message','Authentication required');
    END IF;

    IF command_id IS NULL OR device_installation_id IS NULL OR project_id IS NULL OR person_id IS NULL
       OR work_date_utc IS NULL OR base_revision IS NULL OR command_type IS NULL OR payload IS NULL THEN
        RETURN jsonb_build_object('status','VALIDATION_REJECTED','code','REQUIRED_FIELD','message','Required sync field is missing');
    END IF;
    IF base_revision < 0 OR command_type NOT IN ('CHECK_IN','CHECK_OUT') THEN
        RETURN jsonb_build_object('status','VALIDATION_REJECTED','code','INVALID_COMMAND','message','Invalid command or revision');
    END IF;

    SELECT d.status INTO device_status
    FROM public.device_installations d
    WHERE d.id = device_installation_id AND d.user_id = actor;
    IF device_status IS NULL THEN
        RETURN jsonb_build_object('status','AUTHORIZATION_REJECTED','code','DEVICE_NOT_REGISTERED','message','Device is not registered to the authenticated user');
    END IF;
    IF device_status <> 'ACTIVE' THEN
        RETURN jsonb_build_object('status','DEVICE_REVOKED','code','DEVICE_REVOKED','message','Device installation is revoked');
    END IF;

    SELECT up.organisation_id, up.person_id INTO actor_org, actor_person
    FROM public.user_profiles up WHERE up.user_id = actor;
    IF actor_org IS NULL THEN
        RETURN jsonb_build_object('status','AUTHORIZATION_REJECTED','code','NO_PROFILE','message','Authenticated user has no authoritative profile');
    END IF;

    payload_source := payload->>'source';
    IF payload_source NOT IN ('SELF','QR') THEN
        RETURN jsonb_build_object('status','VALIDATION_REJECTED','code','INVALID_SOURCE','message','Attendance source is invalid');
    END IF;

    IF NOT public.sitesync_sync_authorized(device_installation_id, project_id, person_id) THEN
        RETURN jsonb_build_object('status','AUTHORIZATION_REJECTED','code','NOT_AUTHORIZED','message','Actor is not authorized for this attendance aggregate');
    END IF;

    SELECT * INTO actor_assignment
    FROM public.project_assignments pa
    WHERE pa.organisation_id = actor_org AND pa.project_id = project_id
      AND pa.person_id = actor_person AND pa.status = 'ACTIVE';
    IF NOT FOUND THEN
        RETURN jsonb_build_object('status','AUTHORIZATION_REJECTED','code','ACTOR_UNASSIGNED','message','Authenticated actor has no active project assignment');
    END IF;

    IF payload_source = 'SELF' THEN
        IF person_id <> actor_person THEN
            RETURN jsonb_build_object('status','AUTHORIZATION_REJECTED','code','SELF_TARGET_MISMATCH','message','Self-service attendance can only target the authenticated person');
        END IF;
    ELSE
        IF actor_assignment.project_role NOT IN ('SUPERVISOR','ADMIN') THEN
            RETURN jsonb_build_object('status','AUTHORIZATION_REJECTED','code','ACTOR_NOT_PERMITTED','message','QR attendance requires an active supervisor or admin project assignment');
        END IF;
    END IF;

    payload_assignment := payload->>'projectAssignmentId';
    IF payload_assignment IS NULL OR payload_assignment !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' THEN
        RETURN jsonb_build_object('status','VALIDATION_REJECTED','code','INVALID_ASSIGNMENT','message','Project assignment identity is invalid');
    END IF;

    IF payload->>'eventId' IS NULL OR payload->>'clientOccurredAt' IS NULL THEN
        RETURN jsonb_build_object('status','VALIDATION_REJECTED','code','INVALID_PAYLOAD','message','Event identity and timestamp are required');
    END IF;
    BEGIN
        event_id := (payload->>'eventId')::UUID;
        occurred_at := (payload->>'clientOccurredAt')::TIMESTAMPTZ;
    EXCEPTION WHEN others THEN
        RETURN jsonb_build_object('status','VALIDATION_REJECTED','code','INVALID_PAYLOAD','message','Event identity or timestamp is invalid');
    END;
    IF occurred_at IS NULL OR occurred_at::DATE <> work_date_utc THEN
        RETURN jsonb_build_object('status','VALIDATION_REJECTED','code','WORK_DATE_MISMATCH','message','Event timestamp must belong to the aggregate UTC work date');
    END IF;

    IF (payload->>'commandId') IS DISTINCT FROM command_id::TEXT
       OR (payload->>'projectId') IS DISTINCT FROM project_id::TEXT
       OR (payload->>'personId') IS DISTINCT FROM person_id::TEXT
       OR (payload->>'workDateUtc') IS DISTINCT FROM work_date_utc::TEXT
       OR (payload->>'commandType') IS DISTINCT FROM command_type THEN
        RETURN jsonb_build_object('status','VALIDATION_REJECTED','code','PAYLOAD_MISMATCH','message','Payload does not match sync envelope');
    END IF;

    SELECT * INTO target_assignment
    FROM public.project_assignments pa
    WHERE pa.id = payload_assignment::UUID
      AND pa.organisation_id = actor_org
      AND pa.project_id = project_id
      AND pa.person_id = person_id
      AND pa.company_id = actor_assignment.company_id
      AND pa.status = 'ACTIVE';
    IF NOT FOUND THEN
        RETURN jsonb_build_object('status','VALIDATION_REJECTED','code','INVALID_ASSIGNMENT','message','Target project assignment is invalid');
    END IF;

    IF payload_source = 'SELF' AND target_assignment.id <> actor_assignment.id THEN
        RETURN jsonb_build_object('status','VALIDATION_REJECTED','code','SELF_ASSIGNMENT_MISMATCH','message','Self-service attendance must use the authenticated actor assignment');
    END IF;

    IF target_assignment.company_id <> actor_assignment.company_id THEN
        RETURN jsonb_build_object('status','AUTHORIZATION_REJECTED','code','TARGET_COMPANY_MISMATCH','message','Target worker belongs to a different company');
    END IF;

    -- Serialize creation and mutation for this aggregate without creating a
    -- placeholder row that could survive a rejected command.
    PERFORM pg_advisory_xact_lock(hashtextextended(project_id::TEXT || ':' || person_id::TEXT || ':' || work_date_utc::TEXT, 0));

    SELECT * INTO receipt FROM public.sitesync_sync_command_receipt r WHERE r.command_id = command_id;
    IF FOUND THEN
        RETURN jsonb_build_object('status','DUPLICATE_ACCEPTED','command_id',receipt.command_id,'server_revision',receipt.result_revision,
            'aggregate',receipt.result_payload->'aggregate','result',receipt.result_payload->'result');
    END IF;

    SELECT * INTO aggregate
    FROM public.sitesync_attendance_day a
    WHERE a.project_id = project_id AND a.person_id = person_id AND a.work_date_utc = work_date_utc
    FOR UPDATE;

    IF NOT FOUND THEN
        IF command_type = 'CHECK_OUT' THEN
            RETURN jsonb_build_object('status','VALIDATION_REJECTED','code','INVALID_STATE_TRANSITION','message','CHECK_OUT requires CHECKED_IN state');
        END IF;
        IF base_revision <> 0 THEN
            RETURN jsonb_build_object('status','REVISION_CONFLICT','command_id',command_id,'server_revision',0,
                'authoritative_aggregate',NULL,'reason_code','BASE_REVISION_MISMATCH');
        END IF;
        INSERT INTO public.sitesync_attendance_day (
            project_id, person_id, work_date_utc, organisation_id, company_id, project_assignment_id,
            state, authoritative_payload, server_revision
        ) VALUES (
            project_id, person_id, work_date_utc, actor_org, target_assignment.company_id, target_assignment.id,
            'CHECKED_OUT', '{}'::JSONB, 0
        );
        SELECT * INTO aggregate
        FROM public.sitesync_attendance_day a
        WHERE a.project_id = project_id AND a.person_id = person_id AND a.work_date_utc = work_date_utc
        FOR UPDATE;
    END IF;

    SELECT * INTO receipt FROM public.sitesync_sync_command_receipt r WHERE r.command_id = command_id;
    IF FOUND THEN
        RETURN jsonb_build_object('status','DUPLICATE_ACCEPTED','command_id',receipt.command_id,'server_revision',receipt.result_revision,
            'aggregate',receipt.result_payload->'aggregate','result',receipt.result_payload->'result');
    END IF;

    IF base_revision <> aggregate.server_revision THEN
        RETURN jsonb_build_object('status','REVISION_CONFLICT','command_id',command_id,'server_revision',aggregate.server_revision,
            'authoritative_aggregate',aggregate.authoritative_payload,'reason_code','BASE_REVISION_MISMATCH');
    END IF;
    IF command_type = 'CHECK_OUT' AND aggregate.state <> 'CHECKED_IN' THEN
        RETURN jsonb_build_object('status','VALIDATION_REJECTED','code','INVALID_STATE_TRANSITION','message','CHECK_OUT requires CHECKED_IN state');
    END IF;
    IF command_type = 'CHECK_IN' AND aggregate.state = 'CHECKED_IN' THEN
        RETURN jsonb_build_object('status','VALIDATION_REJECTED','code','INVALID_STATE_TRANSITION','message','CHECK_IN is invalid while already checked in');
    END IF;
    IF command_type = 'CHECK_OUT' AND (aggregate.first_in_utc IS NULL OR occurred_at < aggregate.first_in_utc) THEN
        RETURN jsonb_build_object('status','VALIDATION_REJECTED','code','INVALID_CHRONOLOGY','message','CHECK_OUT cannot predate the active CHECK_IN');
    END IF;

    event_type := CASE command_type WHEN 'CHECK_IN' THEN 'ATTENDANCE_CHECK_IN' ELSE 'ATTENDANCE_CHECK_OUT' END;
    new_revision := aggregate.server_revision + 1;

    IF command_type = 'CHECK_IN' THEN
        aggregate.state := 'CHECKED_IN'; aggregate.first_in_utc := occurred_at; aggregate.last_out_utc := NULL; aggregate.total_minutes := NULL;
    ELSE
        aggregate.state := 'CHECKED_OUT'; aggregate.last_out_utc := occurred_at;
        aggregate.total_minutes := FLOOR(EXTRACT(EPOCH FROM (occurred_at - aggregate.first_in_utc)) / 60)::INTEGER;
    END IF;

    aggregate.project_assignment_id := target_assignment.id;
    aggregate.organisation_id := actor_org;
    aggregate.company_id := target_assignment.company_id;
    aggregate.last_event_id := event_id;
    aggregate.last_command_id := command_id;
    aggregate.server_revision := new_revision;
    aggregate.authoritative_payload := jsonb_build_object(
        'commandId',command_id,'eventId',event_id,'projectId',project_id,'personId',person_id,
        'organisationId',actor_org,'companyId',target_assignment.company_id,'projectAssignmentId',target_assignment.id,
        'commandType',command_type,'eventType',event_type,'workDateUtc',work_date_utc,
        'source',payload_source,'clientOccurredAt',occurred_at,'state',aggregate.state,
        'firstInUtc',aggregate.first_in_utc,'lastOutUtc',aggregate.last_out_utc,
        'totalMinutes',aggregate.total_minutes,'serverRevision',new_revision
    );

    UPDATE public.sitesync_attendance_day a
    SET state=aggregate.state, first_in_utc=aggregate.first_in_utc, last_out_utc=aggregate.last_out_utc,
        total_minutes=aggregate.total_minutes, project_assignment_id=aggregate.project_assignment_id,
        organisation_id=aggregate.organisation_id, company_id=aggregate.company_id,
        last_event_id=event_id, last_command_id=command_id,
        authoritative_payload=aggregate.authoritative_payload, server_revision=new_revision, updated_at=NOW()
    WHERE a.project_id=project_id AND a.person_id=person_id AND a.work_date_utc=work_date_utc;

    result := jsonb_build_object('aggregate',aggregate.authoritative_payload,
        'result',jsonb_build_object('state',aggregate.state,'totalMinutes',aggregate.total_minutes,'serverRevision',new_revision));

    INSERT INTO public.sitesync_sync_command_receipt (
        command_id, project_id, person_id, work_date_utc, base_revision, command_type,
        actor_user_id, device_installation_id, result_status, result_revision, result_payload
    ) VALUES (
        command_id, project_id, person_id, work_date_utc, base_revision, command_type,
        actor, device_installation_id, 'ACCEPTED', new_revision, result
    );

    INSERT INTO public.sitesync_attendance_event (
        event_id, command_id, project_id, person_id, work_date_utc, project_assignment_id,
        actor_user_id, device_installation_id, event_type, occurred_at, previous_revision, new_revision, authoritative_state
    ) VALUES (
        event_id, command_id, project_id, person_id, work_date_utc, target_assignment.id,
        actor, device_installation_id, event_type, occurred_at, base_revision, new_revision, aggregate.authoritative_payload
    );

    RETURN jsonb_build_object('status','ACCEPTED','command_id',command_id,'server_revision',new_revision,
        'aggregate',aggregate.authoritative_payload,'result',result->'result');
END;
$$;

REVOKE ALL ON FUNCTION public.sync_attendance_command(UUID, UUID, UUID, UUID, DATE, BIGINT, TEXT, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.sync_attendance_command(UUID, UUID, UUID, UUID, DATE, BIGINT, TEXT, JSONB) TO authenticated;
