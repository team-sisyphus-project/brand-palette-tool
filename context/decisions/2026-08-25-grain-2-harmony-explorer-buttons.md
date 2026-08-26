# Decision: Harmony explorer is its own `getHarmonyColors` function + `HarmonyExplorer` component, not a reuse of `GenerationMode`/`ModeSelector`

**Date:** 2026-08-25
**Grain:** grain-2 — Harmony explorer buttons

## What was decided

1. Added a new, deliberately narrow pure function in `src/lib/palette.ts`:
   `getHarmonyColors(base: HSL, harmony: HarmonyType)`, where `HarmonyType`
   is `'complementary' | 'analogous' | 'triadic'` only. It returns the raw
   accent hue(s) at the base's own saturation/lightness (1 accent for
   complementary, 2 for analogous, 2 for triadic) - no tint/shade pairing.
   This is separate from the existing `GenerationMode`/`deriveHslByMode`
   (5 modes, tint+shade pairs, drives the 5-color palette generator).
2. Added `HarmonyExplorer.tsx`/`.css`: a presentational button group
   (Complementary/Analogous/Triadic) styled like `ModeSelector`, followed by
   a row of read-only accent swatches for the currently selected harmony.
   `ColorStudy` owns the `harmony` state (`useState`, default
   `'complementary'`) and passes `colors[BRAND_SLOT_INDEX].hsl` as `base` -
   the brand main color, per this grain's default-base requirement (custom
   base selection is a later grain).
3. Each harmony button gets an `aria-label` ("Complementary harmony", etc.)
   distinct from `ModeSelector`'s same-worded buttons, since both groups
   render together inside `ColorGenerator`'s result view and an unqualified
   accessible name of "Triadic" would be ambiguous.
4. The button group's pressed/selected state uses `--color-action-bg` (the
   neutral gray token), not `--color-action-bg-strong` (the system accent
   token `ModeSelector` uses for its selected chip).

## Why

- Boundary explicitly scopes new lib work to "3 harmony types" - reusing
  `GenerationMode`'s tint/shade-pair shape would have pulled in
  `splitComplementary`/`monochromatic` semantics and the palette-generation
  tint/shade concept, which belongs to a different feature (5-color
  palette, not this section's accent-hue explorer) and would blur the
  "Shades visualization" that a later grain owns.
- `src/lib/accentBoundary.test.ts` is a pre-existing regression guard
  enforcing that `--color-action-bg-strong` (and `--color-accent` beneath
  it) is consumed by exactly one chrome rule: `ModeSelector`'s selected
  chip. Using it for `HarmonyExplorer`'s pressed state would have broken
  that guard (and, per policy, a pre-existing test failing means the new
  code is wrong, not the test). `--color-action-bg` is the grayscale token
  already used for this exact "pressed/selected chip" role elsewhere
  (`PaletteSwatch`'s lock toggle), so it was the natural in-token-group
  substitute - no new Token was introduced.
- The `aria-label` disambiguation was required because
  `ColorGenerator.test.tsx`'s pre-existing test
  `fireEvent.click(screen.getByRole('button', { name: 'Triadic' }))`
  (asserting `ModeSelector`'s own Triadic behavior) started failing once
  `HarmonyExplorer` also rendered a same-named "Triadic" button in the same
  tree - `getByRole` throws on multiple matches. Renaming `ModeSelector`'s
  labels was out of scope (Out of scope explicitly excludes "mutating
  ModeSelector"), so the new component's buttons were given the
  distinguishing accessible name instead, while keeping the same visible
  text per the assignment's Complementary/Analogous/Triadic wording.

## What was rejected

- Reusing `deriveHslByMode`/`GenerationMode` directly for the harmony
  explorer: rejected because its tint/shade-pair output (4 colors per mode)
  doesn't match "recomputes and displays that harmony's accent colors" as
  cleanly as a dedicated function, and would couple this grain's 3-type
  scope to a 5-type enum not fully relevant here.
- Visually changing `ModeSelector`'s button labels to disambiguate instead
  of adding `aria-label` to the new component: rejected as an unrequested
  change to an out-of-scope component (Boundary: "mutating ...
  ModeSelector" is out of scope).

## Design Spec

Recorded as an Extension of the existing `color-study` Component -
`design-spec/components/color-study/harmony-explorer.md` - documenting the
new Harmony button group + accent swatch elements and the chip-button token
reuse from `ModeSelector` (same Token Group values, `--color-action-bg`
substituted for `--color-action-bg-strong` on the pressed state for the
reason above). `design-spec/index.md`'s Components table now lists
`harmony-explorer` under color-study's Extensions. Audit check recorded in
`design-spec/audit/2026-08-25.md` under "grain-2 추가 점검".
