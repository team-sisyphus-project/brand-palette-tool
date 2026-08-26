import { useRef, useState, type ChangeEvent, type KeyboardEvent, type MouseEvent } from 'react'
import { hexToRgb, type PaletteColor } from '../lib/palette'
import './PaletteSwatch.css'

/** Shown under the hex trigger when a committed edit fails `hexToRgb` validation (grain-3). */
const INVALID_HEX_MESSAGE = 'Enter a valid hex color, e.g. #3366ff.'

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
 *
 * grain-2 (rounder squares + hover-only lock overlay): the lock toggle now
 * lives inside `.palette-swatch__preview`, layered on top of the invisible
 * color-picker input (later in DOM order so it still receives the click in
 * its own corner - see PaletteSwatch.css) instead of as an always-visible
 * row below the swatch. It is hidden by `opacity: 0` until the preview is
 * hovered or the button itself receives keyboard focus (`:focus-visible`),
 * per design-spec/token-groups/radius/base.md. `onToggleLock`'s contract
 * (and its own `stopPropagation` so it never also fires `onSelectBase`) is
 * unchanged - only where the button sits in the markup moved.
 *
 * grain-3 (inline hex click-to-edit): the HEX label below the swatch is now a
 * button (`isEditingHex === false`) that swaps to a text input on click. The
 * button and the input both `stopPropagation` on click/keydown so neither
 * starting nor performing the edit ever also fires `onSelectBase` - the same
 * "more specific interaction wins" rule the lock toggle and color-picker
 * already follow (see the class doc comment above). Committing (Enter or
 * blur) reuses `hexToRgb` from src/lib/palette.ts - the same module
 * `ColorGenerator.handleSlotColorChange`/`updateSlotColor` validate with -
 * so "is this a valid hex" is judged identically here and there. A valid
 * commit calls `onColorChange` (the existing color-picker path) and closes
 * the input; an invalid commit never calls `onColorChange`, reverts the
 * displayed value to `color.hex`, and shows an inline error. Escape cancels
 * without calling `onColorChange` and without an error. `skipNextBlurRef`
 * exists because committing/cancelling via keyboard swaps the input back out
 * for the button in the same tick - if the input was focused, the DOM
 * removal fires a native blur, which would otherwise re-run
 * `commitHexEdit` a second time with a stale draft.
 */
export function PaletteSwatch({
  color,
  isBrand,
  isLocked,
  onToggleLock,
  onColorChange,
  onSelectBase,
}: PaletteSwatchProps) {
  const [isEditingHex, setIsEditingHex] = useState(false)
  const [hexDraft, setHexDraft] = useState(color.hex)
  const [hexError, setHexError] = useState<string | null>(null)
  const skipNextBlurRef = useRef(false)

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

  const startEditingHex = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation()
    setHexDraft(color.hex)
    setHexError(null)
    setIsEditingHex(true)
  }

  const handleHexTriggerKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    // Enter/Space on this button also bubbles as a keydown (separately from
    // the click it synthesizes) - stop it here so the card's own
    // Enter/Space handler above never also fires onSelectBase.
    event.stopPropagation()
  }

  const commitHexEdit = () => {
    if (hexToRgb(hexDraft)) {
      onColorChange(hexDraft)
      setHexError(null)
    } else {
      setHexError(INVALID_HEX_MESSAGE)
      setHexDraft(color.hex)
    }
    setIsEditingHex(false)
  }

  const cancelHexEdit = () => {
    setHexDraft(color.hex)
    setHexError(null)
    setIsEditingHex(false)
  }

  const handleHexInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    setHexDraft(event.target.value)
  }

  const handleHexInputKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    event.stopPropagation()
    if (event.key === 'Enter') {
      event.preventDefault()
      skipNextBlurRef.current = true
      commitHexEdit()
    } else if (event.key === 'Escape') {
      event.preventDefault()
      skipNextBlurRef.current = true
      cancelHexEdit()
    }
  }

  const handleHexInputBlur = () => {
    if (skipNextBlurRef.current) {
      skipNextBlurRef.current = false
      return
    }
    commitHexEdit()
  }

  const handleHexInputClick = (event: MouseEvent<HTMLInputElement>) => {
    event.stopPropagation()
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
        <button
          type="button"
          className="palette-swatch__lock"
          aria-pressed={isLocked}
          aria-label={`Toggle lock for ${color.hex} color`}
          onClick={handleLockClick}
        >
          {isLocked ? '🔒' : '🔓'}
        </button>
      </div>
      {isEditingHex ? (
        <input
          type="text"
          className="palette-swatch__hex-input"
          value={hexDraft}
          aria-label={`Edit ${color.hex} hex code`}
          aria-invalid={Boolean(hexError)}
          autoFocus
          autoComplete="off"
          spellCheck={false}
          onChange={handleHexInputChange}
          onKeyDown={handleHexInputKeyDown}
          onBlur={handleHexInputBlur}
          onClick={handleHexInputClick}
        />
      ) : (
        <button
          type="button"
          className="palette-swatch__hex"
          aria-label={`Edit ${color.hex} hex code`}
          onClick={startEditingHex}
          onKeyDown={handleHexTriggerKeyDown}
        >
          {color.hex}
        </button>
      )}
      {hexError && (
        <span className="palette-swatch__hex-error" role="alert">
          {hexError}
        </span>
      )}
      {isBrand && <span className="palette-swatch__badge">Brand</span>}
    </div>
  )
}
