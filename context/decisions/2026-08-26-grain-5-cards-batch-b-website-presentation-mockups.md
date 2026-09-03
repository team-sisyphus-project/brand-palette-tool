# grain-5: Cards batch B — website/presentation mockups

## Decision

Built `WebsitePreviewCard` and `PresentationPreviewCard` under
`src/components/colorStudy/`, following the exact `CardShell` +
recompute-on-render + empty-palette-guard contract grain-4 already
established for `SemanticRolesCard`/`DistributionCard`/`ContrastCheckerCard`/
`UsageGuideCard`. Both cards derive every color from `getColorRoles`
(grain-3) plus `getBestTextColor` (grain-3's `colorPairing.ts`) for
contrast-safe CTA/title text, and `PresentationPreviewCard`'s chart slide
reuses `getChartColorSeries` (grain-3's `chartColors.ts`) for its bars.
Registered as a new Design Spec Extension of `color-study`
(`design-spec/components/color-study/website-presentation-mockups.md`) since
no Design Spec mockup pattern for these two cards existed yet.

## Why

- **Whole mock as one `role="img"`, not individually-labeled interactive
  elements.** Mirrors grain-4's `DistributionCard`/`ContrastCheckerCard`
  pattern: the mock's nav links, hero copy, and CTA text are decorative
  demonstration content, not information the page conveys through assistive
  tech beyond "this is a website mockup using the palette" — so the whole
  frame gets one `aria-label` and everything inside is presentational.
  **Rejected**: a `<button>` for the CTA — it triggers nothing, so a
  focusable, keyboard-operable control would be a false affordance; used a
  `<span>` instead, consistent with the rest of the mock being non-interactive
  markup.

- **No new "muted text" token for hero subtext / nav links.** Considered
  `opacity` to visually de-emphasize secondary mock text, but the codebase's
  only existing `opacity` usage is for hiding the native color-picker input
  (`PaletteSwatch.css`), not a "muted text" convention, and inventing one for
  a single card would be exactly the "experimental or temporary values" the design
  system's coding policy rules out. Both cards reuse the `text` role color
  directly for all mock copy, differentiating heading vs. body only through
  existing typography scale (size/weight), not a new color/opacity token.

- **Extension of `color-study`, not two standalone Components.** Per
  `policy/recording.md`'s differentiation criteria, these two tiles add structure to the
  existing masonry grid (same context, same Tile shell rule) rather than
  introducing an unrelated concept — `color-study/base.md` already flagged
  this exact addition ("in future grains... more analysis tiles are expected to be added under
  the same grid/tile shell rules"). Recorded as an Extension file rather than
  folding directly into `base.md`, keeping `base.md` as grain-2's original
  shell description and layering each batch of new tiles as its own
  Extension — mirrors how the codebase's own `context/decisions/` splits one
  file per grain instead of rewriting a single running document.

## Audit

Every token referenced by the new CSS (`WebsitePreviewCard.css`,
`PresentationPreviewCard.css`) already exists in `src/index.css`
(`--space-*`, `--radius-control`/`--radius-pill`, `--border-width-default`,
`--font-*`/`--text-*`/`--weight-*`/`--leading-*`/`--tracking-*`) and is
already registered under `color-study`'s existing Token Group declarations —
no new raw design value introduced. `aspect-ratio`/`overflow`/`text-transform`
are implementation settings per `policy/coding.md` (no visually-token-worthy
value the user perceives as a design decision), not Design Spec entries.
