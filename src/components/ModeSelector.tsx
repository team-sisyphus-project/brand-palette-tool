import { GENERATION_MODES, type GenerationMode } from '../lib/palette'
import './ModeSelector.css'

/** Korean display label for each `GenerationMode`, per spec A. */
const MODE_LABELS: Record<GenerationMode, string> = {
  complementary: '보색',
  analogous: '유사색',
  triadic: '트라이애딕',
  splitComplementary: '스플릿보색',
  monochromatic: '모노크로매틱',
}

export interface ModeSelectorProps {
  /** Currently selected generation mode. */
  mode: GenerationMode
  /** Called with the newly selected mode when the user clicks a mode button. */
  onChange: (mode: GenerationMode) => void
}

/**
 * Button group for spec A's 5 palette generation modes - the standard
 * color-wheel harmony theories 보색/유사색/트라이애딕/스플릿보색/모노크로매틱.
 * Purely presentational selection state - the caller (ColorGenerator) owns
 * `mode` and reacts to `onChange` by recomputing the palette via
 * src/lib/palette.ts's mode-aware HSL rules (M-3).
 */
export function ModeSelector({ mode, onChange }: ModeSelectorProps) {
  return (
    <div className="mode-selector" role="group" aria-label="생성 모드 선택">
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
