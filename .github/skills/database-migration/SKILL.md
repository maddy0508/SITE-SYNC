---
name: database-migration
description: Safely design, inspect, verify, and recover Supabase/Postgres migrations without weakening security boundaries.
---

# Database Migration

1. Inspect the current schema and migration history.
2. Identify affected tables, functions, indexes, policies, constraints, data dependencies, and existing test coverage.
3. Design the smallest forward migration that preserves existing invariants.
4. Review RLS and authorization impact before applying it.
5. Verify the migration on the configured test environment.
6. Test relevant positive and negative access paths.
7. Validate rollback/recovery strategy appropriate to the operation.
8. Record exact migration and verification evidence.

Never bypass RLS, edit production to make a test pass, or invent schema state from memory.