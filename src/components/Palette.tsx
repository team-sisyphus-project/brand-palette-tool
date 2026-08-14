import { BRAND_SLOT_INDEX, type PaletteColor } from '../lib/palette'
import { PaletteSwatch } from './PaletteSwatch'
import './Palette.css'

export interface PaletteProps {
  colors: PaletteColor[]
}

/** Renders the generated 5-color palette, brand main color first. */
export function Palette({ colors }: PaletteProps) {
  return (
    <div className="palette" role="list" aria-label="생성된 5색 팔레트">
      {colors.map((color, index) => (
        <div className="palette__item" role="listitem" key={`${index}-${color.hex}`}>
          <PaletteSwatch color={color} isBrand={index === BRAND_SLOT_INDEX} />
        </div>
      ))}
    </div>
  )
}
