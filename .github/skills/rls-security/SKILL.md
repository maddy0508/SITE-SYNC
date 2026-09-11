---
name: rls-security
description: Audit Supabase authorization, RLS, tenant isolation, ownership, trust boundaries, and security-definer functions.
---

# RLS Security

Audit the complete authorization path, not isolated policies.

1. Identify authenticated identity sources and trust boundaries.
2. Trace organisation, person, membership, project, device, and other ownership relationships.
3. Inspect RLS policies and the functions they depend on.
4. Review `SECURITY DEFINER` functions for fixed `search_path`, privilege escalation, and unintended access.
5. Test anonymous denial, cross-tenant denial, cross-user ownership denial, and expected authorized access.
6. Check that client-supplied identifiers cannot override server-derived scope.
7. Report exploitable findings separately from hardening suggestions.

Never weaken a policy merely to make application tests pass.