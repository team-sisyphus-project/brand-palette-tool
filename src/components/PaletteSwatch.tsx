import type { ChangeEvent } from 'react'
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
  /** Called with the new HEX value when the user picks a color via the native color picker. */
  onColorChange: (hex: string) => void
}

/**
 * One color in the generated 5-color palette: a preview swatch, its HEX
 * code, and a lock toggle. The swatch fill itself is generated data (not a
 * design token) — only the surrounding chrome (border, spacing, text,
 * toggle button) is tokenized.
 *
 * A native `input[type=color]` sits invisibly on top of the preview swatch
 * (Extension: Color Picker, see design-spec/components/palette-swatch). It
 * is the only interaction surface for the picker — visually the colored
 * `.palette-swatch__color` div underneath is what the user sees — so
 * clicking anywhere on the swatch opens the browser's native color picker.
 */
export function PaletteSwatch({
  color,
  isBrand,
  isLocked,
  onToggleLock,
  onColorChange,
}: PaletteSwatchProps) {
  const handleColorPickerChange = (event: ChangeEvent<HTMLInputElement>) => {
    onColorChange(event.target.value)
  }

  return (
    <div className="palette-swatch">
      <div className="palette-swatch__preview">
        <div
          className="palette-swatch__color"
          style={{ backgroundColor: color.hex }}
          aria-hidden="true"
        />
        <input
          type="color"
          className="palette-swatch__color-picker"
          value={color.hex}
          onChange={handleColorPickerChange}
          aria-label={`${color.hex} 색상 직접 수정`}
        />
      </div>
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
