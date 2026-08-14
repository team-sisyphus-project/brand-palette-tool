import type { PaletteColor } from '../lib/palette'
import './PaletteSwatch.css'

export interface PaletteSwatchProps {
  color: PaletteColor
  /** Whether this slot holds the user's brand main color (vs. a derived color). */
  isBrand: boolean
  /** Whether this slot is locked (survives regeneration unchanged). */
  isLocked: boolean
  /** Called when the user toggles this slot's lock state. */
  onToggleLock: () => void
}

/**
 * One color in the generated 5-color palette: a preview swatch, its HEX
 * code, and a lock toggle. The swatch fill itself is generated data (not a
 * design token) — only the surrounding chrome (border, spacing, text,
 * toggle button) is tokenized.
 */
export function PaletteSwatch({ color, isBrand, isLocked, onToggleLock }: PaletteSwatchProps) {
  return (
    <div className="palette-swatch">
      <div
        className="palette-swatch__color"
        style={{ backgroundColor: color.hex }}
        aria-hidden="true"
      />
      <button
        type="button"
        className="palette-swatch__lock"
        aria-pressed={isLocked}
        aria-label={`${color.hex} 색상 잠금 토글`}
        onClick={onToggleLock}
      >
        {isLocked ? '🔒 잠김' : '🔓 잠금'}
      </button>
      <span className="palette-swatch__hex">{color.hex}</span>
      {isBrand && <span className="palette-swatch__badge">브랜드</span>}
    </div>
  )
}
