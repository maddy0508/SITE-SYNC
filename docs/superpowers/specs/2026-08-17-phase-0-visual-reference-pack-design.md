# SITE-SYNC Phase 0 — Visual Reference Pack

**Status:** Visual direction approved; Figma production blocked by current MCP Starter-plan rate limit.
**Date:** 2026-08-17

## Purpose

Create five visual reference artefacts that demonstrate the approved Phase 0 design system without becoming production feature screens.

## 1. Canonical Light Screen

Android phone-native frame.

- Clean modern operational character.
- Warm-white background.
- SITE-SYNC Navy / Deep Blue typography.
- Solar Gold / Amber / Orange as primary brand emphasis.
- Teal / Aqua as secondary technical accent.
- Subtle brand-tint borders.
- Poppins for hierarchy and Inter for dense/supporting information.
- Strong intentional ALL-CAPS usage for screen titles, section headings, short labels, buttons and statuses.
- Actual SITE-SYNC logo used as a large, cropped, semi-transparent header/banner artwork.
- No separate small logo in the top-left when the banner treatment is present.

## 2. Canonical Dark Screen

Same composition and component language as Light Screen, adapted to dark surfaces.

- SITE-SYNC Navy foundation.
- Deep Blue elevated surfaces.
- Solar / Amber remains the primary accent.
- Teal / Aqua remains the secondary accent.
- Borders remain subtle brand-tint borders.
- Same typography and ALL-CAPS rules.
- Actual logo retains its original colour composition in the translucent header/banner.
- Overall character remains clean and operational, not neon, gamer, or futuristic.

## 3. Component Reference Sheet

Show the reusable component vocabulary:

- App shell / top bar
- Navigation
- Primary / secondary / tertiary / destructive / icon buttons
- Text / search / selection inputs
- Standard card
- Identity card
- Statistic card
- Action card
- Section header
- Status / trust indicators
- Offline / syncing / stale indicators
- Loading / skeleton / empty / error feedback
- Avatar / worker identity / role badge

Use both light and dark examples where necessary. Do not invent components outside the approved inventory.

## 4. Trust + Offline State Sheet

Show visually distinct examples of:

- VERIFIED
- PROVISIONAL
- UNVERIFIABLE
- BLOCKED
- INVALID
- ONLINE
- OFFLINE
- SYNCING
- STALE
- PENDING
- FAILED

Rules:

- Colour is never the sole state signal.
- VERIFIED and PROVISIONAL must never look equivalent.
- OFFLINE is an operating condition, not a generic error.
- Copy must not imply authority the system cannot establish.

## 5. QR State Sheet

Show the Phase 0 visual language for:

- Worker QR display
- Scanner/camera viewport
- Scanning
- Processing
- VALID
- INVALID
- UNASSIGNED
- UNVERIFIABLE
- PROVISIONAL
- PERMISSION DENIED
- CAMERA UNAVAILABLE

The sheet establishes UX language only; QR camera functionality remains outside Phase 0.

## Locked visual rules

- Active chromatic palette contains exactly eight colours:
  - #FCB93E Solar Gold
  - #FDA822 Solar Amber
  - #F98D0F Solar Orange
  - #021939 SITE-SYNC Navy
  - #023056 Deep Blue
  - #055077 Structural Blue
  - #067699 Teal
  - #10A7BE Aqua
- #06A7BE Bright Aqua is not an active brand colour.
- Solar gradient = Gold → Amber → Orange only.
- Infrastructure gradient = Navy → Deep Blue → Structural Blue.
- Technical gradient = Teal → Aqua.
- Solar/Amber is primary accent in both themes.
- Teal/Aqua is secondary accent in both themes.
- Borders use subtle brand tint.
- The actual logo is the source of truth for logo artwork and translucent banner treatment.
- No invented logo recolouring.
- No purple, green, red, or other unapproved chromatic variants.
- No production feature UI is implemented by this artefact.
