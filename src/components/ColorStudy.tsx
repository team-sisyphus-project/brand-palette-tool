import type { PaletteColor } from '../lib/palette'
import { ColorWheel } from './ColorWheel'
import './ColorStudy.css'

export interface ColorStudyProps {
  colors: PaletteColor[]
}

/**
 * grain-1 (Color Study section shell): independent section that houses the
 * color-wheel exploration tools, pulled out of the Palette/MoodTag/
 * AestheticMatch result stack it previously rendered inline with (see
 * ColorGenerator's doc comment history - a bare `<ColorWheel colors={palette}
 * />` used to sit directly after AestheticMatch).
 *
 * This grain only extracts the composition: a labeled `<section>` with its
 * own "Color Study" heading, wrapping the untouched `ColorWheel`, with
 * ColorStudy.css adding a top divider + spacing so it reads as visually
 * distinct from the group above it. `ColorWheel` itself and
 * src/lib/palette.ts are untouched (out of scope for this grain).
 *
 * Harmony-exploration buttons (Complementary/Analogous/Triadic), custom
 * base-color selection, and the Shades visualization are later grains' scope
 * - this component only renders the section header + ColorWheel for now.
 */
export function ColorStudy({ colors }: ColorStudyProps) {
  return (
    <section className="color-study" aria-labelledby="color-study-heading">
      <h2 id="color-study-heading" className="color-study__heading">
        Color Study
      </h2>
      <ColorWheel colors={colors} />
    </section>
  )
}
