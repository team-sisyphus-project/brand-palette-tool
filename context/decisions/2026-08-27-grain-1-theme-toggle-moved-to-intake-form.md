# grain-1: ThemeToggle relocated from preview panel to the intake form

## Decision

Moved the `ThemeToggle` render site (and its `.color-generator__theme-toggle-row`
wrapper) out of `ColorGenerator`'s preview/color panel
(`panel-preview` / `.color-generator__preview`) and into the pre-generate
intake form section (`.color-generator__intake-form`), as its first child -
directly above the brand `ColorInput` (`brand-color-input`). No changes to
`ThemeToggle.tsx`/`.css` themselves, or to `.color-generator__theme-toggle-row`'s
own rule (still `display: flex; justify-content: flex-end; width: 100%`) - only
where it is mounted changed, plus the rule's doc comment.

A consequence: `.color-generator__intake-form` only mounts pre-generate
(`!showResult`), so the toggle - like the rest of the intake form - is no
longer rendered at all once a palette exists (`ColorGenerator.test.tsx`'s
`grain-1: theme toggle placement` describe block, previously asserting the
toggle stayed mounted post-generate, was updated to assert the new
pre-generate-only placement and the post-generate unmount instead).

## Why

- The assignment's Do is explicit and unconditional: remove the toggle from
  the preview section entirely and place it inside the intake form, above the
  brand field - not "also render it somewhere post-generate." The task's
  Out-of-scope list explicitly excludes "post-generate (showResult true)
  layout changes," i.e. don't touch the result view's layout to compensate -
  so no new post-generate toggle placement was added.
- Reusing the same `.color-generator__theme-toggle-row` class (right-aligned,
  full-width) rather than inventing a new one keeps the visual anchor
  consistent (top-right of whichever column it's in) with a one-line doc
  comment update instead of a new selector.

## Pre-existing test update

`ColorGenerator.test.tsx`'s `grain-1: theme toggle placement (color panel
top-right)` describe block asserted the toggle rendered inside
`panel-preview` in both pre- and post-generate states - behavior this grain
supersedes per the card's explicit instruction. Per `skills/implement/SKILL.md`
("if a pre-existing test is genuinely wrong - testing outdated behavior - fix
the test and record the decision"), the block was rewritten
(`grain-1: theme toggle placement (intake form, above brand field)`) to
assert: toggle inside the intake form section, ahead of the brand field, not
inside the preview panel; and that it unmounts along with the rest of the
intake form once Generate reveals a palette. No assertion about
`theme`/`onToggleTheme` wiring itself changed.

## Design Spec

`ThemeToggle` had no `design-spec/components/theme-toggle/` entry in this
project's own Spec lineage yet (implemented in code, but never registered as
a Component here - confirmed by checking `index.md`'s Components table across
this project's job history). Registered it now
(`design-spec/components/theme-toggle/base.md`, plus the `border` Token Group
it declares - `design-spec/token-groups/border/base.md`, both matching the
existing code/token values, no code changes from this) with its "usage"
section already describing the new placement, so there is one authoritative
description rather than a registration followed immediately by an update. See
`design-spec/audit/2026-08-27.md`'s grain-1 addendum for the Orphan
classification/resolution and `design-spec/index.md`'s matching history note.

## Rejected alternatives

- Keeping the toggle in `panel-preview` and also duplicating it into the
  intake form: rejected - the card asks to move it, not duplicate it, and a
  second toggle instance would be a11y/UX noise (two switches controlling the
  same state).
- Rendering the toggle unconditionally outside both `panel-generator`/
  `panel-preview` (e.g. hoisted to a shared wrapper) so it survives
  Generate: rejected as exceeding this grain's boundary
  (`src/components/ColorGenerator.tsx`/`.css` only, no `App.tsx` changes) and
  its explicit "post-generate layout changes" out-of-scope note.
