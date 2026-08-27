# Decision: how M-4/M-5 scenario test fixtures were derived and where they were added

**Date:** 2026-08-27
**Grain:** grain-2 — Scenario tests for M-4/M-5 (mood tags / aesthetic name matching)

## What was decided

1. **Extend, don't duplicate, the existing coverage.** grain-1's audit
   (`design-spec/audit/2026-08-27.md`) found `palette.test.ts` and
   `ColorGenerator.test.tsx` already had passing M-4/M-5 tests, but only
   against a single brand hex (`#3366ff`) for M-4 and a single fixture pair
   (`#26d9ac` in / `#1a3300` out) for M-5. This grain adds *additional*
   `describe` blocks/tests rather than rewriting the existing ones, so the
   prior coverage is preserved and this grain's additions are additive and
   easy to attribute:
   - `src/lib/palette.test.ts`: a new
     `describe('M-4/M-5 scenarios: concrete hex fixtures through the full
     generatePalette pipeline', ...)` that drives `generatePalette(hex) ->
     averageHsl -> getMoodTags`/`matchAesthetic` end-to-end (not just
     hand-built HSL objects, which the pre-existing unit tests in the same
     file already covered exhaustively) across 6 brand hexes spread across
     hue/saturation/lightness, plus explicit in-threshold (4 fixtures, 4
     different matched archetypes) and out-of-threshold (2 fixtures)
     scenarios.
   - `src/components/ColorGenerator.test.tsx`: added one more test to the
     existing "mood tag words relocated into the left keyword list" describe
     (mood words appear in the left panel for all 6 diverse brand hexes, not
     just one) and two more tests to the existing "aesthetic name matching
     (M-5)" describe (2 more in-threshold hexes resolving to 2 different
     archetypes, 1 more out-of-threshold hex).
2. **Fixture provenance: throwaway calibration script, not guesswork.**
   Every (hex -> expected mood tags / expected archetype match-or-null) pair
   hard-coded into the new tests was produced by writing a temporary
   `src/lib/scratch.calibration*.test.ts` file that imported the real
   `generatePalette`/`averageHsl`/`getMoodTags`/`matchAesthetic` functions,
   ran them against each candidate hex, and printed the actual results via
   `console.log` under `vitest run`. The candidate hexes were picked to span
   hue (warm/cool/neutral)/saturation/lightness and to land both inside and
   outside `AESTHETIC_MATCH_THRESHOLD`; the printed output was then used
   as-is for the hard-coded expectations. Both scratch files were deleted
   immediately after use - they were never committed and leave no trace in
   the diff (verified via `git status`/`git diff --stat` showing only the
   two `.test.ts` files touched).
3. **UI-level (`ColorGenerator.test.tsx`) fixtures were recalibrated for the
   app's actual default mode.** The first calibration pass computed
   expectations via `generatePalette(hex)` (mode omitted, i.e. the original
   non-mode-aware supporting-color derivation). That produced a failing test
   for `#33cc99`'s mood tags in the UI-level test, because `ColorGenerator`'s
   `mode` state defaults to `GENERATION_MODES[0]` ('complementary'), not the
   mode-less path - the pre-existing test in the same describe block already
   accounted for this (`generatePalette('#3366ff', 'complementary')`). Fixed
   by recalibrating the UI-level fixtures with `generatePalette(hex,
   'complementary')` to match what the component actually renders; the
   library-level pipeline tests in `palette.test.ts` intentionally keep the
   mode-less call (`generatePalette(hex)`, no mode argument) since that
   suite is testing the pipeline's own default behavior, not any particular
   UI wiring.

## Why

- Reusing hand-verified, code-derived fixtures (rather than picking hexes
  and guessing what they'd produce) avoids introducing tests that are
  "accidentally green" against unverified assumptions about the archetype
  centers/threshold - the whole point of a scenario test here is to lock in
  real, checked behavior for both M-4/M-5 threshold branches.
- Keeping the calibration script out of the repo (temporary, deleted before
  finishing) respects the grain's "test files only, no new production logic"
  boundary and the "one change, one purpose" principle - the script itself
  is tooling to derive test data, not a deliverable.

## What was rejected

- **Reusing only the existing `#26d9ac`/`#1a3300` M-5 pair without adding
  more fixtures:** rejected because the grain explicitly asks for scenario
  tests proving *both* threshold branches with fixtures, and a single pair
  each does not demonstrate the behavior holds across more than one
  archetype/region of HSL space.
- **Testing M-4/M-5 only via synthetic HSL objects (as the pre-existing unit
  tests already do exhaustively):** rejected as insufficient for this
  grain's ask specifically because "every generated palette" implies driving
  the real `generatePalette(hex)` entry point, not just the downstream pure
  functions in isolation.
