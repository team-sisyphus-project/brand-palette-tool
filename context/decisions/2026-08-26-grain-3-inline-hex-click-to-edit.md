# grain-3: inline hex code click-to-edit

## Decision

1. `PaletteSwatch`'s HEX label is now a `<button>` (was a `<span>`). Clicking
   it swaps it for a text input pre-filled with the current hex; Enter or
   blur commits, Escape cancels.
2. Commit validation reuses `hexToRgb` from `src/lib/palette.ts` directly
   inside `PaletteSwatch` (not just downstream in `updateSlotColor`), so an
   invalid hex never calls `onColorChange` at all - it reverts the draft to
   `color.hex`, shows an inline error (`.palette-swatch__hex-error`), and
   closes the input. A valid hex calls the existing `onColorChange` prop -
   the same path the color-picker already uses - so `ColorGenerator`'s
   `handleSlotColorChange`/auto-lock-on-edit behavior applies unchanged.
3. Both the trigger button and the input `stopPropagation` on click *and*
   keydown, not just click. `PaletteSwatch`'s outer card is itself a
   `role="button"` that fires `onSelectBase` on Enter/Space (grain-3's base
   color selection) - a native `<button>`'s Enter/Space keypress bubbles as
   a keydown independently of the click it synthesizes, so click-only
   `stopPropagation` (the pattern the pre-existing lock button uses) would
   have let `onSelectBase` also fire when using the keyboard to open or
   commit the hex edit. Stopping propagation on keydown as well closes that
   gap for the new hex controls.
4. Added `skipNextBlurRef`: committing/cancelling via keyboard swaps the
   input back out for the button in the same tick. If the input was
   focused, removing it from the DOM fires a native blur event, which would
   otherwise call `commitHexEdit` a second time with a stale draft. The ref
   is set right before the keyboard-driven state change and consumed (reset)
   by the next blur handler call, so only that one blur is skipped.
5. Registered `color-state-error` as a new Token in
   `design-spec/token-groups/color/base.md` - it already existed in
   `src/index.css` and in `ColorInput.css`'s usage, but no grain had audited
   it as its own subject before. This grain's error text is the first thing
   to bring it into an actively-audited component, so per `policy/audit.md`
   it now enters scope for registration (same trigger as `color-bg-page` in
   grain-1 and `radius-container` in grain-2).

## Why

- Reusing `hexToRgb` (rather than inventing a second hex-validity check) is
  what the grain's Boundary/Done criteria call for, and keeps "is this a
  valid hex" defined in exactly one place (`src/lib/palette.ts`), matching
  `ColorInput`'s existing reliance on the same module's `parseColorInput`.
- Validating inside `PaletteSwatch` before calling `onColorChange` (rather
  than relying solely on `updateSlotColor`'s existing "same reference back
  means invalid, no-op" contract) is what makes "reverts/shows error"
  possible at all - `handleSlotColorChange` silently no-ops on an invalid
  hex with no error surface, which was fine for the color-picker (browser
  never sends an invalid value) but not enough for free-text input.
- `border-width-focus`/`color-border-focus`/hover color tokens were left
  unregistered, mirroring grain-2's judgment call for the same file's lock
  button: they're pre-existing, already multiply-used values, and one more
  consumer in the same component doesn't newly bring the *token* under
  audit the way directly changing/first-using one does.

## Rejected alternatives

- Keeping validation only in `updateSlotColor`/`handleSlotColorChange` and
  having `PaletteSwatch` just always call `onColorChange` on commit -
  rejected because the Done criteria require an inline error and a revert,
  which the silent no-op contract can't produce.
- A single `stopPropagation()` in each control's `onClick` only (matching
  the pre-existing lock button exactly) - rejected after tracing that a
  native button's Enter/Space keydown bubbles as its own event before the
  synthesized click fires, which would have let keyboard-driven edits also
  reassign the Color Study base color.
- Registering `PaletteSwatch` (or `ColorInput`) as a formal Design Spec
  Component in this grain - rejected: the Boundary is the text/input toggle
  only, both contracts (`onToggleLock`/`onSelectBase`) are unchanged, and
  grain-2 already established the precedent of leaving `PaletteSwatch` open
  for a presentation-only change.
