# grain-2: Color Study full-width masonry layout shell

## Decision

1. Hoisted `<ColorStudy />` out of `panel-preview` (`ColorGenerator.tsx`) to
   render as a third top-level element in `ColorGenerator`'s returned
   fragment, a sibling of `panel-generator`/`panel-preview` rather than the
   last child inside the preview column. Gating (`showResult && palette`) is
   unchanged.
2. Kept `App.tsx` untouched (out of this grain's file boundary) and instead
   made `.app-shell` (`App.css`) absorb the new sibling: `flex-wrap: wrap` on
   `.app-shell` plus `flex: 1 1 100%` on `.app-shell > .color-study` forces
   the section onto its own full-width row below the two-column layout,
   without depending on `panel-preview`'s width.
3. Introduced a new container convention on `.color-study` itself:
   `width: 100%; max-width: 1920px; margin-inline: auto;` — the first
   container-max value in this codebase.
4. Built the "4-column Pinterest masonry" requirement with CSS multi-column
   layout (`.color-study__grid { columns: 4; }`, stepping to `2`/`1` at the
   existing 1024px/768px breakpoints) rather than CSS Grid, and wrapped each
   widget (`ColorWheel`, `HarmonyExplorer`, `Shades`) in a shared
   `.color-study__tile` shell (`border-radius: var(--radius-card)`,
   `border: var(--border-width-default) solid var(--color-border-default)`).

## Why

- The grain's file boundary is `ColorGenerator.tsx`, `ColorStudy.tsx/css`,
  `App.css` — `App.tsx` is explicitly excluded. `ColorStudy` becoming a true
  sibling of the `.app-shell` `<div>` itself (not just of the two panels
  inside it) would require editing the wrapper in `App.tsx`, so the
  `flex-wrap` technique gets the same visual/DOM result (not a descendant of
  `panel-preview`, spans the row's full width) while touching only
  boundary-listed files. The card's own Measure M-1 only requires "not a
  descendant of `.panel-preview`" plus a `width: 100%`/`max-width: 1920px`
  CSS contract — both are satisfied without moving `.app-shell` itself.
- CSS multi-column over CSS Grid for the masonry: the tiles vary in height
  (a `ColorWheel` tile is much taller than a compact `HarmonyExplorer`
  button row), and genuine Pinterest-style masonry (later rows pulled up to
  fill short columns, no manually-tuned row gaps) is what `columns` gives
  for free. CSS Grid would need a `grid-row: span N` computed per tile
  (impossible to get right generically once the 10 analysis cards from later
  grains land with very different natural heights) or the experimental,
  not-yet-stable `grid-template-rows: masonry`. This tradeoff was already
  flagged as open in the card's self-authored spec draft
  (`planning-doc-spec-colorstudy-fullwidth-masonry.md` §2); this grain
  resolves it in favor of CSS columns.
- `1920px` is the card's own stated container ceiling (`M-1` in the card
  body). No existing token in `index.css` covers a page-container max-width
  (the closest, `--radius-container`, is a radius token, unrelated), so this
  is recorded as a new convention rather than silently introducing a
  numeric literal with no trace.

## Rejected alternatives

- Editing `App.tsx` to move `.app-shell` down to wrap only the two panels,
  with `ColorStudy` as an outer sibling — the more "structurally clean"
  option raised in the spec draft, but out of this grain's file boundary.
- CSS Grid with per-tile `grid-row: span N` — rejected; requires knowing
  each tile's rendered height ahead of layout (JS measurement) or hardcoding
  span guesses per tile, neither of which holds up once later grains add the
  10 analysis cards with heterogeneous content.
- A single `.color-study-card` React wrapper component instead of a plain
  `.color-study__tile` CSS class — deferred; this grain only wraps 3
  pre-existing widgets inline, so a dedicated component felt premature ahead
  of the 10-card grains where the shared shell will see much more reuse.
