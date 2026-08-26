# grain-2: derive palette name/description/keywords

## Decision

1. Added `DEFAULT_PALETTE_NAME` and `getPaletteName(hsl: HSL): string` to
   `src/lib/palette.ts`. `getPaletteName` wraps `matchAesthetic` as-is
   (no change to its threshold/lookup logic) and falls back to the fixed
   string `'Custom Palette'` when `matchAesthetic` returns `null` (no
   archetype within `AESTHETIC_MATCH_THRESHOLD`), so the Palette
   Description panel's name slot is never empty.
2. Added `getPaletteDescription(hsl: HSL): string[]`, returning a fixed
   2-sentence array composed entirely from existing pure lookups -
   `getPaletteName` (sentence 1's subject), `getMoodTags` (sentence 1's
   mood phrase, joined with a new private `joinWithAnd` helper), and
   `getVibeKeywords` (sentence 2's first 3 keywords). No new adjective
   vocabulary was introduced - both sentences only recombine words the
   existing mood/vibe lookups already produce.
3. Both functions are pure and deterministic (same `HSL` in -> same output
   out), verified by dedicated `toBe`/`toEqual` determinism tests mirroring
   the existing `matchAesthetic`/`getHarmonyColors` determinism tests in
   `palette.test.ts`.
4. No UI/component changes - both functions are unwired (no caller yet),
   per the grain's Boundary ("`src/lib` pure-function layer only") and
   Out of scope ("UI rendering, component wiring").
5. Checked copy tone against `$GENOSIS_SPEC_PATH` per the grain's Done
   criterion. This job's own Design Spec folder was empty at start
   (new-project state); a prior job in the same project
   (`XsuSstrcUBbI/design-spec/token-groups/content-copy/base.md`) had
   already established the project's copy-tone convention (English, short
   declarative phrases/adjectives) for this exact module's existing
   copy (`hueMoodWord`, `AESTHETIC_ARCHETYPES`, etc.) - confirmed the new
   fallback name and sentence templates follow that same tone, and
   recorded both as new `content-copy` tokens in this job's own
   `design-spec/token-groups/content-copy/base.md` (audit trail in
   `design-spec/audit/2026-08-26.md`). This supersedes the `getVibeKeywords`
   decision's precedent of keeping word-list copy only in
   `context/decisions/` - `XsuSstrcUBbI` later established `content-copy`
   as a real Token Group, so this grain follows the newer precedent for the
   *tone* record while still keeping the fuller engineering rationale here.

## Why

- Reusing `matchAesthetic`/`getMoodTags`/`getVibeKeywords` outright (rather
  than re-deriving name/mood logic from HSL bands directly) guarantees the
  new panel never contradicts the mood tags / vibe keywords shown
  elsewhere for the same palette - one source of truth per axis.
- A fixed fallback name keeps `getPaletteName` total (always returns a
  usable string) without needing the caller to branch on `null`, which
  matches the "always-present large title" tone the panel's brief calls
  for and avoids duplicating `AestheticMatch`'s existing null-handling
  pattern in a second place.
- Composing sentences from already-vetted adjective banks (rather than
  inventing new copy) keeps the new function's output vocabulary bounded
  and consistent with the rest of the module's existing (assumption -
  needs confirmation) tone, instead of adding a fourth, independent word
  bank.

## Rejected alternatives

- Returning a single description string instead of an array - rejected:
  the card's "설명 목록(Description List)" wording and this grain's
  "description sentences" (plural) both point to a list of >=1 items; an
  array also lets a future UI grain render each sentence as its own list
  item without re-splitting a paragraph.
- Adding a dedicated `getPaletteKeywords` wrapper around `getMoodTags` -
  skipped: `getMoodTags`/`getVibeKeywords` already exist as public
  deterministic functions the grain's Do explicitly says to *reuse*, and
  no additional derivation logic was needed beyond what
  `getPaletteDescription` already does internally for sentence 2; adding a
  no-op wrapper would be scope creep with no behavior of its own.
- Letting `getPaletteName` return `null` (mirroring `matchAesthetic`) and
  pushing the fallback text into the future UI layer - rejected: out of
  scope for that future grain to own a hardcoded copy fallback; keeping the
  fallback here keeps all copy decisions inside the `src/lib` pure-function
  layer this grain's Boundary is scoped to.
