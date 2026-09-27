# M0 Authorization & Scope Model — role × scope × membership

Authority: MASTER_BLUEPRINT §2 (roles, capabilities, permission formula), §7
DM-INV-4/4a/5/6 (ownership vs operational scope), §6.11 AD-INV-1/4/8/10,
§4 (INV-1..6 readiness), §6.3 WC-INV-1..13.

## 1. Permission formula (§2)

permission = role × scope × membership

- Role: Worker, Supervisor, Company Admin, EPC-Client, Platform Admin (§2).
- Scope: Platform / Company / Project / Site (§7 DM-INV-4); ownership scope and
  operational scope are distinct (DM-INV-4a).
- Membership: Worker is a Company-scoped membership of a Platform-scoped Person
  (WC-INV-1/2); authority flows through membership, never through identity
  alone (AD-INV-1: authority-scoped, not identity-scoped).

Capabilities are flags granted per membership (CapabilityGrant F, §6.11.4):
draft set supervisor, first_aider, management_contact (§6.3.9 OPEN — recorded
in open-items.md). Capabilities gate field actions; admin roles gate
administrative actions; administrative surfaces are not a second permission
system (AD-INV-10).

## 2. Authority matrix (per blueprint authority tables)

| Action | Worker | Supervisor | Company Admin | EPC-Client | Platform Admin |
|---|---|---|---|---|---|
| Claim progress; withdraw own claim | yes (assigned/scoped) | yes | yes | no | no |
| Verify / reject / reverse claim | no | yes (Site) | yes (Company) | no | no |
| Create/assign/cancel task | no | yes (Site) | yes | no | no |
| Capture own/crew evidence; submit QA; raise blocker | yes | yes | yes | no | no |
| Verify QA; assign blocker; verify resolution | no | yes (Site) | yes | no | no |
| Check in/out (QR), breaks, pre-start participation | yes | yes | yes | no | no |
| Force-close shift | no | no | yes only (reason mandatory) | no | no |
| Dismiss blocker | no | authorised Supervisor | yes | no | no |
| Reverse verification | no | no | yes (reason mandatory) | no | no |
| Invite worker; suspend; offboard | no | no | yes (Company) | no | no |
| Project/Site lifecycle; requirements; QR admin; config | no | no | yes (Company) | no | no |
| Company lifecycle; retention; Platform config | no | no | no | no | yes |
| Read assigned Project reports | own scope | Site scope | Company scope | read-only, assigned Projects | Company metadata only |

Anchors: §6.6.2 authority; §6.7.2 authority table; §6.3.9 CLOSED (force-close
authority); §6.11.2 (Company Admin / Platform Admin scopes); §6.9.2 (report
scopes). Platform Admin has no operational authority over a Company's field
actions and no path to mutate Company F records (§6.11.2; AD-INV-2).

## 3. Overrides (AD-INV-4)

Exactly three named overrides in v1, each a canonical domain fact with
mandatory reason and attribution (§6.11.3): force-close shift
(AttendanceEvent FORCE_CLOSE, actor = admin, subject = worker), dismiss
blocker, reverse verification (produces Reversal). No silent admin mode; no
AdminActionEvent/OverrideEvent parallel layer (§6.11.4).

## 4. Enforcement points (DM-INV-10, §6.10.3)

1. Local precondition check, offline-capable, against cached authority state —
  failure is locally rejected with a specific reason (AC-ARCH-F1).
2. Server revalidation, authoritative, at sync — readiness-gate violations
  discovered at sync are rejected, notified, preserved (§6.10.3 table).
3. Storage-level tenancy and Site scoping on every path
  (M0/persistence-model.md §1.1, §1.4; architecture.md §A).

## 5. Membership creation (AD-INV-8)

Invitations are the sole membership creation path in v1 (Invitation F,
§6.11.3): admin initiates → recipient accepts → Person resolved/created →
Worker created → onboarding per §4. No direct Worker or Person creation by an
admin.
