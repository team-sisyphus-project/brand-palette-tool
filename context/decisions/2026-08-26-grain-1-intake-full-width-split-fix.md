# grain-1: pre-generate intake — true full-width left/right split (supersedes prior "nesting is enough" call)

## Decision

1. Added two new pre-generate-only modifier classes, applied via
   `controlsClassName`/`previewClassName` in `ColorGenerator.tsx` (only when
   `!showResult`):
   - `.panel-generator.color-generator__controls--intake { flex: 1 1 auto; }`
     — overrides `panel-generator`'s `App.css` default (`flex: 4`) so it
     claims essentially the whole `app-shell` row instead of a fixed 40%
     share.
   - `.panel-preview.color-generator__preview--intake { flex: 0 0 auto;
     min-width: 0; width: auto; }` — overrides `panel-preview`'s `App.css`
     default (`flex: 6; min-width: 480px`) so the empty pre-generate preview
     panel (it only ever renders the top-right `ThemeToggle` before
     Generate) shrinks to content size instead of reserving ~60% of the row.
2. Both new rules live in `ColorGenerator.css` (doubled selector for
   specificity over the unconditional `App.css` base rules), not `App.css`
   itself — `App.css`/`app-shell` is out of this grain's boundary, and
   `panel-generator`/`panel-preview`'s classNames are set in
   `ColorGenerator.tsx`, so the override is scoped from there.
3. Also changed `.color-generator__intake`'s internal column split from an
   even `flex: 1 1 0` / `flex: 1 1 0` (title / form) to `flex: 1 1 auto`
   (title, grows to fill) / `flex: 0 1 420px` (form, fixed basis) — now that
   `panel-generator` spans the full shell width, an even 50/50 split would
   stretch the form's inputs to ~900px at the 1920px shell width cap, far
   past the attached mockup's fixed-feeling input width.

## Why

- User-reported bug (screenshot): at normal viewport widths the rendered
  page showed the title and the intake form "on the same side" instead of a
  true left/right split spanning the page. Root cause: the intake's internal
  row split (`.color-generator__intro` / `.color-generator__intake-form`,
  added by the prior `2026-08-26-grain-1-pregenerate-two-column-layout`
  decision) was correct on its own, but it was nested entirely inside
  `panel-generator`, which only ever claims `flex: 4` (~40%) of `app-shell`'s
  row — `panel-preview` (`flex: 6`, ~60%) sat empty beside it holding only
  the `ThemeToggle`. The whole title+form split rendered squeezed into the
  left ~40% of the page, which reads as "both columns on the same side" when
  compared against a mockup where the split spans the full page width.
- This **supersedes** that prior decision's explicitly rejected alternative
  ("Widening `panel-generator`'s flex-basis for the pre-generate state...
  rejected as unnecessary complexity") — that call was made without a
  rendered-viewport check against the actual mockup proportions; the
  complexity is in fact necessary to match the attached spec image. The
  nested-`<section>` structure and the 768px stacking breakpoint from that
  decision are unaffected and still correct — only the "no flex-basis
  override needed" part is reversed.

## Rejected alternatives

- Touching `App.css`'s `.panel-generator`/`.panel-preview` base rules
  directly (e.g. adding a `:has(.color-generator__controls--intake)`
  guard, or splitting them into pre/post-generate variants there): rejected
  — out of this grain's boundary (`ColorGenerator.tsx` intake markup /
  `ColorGenerator.css` intake rules only, reusing existing tokens); the
  override achieves the same visual result scoped entirely to
  `ColorGenerator.css`.
- Unmounting/hiding `panel-preview` entirely pre-generate (so
  `panel-generator` is the row's only flex item) instead of shrinking it to
  content size: rejected — `panel-preview` is where `ThemeToggle` renders
  unconditionally (`2026-08-26-grain-1-theme-toggle-placement...` decision,
  out of this grain's scope); removing that container would also remove the
  toggle's mount point pre-generate.
- Keeping the intro/form split at an even `flex: 1 1 0` and instead capping
  `panel-generator`'s own max-width: rejected — a fixed basis on the form
  column alone is simpler and keeps the title column's width responsive to
  whatever room remains, matching the mockup's title-dominant proportions
  more directly than an outer max-width would.
