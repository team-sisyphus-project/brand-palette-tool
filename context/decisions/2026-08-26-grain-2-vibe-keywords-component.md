# grain-2: "keyword:" label rendering + integration

## Decision

1. Added a new `VibeKeywords` presentational component
   (`src/components/VibeKeywords.tsx`) that renders a single line: a fixed
   "keyword:" label followed by `props.keywords.join(', ')`. It owns no
   state and computes nothing - it mirrors `MoodTag`'s/`AestheticMatch`'s
   "data in, no internal computation" prop pattern exactly.
2. Mounted it in `ColorGenerator.tsx` directly below `AestheticMatch` (above
   `ColorStudy`), fed by a new `vibeKeywords` memo
   (`getVibeKeywords(averageHsl(palette))`) that recomputes on every
   `palette` change, the same dependency `moodTags`/`aestheticMatch` already
   use - so it updates on regenerate, mode switch, lock, and manual color
   edits for free.
3. Styled `VibeKeywords.css` by reusing the exact rounded typography tokens
   `MoodTag.css`/`AestheticMatch.css` already use (`--font-rounded`,
   `--text-rounded-md`, `--weight-rounded-medium`, `--leading-rounded`,
   `--tracking-rounded`) plus the already-registered `--color-text-primary`/
   `--color-text-secondary` (design-spec `token-groups/color/base.md`) - no
   pill/background container, since the spec calls for one flowing sentence
   line, not discrete tag chips.
4. Per the grain's Done criteria, checked `design-spec/token-groups/
   typography/base.md` before styling: the rounded family was a pre-existing
   Orphan (used by `MoodTag.css`/`AestheticMatch.css` but never registered,
   folded into `index.md`'s broad "src/index.css" Orphan row). Since this
   grain's new component now also references those exact values, the values
   came into scope - registered the 5 rounded tokens into `typography/
   base.md` (values unchanged, just documented) rather than leaving a
   newly-in-scope Orphan unresolved. Also registered `VibeKeywords` itself
   as a new Design Spec Component (`components/vibe-keywords/base.md`) and
   updated `index.md`'s Components table / Token Group index accordingly.
   `MoodTag`/`AestheticMatch` remain unregistered Components (still Orphan,
   `index.md`'s "src/components/" row) - registering *those* is out of this
   grain's Boundary ("no changing MoodTag/AestheticMatch rendering").

## Why

- Reusing the identical rounded typography tokens as `MoodTag`/
  `AestheticMatch` keeps the three result-panel text elements visually
  consistent as one family, per the grain's explicit instruction to check
  those tokens for reuse.
- Registering the 5 rounded tokens (rather than leaving them as a
  now-doubly-referenced Orphan) follows `policy/audit.md`'s Orphan-in-scope
  rule literally: an Orphan touched by new code must be resolved, not
  perpetuated.
- Formally registering `VibeKeywords` as a Component (rather than leaving it
  as a bare Orphan like `MoodTag`/`AestheticMatch`) follows the standard
  `policy/recording.md` "new Component" procedure for code newly written in
  this grain - the Orphan shortcut only applies to *pre-existing* code found
  during an audit, not to a component this grain is authoring from scratch.

## Rejected alternatives

- A pill/chip visual treatment matching `MoodTag`'s `<ul>`/`<li>` markup -
  rejected: the spec explicitly calls for one continuous comma-joined
  sentence line ("keyword:" + 5+ words on one line), not discrete tags; a
  list of chips would visually fragment what should read as one phrase.
- Leaving the rounded typography tokens as an unresolved Orphan and just
  citing `MoodTag.css`/`AestheticMatch.css` in a code comment - rejected:
  the grain's Done criteria explicitly asks to check tokens for reuse *and*
  record the decision in the Design Spec; once `VibeKeywords` depends on
  those exact values, they are in this grain's scope, and `policy/audit.md`
  requires in-scope Orphans to be resolved, not just noted.
