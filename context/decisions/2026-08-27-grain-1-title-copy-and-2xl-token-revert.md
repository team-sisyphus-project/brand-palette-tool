# grain-1: title copy change + `--text-display-2xl` 72px -> 110px revert

## Decision

1. Hero title copy changed from "Build a palette around your brand" to
   "Color Palette Generator", split one word per line via explicit
   `<br />`s: "Color" / "Palette" / "Generator" (3 lines, per the card).

2. `--text-display-2xl` raised back 72px -> 110px in `src/index.css`. The
   2026-08-26 grain-1 decision (see
   `2026-08-26-grain-1-exact-screenshot-intake-split.md`, point 3) had
   lowered this token from its original 110px to 72px specifically so the
   old title's longest explicit line ("palette around") wouldn't re-wrap
   inside the ~580-620px 50/50 intake column. The new copy's longest word
   ("Generator", 9 characters) is short enough that 110px does not force a
   second wrap, so the constraint that motivated 72px no longer holds -
   reverting to the token's original value is a straight token-value edit
   (`policy/updating.md` "Token value modification"), not a new design decision: the
   Design Spec's `token-groups/typography/base.md` already documents 110px
   as the "intended" pre-generate-hero value, with 72px recorded as a
   layout-driven interim lowering. `.color-generator__intro-title` remains
   the token's only reuse point (confirmed via `index.md`'s Token Group →
   Component index), so the revert's blast radius is scoped to this one
   title, matching the 2026-08-26 grain's own scoping.

3. Verification of the `font-size: 110px` computed-style requirement is done
   by pinning both halves of the chain directly against CSS source
   (`ColorGenerator.css`'s `font-size: var(--text-display-2xl)` declaration,
   and `index.css`'s `--text-display-2xl: 110px`) in a new
   `ColorGenerator.title.test.ts`, rather than asserting
   `getComputedStyle` on a rendered component - jsdom does not run Vitest's
   CSS pipeline, so a rendered element's computed style never reflects
   the actual cascade (established precedent: `pageBackground.test.ts`,
   and `PaletteSwatch.test.tsx`'s doc comment explaining the same
   limitation for hover/focus-visible state).

## Rejected alternatives

- Hardcoding `font-size: 110px` directly on `.color-generator__intro-title`
  instead of updating the `--text-display-2xl` token: rejected per
  `policy/coding.md`'s "do not hardcode design values directly in a Component"
  (no direct design values in components - route through the Token Group)
  and the card's own instruction to update the token, since this class is
  the token's sole reuse point.
- Asserting `getComputedStyle(...).fontSize === '110px'` against a rendered
  `<ColorGenerator />` in jsdom: rejected as unreliable (would pass/fail
  independent of the actual CSS, since jsdom never loads the stylesheet's
  cascade) - see point 3 above.
