-- The immutable event references the command receipt. Insert the receipt first
-- inside the same transaction, then insert the event; any later failure rolls back both.
-- All RPC input parameters are explicitly qualified through the function label to
-- prevent PL/pgSQL parameter/column ambiguity.
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
SET search_path = public
AS $$
DECLARE
    actor UUID := auth.uid();
    device_status TEXT;
    actor_org UUID;
    target_assignment public.project_assignments%ROWTYPE;
    aggregate public.sitesync_attendance_day%ROWTYPE;
    receipt public.sitesync_sync_command_receipt%ROWTYPE;
    new_revision BIGINT;
    event_type TEXT;
    occurred_at TIMESTAMPTZ;
    event_id UUID;
    result JSONB;
BEGIN
    IF actor IS NULL THEN RETURN jsonb_build_object('status','AUTHORIZATION_REJECTED','code','UNAUTHENTICATED','message','Authentication required'); END IF;
    IF sync_attendance_command.command_id IS NULL OR sync_attendance_command.device_installation_id IS NULL OR sync_attendance_command.project_id IS NULL OR sync_attendance_command.person_id IS NULL OR sync_attendance_command.work_date_utc IS NULL OR sync_attendance_command.base_revision IS NULL OR sync_attendance_command.command_type IS NULL OR sync_attendance_command.payload IS NULL THEN
        RETURN jsonb_build_object('status','VALIDATION_REJECTED','code','REQUIRED_FIELD','message','Required sync field is missing');
    END IF;
    IF sync_attendance_command.base_revision < 0 OR sync_attendance_command.command_type NOT IN ('CHECK_IN','CHECK_OUT') THEN RETURN jsonb_build_object('status','VALIDATION_REJECTED','code','INVALID_COMMAND','message','Invalid command or revision'); END IF;

    SELECT d.status INTO device_status FROM public.device_installations d WHERE d.id = sync_attendance_command.device_installation_id AND d.user_id = actor;
    IF device_status IS NULL THEN RETURN jsonb_build_object('status','AUTHORIZATION_REJECTED','code','DEVICE_NOT_REGISTERED','message','Device is not registered to the authenticated user'); END IF;
    IF device_status <> 'ACTIVE' THEN RETURN jsonb_build_object('status','DEVICE_REVOKED','code','DEVICE_REVOKED','message','Device installation is revoked'); END IF;

    SELECT up.organisation_id INTO actor_org FROM public.user_profiles up WHERE up.user_id = actor;
    IF actor_org IS NULL OR NOT public.sitesync_sync_authorized(sync_attendance_command.device_installation_id, sync_attendance_command.project_id, sync_attendance_command.person_id) THEN
        RETURN jsonb_build_object('status','AUTHORIZATION_REJECTED','code','NOT_AUTHORIZED','message','Actor is not authorized for this attendance aggregate');
    END IF;

    BEGIN
        event_id := (sync_attendance_command.payload->>'eventId')::UUID;
        occurred_at := (sync_attendance_command.payload->>'clientOccurredAt')::TIMESTAMPTZ;
        IF (sync_attendance_command.payload->>'projectAssignmentId') IS NULL THEN RAISE EXCEPTION 'missing assignment'; END IF;
    EXCEPTION WHEN others THEN RETURN jsonb_build_object('status','VALIDATION_REJECTED','code','INVALID_PAYLOAD','message','Payload identity or timestamp is invalid'); END;

    IF (sync_attendance_command.payload->>'commandId') IS DISTINCT FROM sync_attendance_command.command_id::TEXT OR (sync_attendance_command.payload->>'projectId') IS DISTINCT FROM sync_attendance_command.project_id::TEXT OR (sync_attendance_command.payload->>'personId') IS DISTINCT FROM sync_attendance_command.person_id::TEXT OR (sync_attendance_command.payload->>'workDateUtc') IS DISTINCT FROM sync_attendance_command.work_date_utc::TEXT OR (sync_attendance_command.payload->>'commandType') IS DISTINCT FROM sync_attendance_command.command_type THEN
        RETURN jsonb_build_object('status','VALIDATION_REJECTED','code','PAYLOAD_MISMATCH','message','Payload does not match sync envelope');
    END IF;
    event_type := CASE sync_attendance_command.command_type WHEN 'CHECK_IN' THEN 'ATTENDANCE_CHECK_IN' ELSE 'ATTENDANCE_CHECK_OUT' END;

    SELECT * INTO receipt FROM public.sitesync_sync_command_receipt r WHERE r.command_id = sync_attendance_command.command_id;
    IF FOUND THEN RETURN jsonb_build_object('status','DUPLICATE_ACCEPTED','command_id',receipt.command_id,'server_revision',receipt.result_revision,'aggregate',receipt.result_payload->'aggregate','result',receipt.result_payload->'result'); END IF;

    SELECT * INTO target_assignment FROM public.project_assignments pa
    WHERE pa.id = (sync_attendance_command.payload->>'projectAssignmentId')::UUID AND pa.project_id = sync_attendance_command.project_id AND pa.person_id = sync_attendance_command.person_id AND pa.organisation_id = actor_org AND pa.status = 'ACTIVE';
    IF NOT FOUND THEN RETURN jsonb_build_object('status','VALIDATION_REJECTED','code','INVALID_ASSIGNMENT','message','Target project assignment is invalid'); END IF;

    INSERT INTO public.sitesync_attendance_day (project_id, person_id, work_date_utc, organisation_id, company_id, project_assignment_id, state, authoritative_payload, server_revision)
    VALUES (sync_attendance_command.project_id, sync_attendance_command.person_id, sync_attendance_command.work_date_utc, actor_org, target_assignment.company_id, target_assignment.id, 'CHECKED_OUT', '{}'::JSONB, 0)
    ON CONFLICT ON CONSTRAINT sitesync_attendance_day_pkey DO NOTHING;

    SELECT * INTO aggregate FROM public.sitesync_attendance_day a
    WHERE a.project_id = sync_attendance_command.project_id AND a.person_id = sync_attendance_command.person_id AND a.work_date_utc = sync_attendance_command.work_date_utc
    FOR UPDATE;

    SELECT * INTO receipt FROM public.sitesync_sync_command_receipt r WHERE r.command_id = sync_attendance_command.command_id;
    IF FOUND THEN RETURN jsonb_build_object('status','DUPLICATE_ACCEPTED','command_id',receipt.command_id,'server_revision',receipt.result_revision,'aggregate',receipt.result_payload->'aggregate','result',receipt.result_payload->'result'); END IF;

    IF sync_attendance_command.base_revision <> aggregate.server_revision THEN RETURN jsonb_build_object('status','REVISION_CONFLICT','command_id',sync_attendance_command.command_id,'server_revision',aggregate.server_revision,'authoritative_aggregate',aggregate.authoritative_payload,'reason_code','BASE_REVISION_MISMATCH'); END IF;
    IF sync_attendance_command.command_type = 'CHECK_OUT' AND aggregate.state <> 'CHECKED_IN' THEN RETURN jsonb_build_object('status','VALIDATION_REJECTED','code','INVALID_STATE_TRANSITION','message','CHECK_OUT requires CHECKED_IN state'); END IF;
    IF sync_attendance_command.command_type = 'CHECK_IN' AND aggregate.state = 'CHECKED_IN' THEN RETURN jsonb_build_object('status','VALIDATION_REJECTED','code','INVALID_STATE_TRANSITION','message','CHECK_IN is invalid while already checked in'); END IF;

    new_revision := aggregate.server_revision + 1;
    IF sync_attendance_command.command_type = 'CHECK_IN' THEN
        aggregate.state := 'CHECKED_IN'; aggregate.first_in_utc := occurred_at; aggregate.last_out_utc := NULL; aggregate.total_minutes := NULL;
    ELSE
        aggregate.state := 'CHECKED_OUT'; aggregate.last_out_utc := occurred_at; aggregate.total_minutes := GREATEST(0, FLOOR(EXTRACT(EPOCH FROM (occurred_at - aggregate.first_in_utc)) / 60))::INTEGER;
    END IF;
    aggregate.project_assignment_id := target_assignment.id; aggregate.organisation_id := actor_org; aggregate.company_id := target_assignment.company_id;
    aggregate.last_event_id := event_id; aggregate.last_command_id := sync_attendance_command.command_id; aggregate.server_revision := new_revision;
    aggregate.authoritative_payload := jsonb_build_object('commandId',sync_attendance_command.command_id,'eventId',event_id,'projectId',sync_attendance_command.project_id,'personId',sync_attendance_command.person_id,'organisationId',actor_org,'companyId',target_assignment.company_id,'projectAssignmentId',target_assignment.id,'commandType',sync_attendance_command.command_type,'eventType',event_type,'workDateUtc',sync_attendance_command.work_date_utc,'source',sync_attendance_command.payload->>'source','clientOccurredAt',occurred_at,'state',aggregate.state,'firstInUtc',aggregate.first_in_utc,'lastOutUtc',aggregate.last_out_utc,'totalMinutes',aggregate.total_minutes,'serverRevision',new_revision);

    UPDATE public.sitesync_attendance_day a
    SET state=aggregate.state, first_in_utc=aggregate.first_in_utc, last_out_utc=aggregate.last_out_utc, total_minutes=aggregate.total_minutes,
        project_assignment_id=aggregate.project_assignment_id, organisation_id=aggregate.organisation_id, company_id=aggregate.company_id,
        last_event_id=event_id, last_command_id=sync_attendance_command.command_id, authoritative_payload=aggregate.authoritative_payload, server_revision=new_revision, updated_at=NOW()
    WHERE a.project_id=sync_attendance_command.project_id AND a.person_id=sync_attendance_command.person_id AND a.work_date_utc=sync_attendance_command.work_date_utc;

    result := jsonb_build_object('aggregate',aggregate.authoritative_payload,'result',jsonb_build_object('state',aggregate.state,'totalMinutes',aggregate.total_minutes,'serverRevision',new_revision));

    -- Receipt is persisted before the immutable event because the event has an FK to the receipt.
    INSERT INTO public.sitesync_sync_command_receipt (command_id, project_id, person_id, work_date_utc, base_revision, command_type, actor_user_id, device_installation_id, result_status, result_revision, result_payload)
    VALUES (sync_attendance_command.command_id, sync_attendance_command.project_id, sync_attendance_command.person_id, sync_attendance_command.work_date_utc, sync_attendance_command.base_revision, sync_attendance_command.command_type, actor, sync_attendance_command.device_installation_id, 'ACCEPTED', new_revision, result);

    INSERT INTO public.sitesync_attendance_event (event_id, command_id, project_id, person_id, work_date_utc, project_assignment_id, actor_user_id, device_installation_id, event_type, occurred_at, previous_revision, new_revision, authoritative_state)
    VALUES (event_id, sync_attendance_command.command_id, sync_attendance_command.project_id, sync_attendance_command.person_id, sync_attendance_command.work_date_utc, target_assignment.id, actor, sync_attendance_command.device_installation_id, event_type, occurred_at, sync_attendance_command.base_revision, new_revision, aggregate.authoritative_payload);

    RETURN jsonb_build_object('status','ACCEPTED','command_id',sync_attendance_command.command_id,'server_revision',new_revision,'aggregate',aggregate.authoritative_payload,'result',result->'result');
END;
$$;
REVOKE ALL ON FUNCTION public.sync_attendance_command(UUID, UUID, UUID, UUID, DATE, BIGINT, TEXT, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.sync_attendance_command(UUID, UUID, UUID, UUID, DATE, BIGINT, TEXT, JSONB) TO authenticated;
