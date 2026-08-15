-- Enable pgcrypto for UUID generation and password hashing in seeds
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==========================================
-- 1. ORGANISATIONS (Root Tenant)
-- ==========================================
CREATE TABLE public.organisations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.organisations ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- 2. COMPANIES
-- ==========================================
CREATE TABLE public.companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organisation_id UUID NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (organisation_id, id)
);
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- 3. PERSONS (Human Identity)
-- ==========================================
CREATE TABLE public.persons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organisation_id UUID NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
    display_name TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (organisation_id, id)
);
ALTER TABLE public.persons ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- 4. USER PROFILES (Auth Link)
-- ==========================================
CREATE TABLE public.user_profiles (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    organisation_id UUID NOT NULL,
    person_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    FOREIGN KEY (organisation_id, person_id) REFERENCES public.persons(organisation_id, id) ON DELETE RESTRICT
);
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- 5. COMPANY MEMBERSHIPS (Employment)
-- ==========================================
CREATE TABLE public.company_memberships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organisation_id UUID NOT NULL,
    company_id UUID NOT NULL,
    person_id UUID NOT NULL,
    status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    FOREIGN KEY (organisation_id, company_id) REFERENCES public.companies(organisation_id, id) ON DELETE CASCADE,
    FOREIGN KEY (organisation_id, person_id) REFERENCES public.persons(organisation_id, id) ON DELETE CASCADE,
    UNIQUE (organisation_id, company_id, person_id),
    UNIQUE (organisation_id, id, company_id, person_id)
);
ALTER TABLE public.company_memberships ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- 6. PROJECTS (Site Context)
-- ==========================================
CREATE TABLE public.projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organisation_id UUID NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (organisation_id, id)
);
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- 7. PROJECT COMPANY PARTICIPATION
-- ==========================================
CREATE TABLE public.project_company_participation (
    organisation_id UUID NOT NULL,
    project_id UUID NOT NULL,
    company_id UUID NOT NULL,
    status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (organisation_id, project_id, company_id),
    FOREIGN KEY (organisation_id, project_id) REFERENCES public.projects(organisation_id, id) ON DELETE CASCADE,
    FOREIGN KEY (organisation_id, company_id) REFERENCES public.companies(organisation_id, id) ON DELETE CASCADE
);
ALTER TABLE public.project_company_participation ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- 8. PROJECT ASSIGNMENTS (Role Context)
-- ==========================================
CREATE TABLE public.project_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organisation_id UUID NOT NULL,
    project_id UUID NOT NULL,
    company_id UUID NOT NULL,
    company_membership_id UUID NOT NULL,
    person_id UUID NOT NULL,
    project_role TEXT NOT NULL CHECK (project_role IN ('WORKER', 'SUPERVISOR', 'ADMIN')),
    status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    FOREIGN KEY (organisation_id, project_id) REFERENCES public.projects(organisation_id, id) ON DELETE CASCADE,
    FOREIGN KEY (organisation_id, project_id, company_id) REFERENCES public.project_company_participation(organisation_id, project_id, company_id) ON DELETE CASCADE,
    FOREIGN KEY (organisation_id, company_membership_id, company_id, person_id) REFERENCES public.company_memberships(organisation_id, id, company_id, person_id) ON DELETE CASCADE,
    UNIQUE (organisation_id, project_id, person_id)
);
ALTER TABLE public.project_assignments ENABLE ROW LEVEL SECURITY;
