# SITE-SYNC Phase 0 — Spacing + Geometry Foundation

**Status:** Approved design direction; spacing and geometry foundation specified for implementation planning.
**Date:** 2026-08-17
**Scope:** M1.5 / Phase 0 UI Foundation — spacing, dimensions, geometry, elevation, and responsive rules.

## 1. Purpose

Define the reusable physical grammar of SITE-SYNC before component and screen implementation. Every subsequent surface must derive its dimensions from these tokens rather than arbitrary per-screen values.

The approved visual direction is **Clean / Modern Operational**. Light and dark themes share the same geometry, spacing, sizing, and interaction dimensions.

## 2. Base measurement system

SITE-SYNC uses a 4dp base grid. Values should align to the grid wherever practical; 2dp values are permitted only for optical correction, hairline separators, or typography-related alignment.

### Core spacing tokens

| Token | Value |
|---|---:|
| `spacing-1` | 4dp |
| `spacing-2` | 8dp |
| `spacing-3` | 12dp |
| `spacing-4` | 16dp |
| `spacing-5` | 20dp |
| `spacing-6` | 24dp |
| `spacing-8` | 32dp |
| `spacing-10` | 40dp |
| `spacing-12` | 48dp |
| `spacing-16` | 64dp |

No arbitrary padding values should be introduced into reusable components without a documented optical or platform-specific reason.

## 3. Screen geometry

- Standard phone horizontal content margin: **20dp**.
- Compact/small phone minimum horizontal margin: **16dp** when required to preserve usable content width.
- Large phone/tablet content margin: **24dp** minimum, with a maximum readable content width rather than uncontrolled stretching.
- Screen header to first content block: **24dp** standard.
- Major section separation: **24dp**.
- Minor section separation: **16dp**.
- Related elements: **8–12dp**.
- Bottom clearance above persistent navigation: **16dp minimum**.
- All content respects Android status-bar, navigation-bar, cutout, and gesture insets.

## 4. Cards and surfaces

- Standard card radius: **16dp**.
- Standard card padding: **16dp**.
- Compact card padding: **12dp** only where density requires it.
- Large feature/identity card padding: **20dp**.
- Boundary border: **1dp**.
- Card-to-card spacing: **12–16dp**.
- Surface contrast/elevation, rather than heavy shadows, establishes hierarchy.
- Excessive nested cards are prohibited.

## 5. Corner-radius system

| Token | Value | Use |
|---|---:|---|
| `radius-xs` | 6dp | Small tags/compact controls |
| `radius-sm` | 10dp | Inputs, compact controls |
| `radius-md` | 12dp | Buttons, small cards |
| `radius-lg` | 16dp | Standard cards, panels |
| `radius-xl` | 20dp | Feature/identity surfaces |
| `radius-pill` | 999dp | Pills, status badges, circular controls |

## 6. Borders and dividers

- Standard border: **1dp**.
- Dividers: **1dp**.
- Use subtle approved brand/neutral tints rather than high-contrast outlines by default.
- Same border logic in both themes; surface-aware colour token changes with theme.
- Gradient borders are reserved for deliberate emphasis, not every card.

## 7. Buttons and controls

- Minimum interactive target: **48 × 48dp**.
- Standard button height: **48dp**.
- Compact button height: **40dp** only for secondary/space-constrained contexts where accessibility remains satisfied.
- Large/high-emphasis action: **52dp**.
- Horizontal button padding: **16–20dp**.
- Standard button radius: **12dp**.
- Uppercase action labels must not wrap under normal conditions.

## 8. Inputs

- Standard input height: **52dp**.
- Compact input height: **48dp** minimum.
- Horizontal internal padding: **16dp**.
- Input radius: **12dp**.
- Label-to-input spacing: **8dp**.
- Input-to-error/help spacing: **4–8dp**.
- Inputs must accommodate system font scaling without clipping.

## 9. Iconography dimensions

