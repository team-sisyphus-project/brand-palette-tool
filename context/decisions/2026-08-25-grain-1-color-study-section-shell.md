# Decision: Color Study section stays nested inside the preview panel, as its own `<section>`

**Date:** 2026-08-25
**Grain:** grain-1 — Color Study section shell

## What was decided

1. Extracted the bare `<ColorWheel colors={palette} />` that used to render
   directly after `AestheticMatch` inside `ColorGenerator`'s
   `panel-preview` section into a new component, `ColorStudy`
   (`src/components/ColorStudy.tsx`), which wraps it in its own
   `<section aria-labelledby="color-study-heading">` with an `<h2>` "Color
   Study" heading.
2. `ColorStudy` renders as a nested `<section>` still inside the same
   `panel-preview`/`color-generator__preview` flex column - it is not
   hoisted out of `app-shell`'s two-panel row layout. Visual separation from
   Palette/MoodTag/AestheticMatch comes from `ColorStudy.css`: a
   `border-top` + `margin-top`/`padding-top` divider (reusing
   `--color-border-default`, `--border-width-default`, `--space-5` - no new
   token values).
3. `ColorWheel` itself and `src/lib/palette.ts` are untouched - `ColorStudy`
   only composes the existing `ColorWheel` behind a heading.

## Why

- `ColorGenerator.test.tsx`'s grain-2 describe block asserts `Regenerate`
  and the `Palette` list (`role="list"`) are *direct children* of the
  preview `<section>` (`Array.from(preview.children)`, see "Regenerate
  renders inside the preview panel, immediately before the color chips").
  Wrapping Palette/MoodTag/AestheticMatch in any new container would have
  broken that pre-existing test. Nesting only the new `ColorStudy` section
  (which nothing pre-existing asserts a DOM position for) avoids touching
  that structure at all.
- The grain's own Boundary is explicit: "layout/composition only;
  `ColorWheel` internals and palette.ts untouched" and Out of scope
  excludes harmony buttons/custom base selection/shades UI. Moving the
  section fully outside `app-shell`'s row layout (which the broader card's
  "standalone layout composition" wording could be read as inviting) would require
  additional `app-shell`/`App.tsx` layout changes (e.g. `flex-wrap`) beyond
  what this narrower grain's Do/Done fields ask for; deferred to whichever
  later grain actually needs the harmony buttons/custom base
  selection/shades UI to have full-width room.
- Chose `<h2>` (not `<h1>`/`<h3>`) since `App.tsx`'s only other heading is
  the page-level `<h1>Color Palette Generator</h1>` - Color Study is a
  sub-section of the page, one level down.
- Chose `--text-display-xs` (20px, the smallest Display-scale size already
  in `src/index.css`) for the heading rather than a Text-scale size, since
  it's a section heading (Display token group's stated audience is
  ">= 20px" per the existing code comment), sized deliberately smaller than
  the page's `--text-display-lg` `<h1>`.

## What was rejected

- Hoisting `ColorStudy` out of `panel-preview`/`app-shell`'s row layout to
  span full width below both panels: would better match the overall card's
  "independent layout" framing, but requires touching `App.css`'s
  `app-shell` (e.g. adding `flex-wrap: wrap` + a full-width flex-basis for
  the new section) - a bigger layout change than this grain's explicit
  Boundary asks for. Revisit if/when the harmony-buttons/shades grains need
  more horizontal room than the current preview column offers.
- Wrapping `Palette`/`MoodTag`/`AestheticMatch` in a shared group `<div>` to
  make the "separated from" relationship more explicit in the DOM: rejected
  because it would break the pre-existing direct-children assertion in
  `ColorGenerator.test.tsx` (see Why above) for no requirement in this
  grain's Done criteria, which only asks that Color Study itself be
  independent/separated - not that the other three be regrouped.

## Design Spec

Bootstrapped `design-spec/index.md` (was empty - new project, no prior
Design Spec) plus a `color-study` Component record
(`design-spec/components/color-study/base.md`) and 4 minimal Token Groups
(`typography`, `spacing`, `border`, `color`) scoped to only the tokens this
grain's CSS actually uses. The rest of the codebase's existing tokens/
components are logged as `open` Orphans in `index.md` rather than backfilled
- out of scope for this grain (see `design-spec/audit/2026-08-25.md`).
