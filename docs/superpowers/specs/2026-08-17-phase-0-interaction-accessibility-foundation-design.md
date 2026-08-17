# SITE-SYNC Phase 0 — Interaction + Accessibility Foundation

**Status:** Approved foundation for implementation planning  
**Date:** 2026-08-17  
**Scope:** Interaction behaviour, asynchronous operations, forms, navigation behaviour, destructive actions, accessibility, responsive text, haptics, and motion.

## 1. Purpose

Define the product-wide behavioural contract before production feature UI is implemented. All screens and reusable components inherit these rules unless a documented feature-specific exception is approved.

## 2. Touch and press

- Minimum interactive target: **48dp × 48dp**.
- Standard buttons use the approved 48dp geometry; large primary actions may use 52dp.
- Pressed state is immediate and visually apparent without requiring animation.
- Disabled controls do not respond to touch and must communicate disabled state through more than colour alone.
- Icon-only controls require an accessible semantic label.
- Touch targets must not be reduced to preserve visual density.

### Haptics

Haptics are restrained and semantic:

- Successful high-confidence actions may use a light confirmation.
- Destructive confirmation may use a distinct warning confirmation.
- Invalid input does not require a haptic on every keystroke.
- Repeated or continuous feedback is avoided.
- Reduced-motion/accessibility settings must not make haptics necessary to understand state.

## 3. Forms

### Validation timing

- Do not aggressively validate untouched fields.
- Validate on field completion where useful for immediate correction.
- Validate the full form on submission.
- Preserve valid input when another field fails.
- Errors identify the field/problem and the corrective action.

### Keyboard / IME

- Focused inputs remain visible above the keyboard.
- Keyboard action buttons match the next logical form operation.
- Numeric fields use the appropriate numeric keyboard.
- Password fields provide the platform-appropriate secure input behaviour.
- Search fields support explicit dismissal/clear behaviour.
- Submission must be disabled or guarded while an identical request is already in flight.

## 4. Navigation

### Transitions

- Standard navigation uses a short, consistent transition.
- Nested screens retain context and predictable back behaviour.
- Modal flows are visually and behaviourally distinct from ordinary navigation.
- Camera/QR scanning is treated as a dedicated full-screen operational surface.

### Back behaviour

- Back returns to the immediate previous navigation state.
- Back never silently discards meaningful unsaved changes.
- A modal closes before the underlying screen is popped.
- After a completed destructive or submission flow, back does not return the user to a stale editable state unless explicitly supported.

### Unsaved state

If meaningful edits would be lost, the user receives a clear confirmation before leaving. If no meaningful data would be lost, navigation remains immediate.

### Context invalidation

If company/project context becomes invalid while a screen is open, the app must not continue presenting context-dependent actions as authorised. Route the user to the nearest valid context-selection state and explain the change.

## 5. Async operations

Every asynchronous action has an explicit lifecycle:

`IDLE → SUBMITTING/LOADING → SUCCESS | FAILED`

Where applicable:

`OFFLINE → PENDING → SYNCING → SUCCESS | FAILED`

Rules:

- Loading feedback appears immediately for operations that are not effectively instantaneous.
- The initiating control is guarded against duplicate submission.
- Retry is offered when the failure is recoverable.
- Cancellation is available for long-running user-controlled operations where safe.
- Success feedback confirms the resulting state rather than merely saying the request was sent.
- Failure feedback explains what failed and the available recovery path.

## 6. Offline behaviour

Offline is an operating condition, not a generic error.

- Persistent offline state is available through the global shell/status treatment.
- A contextual banner is used when offline materially changes the current task.
- Actions that are safe offline remain available.
- Actions requiring current authority are blocked or placed into an explicitly pending state according to domain rules.
- Cached information must carry an appropriate freshness/verification state.
- Offline success must never be represented as current server verification.

## 7. Trust and verification interaction

The interaction model preserves the distinction between:

- **VERIFIED** — current trusted validation is established.
- **PROVISIONAL** — trusted cached/local information supports the result, but current authority is unavailable.
- **UNVERIFIABLE** — sufficient authority cannot currently be established.
- **BLOCKED** — the action/context is not authorised.
- **INVALID** — the supplied input itself is malformed/unacceptable.

No interaction may collapse these into a generic success/error pair.

## 8. Destructive actions

Destructive actions are proportionate to consequence.

- Reversible low-risk actions may use immediate action plus undo where appropriate.
- Irreversible or materially consequential actions require explicit confirmation.
- Confirmation states the consequence in plain language.
- The destructive action is visually distinct but does not rely on colour alone.
- Confirmation is never disguised as a neutral continuation button.
- Repeated taps cannot trigger repeated destructive operations.

## 9. Errors and recovery

Avoid generic messages such as “Something went wrong” when the system can identify the failure.

Preferred structure:

**WHAT HAPPENED → WHY IT MATTERS → WHAT CAN BE DONE**

Example:

> We couldn't verify this worker against the current project roster. Check the project assignment or try again when a connection is available.

Recovery actions are explicit: retry, go back, choose another context, request permission, or continue with an allowed offline path.

## 10. Accessibility baseline

### Semantics

- Every meaningful control has a semantic role and accessible name.
- Decorative logo/banner artwork is excluded from the accessibility tree.
- Icon-only actions require explicit accessible names.
- Status information is announced semantically where it changes meaningfully.
- Reading order follows visual and task hierarchy.

### Colour

- Colour never carries state meaning by itself.
- Verified/provisional/unverifiable/blocked/invalid states require text, iconography, shape, or another redundant cue.
- Text and interactive elements must meet the applicable Android accessibility contrast requirements.

### Dynamic text

- Support Android system font scaling.
- Content must reflow rather than clip or overlap at enlarged text sizes.
- Fixed-height containers must not contain variable text that can become inaccessible.
- ALL-CAPS treatment remains a visual casing rule; source semantics remain meaningful to assistive technology.

### Focus

- Focus order follows task order.
- Focus remains visible against both light and dark surfaces.
- Modal focus is trapped within the modal until dismissed.
- Returning from a modal restores focus to a sensible originating control.

## 11. Motion

Motion is controlled and functional.

- Screen transitions are short and consistent.
- Loading animation communicates ongoing activity.
- Success/error motion is brief and optional, never required for comprehension.
- QR scanning feedback may animate while active.
- Reduced-motion settings disable non-essential movement and replace it with instantaneous state changes or static feedback.

## 12. Responsive behaviour

- Portrait is the primary orientation.
- Small phones use the minimum spacing/margin rules without reducing touch targets.
- Large phones may use increased horizontal margins and whitespace.
- Tablets may use wider content regions and multi-column compositions where task-appropriate.
- Landscape is supported only where it materially improves an operational task; it must not create unusable cropped layouts.
- System bars and safe areas are respected.

## 13. Acceptance gate

- [x] Touch targets defined.
- [x] Press/focus/disabled behaviour defined.
- [x] Haptic policy defined.
- [x] Form validation defined.
- [x] Keyboard/IME behaviour defined.
- [x] Navigation and back behaviour defined.
- [x] Unsaved-state behaviour defined.
- [x] Async lifecycle defined.
- [x] Offline interaction defined.
- [x] Trust-state interaction defined.
- [x] Destructive-action rules defined.
- [x] Error/recovery language defined.
- [x] Accessibility semantics defined.
- [x] Dynamic text behaviour defined.
- [x] Reduced-motion behaviour defined.
- [x] Responsive rules defined.
