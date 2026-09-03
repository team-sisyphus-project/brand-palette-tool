# Decision: intake form generate-gate supersedes auto-render, ColorInput generalized for reuse

**Date:** 2026-08-25
**Grain:** grain-1 — Intake form + generate gate

## What was decided

1. `ColorGenerator` no longer renders the palette/result section on mount or
   on every brand-color keystroke. A new `hasGenerated` state flag, set only
   by clicking the new "Generate" button while the brand color is valid,
   gates the whole result section (`Palette`, `MoodTag`, `AestheticMatch`,
   `ColorWheel`, `ModeSelector`, `Regenerate`). This intentionally supersedes
   the previous "auto-render on mount" behavior described in the file's own
   doc comment and covered by several pre-existing tests.
2. `ColorInput` was generalized to accept `id`/`label`/`placeholder` as props
   (previously hardcoded to the brand field). It is now reused, unchanged in
   structure, for the brand field, the 4 optional additional Hex fields, and
   the mood-keyword field.

## Why

- The card explicitly asks for a Generate action so results only appear
  after an explicit click (a "Generate" gate), which cannot coexist with the old
  "renders immediately on every keystroke" contract - one card supersedes
  the other by requirement, not by mistake.
- Reusing `ColorInput` (Design Spec `components/text-input`) for the 4 extra
  fields and the keyword field avoids duplicating the same label+input+error
  markup/CSS 3 more times; the only per-field difference (Hex validation vs.
  no validation) already lived in the caller (`ColorGenerator`), not in
  `ColorInput` itself, so generalizing the id/label/placeholder was enough -
  no new component was needed.

## What was rejected

- Keeping `ColorInput` brand-only and writing a separate, near-identical
  component for the additional Hex fields / keyword field: rejected as
  duplication with zero structural difference from the existing component.
- Modifying the pre-existing `ColorGenerator.test.tsx` assertions' *intent*
  (e.g. relaxing "no palette without interaction" to "no palette without
  Generate *or* interaction"): the tests were rewritten to require an
  explicit `Generate` click wherever they previously relied on
  auto-render, preserving what each test actually verifies (palette
  correctness, determinism, lock/regenerate semantics, mode switching, mood
  tags, aesthetic match) - only the trigger step changed, and it changed for
  every existing test project-wide, following directly from the "Generate
  action" requirement in the card. All other pre-existing tests (palette.ts,
  ColorWheel, ThemeToggle, contrast, theme, accentBoundary) were left
  untouched.

## Deferred (other grains/cards, per this grain's Out of scope)

- Wiring the 4 extra colors / keyword into `generatePalette`.
- Hiding the brand color form / re-editing after generation, center-aligning
  the right panel, repositioning the Regenerate button above the color
  chips, Color Study section, chip hover-lock/inline-hex edit, light/dark
  toggle reposition.
