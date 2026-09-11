-- M1.7 authoritative attendance synchronization boundary.
-- Production migration is intentionally gated by release approval.

CREATE TABLE public.sitesync_attendance_day (
    project_id UUID NOT NULL,
    person_id UUID NOT NULL,
    work_date_utc DATE NOT NULL,
    organisation_id UUID NOT NULL,
    company_id UUID NOT NULL,
    project_assignment_id UUID NOT NULL,
    state TEXT NOT NULL CHECK (state IN ('CHECKED_IN', 'CHECKED_OUT')),
    first_in_utc TIMESTAMPTZ,
    last_out_utc TIMESTAMPTZ,
    total_minutes INTEGER CHECK (total_minutes IS NULL OR total_minutes >= 0),
    last_event_id UUID,
    last_command_id UUID,
    authoritative_payload JSONB NOT NULL,
    server_revision BIGINT NOT NULL DEFAULT 0 CHECK (server_revision >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (project_id, person_id, work_date_utc),
    FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE RESTRICT,
    FOREIGN KEY (person_id) REFERENCES public.persons(id) ON DELETE RESTRICT,
    FOREIGN KEY (project_assignment_id) REFERENCES public.project_assignments(id) ON DELETE RESTRICT
);
ALTER TABLE public.sitesync_attendance_day ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.sitesync_sync_command_receipt (
    command_id UUID PRIMARY KEY,
    project_id UUID NOT NULL,
    person_id UUID NOT NULL,
    work_date_utc DATE NOT NULL,
    base_revision BIGINT NOT NULL CHECK (base_revision >= 0),
    command_type TEXT NOT NULL CHECK (command_type IN ('CHECK_IN', 'CHECK_OUT')),
    actor_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
    device_installation_id UUID NOT NULL REFERENCES public.device_installations(id) ON DELETE RESTRICT,
    received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    result_status TEXT NOT NULL CHECK (result_status = 'ACCEPTED'),
    result_revision BIGINT NOT NULL CHECK (result_revision >= 1),
    result_payload JSONB NOT NULL,
    UNIQUE (command_id)
);
ALTER TABLE public.sitesync_sync_command_receipt ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.sitesync_attendance_event (
    event_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    command_id UUID NOT NULL UNIQUE REFERENCES public.sitesync_sync_command_receipt(command_id) ON DELETE RESTRICT,
    project_id UUID NOT NULL,
    person_id UUID NOT NULL,
    work_date_utc DATE NOT NULL,
    project_assignment_id UUID NOT NULL,
    actor_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
    device_installation_id UUID NOT NULL REFERENCES public.device_installations(id) ON DELETE RESTRICT,
    event_type TEXT NOT NULL CHECK (event_type IN ('ATTENDANCE_CHECK_IN', 'ATTENDANCE_CHECK_OUT')),
    occurred_at TIMESTAMPTZ NOT NULL,
    previous_revision BIGINT NOT NULL CHECK (previous_revision >= 0),
    new_revision BIGINT NOT NULL CHECK (new_revision = previous_revision + 1),
    authoritative_state JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (project_id, person_id, work_date_utc, new_revision)
);
ALTER TABLE public.sitesync_attendance_event ENABLE ROW LEVEL SECURITY;

CREATE INDEX sitesync_attendance_day_aggregate_idx
    ON public.sitesync_attendance_day (project_id, person_id, work_date_utc);
CREATE INDEX sitesync_sync_command_receipt_aggregate_idx
    ON public.sitesync_sync_command_receipt (project_id, person_id, work_date_utc);
CREATE INDEX sitesync_attendance_event_aggregate_idx
    ON public.sitesync_attendance_event (project_id, person_id, work_date_utc, new_revision);

CREATE OR REPLACE FUNCTION public.sitesync_sync_authorized(
    p_device_installation_id UUID,
    p_project_id UUID,
    p_person_id UUID
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT
        auth.uid() IS NOT NULL
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
            JOIN public.projects p
              ON p.id = p_project_id
             AND p.organisation_id = up.organisation_id
            JOIN public.project_assignments target_pa
              ON target_pa.organisation_id = up.organisation_id
             AND target_pa.project_id = p_project_id
             AND target_pa.person_id = p_person_id
             AND target_pa.status = 'ACTIVE'
            WHERE up.user_id = auth.uid()
        );
$$;
REVOKE ALL ON FUNCTION public.sitesync_sync_authorized(UUID, UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.sitesync_sync_authorized(UUID, UUID, UUID) TO authenticated;

CREATE POLICY sitesync_attendance_day_select_authorized
ON public.sitesync_attendance_day
FOR SELECT TO authenticated
USING (public.sitesync_sync_authorized(NULLIF(current_setting('request.headers', true), '')::UUID, project_id, person_id));

-- New authoritative tables are not directly writable by clients. The RPC owns mutation.
REVOKE ALL ON public.sitesync_attendance_day FROM anon, authenticated;
REVOKE ALL ON public.sitesync_sync_command_receipt FROM anon, authenticated;
REVOKE ALL ON public.sitesync_attendance_event FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.sitesync_event_immutable()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    RAISE EXCEPTION 'M1.7 attendance events are immutable';
END;
$$;

CREATE TRIGGER sitesync_attendance_event_no_update
BEFORE UPDATE OR DELETE ON public.sitesync_attendance_event
FOR EACH ROW EXECUTE FUNCTION public.sitesync_event_immutable();

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
    result JSONB;
    existing_payload JSONB;
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

    SELECT up.organisation_id INTO actor_org
    FROM public.user_profiles up
    WHERE up.user_id = actor;
    IF actor_org IS NULL OR NOT public.sitesync_sync_authorized(device_installation_id, project_id, person_id) THEN
        RETURN jsonb_build_object('status','AUTHORIZATION_REJECTED','code','NOT_AUTHORIZED','message','Actor is not authorized for this attendance aggregate');
    END IF;

    IF (payload->>'commandId') IS DISTINCT FROM command_id::TEXT
       OR (payload->>'projectId') IS DISTINCT FROM project_id::TEXT
       OR (payload->>'personId') IS DISTINCT FROM person_id::TEXT
       OR (payload->>'workDateUtc') IS DISTINCT FROM work_date_utc::TEXT
       OR (payload->>'commandType') IS DISTINCT FROM command_type
       OR (payload->>'clientOccurredAt') IS NULL
       OR (payload->>'projectAssignmentId') IS NULL THEN
        RETURN jsonb_build_object('status','VALIDATION_REJECTED','code','PAYLOAD_MISMATCH','message','Payload does not match sync envelope');
    END IF;

    BEGIN
        occurred_at := (payload->>'clientOccurredAt')::TIMESTAMPTZ;
    EXCEPTION WHEN others THEN
        RETURN jsonb_build_object('status','VALIDATION_REJECTED','code','INVALID_TIMESTAMP','message','clientOccurredAt is invalid');
    END;
    event_type := CASE command_type WHEN 'CHECK_IN' THEN 'ATTENDANCE_CHECK_IN' ELSE 'ATTENDANCE_CHECK_OUT' END;

    SELECT * INTO receipt
    FROM public.sitesync_sync_command_receipt r
    WHERE r.command_id = sync_attendance_command.command_id;
    IF FOUND THEN
        RETURN jsonb_build_object(
            'status','DUPLICATE_ACCEPTED',
            'command_id', receipt.command_id,
            'server_revision', receipt.result_revision,
            'aggregate', receipt.result_payload->'aggregate',
            'result', receipt.result_payload->'result'
        );
    END IF;

    SELECT * INTO target_assignment
    FROM public.project_assignments pa
    WHERE pa.id = (payload->>'projectAssignmentId')::UUID
      AND pa.project_id = project_id
      AND pa.person_id = person_id
      AND pa.organisation_id = actor_org
      AND pa.status = 'ACTIVE';
    IF NOT FOUND THEN
        RETURN jsonb_build_object('status','VALIDATION_REJECTED','code','INVALID_ASSIGNMENT','message','Target project assignment is invalid');
    END IF;

    INSERT INTO public.sitesync_attendance_day (
        project_id, person_id, work_date_utc, organisation_id, company_id,
        project_assignment_id, state, authoritative_payload, server_revision
    ) VALUES (
        project_id, person_id, work_date_utc, actor_org, target_assignment.company_id,
        target_assignment.id, 'CHECKED_OUT', '{}'::JSONB, 0
    ) ON CONFLICT (project_id, person_id, work_date_utc) DO NOTHING;

    SELECT * INTO aggregate
    FROM public.sitesync_attendance_day a
    WHERE a.project_id = sync_attendance_command.project_id
      AND a.person_id = sync_attendance_command.person_id
      AND a.work_date_utc = sync_attendance_command.work_date_utc
    FOR UPDATE;

    IF base_revision <> aggregate.server_revision THEN
        RETURN jsonb_build_object(
            'status','REVISION_CONFLICT',
            'command_id', command_id,
            'server_revision', aggregate.server_revision,
            'authoritative_aggregate', aggregate.authoritative_payload,
            'reason_code','BASE_REVISION_MISMATCH'
        );
    END IF;

    IF command_type = 'CHECK_OUT' AND aggregate.state <> 'CHECKED_IN' THEN
        RETURN jsonb_build_object('status','VALIDATION_REJECTED','code','INVALID_STATE_TRANSITION','message','CHECK_OUT requires an authoritative CHECKED_IN state');
    END IF;
    IF command_type = 'CHECK_IN' AND aggregate.state = 'CHECKED_IN' THEN
        RETURN jsonb_build_object('status','VALIDATION_REJECTED','code','INVALID_STATE_TRANSITION','message','CHECK_IN is not valid while already checked in');
    END IF;

    new_revision := aggregate.server_revision + 1;
    IF command_type = 'CHECK_IN' THEN
        aggregate.state := 'CHECKED_IN';
        aggregate.first_in_utc := occurred_at;
        aggregate.last_out_utc := NULL;
        aggregate.total_minutes := NULL;
    ELSE
        aggregate.state := 'CHECKED_OUT';
        aggregate.last_out_utc := occurred_at;
        aggregate.total_minutes := GREATEST(0, FLOOR(EXTRACT(EPOCH FROM (occurred_at - aggregate.first_in_utc)) / 60))::INTEGER;
    END IF;

    aggregate.project_assignment_id := target_assignment.id;
    aggregate.organisation_id := actor_org;
    aggregate.company_id := target_assignment.company_id;
    aggregate.last_command_id := command_id;
    aggregate.server_revision := new_revision;
    aggregate.authoritative_payload := jsonb_build_object(
        'commandId', command_id,
        'eventId', (payload->>'eventId')::UUID,
        'projectId', project_id,
        'personId', person_id,
        'organisationId', actor_org,
        'companyId', target_assignment.company_id,
        'projectAssignmentId', target_assignment.id,
        'commandType', command_type,
        'eventType', event_type,
        'workDateUtc', work_date_utc,
        'source', payload->>'source',
        'clientOccurredAt', occurred_at,
        'state', aggregate.state,
        'firstInUtc', aggregate.first_in_utc,
        'lastOutUtc', aggregate.last_out_utc,
        'totalMinutes', aggregate.total_minutes,
        'serverRevision', new_revision
    );

    UPDATE public.sitesync_attendance_day a
    SET state = aggregate.state,
        first_in_utc = aggregate.first_in_utc,
        last_out_utc = aggregate.last_out_utc,
        total_minutes = aggregate.total_minutes,
        project_assignment_id = aggregate.project_assignment_id,
        organisation_id = aggregate.organisation_id,
        company_id = aggregate.company_id,
        last_event_id = (payload->>'eventId')::UUID,
        last_command_id = command_id,
        authoritative_payload = aggregate.authoritative_payload,
        server_revision = new_revision,
        updated_at = NOW()
    WHERE a.project_id = project_id AND a.person_id = person_id AND a.work_date_utc = work_date_utc;

    result := jsonb_build_object(
        'aggregate', aggregate.authoritative_payload,
        'result', jsonb_build_object('state', aggregate.state, 'totalMinutes', aggregate.total_minutes, 'serverRevision', new_revision)
    );

    INSERT INTO public.sitesync_attendance_event (
        command_id, project_id, person_id, work_date_utc, project_assignment_id,
        actor_user_id, device_installation_id, event_type, occurred_at,
        previous_revision, new_revision, authoritative_state
    ) VALUES (
        command_id, project_id, person_id, work_date_utc, target_assignment.id,
        actor, device_installation_id, event_type, occurred_at,
        base_revision, new_revision, aggregate.authoritative_payload
    );

    INSERT INTO public.sitesync_sync_command_receipt (
        command_id, project_id, person_id, work_date_utc, base_revision,
        command_type, actor_user_id, device_installation_id, result_status,
        result_revision, result_payload
    ) VALUES (
        command_id, project_id, person_id, work_date_utc, base_revision,
        command_type, actor, device_installation_id, 'ACCEPTED',
        new_revision, result
    );

    RETURN jsonb_build_object(
        'status','ACCEPTED',
        'command_id', command_id,
        'server_revision', new_revision,
        'aggregate', aggregate.authoritative_payload,
        'result', result->'result'
    );
END;
$$;

REVOKE ALL ON FUNCTION public.sync_attendance_command(UUID, UUID, UUID, UUID, DATE, BIGINT, TEXT, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.sync_attendance_command(UUID, UUID, UUID, UUID, DATE, BIGINT, TEXT, JSONB) TO authenticated;
