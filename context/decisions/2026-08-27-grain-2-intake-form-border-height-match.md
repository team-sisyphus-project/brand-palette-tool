# grain-2: intake-form border + title-height match via calc(), not a literal px

## Decision

1. Added a rectangular border to `.color-generator__intake-form` using the
   existing neutral-gray chrome tokens `--border-width-default` /
   `--color-border-default` (same tokens `ColorInput`'s fields and the
   add-color button already use) rather than introducing a new border color.
2. Set the container's height via
   `calc(var(--text-display-2xl) * var(--leading-display) * 3)` with
   `box-sizing: border-box`, instead of hardcoding the resulting `396px`
   literal.
3. Registered two new Design Spec Token Groups (`border`, `color`), each with
   only the single token this grain references, and registered
   `.color-generator__intake-form` itself as a new `intake-form` Component.

## Why

- Spec A's M-7 asks for the bordered box's rendered height to match the left
  title's 3-line (M-6, 110px) rendered height, with an assumed ±4px
  tolerance. The title's line-box height is fully determined by
  `--text-display-2xl` (110px) and the unitless `--leading-display` (1.2) —
  `calc()` re-derives the same 396px straight from those two tokens instead
  of duplicating the arithmetic as a literal. If either token changes later,
  this box's height changes with it instead of silently drifting outside the
  tolerance window.
- `border-width-default`/`color-border-default` were Orphans (used elsewhere
  in code, never registered) until this grain referenced them directly for
  the first time (`policy/audit.md`: "작업 범위 안에 Orphan이 있으면
  교정한다"), so both got minimal new Token Groups rather than being reused
  silently.
- `.color-generator__intake-form` meets 2 of the 3 Component-identification
  criteria in `policy/reading.md` (independent role, clear boundary — not
  repeated use, it renders once) once it carries a Token Group declaration
  of its own, so it was registered as a Component rather than left as
  unregistered markup.

## Rejected alternatives

- Hardcoding `height: 396px` — rejected: it would duplicate
  `text-display-2xl * leading-display * 3` as a silent literal that could
  drift out of sync with the title if either token is later edited.
- Using `min-height` instead of `height` — rejected: the current intake
  content (brand field, mood field, generate button, ~260-330px) sits
  comfortably under 396px, so a fixed `height` reliably matches the title
  without risking the box growing taller than the ±4px window if content
  grows later; the spec's own instruction is to match a specific height, not
  merely a floor.
- Adding container padding along with the border — rejected for this grain:
  it isn't required by M-7 (border + height match only), and any padding
  choice would need re-verifying the height budget against M-8/M-9's future
  field-width/theme-toggle changes to the same container — left for those
  grains.
