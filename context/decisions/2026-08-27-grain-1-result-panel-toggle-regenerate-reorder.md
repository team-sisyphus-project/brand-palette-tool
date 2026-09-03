# grain-1 (2026-08-27): result panel reorder — toggle above chips, Regenerate below chips (M-11/M-12)

## Decision
Changed the `panel-preview--result` child order in `ColorGenerator.tsx` from `ThemeToggle row → Regenerate → Palette (color chips) → AestheticMatch`
to `ThemeToggle row → Palette (color chips) → Regenerate → AestheticMatch`. Only the JSX order changed; no new CSS rules were added —
the right alignment (`justify-content: flex-end`, `.color-generator__theme-toggle-row`) and horizontal centering
(`align-items: center` on `.color-generator__preview--result` + the inner `.color-generator__regenerate { align-self: center }`) already existed
and are reused as-is.

## Rationale
Spec A "result screen layout" delta (M-11/M-12): the theme toggle must sit directly above the color chips, right-aligned, and Regenerate must sit below the chips, horizontally centered.
The previous implementation had Regenerate wedged between the toggle and the chips, so the "directly above" (no other element in between) condition was not met.

## Affected pre-existing tests (modified)
- `ColorGenerator.test.tsx`'s "Regenerate renders inside the preview panel, immediately before the color chips" — it asserted an old order
  that can no longer be structurally true under the new placement (the very behavior the test verifies was intentionally changed by this spec delta),
  so we judged it to fall under the policy-defined "a pre-existing test verifies outdated behavior" exception, flipped the assertion direction
  ("immediately after"), and also corrected the describe block title's "Regenerate above chips". The intent of what the assertion
  verifies (the order relationship itself) was kept — only which order it is changed, to match the spec.
- The same file's "Regenerate still works after moving above the color chips" — name only corrected to "below" (the behavior itself is position-independent).

## Newly added tests
- `grain-1: result panel reorder - toggle above chips, Regenerate below chips (M-11/M-12)` describe block —
  nothing between the toggle row and the color chips (M-11), Regenerate comes immediately after the color chips (M-12), and the right/center alignment classes are checked.

## Rejected alternatives
- Moving Regenerate after AestheticMatch (to the very bottom of the panel): not adopted, interpreting the spec wording ("below the color chips") as "immediately below" —
  the relative position to AestheticMatch is not specified in this card/spec delta, so the most conservative choice was the position immediately after the chips.
