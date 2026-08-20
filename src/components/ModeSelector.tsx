import { GENERATION_MODES, type GenerationMode } from '../lib/palette'
import './ModeSelector.css'

/** Korean display label for each `GenerationMode`, per spec A. */
const MODE_LABELS: Record<GenerationMode, string> = {
  calm: '차분함',
  bright: '밝음',
  contrast: '대비',
  monotone: '모노톤',
  lightness: '명도',
}

export interface ModeSelectorProps {
  /** Currently selected generation mode. */
  mode: GenerationMode
  /** Called with the newly selected mode when the user clicks a mode button. */
  onChange: (mode: GenerationMode) => void
}

/**
 * Button group for spec A's 5 palette generation modes (차분함/밝음/대비/
 * 모노톤/명도). Purely presentational selection state - the caller
 * (ColorGenerator) owns `mode` and reacts to `onChange` by recomputing the
 * palette via src/lib/palette.ts's mode-aware HSL rules (M-3).
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
