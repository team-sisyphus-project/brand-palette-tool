# grain-1: pre-generate two-column layout (title+description | intake form)

## Decision

1. Moved the page title/description out of `App.tsx`'s standalone
   `.app__intro` block into `ColorGenerator`'s pre-generate branch, as a new
   `.color-generator__intake` row nested inside `panel-generator`: left
   column `.color-generator__intro` (title + description, unchanged copy),
   right column a **nested `<section className="color-generator__intake-form">`**
   wrapping the pre-existing intake fields (brand color, progressive
   additional-color fields, mood keyword, Generate button) verbatim.
2. The intake-form wrapper is a `<section>`, not a `<div>`, specifically so
   pre-existing tests that resolve `.closest('section')` from a field (e.g.
   `getInput().closest('section')` in the "add-color button placement" and
   "theme toggle placement" suites) bind to this new inner section instead of
   the outer `panel-generator` section — keeping their direct-children /
   order assertions valid without modifying the tests themselves.
3. `panel-generator`/`panel-preview`'s own 4:6 flex split (`App.css`,
   unconditional across pre/post-generate) is untouched. The new 2-column
   split lives entirely inside `panel-generator`'s pre-generate content, with
   its own independent breakpoint at 768px (`.color-generator__intake`
   switches `flex-direction: row -> column`), separate from `app-shell`'s
   existing 1024px/768px panel-stacking rules.
4. Added `--text-display-2xl: 110px` (`src/index.css`) as the next step past
   the existing Display scale (20/22/28/34/48), for the relocated title only.
   Every other typography/spacing value the new markup uses
   (`--font-display`, `--weight-display-bold`, `--leading-display`,
   `--tracking-display`, `--font-text`, `--text-body-lg`,
   `--weight-text-regular`, `--leading-text`, `--tracking-text`,
   `--space-4`, `--space-6`) is reused verbatim from the deleted
   `.app__intro h1`/`.app__intro p` rules or the existing 8px-multiple
   spacing scale — no other new values introduced.

## Why

- The grain's Do explicitly asks to relocate the existing title/description
  into a left/right split with the intake form "as one row" inside
  ColorGenerator's pre-generate branch, and to leave the post-generate
  branch (panel-generator/panel-preview 4:6, per grain-2/3's contract)
  untouched — scoping the new layout inside panel-generator's own
  pre-generate content, rather than touching `app-shell`'s CSS, satisfies
  both constraints with the smallest possible diff.
- The nested-`<section>` choice for the form wrapper is the one non-obvious
  decision this grain makes: without it, wrapping the (previously flat)
  intake fields in any container would collapse
  `ColorGenerator.test.tsx`'s `getControlsPanel().children`-based order
  assertions (brand field before add-color button before mood field) into a
  single child, breaking them. Using a `<section>` exploits
  `Element.closest('section')`'s "nearest ancestor" semantics so those tests
  keep resolving to a container whose direct children are unchanged.
- A dedicated 768px breakpoint on the new `.color-generator__intake` (rather
  than reusing `app-shell`'s existing 1024px panel-stacking breakpoint) is
  required by the Do's explicit "<768px stacks, otherwise 2-column" spec,
  which is a different threshold than the pre-existing panel-level one.

## Rejected alternatives

- Reusing `panel-generator`(4)/`panel-preview`(6) themselves as the two
  columns (title+desc in panel-generator, form moved into panel-preview):
  rejected — panel-preview unconditionally renders the ThemeToggle (a
  separate, prior grain's decision) in both states, and this would also
  inherit `app-shell`'s existing 1024px stacking breakpoint instead of the
  required 768px one.
- Wrapping the intake fields in a plain `<div>` for the right column:
  rejected — collapses the pre-existing "field order" tests as described
  above; would have required modifying those (disallowed for pre-existing
  tests whose intent is still valid).
- Widening `panel-generator`'s flex-basis for the pre-generate state (via a
  modifier class) instead of nesting the 2-column split inside it: rejected
  as unnecessary complexity — nesting achieves the same visual result without
  touching any rule `app-shell`/`panel-preview` share with the post-generate
  contract.
