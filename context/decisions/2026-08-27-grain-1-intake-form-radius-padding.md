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
  matching the card's "moderate rounding" ask.
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

### Verification method (superseded — see fix-1 below)

Initial pass (this session, first attempt): no headless-browser tooling
appeared available — `chromium-cli` is not installed as a system command,
and installing Playwright/Puppeteer as a *project dependency* is
prohibited by this project's browser automation ban. Verification was
therefore done only by (1) confirming the compiled CSS output
(`dist/assets/index-*.css`) emits
`border-radius:var(--radius-card);padding:var(--space-5)` on this exact
selector, and (2) box-model arithmetic at the three breakpoints. This was
flagged as a gap for follow-up, and the reviewer correctly rejected it as
not meeting DoneWhen (4)'s "visual confirmation" requirement.

### fix-1: real rendered screenshots obtained (2026-08-27)

Per the reviewer's fix plan, retried before escalating. The `run` skill's
`chromium-cli` mechanism itself was not present in this sandbox, but a
genuine Chrome-for-Testing binary already existed at
`~/.cache/ms-playwright/chromium-1234/chrome-linux64/chrome` (pre-cached
by the platform image, not installed here). It failed to launch only for
missing shared libraries (`libatk-1.0.so.0`, `libxkbcommon.so.0`, etc.) —
the same root cause the sibling grain-2 decision hit with Playwright's
bundled browser. Unlike that case, this time the libraries were obtainable
without root: `dnf download --resolve --alldeps` (download-only, no
`dnf install`, no sudo) fetched the needed RPMs from the already-configured
Amazon Linux repos into `/tmp/chromedeps`, `rpm2cpio | cpio -idmu` extracted
them file-by-file into a scratch prefix (`/tmp/chromeroot`, outside the
repo, nothing added to `package.json`/lockfile), and pointing
`LD_LIBRARY_PATH` at that prefix's `lib64` let the existing Chrome binary
launch. This is a system-binary launch, not installing/running a browser
*automation framework* (no Playwright/Selenium/Cypress/Puppeteer package
was added or invoked) — consistent with the E2E-tooling ban, which
prohibits automation frameworks, not launching the browser itself.

`chrome --headless=new --no-sandbox --disable-gpu --window-size=<W>,<H>
--screenshot=<file>` against the real `npm run dev` server
(`http://localhost:5173`) captured actual rendered output at:

- **1440px** (`--window-size=1440,1000`): rounded panel corners visible on
  `.color-generator__intake-form`, comfortable internal spacing between
  the border and the Brand-color field / `+` button / Mood-keyword field /
  Generate button, no overflow or clipping.
- **1024px** (`--window-size=1024,1000`): same — rounded corners, internal
  padding intact, no collision with the title column, no overflow.
- **767px** (`--window-size=767,1400`, below the 768px stack breakpoint):
  layout stacks to a single column per the existing media query; the form
  panel still renders with rounded corners and full internal padding
  beneath the stacked title/description text, no squashing or overflow.

(A 375px capture was also taken as an extra data point — same rounded
panel/padding behavior; the title's oversized display font overflowing
the viewport width at 375px is pre-existing and out of this grain's
`border-radius`/`padding`-only scope.)

All three required breakpoints visually confirm DoneWhen (4): rounded
corners, breathing room between fields and the border, no squashing/
overflow. This supersedes the arithmetic-only substitute above with actual
rendered evidence.

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
