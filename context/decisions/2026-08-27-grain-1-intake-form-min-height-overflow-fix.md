# grain-1: intake-form fixed height overflows once extra fields reveal - switched to min-height

## Decision

Changed `.color-generator__intake-form` (`src/components/ColorGenerator.css`) from
`height: calc(var(--text-display-2xl) * var(--leading-display) * 3)` to
`min-height: calc(var(--text-display-2xl) * var(--leading-display) * 3)` -
same formula/tokens, just a different CSS property. Updated the M-7
regression test (`colorGeneratorIntakeFormBorder.test.ts`) to assert
`min-height` instead of `height` (and to assert `height` is no longer
declared at all), keeping every other assertion (border, box-sizing,
396px-floor arithmetic) intact.

## Why

This grain's Do was to verify the M-7/grain-1-radius-padding fixed-height
box at 1440/1024/767/375px **with all 4 progressive-disclosure additional-
color fields revealed** (`ADDITIONAL_COLOR_COUNT` in ColorGenerator.tsx) -
the prior radius/padding grain's decision record explicitly flagged this as
a "Known pre-existing risk (out of scope)" to be checked here.

### Verification method

Real Chrome rendering, not just box-model arithmetic (the box-model
estimate alone put this borderline - real fonts/browser box models can
differ by a few px either way, and the effect here is large enough that
real pixels were worth getting). Used the same approach the immediately
preceding radius/padding grain's decision record established as compliant
with this project's browser-automation ban ("a system-binary launch, not
installing/running a browser automation framework"): the pre-cached
`~/.cache/ms-playwright/chromium-1234` Chrome-for-Testing binary (already
present in this sandbox image, not installed by this session), launched
headless with its missing shared libs resolved via a download-only
`dnf download --resolve --alldeps` + `rpm2cpio | cpio` extraction into a
scratch `LD_LIBRARY_PATH` prefix (no `dnf install`, no sudo, nothing added
to `package.json`/lockfile). Drove it via the raw Chrome DevTools Protocol
over the built-in Node `WebSocket`/`fetch` globals (no Playwright/
Puppeteer/Selenium/Cypress package added or invoked - just speaking CDP's
JSON-RPC directly, the same category of "launch the real binary, don't
install an automation framework" the prior grain's precedent covers)
against the real `npm run dev` server, to: set each viewport's device
metrics, navigate, click `.color-generator__add-color` 4x to reveal all 4
fields, measure `.color-generator__intake-form`'s rendered box vs. its
last child's bottom edge, and capture a PNG screenshot - at all 4 required
widths (1440/1024/767/375), before and after this fix.

### Before (fixed `height`, real Chrome measurements)

At every one of the 4 widths, the box stayed pinned to 396px while its
content (theme-toggle row, brand field, all 4 revealed additional-color
fields, mood field, Generate) rendered ~193px taller than that:

| width | box height | content bottom vs. box bottom | clipped |
|-------|-----------|-------------------------------|---------|
| 1440  | 396px     | +193px past the border        | yes     |
| 1024  | 396px     | +193px past the border        | yes     |
| 767   | 396px     | +193px past the border        | yes     |
| 375   | 396px     | +193px past the border        | yes     |

Screenshots confirm this visually: at every width, "Additional color 4",
the Mood keyword field, and the Generate button all render *outside* the
rounded/bordered panel entirely - the border box visibly cuts through
"Additional color 3"/4 instead of enclosing the form. This reproduces
regardless of viewport width, since the fixed height was never a function
of column width and the `<=768px` media query only ever reset
`flex-basis`, not height.

### After (`min-height`, real Chrome measurements)

| width | box height (grows with content) | clipped |
|-------|----------------------------------|---------|
| 1440  | 704px                            | no      |
| 1024  | 806px (taller - see note below)  | no      |
| 767   | 636px (stacked column)           | no      |
| 375   | 636px (stacked column)           | no      |

All 4 revealed fields plus Generate render fully inside the rounded/
bordered panel at every width, with the same `var(--space-5)` padding on
every edge - confirmed both by the DevTools measurement (content bottom
never exceeds the box's rendered bottom) and by the screenshots. The
`767`/`375` (stacked, `flex-direction: column`) layout is unaffected by
the mobile media query beyond its existing `flex-basis: auto` reset - the
panel still reads as a single clean block below the title/description
text, same padding on all sides, no squashing.

Note on the 1024px box being taller (806px) than 1440px's (704px): this is
`align-items: stretch` on the parent `.color-generator__intake` row (M-7's
own mechanism, unmodified here) - at the narrower 1024px column width, the
sibling `.color-generator__intro` column's title/paragraphs wrap onto more
lines and grows taller, so the intake-form column (whose own height is now
a `min-height` floor, not a hard cap) stretches to match it, same as it
always would have for a shrink-wrapped box under `align-items: stretch`.
This produces some empty whitespace below the Generate button at 1024px -
expected and harmless (not overflow/clipping/squishing - the Do's actual
concern), not fixed here since it is a direct, correct consequence of the
still-in-scope M-7 stretch mechanism this grain does not touch.

## Rejected alternatives

- **Keep `height`, add `overflow-y: auto`/`hidden`**: rejected - would hide
  real, interactive form fields behind a scrollbar or clip them outright,
  the opposite of what "no clip/overflow" means for a form the user needs
  to fill in.
- **Keep `height` fixed, shrink the 4-field stack's own spacing instead**:
  rejected - out of this grain's Boundary (`.color-generator__intake-form`
  height/media-query rules only; the `--element-gap-md`/`ColorInput`
  internal spacing tokens live elsewhere and are shared by every other
  field in the app, not something to shrink just to make one fixed box fit).
- **Drop the M-7 title-height match instead of `min-height`ing it (e.g.
  revert to `height: auto`)**: rejected - `min-height` keeps the exact same
  M-7 floor (the box still renders at exactly 396px, matching the title,
  whenever content fits inside it - the pre-reveal/all-still-revealed-later
  states from the prior grain's arithmetic), it just stops being a hard cap
  that clips taller content instead of also being a floor.

## Known pre-existing issue (out of scope, unrelated to this fix)

At 1024px, the page already renders a horizontal scrollbar/overflow -
confirmed present in both the before *and* after screenshots, so it
predates this fix (very likely `.color-generator__intake`'s hardcoded
`gap: 120px`, from a separate prior grain, not fitting inside the row at
that width). Out of this grain's Boundary (intake-form height/media-query
only, not the parent row's gap) - flagged here, not fixed.
