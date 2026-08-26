# grain-1: rich vibe-keyword generation logic

## Decision

1. Added `getVibeKeywords(hsl: HSL): string[]` to `src/lib/palette.ts`,
   extending `getMoodTags`'s existing hue/saturation/lightness lookup-table
   pattern rather than replacing or altering it. It reuses the same 3 axes
   `getMoodTags` classifies (`hueVibeBand` mirrors `hueMoodWord`'s band
   boundaries; `saturationBand`/`lightnessBand` are reused directly, not
   duplicated) but each axis now maps to a 2-word bank
   (`HUE_VIBE_WORDS`/`SATURATION_VIBE_WORDS`/`LIGHTNESS_VIBE_WORDS`) instead
   of `getMoodTags`'s single word, so a normal HSL input always yields
   2+2+2 = 6 candidate words.
2. The 3 word banks are disjoint from each other by construction (no word
   repeats across banks), which is what lets the function guarantee 5+
   *unique* adjectives on every input without padding, sampling, or
   randomness - it is deduped via `Set` defensively (same defensive pattern
   `getMoodTags` already uses), but in practice always returns exactly 6.
   Individual words are allowed to echo `getMoodTags`'s own vocabulary (e.g.
   "warm", "vibrant") - the uniqueness guarantee is scoped to *this*
   function's own output, not cross-function distinctness.
3. `hueVibeBand` is a new, separate function from `hueMoodWord` (not a
   refactor of it) even though both compute the same band from the same
   threshold constants - this keeps `getMoodTags`'s existing implementation
   and output completely untouched, per the grain's explicit
   out-of-scope ("removing/altering `getMoodTags`").
4. Checked `design-spec/token-groups/color/base.md` and
   `.../typography/base.md` for existing keyword/tone vocabulary guidance
   before picking words - found none (recorded in
   `design-spec/audit/2026-08-26.md`). This is a content/copy decision (a
   word list), not a color or typography *value*, so it falls outside the
   Token Group schema (`schema/token-group.md` only covers hex/rgba, size,
   weight, etc.) - recorded here instead, following the same precedent as
   `getMoodTags` (also never registered as a Design Spec Token).
5. No UI/component changes - the function is unwired (no caller yet), per
   the grain's Boundary ("pure function in `src/lib/palette.ts`; no
   component/JSX changes").

## Why

- Reusing `saturationBand`/`lightnessBand` and mirroring (not duplicating)
  `hueMoodWord`'s thresholds keeps all mood/vibe classification agreeing on
  the same H/S/L boundaries - a color that reads "Warm" in `MoodTag` will
  never read "cool" in the vibe-keyword line, avoiding a confusing
  contradiction for non-expert users.
- Two words per axis (6 total) comfortably clears the "5+ unique" Done
  criterion with a fixed, deterministic margin, rather than relying on
  runtime padding logic that would add complexity for a rarely-hit edge
  case.

## Rejected alternatives

- Refactoring `hueMoodWord` to share a `hueTemperatureBand` helper with
  `getVibeKeywords` - rejected: touches code the grain explicitly marks
  out-of-scope, for a saving of a few duplicated lines.
- Registering the new word banks as a Design Spec Token Group (e.g.
  `content`/`copy`) - rejected: the schema (`schema/token-group.md`) is
  explicitly scoped to visual design axes (color, typography, spacing,
  radius, shadow, transition); a word list isn't a value on any of those
  axes, and `getMoodTags` set the precedent of keeping this class of
  decision in `context/decisions/` instead.
- A single shared word bank keyed only by one combined S×L cell (mirroring
  `SATURATION_LIGHTNESS_MOOD`) - rejected: that collapses 2 independent axes
  into 1 lookup, which would make it harder to guarantee a fixed minimum
  count independent of how many S×L cells collide, and diverges further
  from "extending" the existing 2-axis-plus-hue pattern the grain calls for.
