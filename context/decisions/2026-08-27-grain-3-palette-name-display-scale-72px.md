# grain-3 (M-14): new `--text-display-xl-2` token for the palette name's 72px

## Decision

Changed `.palette-description__name`'s `font-size` in `PaletteDescription.css`
from `var(--text-display-xl)` (48px) to a **new** token, `var(--text-display-xl-2)`
(72px), added to `index.css`'s Display typography scale.

Checked the existing Display scale first, per the grain's Done criteria:
`--text-display-xs` (20px) / `-sm` (22px) / `-md` (28px) / `-lg` (34px) /
`-xl` (48px) / `-2xl` (110px). 72px matches none of the 6 existing steps, so
it needed either a new token or a documented literal. Went with a new token —
`--text-display-xl-2` — inserted between the existing `-xl` (48px) and `-2xl`
(110px) steps.

Also registered the previously-unregistered `palette-description` Design Spec
Component (Orphan) and backfilled the Display axis of the `typography` Token
Group (it existed in `src/index.css` since grain-1 but the Token Group's
definition scope had only ever covered the Action axis, per grain-2's note).

## Why

- `policy/coding.md`'s "정의가 없을 때" rule: no existing Display-scale value
  matches 72px, so extend the scale with a new step rather than hardcode a
  literal — same approach grain-2 took for `--text-action-lg` (24px).
- Did **not** repurpose `--text-display-2xl` (which historically held 72px for
  one commit, per `index.css`'s own grain-1 comment) even though the value
  matches exactly: `--text-display-2xl` is now the homepage hero title's
  dedicated 110px value (M-6, a different, out-of-scope component). Changing
  its value back to 72px would silently regress that unrelated title.
- Named it `--text-display-xl-2` (a second rung within the `xl` tier) rather
  than renaming the existing `-2xl` token to `-3xl` and reusing `-2xl` for
  72px — renaming `-2xl` would require touching every existing reference to
  it (`App.css`'s intro title, `ColorGenerator.css`), which is both outside
  this grain's boundary ("PaletteDescription.css 타이포그래피") and a needless
  blast-radius increase for a change that only needs one new value.
- Registering the Display axis as part of the same `typography` Token Group
  (rather than a new `typography/display` Token Group) follows
  `policy/recording.md`: Token Groups scope by *design axis* (fonts, sizes,
  weights, tracking, line-height are all still "typography"), not by which
  component happens to use them — `action-button` and `palette-description`
  are two different Components declaring the same Token Group.

## Rejected alternatives

- Hardcoding `font-size: 72px` as a literal directly in the CSS — rejected:
  violates `policy/coding.md`'s "오염 금지" (no raw design values outside a
  Token Group), and the grain's Done criteria explicitly calls for
  tokenizing-or-literal-with-recorded-reason; tokenizing fits the existing
  scale's naming pattern cleanly.
- Reusing `--text-display-2xl` (110px) directly, or changing its value to
  72px — rejected: it is the homepage hero title's dedicated value (M-6, out
  of scope); overwriting it would regress that title, and reusing the
  variable as-is (110px) would overshoot Spec A's explicit 72px for M-14.
- Renaming `--text-display-2xl` to `--text-display-3xl` and introducing a new
  `--text-display-2xl` at 72px, to keep the "2xl > xl" naming convention
  strictly ordinal — rejected: a rename touches every existing call site
  across `App.css`/`ColorGenerator.css`, none of which are in this grain's
  boundary, for a purely cosmetic naming preference.
