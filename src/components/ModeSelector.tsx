import { GENERATION_MODES, type GenerationMode } from '../lib/palette'
import './ModeSelector.css'

/** English display label for each `GenerationMode`. */
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
 * grain-1 (restore): 5-button generation-mode selector, rendered in the
 * post-generate left panel above `PaletteDescription` (see
 * ColorGenerator.tsx). Purely presentational selection state - the caller
 * (`ColorGenerator`) owns `mode` and reacts to `onChange` by regenerating
 * only the unlocked/derived palette slots via `src/lib/palette.ts`'s
 * `generatePalette` (brand + locked slots are merged back in untouched, see
 * ColorGenerator's `handleSelectMode`).
 *
 * Deliberately reuses `HarmonyExplorer`'s grayscale "chip-button" token set
 * 1:1 (`.mode-selector__button` mirrors `.harmony-explorer__button`) rather
 * than introducing a new pressed-state token: `src/lib/accentBoundary.test.ts`
 * asserts no UI chrome CSS consumes the system accent tokens
 * (`--color-accent`/`--color-action-bg-strong`), so the selected chip's
 * pressed state uses the neutral `--color-action-bg` token, same as
 * `HarmonyExplorer`'s own pressed state - see ModeSelector.css.
 */
export function ModeSelector({ mode, onChange }: ModeSelectorProps) {
  return (
    <div className="mode-selector">
      <div className="mode-selector__buttons" role="group" aria-label="Select generation mode">
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
    </div>
  )
}
