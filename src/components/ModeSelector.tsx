import { GENERATION_MODES, type GenerationMode } from '../lib/palette'
import './ModeSelector.css'

/** English display label for each `GenerationMode`, per spec A. */
const MODE_LABELS: Record<GenerationMode, string> = {
  complementary: 'Complementary',
  analogous: 'Analogous',
  triadic: 'Triadic',
  splitComplementary: 'Split Complementary',
  monochromatic: 'Monochromatic',
}

export interface ModeSelectorProps {
  /** Currently selected generation mode. */
  mode: GenerationMode
  /** Called with the newly selected mode when the user clicks a mode button. */
  onChange: (mode: GenerationMode) => void
}

/**
 * Button group for spec A's 5 palette generation modes - the standard
 * color-wheel harmony theories Complementary/Analogous/Triadic/Split
 * Complementary/Monochromatic.
 * Purely presentational selection state - the caller (ColorGenerator) owns
 * `mode` and reacts to `onChange` by recomputing the palette via
 * src/lib/palette.ts's mode-aware HSL rules (M-3).
 */
export function ModeSelector({ mode, onChange }: ModeSelectorProps) {
  return (
    <div className="mode-selector" role="group" aria-label="Select generation mode">
      {GENERATION_MODES.map((candidate) => (
        <button
          key={candidate}
          type="button"
          className="mode-selector__button"
          aria-pressed={candidate === mode}
          onClick={() => onChange(candidate)}
        >
          {MODE_LABELS[candidate]}
        </button>
      ))}
    </div>
  )
}
