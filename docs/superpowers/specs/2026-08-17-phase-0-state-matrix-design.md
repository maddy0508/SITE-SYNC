# SITE-SYNC Phase 0 — UI State Matrix

**Status:** Design foundation complete; implementation planning only.
**Date:** 2026-08-17
**Scope:** Screen × state × behaviour contract for Phase 0.

## 1. Purpose

Define which states apply to each major SITE-SYNC screen and what each state means, displays, permits, blocks, and does on recovery. This prevents screens from inventing their own loading, offline, trust, permission, or error language.

## 2. Global state vocabulary

| State | Meaning | User-facing treatment | Action policy |
|---|---|---|---|
| DEFAULT | Screen can be entered/used normally | Standard screen | Normal allowed actions |
| LOADING | Required data is being obtained | Skeleton/progress; preserve structure | Prevent duplicate submission; navigation only when safe |
| LOADED | Required data available | Standard content | Normal actions |
| EMPTY | Valid request returned no records | Explicit empty state + useful next action | Creation/navigation where authorised |
| ERROR | Operation failed without a more specific state | Specific explanation + retry/recovery | Retry or safe exit |
| OFFLINE | Device currently has no network path | Persistent compact indicator; banner when consequential | Local-safe actions remain available; network-authoritative actions may block |
| STALE | Cached data exceeds its accepted freshness | Explicit stale label/timestamp | Read where safe; do not imply current authority |
| PROVISIONAL | Result is supported by trusted cached/local information but current authority cannot be established | Distinct provisional treatment | Actions limited to those explicitly permitted for provisional state |
| UNVERIFIABLE | Authority/current validity cannot currently be established | Explicit unverifiable state | Do not present as verified; restrict consequential action |
| BLOCKED | Requested context/action is not authorised | Permission/blocked explanation | No execution; offer permitted alternative or exit |
| INVALID | Supplied input is malformed/unacceptable | Input-specific error | Correct/re-enter; do not retry unchanged input blindly |
| DISABLED | Control unavailable by design/context | Disabled control with accessible explanation when needed | No action |
| SUBMITTING | User action is being committed | Progress on originating action | Prevent duplicate submission |
| SUCCESS | Action completed | Brief success confirmation/state transition | Continue/return according to flow |
| SYNCING | Local state is being reconciled | Sync indicator + scope | Continue safe local work; do not imply completed server reconciliation |
| PENDING | Action/data awaits server or workflow resolution | Pending status + timestamp/context | No duplicate creation; allow cancellation only where defined |
| FAILED | Sync/reconciliation or queued operation failed | Explicit failure + retry/recovery | Preserve local evidence; retry safely |

## 3. Screen matrix

| Screen | Loading | Empty | Error | Offline | Stale | Provisional | Blocked | Invalid | Submitting/Syncing/Pending/Failed |
|---|---|---|---|---|---|---|---|---|---|
| Authentication | Yes | N/A | Yes | Yes where cached session policy permits | N/A | N/A | Yes | Yes | Submitting |
| Identity | Yes | N/A | Yes | Yes | Yes | Yes where identity is cache-backed | Yes | Yes | Syncing/Pending |
| Organisation / Company Context | Yes | Yes | Yes | Yes | Yes | Yes | Yes | N/A | Syncing |
| Project Context | Yes | Yes | Yes | Yes | Yes | Yes | Yes | N/A | Syncing |
| Worker Home | Yes | Yes for individual widgets | Yes | Yes | Yes | Yes for cached widgets | Yes for unavailable capability | N/A | Syncing/Pending |
| Supervisor Home | Yes | Yes for individual widgets | Yes | Yes | Yes | Yes where source is cached | Yes | N/A | Syncing/Pending |
| Administrator Home | Yes | Yes for individual widgets | Yes | Yes | Yes | Yes where source is cached | Yes | N/A | Syncing/Pending |
| My QR | Yes | N/A | Yes | Yes | Yes | Yes | Yes | N/A | Regenerating/Pending where applicable |
| QR Scanner | Camera loading | N/A | Yes | Yes | N/A | N/A | Permission denied | Invalid scan | Processing |
| QR Scan Result | Processing | N/A | Yes | Yes | Yes | Yes | Yes | Yes | Pending verification |
| Attendance | Yes | Yes | Yes | Yes | Yes | Yes | Yes | Yes | Submitting/Syncing/Pending/Failed |
| Timesheets | Yes | Yes | Yes | Yes | Yes | Yes | Yes | N/A | Syncing/Pending/Failed |
| SWMS Library | Yes | Yes | Yes | Yes | Yes | Yes | Yes | N/A | Syncing |
| SWMS Detail | Yes | N/A | Yes | Yes | Yes | Yes | Yes | N/A | Pending signature/update where applicable |
| My Permits | Yes | Yes | Yes | Yes | Yes | Yes | Yes | N/A | Syncing/Pending/Failed |
| Permit Detail | Yes | N/A | Yes | Yes | Yes | Yes | Yes | Yes | Submitting/Syncing/Pending/Failed |
| Reports | Yes | Yes | Yes | Yes | Yes | Yes | Yes | N/A | Generating/Syncing/Pending/Failed |
| Report Detail | Yes | N/A | Yes | Yes | Yes | Yes | Yes | N/A | Generating/Syncing |
| Settings | Yes only where data is loaded remotely | Yes for optional sections | Yes | Yes | Yes for remote settings | Yes | Yes | Yes | Submitting/Syncing |
| Logout | N/A | N/A | Yes | Yes | N/A | N/A | N/A | N/A | Submitting |

