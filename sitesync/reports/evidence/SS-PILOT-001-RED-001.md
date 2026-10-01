# SS-PILOT-001 RED Evidence 001

- Evidence class: INSPECTED / TESTED (RED)
- Workflow run: 36010710193
- Workflow: SS-PILOT-001 RED evidence
- Head commit: 87a5b3c7c9df4fb2529c0dffa1cc063500d074c6
- Artifact: ss-pilot-001-red-output
- Artifact SHA-256: ef03217a265e35c8b009bed68e6fefab5072e3765dd436ee420e312147ed6372
- Observed at: 2026-09-24T14:09:37Z
- Test command exit code: 3

## Raw failing output

```text
BEGIN
INSERT 0 2
INSERT 0 1
INSERT 0 2
INSERT 0 2
INSERT 0 2
INSERT 0 2
INSERT 0 1
INSERT 0 2
INSERT 0 2
INSERT 0 1
RESET
UPDATE 1
SET
SET
psql:sitesync/supabase/tests/m17_sync_adversarial.sql:46: ERROR:  infinite recursion detected in policy for relation "project_assignments"
exit_code=3
```

## Interpretation

The current `project_assignments_select_authorised` policy produces an observed PostgreSQL infinite-recursion failure when the authenticated adversarial test queries `project_assignments`.

This is observed RED evidence. It is not the previously hypothesised inactive-membership assertion failure; the policy fails earlier at its recursive authorization boundary.

No RLS policy modification is included in this evidence commit.
