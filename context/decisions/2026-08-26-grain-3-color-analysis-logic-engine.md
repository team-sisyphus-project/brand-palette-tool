# grain-3: Color analysis logic engine

## Decision

1. Built `getColorRoles` (`src/lib/colorRoles.ts`) as the single source of
   truth every other new module composes on top of: it maps a generated
   5-color palette onto the 10 fixed semantic roles (Primary, Secondary,
   Accent, Background, Surface, Text, Border, Success, Warning, Error) as
   follows —
   - Primary/Secondary/Accent reuse palette slots 0/1/2 directly (no new
     color math).
   - Background/Surface/Text/Border are "branded neutrals": the primary
     color's own hue at fixed, near-zero saturation and role-specific
     lightness (background/surface near-white, text near-black, border
     in between).
   - Success/Warning/Error are fixed green/amber/red hues, independent of
     the input palette.
2. Split the 7 in-scope analysis concerns (semantic roles, 60/30/10
   distribution, contrast grading, usage-guide text, pairing suggestions,
   gradient pairs, chart color series) into 7 separate `src/lib/*.ts`
   modules rather than one large file, mirroring this codebase's existing
   one-concern-per-file convention (`contrast.ts`, `paletteExport.ts`,
   `paletteMarkdownExport.ts`, ...). All 6 downstream modules
   (`colorDistribution`, `contrastAccessibility`, `colorUsageGuide`,
   `colorPairing`, `colorGradients`) that need a role→color mapping call
   `getColorRoles` rather than re-deriving it, so the 10-role definition
   only lives in one place.
3. `contrastAccessibility.ts` reuses `contrastRatio` from the existing
   `src/lib/contrast.ts` (WCAG math already used for design-token audits)
   instead of re-implementing luminance/ratio math a second time. It adds
   only grading (`getContrastGrade`: AAA ≥7:1, AA ≥4.5:1, else Fail) and the
   3 fixed combinations the design spec's accessibility card names (white on
   Primary, dark on Primary, Accent on Background).
4. `chartColors.ts` reuses `averageHsl` from `src/lib/palette.ts` as its
   center hue and fans `count` series out at `360 / count` degree steps —
   guarantees hue-distinctness by construction (no two series ever land on
   the same hue) rather than post-hoc deduping.
5. Deferred 3 of the design spec's 10 analysis cards to later grains, per
   this grain's own scope line ("semantic role mapping, 60/30/10
   distribution data, WCAG contrast ratio+grade, usage-guide text, pairing
   suggestions, gradient pairs, chart color series" — 7 items, not 10):
   Website preview, Presentation preview, and Design token output are UI/
   formatting-heavy concerns better suited to a UI-facing grain, not this
   grain's "pure logic, src/lib only" boundary.

## Why

- A single `getColorRoles` as the shared foundation keeps the "10 roles"
  definition in exactly one place. Every fixed constant it introduces
  (branded-neutral lightness/saturation values, the 3 status hues) is
  genuinely unconfirmed design taste, so each is marked
  `(assumption — needs confirmation)` inline, the same convention
  `src/lib/palette.ts` already uses for its own mood/vibe/archetype
  thresholds — a future grain (or the human confirming the draft spec) can
  grep for that marker and revisit every one without re-deriving which
  values were guesses.
- Branded neutrals (background/surface/text/border tinted by the primary
  hue) over flat grayscale: the spec's own example output ("Primary Red",
  "Best for CTAs...") frames every role as part of one branded system, and
  a near-zero-saturation tint of the brand hue reads as coherent without
  fighting the "grayscale UI chrome" constraint this codebase already
  enforces elsewhere (`accentBoundary.test.ts`) — these are *data* colors
  returned by a pure function, not literals painted onto UI chrome CSS, so
  that guard does not apply here.
- Fixed (brand-independent) Success/Warning/Error over hue-shifted variants:
  status colors are conventionally kept recognizable across any brand color,
  and tying them to the primary hue would risk producing a "success" that
  isn't legibly green when the brand hue itself sits near red/amber.

## Rejected alternatives

- Slot-position-only role mapping (treat palette\[3\]/palette\[4\] as two more
  roles directly) — rejected because the palette's derived slots 3/4 vary in
  *meaning* by `GenerationMode` (e.g. `analogousAccent` vs a second
  `monochromatic` step), so borrowing them for fixed roles like Background/
  Border would make those roles' color character swing with the user's
  chosen generation mode instead of staying stable and neutral.
- One combined `colorAnalysis.ts` file for all 7 concerns — rejected in
  favor of 7 focused files; this codebase's existing `src/lib` convention is
  one narrow concern per file, and a single ~600-line file would bury the
  per-concern JSDoc "why" comments the rest of the codebase relies on.
- Re-deriving contrast math locally in `contrastAccessibility.ts` instead of
  importing `contrast.ts` — rejected as needless duplication of already-
  tested WCAG relative-luminance/ratio logic.
