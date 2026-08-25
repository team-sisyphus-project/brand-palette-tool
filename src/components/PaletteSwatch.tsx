import type { ChangeEvent, KeyboardEvent, MouseEvent } from 'react'
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
  /**
   * Called when the chip is clicked to set it as Color Study's custom base
   * color (grain-3). Fires on a click anywhere on the chip except the
   * color-picker overlay (see `handlePreviewClick`) - the lock toggle also
   * stops the click from reaching this handler (see `handleLockClick`) so
   * locking a slot never silently changes the Color Study base too.
   */
  onSelectBase: () => void
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
 *
 * grain-3 (custom Color Study base color): the whole chip is also a click
 * target for `onSelectBase` (Extension: Base Color Selection, see
 * design-spec/components/color-study/base-color-selection.md) - clicking
 * this chip anywhere except the color-picker overlay or the lock toggle sets
 * it as Color Study's base color. Both of those two pre-existing, more
 * specific interactions stop the click from bubbling to `onSelectBase` so
 * they keep their own single meaning (open the picker / toggle the lock)
 * instead of also silently reassigning the base color.
 */
export function PaletteSwatch({
  color,
  isBrand,
  isLocked,
  onToggleLock,
  onColorChange,
  onSelectBase,
}: PaletteSwatchProps) {
  const handleColorPickerChange = (event: ChangeEvent<HTMLInputElement>) => {
    onColorChange(event.target.value)
  }

  const handlePreviewClick = (event: MouseEvent<HTMLDivElement>) => {
    event.stopPropagation()
  }

  const handleLockClick = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation()
    onToggleLock()
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'Enter' && event.key !== ' ') return
    event.preventDefault()
    onSelectBase()
  }

  return (
    <div
      className="palette-swatch"
      role="button"
      tabIndex={0}
      aria-label={`Set ${color.hex} as Color Study base color`}
      onClick={onSelectBase}
      onKeyDown={handleKeyDown}
    >
      <div className="palette-swatch__preview" onClick={handlePreviewClick}>
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
          aria-label={`Edit ${color.hex} color directly`}
        />
      </div>
      <button
        type="button"
        className="palette-swatch__lock"
        aria-pressed={isLocked}
        aria-label={`Toggle lock for ${color.hex} color`}
        onClick={handleLockClick}
      >
        {isLocked ? '🔒 Locked' : '🔓 Lock'}
      </button>
      <span className="palette-swatch__hex">{color.hex}</span>
      {isBrand && <span className="palette-swatch__badge">Brand</span>}
    </div>
  )
}
