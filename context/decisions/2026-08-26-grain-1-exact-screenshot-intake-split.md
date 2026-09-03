# grain-1: exact-screenshot match for the intake split, title line breaks, page width cap

## Decision

1. `.color-generator__intro` and `.color-generator__intake-form` now both use
   `flex: 1 1 0` (equal share), replacing the prior asymmetric
   `flex: 1 1 auto` (intro) / `flex: 0 1 420px` (form) split. The user asked
   explicitly for a true 50/50 split matching the attachment, superseding
   the earlier grain-1 rationale (a fixed-width form column so inputs
   wouldn't balloon at the old 1920px page cap) - that rationale no longer
   applies once the page cap drops to 1440px and the split is intentionally
   even.

2. Title text is unchanged ("Build a palette around your brand" - the card
   explicitly puts wording changes out of scope), but now breaks across
   exactly 3 explicit lines via `<br />`: "Build a" / "palette around" /
   "your brand". This is a 2-words-per-line grouping (minimizes the longest
   line's character count among contiguous-word groupings of 6 words into 3
   lines - alternatives like "Build a palette" / "around" / "your brand"
   produce a longer worst-case line), chosen so the title reads as evenly
   as possible across the 3 lines rather than lopsided.

3. `--text-display-2xl` lowered 110px -> 72px. The prior 110px was sized for
   the old near-full-width intro column; at the new true-50% column width
   (~580-620px at the 1440px cap), 110px would force the longest explicit
   line ("palette around") to wrap a second time, breaking the "exactly 3
   lines" requirement. 72px was derived from font-metric estimation (no
   headless-browser verification was performed - browser automation tools
   are out of bounds per this project's E2E prohibition) with a safety
   margin, rather than the tightest theoretical fit, since Pretendard's
   actual glyph widths weren't measurable in this environment.

4. `--content-max-width` lowered 1920px -> 1440px per the explicit request.
   Not registered as a new Design Spec Token: this project's existing
   sizing Token Group (`design-spec/token-groups/sizing/base.md`) already
   states its own boundary excludes "placement axes such as a layout
   container's flex-grow/min-width" (layout-container placement axis) as implementation config,
   and the 2026-08-26 audit already classified this same variable's sibling
   layout values (flex/min-width/width) as outside the tokenized scan axes
   (color/typography/spacing/radius/shadow/border/opacity). Kept as a plain
   CSS custom property in `index.css`, consistent with that precedent.

## Rejected alternatives

- Keeping the form column at a fixed pixel basis and only reflowing the
  title: rejected because the user asked for the screen to literally split
  50/50, not just for the title to look bigger.
- Relying on incidental CSS wrap (no explicit `<br />`) with a `clamp()`
  font-size: rejected per the card's explicit "explicit line breaks, not
  incidental wrap" instruction - incidental wrap would produce a different
  line count at different column widths, not a guaranteed 3.
