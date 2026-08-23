---
applyTo: "sitesync/supabase/**/*,sitesync/**/migrations/**/*,sitesync/**/database/**/*"
---

# Supabase and database conventions

- Inspect the existing migration chain and schema before writing a migration.
- Treat `auth.uid()` and server-side relationships as the authority for user, organisation, project, and device ownership.
- Never accept a client-supplied organisation/project/user identifier as an authorization boundary.
- Preserve tenant isolation. Cross-tenant access must fail rather than be inferred or repaired client-side.
- `SECURITY DEFINER` functions must use a fixed, explicit `search_path` and be reviewed for privilege escalation.
- Migrations must be forward-verifiable and have an explicit rollback/recovery strategy appropriate to the change.
- Test both positive and negative authorization paths, including anonymous access and cross-tenant access.