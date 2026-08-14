import type { PaletteColor } from '../lib/palette'
import './PaletteSwatch.css'

export interface PaletteSwatchProps {
  color: PaletteColor
  /** Whether this slot holds the user's brand main color (vs. a derived color). */
  isBrand: boolean
}

/**
 * One color in the generated 5-color palette: a preview swatch plus its HEX
 * code. The swatch fill itself is generated data (not a design token) —
 * only the surrounding chrome (border, spacing, text) is tokenized.
 */
export function PaletteSwatch({ color, isBrand }: PaletteSwatchProps) {
  return (
    <div className="palette-swatch">
      <div
        className="palette-swatch__color"
        style={{ backgroundColor: color.hex }}
        aria-hidden="true"
      />
      <span className="palette-swatch__hex">{color.hex}</span>
      {isBrand && <span className="palette-swatch__badge">브랜드</span>}
    </div>
  )
}
