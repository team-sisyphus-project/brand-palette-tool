import { BRAND_SLOT_INDEX, type Locks, type PaletteColor } from '../lib/palette'
import { PaletteSwatch } from './PaletteSwatch'
import './Palette.css'

export interface PaletteProps {
  colors: PaletteColor[]
  /** Per-slot lock state, indexed the same as `colors`. */
  locks: Locks
  /** Called with the slot index whose lock toggle was clicked. */
  onToggleLock: (index: number) => void
  /** Called with the slot index and new HEX value when a swatch's color picker changes. */
  onColorChange: (index: number, hex: string) => void
}

/** Renders the generated 5-color palette, brand main color first. */
export function Palette({ colors, locks, onToggleLock, onColorChange }: PaletteProps) {
  return (
    <div className="palette" role="list" aria-label="Generated 5-color palette">
      {colors.map((color, index) => (
        <div className="palette__item" role="listitem" key={`${index}-${color.hex}`}>
          <PaletteSwatch
            color={color}
            isBrand={index === BRAND_SLOT_INDEX}
            isLocked={locks[index] ?? false}
            onToggleLock={() => onToggleLock(index)}
            onColorChange={(hex) => onColorChange(index, hex)}
          />
        </div>
      ))}
    </div>
  )
}