| Token | Value | Use |
|---|---:|---|
| `icon-xs` | 16dp | Inline/status detail |
| `icon-sm` | 20dp | Compact controls |
| `icon-md` | 24dp | Standard navigation/actions |
| `icon-lg` | 32dp | Feature/action surfaces |
| `icon-xl` | 40dp | Identity/feature emphasis |
| `icon-xxl` | 48dp | Large empty/feedback states |

Visible glyph size does not override the 48dp minimum interactive target.

## 10. Identity geometry

- Small avatar: **32dp**.
- Standard avatar: **40dp**.
- Prominent avatar: **56dp**.
- Profile/identity hero: **80–96dp** depending on screen hierarchy.
- Worker identity layouts must preserve identity, role/company/project context, and status without excessive truncation.
- Company/project marks use consistent containment and must not dominate worker identity without an explicit hierarchy decision.

## 11. QR geometry

- Standard QR display region: **240–280dp square** on phones where width permits.
- Minimum practical QR rendering area: **200dp square**.
- QR quiet zone remains intact.
- QR is never cropped by decorative containers.
- Supporting identity/status information sits outside the QR data region.
- Scanner framing preserves adequate camera viewport and keeps controls out of critical scan content.

Exact QR size adapts to available width while preserving reliability.

## 12. Navigation geometry

### Bottom navigation

- Minimum touch target per destination: **48dp**.
- Container height must accommodate icon, label, and system gesture inset.
- A floating primary action may overlap the navigation surface only when its touch target remains independently clear.

### Top navigation

- Standard top-bar interactive height: **56dp** minimum, excluding system insets.
- Back/navigation icon target: **48 × 48dp**.
- Title alignment remains stable across screens.

## 13. Responsive/device rules

SITE-SYNC is Android/native-first and must not be designed around a single screenshot size.

### Small phone

1. Preserve touch targets.
2. Preserve primary information.
3. Reduce horizontal padding where necessary.
4. Stack secondary content rather than compressing text below readability.

### Standard/large phone

Use the standard 20dp content margin and normal spacing scale.

### Tablet

If tablet support is enabled for a surface, use responsive columns or constrained reading widths rather than stretching every card to full display width.

### Orientation

Portrait is the primary design orientation. Landscape remains functional for core workflows but does not require identical composition. Critical actions and data must remain accessible.

## 14. Typography relationship

Geometry must respect the approved Poppins + Inter typography system. Typography is not shrunk to force fixed geometry.

When space is constrained:

1. preserve touch target;
2. preserve semantic text;
3. allow vertical expansion/stacking;
4. reduce optional spacing;
5. only then consider a smaller permitted typography token.

The typography system intentionally uses substantial ALL CAPS for operational headings, labels, buttons, navigation, and statuses; geometry must account for this casing without creating cramped layouts.

## 15. Elevation and depth

- Base surfaces rely primarily on colour/value contrast.
- Standard cards use subtle elevation or surface contrast.
- Floating controls may use stronger elevation to communicate separation.
- Decorative shadows must not become a defining visual feature.
- Dark mode avoids muddy black-on-navy shadow effects.

## 16. Optical corrections

The 4dp grid is the default, not an absolute prohibition against optical correction. Permitted exceptions include icon optical centering, logo alignment, 1–2dp separator alignment, platform text-baseline correction, QR quiet-zone preservation, and device/system inset handling. Exceptions should be made at component level rather than repeatedly per screen.

## 17. Non-goals

This specification does not define colour tokens, typography tokens beyond geometry implications, component variants, navigation architecture, screen-specific layouts, or production UI implementation.

## 18. Acceptance criteria

- [x] 4dp base grid established.
- [x] Core spacing tokens defined.
- [x] Screen margins defined.
- [x] Card padding and radius rules defined.
- [x] Button/input dimensions defined.
- [x] Minimum touch targets defined.
- [x] Icon sizes defined.
- [x] Avatar/identity geometry defined.
- [x] QR display geometry defined.
- [x] Border/divider rules defined.
- [x] Elevation rules defined.
- [x] Safe-area and responsive rules defined.
- [x] Landscape policy defined.
- [x] Geometry relationship to typography defined.
- [x] Optical-correction rules defined.
