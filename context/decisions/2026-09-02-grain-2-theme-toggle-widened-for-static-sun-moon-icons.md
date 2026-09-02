# grain-2: ThemeToggle widened to 92px for static Sun/Moon icons

## Decision

Added static, always-rendered Sun (left) and Moon (right) inline SVG icons
flanking the `.theme-toggle` track, and widened the button's own hit area
from 52px to 92px (14px icon + 6px gap + 52px track + 6px gap + 14px icon) to
fit them. The track itself keeps its original 52px width and the thumb keeps
its original 22px size / 24px travel distance — only the track's `left`
offset within the (now wider) button changed, from `0` to `20px`, and the
thumb's static `left` shifted from `3px` to `23px` to match. Icon color reuses
the existing `--color-text-secondary` token (grayscale, no new accent) via
`currentColor`.

## Why

The card's Done criteria requires visually confirming both the Sun and Moon
icon in each theme state. Fitting both icons *inside* the existing 52px track
(alongside the 22px thumb, which travels the full width) would mean the thumb
fully covers whichever icon sits on its side — e.g. unchecked/light leaves the
thumb parked over the left zone, hiding a left-placed Sun icon exactly in the
state where it's most relevant. Making both icons permanently visible,
regardless of thumb position, required moving them outside the thumb's travel
range — hence widening the button rather than squeezing icons into the
existing 52px.

`.color-generator__theme-toggle-row` (the only place `ThemeToggle` is
mounted) is `width: 100%; justify-content: flex-end` — it right-aligns its
child by content size, not a fixed px, so the wider control has no knock-on
effect on `ColorGenerator.tsx`/`.css` (unchanged, out of this grain's
Boundary regardless).

## Rejected alternatives

- **Icon inside the sliding thumb** (single icon that swaps Sun/Moon based on
  `theme`, moving with the thumb): rejected — the card explicitly says
  "트랙 좌우측에 각각... 배치" (place respectively on the track's left/right
  sides), i.e. on the track, not the thumb; a thumb-only icon wouldn't have a
  "left" and "right" icon simultaneously.
- **Keep 52px width, accept the thumb covering one icon depending on
  state**: rejected — fails the Done criterion of visually confirming both
  icons in both states, and the covered/uncovered semantics (which icon is
  revealed on which side) would likely read as backwards/confusing (the
  currently-*inactive* option would be the one left visible).
- **New `sizing` Token Group for the 14px icon size**: rejected — the
  component's own track/thumb geometry (52/28/22/3/24px) has never been
  tokenized in this project's Design Spec or code; it's handled as a
  component-local implementation value. Introducing a new Token Group for
  just the icon size, while leaving the rest of the component's geometry
  hardcoded, would be an inconsistent half-measure and is outside this
  grain's Boundary (`ThemeToggle.tsx`/`.css` only, no `index.css` token
  additions requested by the card).

## Design Spec

This project's `design-spec/` was completely empty at the start of this job
(see `design-spec/audit/2026-09-02.md`). Registered `theme-toggle` for the
first time (`design-spec/components/theme-toggle/base.md`) along with the
three Token Groups it declares — `color` (`base.md` + `dark.md`), `radius`,
`border` (all `token-groups/{name}/base.md`) — matching the existing/actual
`src/index.css` values (no new tokens; the icons reuse the pre-existing
`--color-text-secondary`). `design-spec/index.md` created fresh, scoped to
just this component and its Token Groups.
