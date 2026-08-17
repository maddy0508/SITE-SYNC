# SITE-SYNC Phase 0 — Navigation Architecture

**Status:** Approved design foundation for implementation planning.
**Date:** 2026-08-17
**Scope:** Application navigation model, context hierarchy, role routing, restoration, invalidation, and back/modal behaviour.

## 1. Purpose

Define where every major SITE-SYNC surface lives and how users move through the product before production feature UI is implemented.

The navigation model follows the product hierarchy:

AUTHENTICATION → IDENTITY → ORGANISATION/COMPANY → PROJECT → ROLE HOME → FEATURE SURFACES

Navigation is capability-aware, context-aware, and shared across roles. Role differences change available destinations and actions, not the underlying navigation system.

## 2. Context hierarchy

### Authentication
Establishes an authenticated session.

### Identity
Establishes the signed-in person and account context.

### Organisation / Company
Establishes the company context applicable to the account. Where a person belongs to only one applicable company, selection may be skipped while the context remains explicit.

### Project
Establishes the active project context. Feature screens that require a project must not operate without a valid project context.

### Role Home
The home surface is composed according to effective role/capability: Worker, Supervisor, or Administrator/company-level user.

## 3. Root navigation

The root authenticated experience is a role-specific Home plus a stable set of global destinations appropriate to that role.

Proposed root destinations are:

- HOME
- QR / ATTENDANCE where the role requires it
- WORK / OPERATIONS feature entry points as applicable
- REPORTS where authorised
- PROFILE / SETTINGS

The exact bottom-navigation set is capability-driven rather than identical for every role. Feature-heavy destinations remain grouped rather than turning every feature into a root tab.

## 4. Role architecture

### Worker
Worker navigation prioritises:
- Home
- My QR
- Attendance/time-related personal surfaces
- My Permits
- SWMS/documents relevant to the worker
- Profile/settings

### Supervisor
Supervisor navigation prioritises:
- Home
- QR scanner / attendance operations
- Team/site operational surfaces
- Permits and SWMS operations
- Reports/verification where authorised
- Profile/settings

### Administrator / company-level user
Administrator navigation prioritises:
- Home
- Organisation/company administration
- Project management/context
- People/memberships/assignments
- Operational controls
- Reports
- Settings

These are compositions of the same shared shell and components.

## 5. Navigation layers

### Root
Stable destinations represented by bottom navigation where appropriate.

### Nested
Feature details, lists, forms, history, and configuration screens push onto the current navigation stack.

### Modal
Short-lived tasks requiring focused attention use modal presentation, including confirmations, selection sheets, permission explanations, and other interruptive but reversible actions.

### Full-screen modal
Camera/QR scanning and similarly immersive workflows may use full-screen modal presentation.

### Contextual
Project/company context selectors, filters, and temporary operational controls are contextual surfaces and must not silently change the active context.

## 6. Back behaviour

- Nested screen: return to the immediately preceding screen.
- Modal: dismiss modal and return to the originating screen.
- Unsaved changes: prompt before destructive dismissal when changes would be lost.
- Scanner full-screen flow: back exits scanning and returns to the scanner entry surface; a processed result does not silently return to an unrelated root destination.
- Root destination: back exits according to Android/system behaviour rather than inventing an app-specific navigation loop.
- After a completed destructive/terminal workflow, navigation follows the workflow's defined success destination.

## 7. Context switching

### Project switching
Project switching is an explicit action. The active project context must be visible wherever it materially affects data or authority.

When the project changes:
1. Confirm the new project context.
2. Rebuild/replace project-scoped navigation state.
3. Discard stale project-scoped screens from the stack.
4. Route to the new project's role Home.
5. Re-evaluate available capabilities.

### Company switching
If multiple company contexts are available, company switching follows the same explicit model and invalidates dependent project context.

Company switch:
COMPANY → PROJECT CONTEXT RESET → ROLE/CAPABILITY RE-EVALUATION → HOME

## 8. Invalid context

If the active company/project becomes invalid because access is revoked, membership changes, the project closes, or authority can no longer be established:

1. Stop navigation into affected project-scoped operations.
2. Preserve already-visible safe information only where authorised.
3. Present an explicit context-invalid state.
4. Remove invalid project-scoped stack entries.
5. Route to the highest valid context (company selector or organisation/home).

The UI must not imply continued authority merely because a stale screen remains in memory.

## 9. Logout

Logout is a terminal session action.

Flow:

SETTINGS/PROFILE → CONFIRM LOGOUT → CLEAR SESSION → CLEAR AUTHENTICATED NAVIGATION → AUTHENTICATION

Cached offline data must follow the separate data-retention/security policy; navigation must never expose authenticated surfaces after logout.

## 10. App restart / restoration

On cold start:

1. Determine session state.
2. If unauthenticated → Authentication.
3. If authenticated → restore valid identity/company/project context where possible.
4. Revalidate context/capability before restoring project-scoped navigation.
5. If context cannot be restored safely → route to the highest valid context.

Do not blindly restore a stale feature screen that assumes authority which has not been re-established.

## 11. Offline navigation

Offline is an operating condition, not a separate navigation universe.

Users may continue into screens whose data and actions are explicitly supported offline.

Screens/actions requiring current authority or unavailable server state must surface the relevant PROVISIONAL, UNVERIFIABLE, BLOCKED, PENDING, or FAILED state rather than pretending the operation is current.

Persistent offline indication belongs in the shared shell; contextual offline/provisional information belongs near affected content/actions.

## 12. Permission and capability routing

Navigation must reflect effective permissions/capabilities.

A hidden destination is preferred when the user has no legitimate reason to access it. When a user reaches a surface through a stale link, restored state, or changing permission, the destination must resolve to a clear BLOCKED state or safe parent rather than exposing restricted content.

Permission failure is distinct from invalid input and unverifiable authority.

## 13. Navigation state model

Each navigation entry should be understood as:

- destination
- parent/context
- required context
- required capability
- presentation mode
- restoration policy
- offline policy
- exit destination

This prevents feature screens from becoming detached from organisation/project authority.

## 14. Feature placement principles

- Authentication is outside the authenticated shell.
- Identity/context establishment precedes project-scoped feature navigation.
- High-frequency role actions belong near Home or stable root navigation.
- Detailed feature records are nested.
- Forms and confirmations are contextual/modal where appropriate.
- Camera scanning is immersive/full-screen.
- Settings/profile are stable but secondary.
- Reports are grouped rather than creating one root destination per report type.
- Cross-company/project data is never reachable by navigation alone; underlying data isolation remains authoritative.

## 15. Navigation consequences of trust states

### VERIFIED
Normal navigation permitted within effective authority.

### PROVISIONAL
Navigation into cached/locally supported surfaces may continue, but current-authority actions must be marked appropriately.

### UNVERIFIABLE
Do not silently treat the context as current. Route to a state explaining what cannot currently be established and what recovery is available.

### BLOCKED
Do not enter the protected operation. Provide a safe return path.

### INVALID
Return to the input/action that produced the invalid state where correction is possible.

## 16. Acceptance gate

- [x] Authentication → identity → organisation/company → project → role Home hierarchy defined.
- [x] Root/nested/modal/contextual navigation layers defined.
- [x] Worker/supervisor/administrator compositions defined.
- [x] Back behaviour defined.
- [x] Logout behaviour defined.
- [x] Project/company switching defined.
- [x] Invalid-context handling defined.
- [x] Restart/restoration defined.
- [x] Offline navigation principles defined.
- [x] Permission/capability routing defined.
- [x] Trust-state navigation consequences defined.
- [x] Feature placement principles defined.
