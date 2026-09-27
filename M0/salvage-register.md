# M0 Salvage Register — full AC-04 register at M0 time

Authority: MASTER_BLUEPRINT §12 (salvage register, status PARTIAL), §M0.4
(salvage boundary), §M0.5 (pending extraction gate), §6.3.8 / §7.14
reconciliations; KIMI/SKILLS/03 (disposition rules).
Baseline: maddy0508/SITE-SYNC @ f90b77ab73cb7ae20b1084ad94fb5bc159afa841.
Paths verified present at EP-1.0 (db8a7d3), which is byte-identical to the
baseline under sitesync/ (evidence: `git diff --stat f90b77ab..db8a7d3 --
sitesync/` empty).

Register rules (binding, §12 + Skill 03): no promotion without blueprint anchor
+ predating test (INV-C strict: the test predates the implementation being
promoted) + §8 compliance. M0 promotes nothing (§M0.4). Critical leak note
(§12): AC-04's CompanyMembership is not renameable to Worker — that would
preserve the organisation-scoped identity model and violate WC-INV-1/2/3.

## Register

| ID | Artifact (path) | Behaviour | Anchor | Test? | Test predates? | Disposition | Reason |
|---|---|---|---|---|---|---|---|
| SR-001.1 | sitesync/supabase/migrations/20260815000000_init_identity_tenancy.sql | Creates organisations, persons, user_profiles, companies, company_memberships, projects, project_company_participation, project_assignments | §6.3, §7.14 | no | — | REFERENCE | Organisation-scoped identity conflicts WC-INV-1/2 and DM-INV-5; informs only |
| SR-001.2 | sitesync/supabase/migrations/20260815000001_init_device_installations.sql | Creates device_installations | §7 Device (AC-DM-20–23) | no | — | FREEZE | Pending §7.15 physical DeviceInstallation representation decision |
| SR-001.3 | sitesync/supabase/migrations/20260817000000_m14_identity_rls.sql | RLS policies over identity tables | §8 B1 | no | — | SALVAGE (pattern only) | Pattern may inform §A mechanism; org-scope assumptions must not leak |
| SR-001.4 | sitesync/supabase/migrations/20260817000001_m14_identity_rls_fix.sql | RLS policy fixes | §8 B1 | no | — | SALVAGE (pattern only) | As SR-001.3 |
| SR-001.5 | sitesync/supabase/migrations/20260817000002_m14_identity_grants.sql | Role grants | §8 B1 | no | — | SALVAGE (pattern only) | As SR-001.3; bypass-path analysis required (§M0.3.1) |
| SR-001.6 | sitesync/supabase/migrations/20260912000000_m17_sync_server.sql | Sync server schema: sitesync_sync_command_receipt, sitesync_attendance_event, sitesync_attendance_day | §6.10, §7.14 | no | — | SALVAGE (mechanism) | Sync schema ALIGNS (§7.14); identity/tenancy schema CONFLICTS PS-INV-1/DM-INV-5 |
| SR-001.7 | sitesync/supabase/migrations/20260912000001_m17_sync_rpc_hardening.sql | RPC hardening | §6.10 | no | — | SALVAGE (mechanism) | As SR-001.6 |
| SR-001.8 | sitesync/supabase/migrations/20260912000002_m17_sync_rpc_conflict_target.sql | RPC conflict target | §6.10, AC-ARCH-C6 | no | — | SALVAGE (mechanism) | As SR-001.6; conflict policy must match §J per-class rules |
| SR-001.9 | sitesync/supabase/migrations/20260912000003_m17_sync_receipt_event_order.sql | Receipt/event ordering | §6.10, AC-ARCH-C4 | no | — | SALVAGE (mechanism) | As SR-001.6 |
| SR-001.10 | sitesync/supabase/migrations/20260912000004_m17_sync_security_hardening.sql | Security hardening | §8 B1 | no | — | SALVAGE (mechanism) | As SR-001.6 |
| SR-001.11 | sitesync/supabase/migrations/20260912000005_m17_sync_authorization_validation.sql | Authorization validation | §M, §6.10 | no | — | SALVAGE (mechanism) | As SR-001.6; must not encode org-scope model |
| SR-001.12 | sitesync/supabase/migrations/20260912000006_m17_sync_plpgsql_conflict_policy.sql | PLpgSQL conflict policy | §6.10 | no | — | FREEZE | PLpgSQL stack frozen pending mechanism selection (§8.M OPEN) |
| SR-001.13 | sitesync/supabase/migrations/20260912000007_m17_sync_uuid_validation_compat.sql | UUID validation compat | §6.10 | no | — | FREEZE | As SR-001.12 |
| SR-002.1 | sitesync/src/sync/index.ts | Sync module surface | §6.10 | yes (syncRuntime etc.) | — | SALVAGE (mechanism) | Mechanism may inform §I; promotion only with anchor + predating test + §8 |
| SR-002.2 | sitesync/src/sync/syncRuntime.ts | Sync runtime | §6.10 | yes | — | SALVAGE (mechanism) | As SR-002.1 |
| SR-002.3 | sitesync/src/sync/syncWorker.ts | Sync worker | §6.10 | yes | — | SALVAGE (mechanism) | As SR-002.1 |
| SR-002.4 | sitesync/src/sync/syncTransport.ts | Transport interface | §6.10 | yes | — | SALVAGE (mechanism) | As SR-002.1 |
| SR-002.5 | sitesync/src/sync/supabaseSyncTransport.ts | Supabase transport | §6.10 | yes | — | SALVAGE (mechanism) | Vendor-specific; §8.J leaves transport open |
| SR-002.6 | sitesync/src/sync/syncCommandRepository.ts | Command repository | §6.10, AC-ARCH-C2 | yes | — | SALVAGE (mechanism) | Command identity handling may inform §F/§G |
| SR-002.7 | sitesync/src/sync/syncLifecycle.ts | Lifecycle states | §6.10.3 | yes | — | SALVAGE (mechanism) | Must map to six-state vocabulary (§M0.3.7) before any promotion |
| SR-002.8 | sitesync/src/sync/syncRetryPolicy.ts | Retry policy | §6.10.3 | yes | — | SALVAGE (mechanism) | Bounded retries only; terminal failure visible (AC-ARCH-G2) |
| SR-003.1 | idempotency mechanism (sitesync_sync_command_receipt in SR-001.6; syncCommandRepository.ts) | Command receipt idempotency | §8 AC-ARCH-G1, §7.10 | no | — | SALVAGE | Receipt pattern aligns with §G; promotion requires predating test (INV-C) |
| SR-004 | .github/workflows/ (m15/m16/m17 verify + android build, 7 files) | CI verification pipelines | §5 DoD | n/a | — | SALVAGE | CI mechanics reusable for milestone gates; no M0 workflow exists yet |
| SR-005 | sitesync/__tests__/ (24 files) + sitesync/supabase/tests/ | Jest + SQL test suites | §6.10 | yes | mixed | SALVAGE where §6.10-anchored | Sync-anchored tests salvageable; INV-C strict: promotion requires test predating the implementation being promoted |
| SR-006 | GitHub history of maddy0508/SITE-SYNC | Development history M13–M17 | §12 | n/a | — | REFERENCE | Context only; never an authority source |
| SR-007 | M1.x structure (docs/superpowers plans; m13–m17 branch lineage) | Prior milestone decomposition | §11 | n/a | — | DISCARD | Superseded by §11 milestone map M0–M12 |
| SR-008 | Existing implementation, partially classified | See sub-rows | §6.3.8, §7.14 | mixed | mixed | PARTIALLY CLASSIFIED — per sub-rows below | §12 |

