# grain-1: fixed (non-adaptive) `--color-action-bg-fixed` token, kept separate from `--color-action-bg`

## Decision

Added a new, theme-independent color token `--color-action-bg-fixed: #000000`
declared once at the base `:root` in `src/index.css` (not re-declared inside
`:root[data-theme='light']`, `:root[data-theme='dark']`, or the
`prefers-color-scheme: dark` block), and pointed
`.color-generator__generate`/`.color-generator__regenerate`'s `background` at
it — instead of changing the value of the existing adaptive
`--color-action-bg` token (`#6e6e73` light / `#5c5c61` dark).

## Why

- The attached spec calls for a pure-black background on Generate/Regenerate
  in both light and dark mode — a genuinely non-adaptive value, unlike every
  other color token in this file.
- `--color-action-bg` is shared by four other consumers
  (`ThemeToggle.css`, `PaletteSwatch.css`, `HarmonyExplorer.css`,
  `ColorWheel.css`) that are explicitly out of this grain's scope (DoneWhen
  (5): "기존 `--color-action-bg` 소비처 4곳 시각적 무변경"). Changing that
  token's value, or its per-theme declarations, would have repainted all four
  — a boundary violation (`policy/coding.md`'s "오염 금지").
- A single fixed token declared once (rather than duplicating the same
  `#000000` literal into both the light and dark `:root[data-theme=...]`
  blocks) makes the "does not adapt" property structurally obvious and
  impossible to accidentally diverge between themes later.

## Rejected alternatives

- Overriding `--color-action-bg`'s value directly to `#000000` — rejected:
  would repaint the four out-of-scope consumers above.
- Declaring `--color-action-bg-fixed: #000000` separately inside each of the
  light/dark/`prefers-color-scheme` blocks (mirroring how the adaptive tokens
  are declared) — rejected: the value never changes, so repeating it three
  times only invites future drift between the copies; a single base-`:root`
  declaration is both simpler and structurally enforces the "fixed" contract.
