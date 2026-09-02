import { HARMONY_TYPES, getHarmonyColors, type HSL, type HarmonyType } from '../lib/palette'
import './HarmonyExplorer.css'

/** English display label for each `HarmonyType`. */
const HARMONY_LABELS: Record<HarmonyType, string> = {
  complementary: 'Complementary',
  analogous: 'Analogous',
  triadic: 'Triadic',
}

export interface HarmonyExplorerProps {
  /** Base color the harmony accents are derived from (default: brand main color - see ColorStudy). */
  base: HSL
  /** Currently selected harmony type. */
  harmony: HarmonyType
  /** Called with the newly selected harmony type when the user clicks a harmony button. */
  onChange: (harmony: HarmonyType) => void
}

/**
 * Complementary/Analogous/Triadic button group under the Color Study color
 * wheel (grain-2). Purely presentational selection state - mirrors
 * `ModeSelector`'s chip-button shape/tokens (`.harmony-explorer__button`
 * reuses the same spacing/border/color/typography tokens as
 * `.mode-selector__button`; see HarmonyExplorer.css and
 * design-spec/components/color-study/harmony-explorer.md) - the caller
 * (`ColorStudy`) owns `harmony` state and reacts to `onChange`.
 *
 * Below the buttons, the current harmony's accent colors are recomputed
 * deterministically via `getHarmonyColors(base, harmony)` (src/lib/palette.ts)
 * and rendered as read-only swatches. No palette-slot mutation and no
 * randomness - the same `base`/`harmony` pair always renders the same
 * accents.
 *
 * Each button's visible text matches `ModeSelector`'s own
 * Complementary/Analogous/Triadic labels (both name the same harmony
 * theory), so an `aria-label` ("Complementary harmony", etc.) gives this
 * group's buttons a distinct accessible name from ModeSelector's - without
 * it, `getByRole('button', { name: 'Triadic' })` would be ambiguous
 * whenever both button groups are mounted together.
 */
export function HarmonyExplorer({ base, harmony, onChange }: HarmonyExplorerProps) {
  const accents = getHarmonyColors(base, harmony)

  return (
    <div className="harmony-explorer">
      <div className="harmony-explorer__buttons" role="group" aria-label="Select color harmony">
        {HARMONY_TYPES.map((candidate) => (
          <button
            key={candidate}
            type="button"
            className="harmony-explorer__button"
            aria-pressed={candidate === harmony}
            aria-label={`${HARMONY_LABELS[candidate]} harmony`}
            onClick={() => onChange(candidate)}
          >
            {HARMONY_LABELS[candidate]}
          </button>
        ))}
      </div>
      <div
        className="harmony-explorer__accents"
        aria-label={`${HARMONY_LABELS[harmony]} accent colors`}
      >
        {accents.map((color, index) => (
          <div key={`${index}-${color.hex}`} className="harmony-explorer__accent">
            <div
              className="harmony-explorer__swatch"
              style={{ backgroundColor: color.hex }}
              aria-hidden="true"
            />
            <span className="harmony-explorer__hex">{color.hex}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