### SR-008 sub-register (§6.3.8 extraction, completed there; restated)

| ID | Artifact | Disposition | Reason (§6.3.8) |
|---|---|---|---|
| SR-008.a | sitesync/src/auth/authService.ts | REFERENCE | Session boundary only |
| SR-008.b | sitesync/src/identity/identityService.ts | REFERENCE | Organisation-scoped, conflicts WC-INV-1/2 |
| SR-008.c | sitesync/src/identity/projectContext.ts | REFERENCE | No SiteAssignment |
| SR-008.d | sitesync/src/identity/deviceRegistrationService.ts | FREEZE | Pending §7 Device physical representation |
| SR-008.e | persons migration (in SR-001.1) | REFERENCE | Organisation-scoped |
| SR-008.f | company_memberships (in SR-001.1) | REFERENCE | Precursor, not Worker E; not renameable (§12 leak note) |
| SR-008.g | project_assignments (in SR-001.1) | REFERENCE | No SiteAssignment; ACTIVE/INACTIVE only |
| SR-008.h | QR parser/validation/camera mechanics (sitesync/src/qr/qrPayload.ts, qrValidation.ts, qrCameraFrameAdapter.ts, qrCameraState.ts, qrScanController.ts, QrScannerScreen.tsx) | SALVAGE (mechanism only) | §6.3 mechanics reusable; identity model is not |
| SR-008.i | QR identity model | NEW | No §6.3-conformant model exists in AC-04 |
| SR-008.j | QR rotation/revocation | NEW | Not present in AC-04 |
| SR-008.k | Crew model | NEW | Not present in AC-04 |
| SR-008.l | QR tests (sitesync/__tests__/qr*.test.ts) | SALVAGE (test mechanics only) | INV-C requires new tests for any promotion (§6.3.8) |
| SR-008.m | pre-start implementation (§6.4) | OPEN / PENDING | Extraction not performed; expected NOT PRESENT (grep: no pre-start code in sitesync/src or __tests__) |
| SR-008.n | reporting implementation (§6.9) | OPEN / PENDING | Extraction not performed; expected NOT PRESENT or REFERENCE (§6.9.8) |
| SR-008.o | administration implementation (§6.11) | OPEN / PENDING | Extraction not performed (§6.11.8) |

## Promotion ledger

None. M0 promotes no salvage item (§M0.4). Every SALVAGE entry above remains
blocked until: blueprint anchor confirmed + acceptance test predating the
promoted implementation exists (INV-C strict) + §8 compliance demonstrated,
per §8.L.
