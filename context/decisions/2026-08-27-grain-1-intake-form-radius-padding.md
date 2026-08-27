# grain-1: intake-form panel gets border-radius/padding via existing tokens

## Decision

1. Added `border-radius: var(--radius-card)` (16px) and `padding: var(--space-5)`
   (24px) to `.color-generator__intake-form` (`src/components/ColorGenerator.css`).
2. No change to the M-7 `height: calc(var(--text-display-2xl) * var(--leading-display) * 3)`
   formula or `box-sizing: border-box` — `border-box` already folds the new
   padding (and the pre-existing border) into that fixed outer height, so the
   M-7 title-height match is unaffected.
3. Registered `radius`/`spacing` Design Spec Token Groups (each with only the
   single token this grain references) and an `intake-form` Component,
   per `design-spec/` (this job's Design Spec started empty — see
   `design-spec/audit/2026-08-27.md`).

## Why

- `--radius-card` over `--radius-control` (12px, this project's small-control
  rounding — too subtle for a full panel) or `--radius-container` (28px,
  reserved for the outer `App.css` app-shell panels — would make this nested
  panel read as a second outer shell). `--radius-card` is already this
  project's "standalone content card" rung (`.color-generator__regenerate`),
  matching the card's "적당한 둥글기" ask.
- `--space-5` matches `.panel-generator`/`.panel-preview` in `App.css`, this
  project's existing padding for a bordered content panel — reused instead of
  picking a new value so panel padding stays consistent project-wide.
- Verified the padding doesn't starve the fixed-height box: `border-box`
  reduces the *inner* content budget from ~394px (396px height minus 2px
  border) to ~346px (minus 48px of new vertical padding). The pre-reveal
  field stack sums to ~326px (theme-toggle row 44px + gap 16 + brand
  `ColorInput` ~64px + gap 16 + add-color button 44px + gap 16 + mood
  `ColorInput` ~64px + gap 16 + Generate button 46px, each from that
  element's own token-driven height/padding in `ColorInput.css`/
  `ThemeToggle.css`/`ColorGenerator.css`) — fits inside the 346px budget
  with ~20px to spare, down from ~68px of spare before this grain, but
  still no overflow.

### Verification method (tooling constraint)

No headless-browser tooling was available in this session to capture an
actual rendered screenshot — `chromium-cli` is not installed, no
system Chromium/Chrome binary is present, and installing one
(Playwright/Puppeteer/etc.) is prohibited by this project's browser
automation ban. Verification for M4-M8 (`planning-doc-scenario-
intake-form-radius-padding.md`) was therefore done by (1) confirming the
compiled CSS output (`dist/assets/index-*.css`) emits
`border-radius:var(--radius-card);padding:var(--space-5)` on this exact
selector, and (2) the box-model arithmetic above at the three breakpoints
(1440px/1024px/<768px don't change this selector's own box math — only
`.color-generator__intake`'s `flex-direction` and this selector's
`flex-basis` change per the existing 768px media query, neither of which
affects the fixed `height`/new `padding` interaction computed here).
Flagged so a human (or a follow-up grain with browser tooling) can
confirm with an actual screenshot.

## Rejected alternatives

- `--radius-control`/`--radius-container` for `border-radius` — rejected, see
  above (too subtle / collides with the outer-shell rounding role).
- A new spacing/radius token — rejected: both `--radius-card` and `--space-5`
  are pre-existing, already-used-elsewhere tokens whose semantic role matches
  this panel exactly; the grain's own boundary also prohibits adding new
  `--radius-*`/`--space-*` tokens.
- Adjusting the `height` calc to add room for the new padding — rejected:
  `box-sizing: border-box` already absorbs padding into the existing fixed
  height without changing it, and changing the formula would break the M-7
  title-height match this box exists to preserve.

## Known pre-existing risk (out of scope)

With all 4 additional-color fields revealed, the intake form's natural content
height was already close to the M-7 fixed-height budget before this grain;
the new 48px of padding tightens that budget further. This is a pre-existing
fixed-height risk from M-7 (not introduced by this grain) and is out of this
grain's Boundary (`border-radius`/`padding` only) — flagged here, not fixed.
