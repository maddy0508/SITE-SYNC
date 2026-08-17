# SITE-SYNC Phase 0 — Brand Foundation Design

## Status
Corrected design specification. The active chromatic system is now **8 colours**; Bright Aqua is removed from the active brand palette.

## Purpose
Establish the immutable visual foundation for Phase 0 before production feature UI is implemented.

## Canonical active brand colours

### Solar
- `#FCB93E` — Solar Gold
- `#FDA822` — Solar Amber
- `#F98D0F` — Solar Orange

### Infrastructure
- `#021939` — SITE-SYNC Navy
- `#023056` — Deep Blue
- `#055077` — Structural Blue

### Technical
- `#067699` — Teal
- `#10A7BE` — Aqua

`#06A7BE` — Bright Aqua is removed from the active brand system. It must not be used in production UI unless explicitly reinstated later.

No purple, generic green, generic red, neon substitutions, or invented chromatic brand hues are permitted.

## Gradient system

### Solar Gradient
**Solar-only:** `#FCB93E → #FDA822 → #F98D0F`

The Solar Gradient must remain entirely within the Solar family. **It must not transition into blue, teal, aqua, or any Infrastructure/Technical colour.**

### Infrastructure Gradient
`#021939 → #023056 → #055077`

### Technical Gradient
`#067699 → #10A7BE`

### SITE-SYNC Signature Gradient
A controlled continuous transition across the active Solar, Infrastructure and Technical families, using only the eight active colours. This is distinct from the Solar Gradient and must not be used as a substitute for the Solar family gradient.

## Logo rules

The supplied SITE-SYNC logo is the master visual asset. Preserve its geometry, proportions and original colour relationships.

Header/banner treatment uses the actual logo enlarged, cropped and rendered semi-transparent. The header must not use a newly invented illustration or recoloured approximation.

## Theme rules

### Dark
- Background hierarchy: SITE-SYNC Navy → Deep Blue → Structural Blue.
- Solar family carries primary emphasis and activation.
- Technical family carries connection, technology and synchronisation.
- Controlled gradients may span the active brand families where appropriate.

### Light
- Warm neutral base.
- Navy/Deep Blue typography and structural elements.
- The same Solar, Infrastructure and Technical brand colours remain visible.
- Light mode must not become a generic blue/white interface.

## Application rules

- Flat brand colours are allowed where a single semantic or structural value is required.
- Gradient treatments are preferred for designated brand accents, outlines, signature surfaces and selected indicators where they improve hierarchy.
- Gradients must remain restrained; the interface must not become a collection of unrelated rainbow accents.
- The Solar Gradient is specifically restricted to Solar Gold → Solar Amber → Solar Orange.
- Brand colours must never be substituted with visually similar colours from outside the active palette.
- Semantic status colours will be defined separately in the wider Phase 0 design system and must not silently alter the canonical brand palette.

## Figma source of truth

Figma file: `SITE-SYNC — Brand Foundation`

`https://www.figma.com/design/j8K9GWR1bnCYy4dOMbmUQE`

The Figma foundation must be corrected to match this specification: Bright Aqua removed, Solar Gradient corrected to Solar-only, and the Signature Gradient kept separate from the Solar Gradient.

## Scope boundary

This foundation does not define production feature screens, QR camera behaviour, attendance, synchronisation, permits, SWMS, or backend data. Those consume this foundation in later Phase 0/M1.5 work.