# Supabase verification

M1.4 RLS migrations must be executed against the configured SITE-SYNC test Supabase project before the migration PR is merged.

Required checks:

1. Authenticated Organisation A user can resolve only Organisation A identity/context.
2. Organisation A cannot read Organisation B project, membership, person, or assignment data.
3. An authenticated user can read/insert/update only their own `device_installations` rows.
4. A revoked device remains readable for audit but cannot be treated as active by application logic.
5. Project assignment policies do not recurse or raise `infinite recursion detected in policy`.
6. Anonymous access remains denied.

The migration itself is `20260817000000_m14_identity_rls.sql` followed by
`20260817000001_m14_identity_rls_fix.sql`.
