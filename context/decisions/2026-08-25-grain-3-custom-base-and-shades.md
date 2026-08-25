# Decision: whole-chip click sets Color Study's base color; Shades ramp uses fixed absolute lightness levels, no border-radius

**Date:** 2026-08-25
**Grain:** grain-3 — Custom base color + Shades visualization

## What was decided

1. `PaletteSwatch`'s entire chip (`.palette-swatch`, a `<div role="button"
   tabIndex={0}>`) is now a click/keyboard (`Enter`/`Space`) target for a new
   `onSelectBase` callback, wired `Palette` → `ColorGenerator` (new
   `baseColorIndex` state, default `BRAND_SLOT_INDEX`) → `ColorStudy` (new
   optional `baseColorIndex` prop, falls back to the brand slot when omitted
   or out of range). Two pre-existing, more specific interactions inside the
   same chip - the invisible native color-picker overlay
   (`.palette-swatch__preview`) and the lock toggle button
   (`.palette-swatch__lock`) - both call `event.stopPropagation()` in their
   own click handlers so they keep their single existing meaning (open the
   picker / toggle the lock) instead of also silently reassigning the Color
   Study base color. This directly implements the grain's "avoiding its
   existing color-picker overlay" instruction, extended by symmetry to the
   lock toggle for the same reason (an existing, self-contained, distinct
   interaction should not gain an unrequested side effect).
2. New pure `generateShades(base: HSL): PaletteColor[]` in `src/lib/palette.ts`:
   holds hue/saturation fixed at the input's own values, samples 5 fixed,
   *absolute* lightness levels (`90/70/50/30/10`), not levels relative to the
   input's own lightness. `SHADE_STEPS` (`= 5`) is exported alongside it.
3. New `Shades`/`Shades.css` presentational component
   (`src/components/Shades.tsx`), rendered by `ColorStudy` directly below
   `HarmonyExplorer`. `ColorStudy` derives its `groups` prop every render (no
   own state): one group for the resolved base color, plus one group per
   accent color of the currently selected harmony (`getHarmonyColors`) - so
   Complementary shows 2 ramps (Base + Accent 1), Analogous/Triadic show 3
   (Base + Accent 1 + Accent 2).
4. Each Shades step's rendered text is `"{lightness}% {HEX}"` (e.g.
   `"50% #40bfbf"`), not the bare HEX. `.shades__swatch` deliberately has no
   `border-radius` - this grain's Boundary explicitly excludes
   "border-radius changes", and the only established swatch-corner token
   (`--radius-card`, used by `PaletteSwatch`/`HarmonyExplorer`) isn't
   registered in any Design Spec Token Group yet (a pre-existing `radius`
   Token Group gap - see `design-spec/audit/2026-08-25.md`'s "grain-3 추가
   점검"), so introducing it here would have meant creating that Token Group
   as a side effect of a change the Boundary says is out of scope.

## Why

- **Whole-chip click, not a sub-element:** the assignment's own wording
  ("상단 팔레트 칩을 클릭해") and this grain's Boundary phrase ("avoiding its
  existing color-picker overlay") both read as "the chip is the click
  target; the picker overlay is the one carved-out exception" - not "a new,
  separate button somewhere on the chip." A `<div role="button" tabIndex>`
  containing the pre-existing native `<input type=color>` and `<button>`
  (lock toggle) is not a pristine accessibility pattern (nested interactive
  descendants), but it is the minimal change that satisfies the literal
  requirement without altering either pre-existing control's own behavior,
  and `stopPropagation` on both keeps every click's outcome single-purpose
  and predictable.
- **Percentage-prefixed step text, not bare HEX:** `generateShades`
  intentionally holds hue/saturation fixed and only steps lightness across a
  *fixed* set of levels - so whenever an input color's own lightness happens
  to already sit on one of those 5 levels (common with round test/demo
  values), the ramp legitimately reproduces the exact same HEX already shown
  by `HarmonyExplorer`'s accent swatch. A bare-HEX label would then make two
  different elements share identical rendered text, which broke
  `ColorStudy.test.tsx`'s pre-existing `getByText(color.hex)` assertions
  (ambiguous match) the first time this was tried. Prefixing the lightness
  percentage keeps every step's text unique while adding information this
  panel is explicitly meant to convey ("명도 단계별" - which step a user is
  looking at), so the fix also improves the feature rather than working
  around the collision by suppressing it. This mirrors grain-2's own
  precedent for the same class of problem (its `aria-label`
  disambiguation between `HarmonyExplorer`'s and `ModeSelector`'s
  same-worded buttons) - resolve same-text collisions by making the
  colliding elements' own identity more specific, not by hiding data.
- **Fixed *absolute* lightness levels, not relative to the input's own
  lightness:** every ramp - for the base color or any accent - spans the
  same visible range and reads as one consistent ladder, closer to a
  conventional design-token shade scale (e.g. 50/100/.../900) than a
  ramp whose spread depends on where the input color already sits.
- **No `border-radius` on `.shades__swatch`:** the grain's own Boundary text
  explicitly lists "border-radius changes" as out of scope. Reaching for the
  existing (but Design-Spec-unregistered) `--radius-card` value would have
  forced creating a brand-new `radius` Token Group as a side effect of an
  explicitly out-of-scope concern - safer to leave the swatches square and
  leave that Orphan exactly as open as it already was.

## What was rejected

- A dedicated new "select base" button/label instead of making the whole
  chip clickable: rejected as a narrower reading of "clicking a top palette
  chip" than the assignment's wording supports, and it would leave the lock
  button's `stopPropagation` unnecessary/asymmetric for no benefit.
- Making shade-ramp lightness levels relative to each input color's own
  lightness (e.g. `base.l +/- {40, 20, 0, -20, -40}` clamped): rejected -
  would make different colors' ramps span different visible ranges,
  weakening the "consistent ladder" read: this Boundary's own wording calls
  out "명도 단계별" (lightness-*step*), which fixed absolute levels represent
  more literally than an input-relative spread.
- Suppressing the HEX-collision by having `generateShades` skip a level
  equal to the input's own rounded lightness: rejected - would make the
  ramp's shape depend on the specific input (no longer a fixed 5-level
  sample), and reproducing the exact same color as an existing swatch is
  legitimate, expected behavior for a shade ramp, not a bug to hide.
- Introducing `--radius-card` via a brand-new `radius` Token Group so
  `.shades__swatch` could match `PaletteSwatch`/`HarmonyExplorer`'s rounded
  corners: rejected per this grain's explicit Boundary exclusion of
  border-radius changes (see above).

## Design Spec

Recorded as two Extensions of the existing `color-study` Component:
`design-spec/components/color-study/base-color-selection.md` (the chip-click
interaction contract; introduces no new token values) and
`design-spec/components/color-study/shades.md` (the new Shades panel and its
token reuse from `PaletteSwatch.css`). Newly-consumed-but-previously-
unregistered token entries (already-confirmed values, per
`policy/coding.md`'s "실제 렌더링되는 페이지에서 사용되고 있는 값은 확정된
디자인 결정이다") were added to `typography/base.md`, `spacing/base.md`, and
`color/base.md`. Audit check recorded in `design-spec/audit/2026-08-25.md`
under "grain-3 추가 점검", including the `--radius-card` Orphan finding
(left open, out of scope per Boundary) now cross-referenced from
`index.md`'s Orphans table.
