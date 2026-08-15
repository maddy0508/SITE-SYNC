-- ==========================================
-- M1.2 Operational schema
-- Append-only ledger, materialised state,
-- idempotency ledger, audit trail.
-- ==========================================

ALTER TABLE public.project_assignments
    ADD CONSTRAINT project_assignments_composite_identity_unique
    UNIQUE (organisation_id, id, project_id, company_id, person_id);

ALTER TABLE public.project_assignments
    ADD CONSTRAINT project_assignments_project_company_person_unique
    UNIQUE (organisation_id, project_id, company_id, person_id);

CREATE TABLE public.attendance_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    command_id UUID NOT NULL,
    organisation_id UUID NOT NULL,
    project_id UUID NOT NULL,
    company_id UUID NOT NULL,
    person_id UUID NOT NULL,
    project_assignment_id UUID NOT NULL,
    event_type TEXT NOT NULL CHECK (event_type IN ('ATTENDANCE_CHECK_IN', 'ATTENDANCE_CHECK_OUT')),
    occurred_at_utc TIMESTAMPTZ NOT NULL,
    device_time_utc TIMESTAMPTZ,
    device_installation_id UUID REFERENCES public.device_installations (id),
    created_by_user_id UUID REFERENCES auth.users (id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    FOREIGN KEY (organisation_id, project_assignment_id, project_id, company_id, person_id)
        REFERENCES public.project_assignments (organisation_id, id, project_id, company_id, person_id)
        ON DELETE RESTRICT
);

CREATE INDEX idx_attendance_events_project_person_occurred
    ON public.attendance_events (project_id, person_id, occurred_at_utc);
CREATE INDEX idx_attendance_events_command_id
    ON public.attendance_events (command_id);
ALTER TABLE public.attendance_events ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.attendance_states (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organisation_id UUID NOT NULL,
    project_id UUID NOT NULL,
    company_id UUID NOT NULL,
    person_id UUID NOT NULL,
    work_date DATE NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('CHECKED_IN', 'CHECKED_OUT')),
    current_revision INT NOT NULL DEFAULT 0,
    last_command_id UUID,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (project_id, person_id, work_date),
    FOREIGN KEY (organisation_id, project_id, company_id, person_id)
        REFERENCES public.project_assignments (organisation_id, project_id, company_id, person_id)
        ON DELETE RESTRICT
);
ALTER TABLE public.attendance_states ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.timesheets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organisation_id UUID NOT NULL,
    project_id UUID NOT NULL,
    company_id UUID NOT NULL,
    person_id UUID NOT NULL,
    work_date DATE NOT NULL,
    start_utc TIMESTAMPTZ,
    finish_utc TIMESTAMPTZ,
    total_minutes INT,
    status TEXT NOT NULL DEFAULT 'INCOMPLETE' CHECK (status IN ('COMPLETE', 'INCOMPLETE')),
    derivation_policy TEXT NOT NULL DEFAULT 'M1_FIRST_IN_LAST_OUT_UTC',
    source_attendance_state_revision INT NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (project_id, person_id, work_date),
    FOREIGN KEY (organisation_id, project_id, company_id, person_id)
        REFERENCES public.project_assignments (organisation_id, project_id, company_id, person_id)
        ON DELETE RESTRICT
);
ALTER TABLE public.timesheets ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.processed_commands (
    command_id UUID PRIMARY KEY,
    command_type TEXT NOT NULL,
    aggregate_id TEXT,
    actor_user_id UUID,
    device_installation_id UUID,
    organisation_id UUID,
    project_id UUID,
    company_id UUID,
    person_id UUID,
    result JSONB NOT NULL,
    processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.processed_commands ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.audit_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    command_id UUID,
    actor_user_id UUID,
    device_installation_id UUID,
    organisation_id UUID,
    project_id UUID,
    company_id UUID,
    target_person_id UUID,
    action TEXT NOT NULL,
    entity_type TEXT,
    entity_id UUID,
    before_state JSONB,
    after_state JSONB,
    error_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_audit_events_project_id ON public.audit_events (project_id);
CREATE INDEX idx_audit_events_target_person_id ON public.audit_events (target_person_id);
ALTER TABLE public.audit_events ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.prevent_row_modification()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    RAISE EXCEPTION 'record is append-only'
        USING ERRCODE = 'SB001';
END;
$$;

CREATE TRIGGER attendance_events_no_update
    BEFORE UPDATE ON public.attendance_events
    FOR EACH ROW EXECUTE FUNCTION public.prevent_row_modification();
CREATE TRIGGER attendance_events_no_delete
    BEFORE DELETE ON public.attendance_events
    FOR EACH ROW EXECUTE FUNCTION public.prevent_row_modification();
CREATE TRIGGER processed_commands_no_update
    BEFORE UPDATE ON public.processed_commands
    FOR EACH ROW EXECUTE FUNCTION public.prevent_row_modification();
CREATE TRIGGER processed_commands_no_delete
    BEFORE DELETE ON public.processed_commands
    FOR EACH ROW EXECUTE FUNCTION public.prevent_row_modification();
CREATE TRIGGER audit_events_no_update
    BEFORE UPDATE ON public.audit_events
    FOR EACH ROW EXECUTE FUNCTION public.prevent_row_modification();
CREATE TRIGGER audit_events_no_delete
    BEFORE DELETE ON public.audit_events
    FOR EACH ROW EXECUTE FUNCTION public.prevent_row_modification();
