# Decision: post-generate view hides the intake form, centers the preview panel, moves Regenerate above the chips

**Date:** 2026-08-25
**Grain:** grain-2 — Generated result view (center + hide form + Regenerate above chips)

## What was decided

1. `ColorGenerator`'s `panel-generator` section now renders the intake form
   (brand field, 4 additional Hex fields, mood-keyword field, Generate
   button) only while `!showResult`; once `showResult` is true it renders
   only `ModeSelector` (unchanged placement, out of scope for this grain).
   The Generate button is unmounted along with the fields it submits - it
   has no field left to act on once the brand input is gone, and leaving a
   dead button next to ModeSelector would be a worse UX than hiding it, even
   though the card text only named the 3 field groups explicitly.
2. `Regenerate` moved from `panel-generator` into `panel-preview`, rendered
   first among that section's children (directly above `Palette`, i.e.
   "above the color chips").
3. `panel-preview` gets a new modifier class,
   `color-generator__preview--result` (added only while `showResult`), which
   sets `align-items: center; text-align: center;` - reusing the existing
   flex-column layout already in place, no new spacing/color/typography
   token needed. `token-groups/spacing/base.md` and the other existing Token
   Groups were checked first; alignment/positioning properties
   (`align-items`, `text-align`, `justify-content`) are not in
   `policy/coding.md`'s design-token scan list (color, typography, spacing,
   radius, shadow, border, opacity) - they are layout arrangement, not a
   reusable value on a token scale, so no Design Spec Token Group entry was
   added for this change.
4. `.color-generator__generate`/`.color-generator__regenerate`'s shared
   `align-self: flex-start` (design-spec `components/action-button`) is
   overridden back to `center` specifically for
   `.color-generator__preview--result .color-generator__regenerate`, since
   Regenerate's new home is a centered panel while Generate (still
   left-aligned in the stacked pre-generate form) keeps the original rule.

## Why

- The assignment/grain explicitly supersedes grain-1's "brand field stays
  visible and editable, palette keeps live-updating from it" behavior for
  the post-generate state - the two cannot coexist once the field is gone.
- Reusing the flex-column layout's `align-items`/`text-align` avoids adding
  a parallel set of "centered" spacing tokens; the existing gap/padding
  tokens (`element-gap-md`, etc.) are untouched and still apply.

## What was rejected

- Keeping the Generate button visible post-generate (literal reading of the
  card, which only named the 3 field groups): rejected as a worse UX (a
  button with no fields to submit) with no upside; nothing in Out of scope
  protects it, and DoneWhen's "intake form is not rendered" reads naturally
  as including its own submit action.
- Adding a new `layout`/`alignment` Token Group for `align-items`/
  `text-align: center`: rejected per `policy/coding.md`'s explicit
  classification - these are not in the design-token scan list (they don't
  change a value the user perceives on a shared scale, they change
  arrangement), so recording them as Design Spec Tokens would misclassify
  an implementation-config-level concern as a design token.
- Modifying pre-existing `ColorGenerator.test.tsx` tests' *assertion intent*
  where avoidable: only the 5 tests whose *mechanism* (re-editing the brand
  field, or clicking it, after Generate) became physically impossible once
  the field unmounts were touched:
  - "clears the palette and error once the field is emptied again" and
    "after Generate, the palette keeps updating live as the brand input
    changes to a new valid color" — removed; their scenario is no longer
    reachable through the UI, and each one's still-valid half of intent is
    already covered by "renders no palette and no error once the input is
    cleared (M-1 baseline)" (pre-generate) and the new grain-2 describe
    block (hidden-form assertions) respectively.
  - "re-entering the exact same brand input (after typing something else)
    renders the identical 5-color palette" — removed; the same determinism
    guarantee (M-1) already has a fresh-mount version right below it.
  - "re-entering the same brand input shows the same mood tags
    (determinism)" — rewritten to the same fresh-mount pattern. Left as-is,
    it would have silently become a test that can't fail: firing a change
    event on a detached DOM node is a no-op, so the "same input -> same
    tags" assertion would trivially pass even if determinism broke.
  - "recomputes the match every time the palette is recalculated by
    switching generation modes" — rewritten to actually click mode buttons.
    Its title always claimed mode-switching but its body drove the change
    by re-editing the brand field (a pre-existing title/body mismatch); this
    grain's field-unmount forced a fix, so the body was aligned with what
    the title always said, using `#26d9ac`/`triadic` values pre-verified via
    `src/lib/palette.ts`'s own `averageHsl`/`matchAesthetic` (node scratch
    script) to land the match outside every archetype's threshold.
  All other pre-existing tests (palette lock/regenerate/mode-switch via
  buttons, color-picker edits, ThemeToggle, palette.ts, ColorWheel, contrast,
  theme, accentBoundary) were left untouched - they never depended on
  post-generate brand-field access.

## Deferred (other grains/cards, per this grain's Out of scope)

- ModeSelector placement/reposition, swatch hover-lock/inline-hex editing,
  light/dark toggle reposition, white background, border-radius changes on
  other cards, Color Study section.