## 4. Trust-state rules

Trust states are not generic feedback states and must never be collapsed into one visual treatment.

### VERIFIED

Current trusted authority has been established. Display a clear `VERIFIED` state and, where useful, the verification timestamp/source context.

### PROVISIONAL

Trusted local/cached information supports the result, but current authority is unavailable. Display `PROVISIONAL` prominently enough that it cannot be mistaken for verified authority.

### UNVERIFIABLE

The system cannot establish sufficient authority. Do not use success language or a verified visual. Consequential actions requiring current authority remain blocked.

### BLOCKED

The requested action or context is not authorised. Explain the permission boundary without exposing unnecessary security detail.

### INVALID

The supplied value itself is malformed, expired, unacceptable, or otherwise invalid. This is distinct from a permission failure and distinct from inability to verify.

## 5. Offline rules

Offline is a normal operating condition, not a generic error.

### Persistent indicator

Show a compact `OFFLINE` indicator in the global shell while offline.

### Consequential banner

Use a banner when offline changes the user's ability to complete the current workflow or when cached information could otherwise be mistaken for current authority.

### Action policy

- Local-safe actions remain available where the domain permits them.
- Network-authoritative actions are blocked rather than simulated as successful.
- Locally recorded work is explicitly marked pending/syncing as appropriate.
- Cached information may be shown with freshness/provisional treatment.
- Never imply server reconciliation while offline.

## 6. Recovery rules

### Error → Retry

Retry only the failed operation. Preserve user-entered data and current navigation context where safe.

### Offline → Online

Do not silently claim success. Re-establish connectivity, reconcile queued operations according to domain rules, then transition through `SYNCING`/`PENDING`/`SUCCESS` or `FAILED` as applicable.

### Provisional → Verified

When current authority becomes available, explicitly transition to `VERIFIED` and update the verification timestamp.

### Provisional → Unverifiable

If cached evidence can no longer establish a sufficient basis, downgrade to `UNVERIFIABLE`; never preserve the stronger state merely because it was previously shown.

### Blocked

Do not retry automatically. Route to a permitted action, context switch, or exit.

### Invalid

Keep the user in the originating flow and identify what must be corrected.

## 7. Screen-level state selection rule

A screen may display multiple states simultaneously at different scopes. Example: a loaded screen can be `OFFLINE`, one card can be `STALE`, and one queued action can be `PENDING`. The state matrix is therefore compositional rather than a single mutually-exclusive screen enum.

Priority for user communication when states conflict:

1. BLOCKED / permission consequence
2. INVALID input consequence
3. UNVERIFIABLE / PROVISIONAL trust consequence
4. OFFLINE / connectivity condition
5. ERROR / FAILED operation
6. PENDING / SYNCING
7. STALE
8. LOADING
9. LOADED / EMPTY

The priority controls presentation prominence, not data-model exclusivity.

## 8. Accessibility

- Every state has a text label or semantic equivalent; colour is supplementary.
- Status announcements must describe the meaningful transition, not only the colour/icon change.
- Loading and syncing indicators must not trap focus.
- Error and blocked messages must be reachable in logical focus order.
- Dynamic text scaling must not remove the distinction between trust states.

## 9. Acceptance gate

- [x] Global state vocabulary defined.
- [x] Major screen × state applicability mapped.
- [x] Trust states explicitly separated.
- [x] Offline model explicitly separated from error.
- [x] Recovery rules defined.
- [x] Concurrent state composition defined.
- [x] State communication priority defined.
- [x] Accessibility rules defined.
