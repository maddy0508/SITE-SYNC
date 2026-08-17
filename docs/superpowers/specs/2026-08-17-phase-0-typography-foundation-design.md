# SITE-SYNC Phase 0 — Typography Foundation Design

**Status:** Approved design direction; typography foundation specified for implementation planning.
**Date:** 2026-08-17
**Scope:** M1.5 / Phase 0 UI Foundation — typography only.

## 1. Purpose

Define the reusable SITE-SYNC typography system before component and screen implementation. Typography must establish hierarchy, information density, accessibility behaviour, and consistent casing across both light and dark themes.

The approved visual direction is **Clean / Modern Operational**. Light and dark themes share the same typographic system; theme changes affect colour and surface treatment, not typography.

## 2. Typeface system

### Primary display/UI family: Poppins

Poppins is the primary visual voice for high-hierarchy interface text:

- display text
- screen titles
- section headings
- card titles
- buttons and high-priority actions
- prominent numerical/statistical values
- selected navigation labels where emphasis is required

Poppins provides the geometric, clean, contemporary character established by the approved visual direction without making the product feel futuristic or decorative.

### Supporting information family: Inter

Inter is used where readability and information density are the priority:

- body copy
- secondary body copy
- descriptions
- metadata
- timestamps
- supporting labels
- dense operational information
- accessibility/helper text

The two-family split is deliberate: Poppins establishes hierarchy and brand character; Inter carries operational reading load.

## 3. Type scale

Initial tokens are defined below. Exact Android rendering values may be tuned during component implementation only where required to preserve the approved hierarchy across device sizes and system font scaling.

| Token | Family | Size | Weight | Line height | Letter spacing | Casing |
|---|---|---:|---|---:|---|---|
| `display` | Poppins | 32sp | Bold | 38sp | -0.2sp | Intentional case; ALL CAPS permitted for short branded/display labels |
| `screen-title` | Poppins | 24sp | SemiBold | 30sp | 0 | **ALL CAPS by default** |
| `section-heading` | Poppins | 18sp | SemiBold | 24sp | 0 | **ALL CAPS by default** |
| `card-title` | Poppins | 16sp | Medium/SemiBold | 20sp | 0 | **ALL CAPS by default for short operational titles** |
| `body` | Inter | 14sp | Regular | 20sp | 0 | Sentence case |
| `body-secondary` | Inter | 14sp | Regular | 20sp | 0 | Sentence case |
| `label` | Inter | 12sp | Medium | 16sp | +0.3sp | **ALL CAPS by default** |
| `caption` | Inter | 11sp | Regular | 14sp | +0.1sp | Sentence case unless a status/metadata token requires ALL CAPS |
| `button` | Poppins | 14sp | Medium/SemiBold | 18sp | +0.4sp | **ALL CAPS by default** |
| `numeric` | Poppins | 32sp | SemiBold/Bold | 36sp | -0.3sp | Numeric; accompanying unit/status follows its own token |
| `status` | Inter | 12sp | Medium/SemiBold | 16sp | +0.5sp | **ALL CAPS** |

## 4. Casing philosophy

The approved direction intentionally uses **more ALL CAPS than the earlier draft**.

ALL CAPS is part of SITE-SYNC's operational visual language. It should be deliberate and systematic rather than random.

### ALL CAPS is the default for

- screen titles
- section headings
- short card titles
- buttons
- field/component labels
- status labels
- navigation labels where space permits
- short action labels
- compact metadata categories
- verification/trust states
- operational headings such as `TODAY'S OVERVIEW`, `SITE STATUS`, `QUICK ACTIONS`, `MY PERMITS`, `MY QR CODE`

### Sentence case is the default for

- body paragraphs
- explanations
- helper text
- error descriptions
- confirmation/destructive-action explanations
- longer names and free-form content
- timestamps when presented as prose

### Domain names and user data

User-entered names, company names, project names, document titles and other source data must not be forcibly uppercased unless the domain explicitly requires it.

The UI may use a separate display transformation for intentional identity treatments, but source data must remain semantically intact.

## 5. Hierarchy rules

Typography hierarchy must be obvious without relying on colour alone.

Priority order:

1. Screen title
2. Section heading
3. Card/action title
4. Primary body content
5. Supporting body content
6. Label/caption/metadata

Weight and size should do most of the hierarchical work. Brand colour is supplementary.

A heading must remain distinguishable in monochrome or when viewed with reduced colour perception.

## 6. Theme behaviour

Typography does not change between light and dark themes.

### Light

- Primary text: SITE-SYNC Navy / Deep Blue
- Secondary text: Deep Blue / Structural Blue as appropriate
- Muted text: approved neutral treatment

### Dark

- Primary text: warm white/light neutral
- Secondary text: lighter approved neutral
- Muted text: reduced-contrast approved neutral

Solar/amber remains the primary brand accent in both themes. Teal/aqua remains the secondary technical accent in both themes. Typography must not become dependent on either accent for readability.

## 7. Accessibility

- Text must remain readable at supported Android system font-scale settings.
- No critical information may be conveyed through casing alone.
- ALL CAPS must not be used for long paragraphs or lengthy explanatory text because it materially reduces readability.
- Line height must remain sufficient for scaled text and multi-line labels.
- Text colour must meet the Phase 0 contrast requirements independently of brand accent decoration.
- Truncation must never remove the semantic distinction between trust states, errors, permissions, or destructive actions.
- Numeric/statistical values must remain legible when system font scaling is increased.

## 8. Component application

The typography tokens are the only permitted starting points for components. Components may compose tokens but should not create arbitrary one-off text styles.

Examples:

- `TODAY'S OVERVIEW` → `section-heading`
- `MY PERMITS` → `screen-title` or `card-title` depending on context
- `WORKERS ON SITE` → `label`
- `128 / 142` → `numeric`
- `Last verified · 08:42` → `caption`
- `WE COULDN'T VERIFY THIS WORKER` → `status`/heading hierarchy plus sentence-case explanatory body text
- `RETRY` → `button`

## 9. Relationship to brand foundation

Typography must visually coexist with the locked eight-colour chromatic brand palette:

- `#FCB93E` Solar Gold
- `#FDA822` Solar Amber
- `#F98D0F` Solar Orange
- `#021939` SITE-SYNC Navy
- `#023056` Deep Blue
- `#055077` Structural Blue
- `#067699` Teal
- `#10A7BE` Aqua

`#06A7BE` Bright Aqua is not part of the active palette.

Typography itself remains primarily neutral/structural. Solar/amber is the primary accent and teal/aqua the secondary accent in both themes.

## 10. Non-goals

This specification does not define:

- component geometry
- spacing tokens
- navigation
- iconography
- motion
- screen-specific layouts
- production UI implementation

Those belong to subsequent Phase 0 design work.

## 11. Acceptance criteria

- [x] Typeface direction approved: Poppins + Inter.
- [x] Clean / Modern Operational visual direction approved.
- [x] Light and dark themes share one typography system.
- [x] ALL CAPS usage explicitly expanded and systematised.
- [x] Sentence-case exceptions defined.
- [x] Numeric/statistical treatment defined.
- [x] Accessibility baseline defined.
- [x] Typography is independent of semantic accent colour.
- [x] Active palette is correctly recorded as eight chromatic colours.
