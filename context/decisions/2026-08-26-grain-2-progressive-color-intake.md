# grain-2: progressive intake form (primary color + keyword first, "+" reveals extra colors)

## Decision

1. Added `revealedExtraColorCount` state to `ColorGenerator` (0..4, starts at
   0). The 4 additional-color `ColorInput` fields (`extraColors`, unchanged
   4-slot array/validation from grain-1) are now sliced to
   `extraColors.slice(0, revealedExtraColorCount)` before rendering, instead
   of always rendering all 4.
2. Added a "+" icon-only button (`color-generator__add-color`, accessible
   name "Add another color") directly after the brand `ColorInput` and
   before the (conditionally rendered) additional-color fields block. Each
   click calls `handleAddExtraColor`, which increments
   `revealedExtraColorCount` by 1, capped at `ADDITIONAL_COLOR_COUNT` (4).
   The button itself is not rendered at all once the count reaches 4
   (`revealedExtraColorCount < ADDITIONAL_COLOR_COUNT`), rather than
   rendering disabled - simpler markup, and "disappears" is explicitly
   listed as an acceptable outcome in the grain's Done criteria.
3. Layout order is: brand field -> (revealed extra-color fields, if any) ->
   add-color button (while count < 4) -> mood-keyword field -> Generate.
   This keeps the button "directly beneath the brand field" exactly as
   asked at first render (no fields yet, so the button is the very next
   sibling), and lets each reveal simply grow the list between the brand
   field and the button, pushing the button down one slot at a time - the
   same shape as a standard "add item to a list" affordance (the trigger
   trails the list it grows).
4. Existing `extraColorErrors` (built from `parseColorInput`, `src/lib/palette.ts`)
   is untouched - it still validates all 4 `extraColors` slots regardless of
   how many are currently rendered; only the rendering is sliced. A
   not-yet-revealed slot can't produce a validation error since its value
   can only change through the (also not-yet-mounted) `ColorInput`.
5. Checked `design-spec/components/` for a reusable icon-only button pattern
   before styling: `palette`'s lock-toggle icon button
   (`radius-control`/`touch-target-min`/`color-border-default`) was the
   closer fit vs. the pill-shaped, text-labeled Generate/Regenerate
   "action-button" pattern - reused the former's token set, no new token
   values. Registered the new pattern as
   `design-spec/components/add-color-button/base.md` (see
   `design-spec/audit/2026-08-26.md`'s grain-2 entry) since it's a
   genuinely new icon-button concept (progressive disclosure trigger), not
   a Variant/Extension of an existing registered Component.

## Why

- The assignment explicitly asks the first page to start with "JUST the
  primary color and keyword" plus a "+" button beneath the primary color -
  this directly supersedes grain-1's "all 4 additional fields visible from
  the start" intake-form shape.
- Keeping `extraColors`/`extraColorErrors` state shape unchanged (still a
  fixed 4-slot array) means `generatePalette`/`parseColorInput` and the
  Generate-gate logic need zero changes - only what's *rendered* changes,
  which matches the grain's boundary (state/layout + CSS only).

## Test changes (pre-existing tests superseded)

`ColorGenerator.test.tsx` had several grain-1 tests asserting all 4
additional-color fields are visible immediately on mount (e.g. "renders the
brand field, 4 optional additional Hex fields..."). These directly
contradict the new, explicitly requested behavior, so per the "pre-existing
test is genuinely wrong (testing outdated behavior)" exception they were
updated rather than left red:

- Replaced the "all 4 fields visible on mount" assertion with "only brand +
  keyword + add-color button visible, no additional fields" and added a new
  test proving each button click reveals exactly one more field in order.
- Added a `revealExtraColors(n)` test helper (clicks the add-color button n
  times) and inserted it before existing per-field interaction tests
  (validation, clearing, generated-result-view unmount checks) that need N
  fields already revealed to interact with them - the interaction/validation
  assertions themselves are unchanged.
- Added a new describe block asserting DOM order (add-color button
  immediately after the brand field, before the mood-keyword field) since
  that placement is an explicit Done-criterion ("directly beneath the brand
  color field").

## Rejected alternatives

- Rendering the button as always-present but `disabled` once all 4 fields
  are revealed, instead of unmounting it - rejected: the grain's Done
  criteria explicitly accepts either "disappears/disables", and not
  rendering it keeps `getByRole('button', { name: 'Add another color' })`
  queries simple (no need to also assert `aria-disabled`) with no loss of
  functionality.
- Placing the button after all currently-revealed fields but *before*
  further reveals stack above the brand field (i.e., newest field appears
  above older ones) - rejected: it would make the button jump position
  relative to the brand field on every click in a way that reads as
  unstable, whereas "button trails a growing list" is the conventional,
  predictable shape.
- Recording the new button purely as a `context/decisions/` engineering
  note instead of a registered Design Spec Component - rejected: unlike
  `getVibeKeywords`'s word-bank (a content/copy decision explicitly outside
  the Token Group schema), this is a visual UI pattern (an icon button with
  its own token combination) intended to be reusable, which is exactly what
  `components/` registration is for.
