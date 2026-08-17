-- M1.4 grant boundary
-- RLS policies determine which rows are visible; authenticated must also have
-- the minimum table privileges needed to evaluate those policies.

GRANT SELECT ON TABLE
    public.organisations,
    public.companies,
    public.persons,
    public.user_profiles,
    public.company_memberships,
    public.projects,
    public.project_company_participation,
    public.project_assignments,
    public.device_installations
TO authenticated;

GRANT INSERT, UPDATE ON TABLE public.device_installations TO authenticated;

-- No DELETE privilege is granted for device installations. Revocation is an
-- UPDATE to status/revoked_at, preserving the installation audit record.
