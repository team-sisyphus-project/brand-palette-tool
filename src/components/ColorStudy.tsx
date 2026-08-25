import { useState } from 'react'
import { BRAND_SLOT_INDEX, type HarmonyType, type PaletteColor } from '../lib/palette'
import { ColorWheel } from './ColorWheel'
import { HarmonyExplorer } from './HarmonyExplorer'
import './ColorStudy.css'

export interface ColorStudyProps {
  colors: PaletteColor[]
}

/** Harmony type shown before the user clicks a harmony button. */
const DEFAULT_HARMONY: HarmonyType = 'complementary'

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
 * grain-2 (harmony explorer buttons): under the color wheel, a
 * `HarmonyExplorer` button group (Complementary/Analogous/Triadic) lets the
 * user step through the 3 standard harmony types. The base color it derives
 * accents from defaults to the palette's brand main color
 * (`colors[BRAND_SLOT_INDEX]`) - custom base-color selection (picking a
 * different chip as the base) and the Shades visualization are later grains'
 * scope; this grain only owns the harmony toggle state and recomputes the
 * selected harmony's accent colors deterministically via
 * `getHarmonyColors` (src/lib/palette.ts). The main 5-color palette and
 * ModeSelector are untouched - `HarmonyExplorer` never mutates `colors`.
 */
export function ColorStudy({ colors }: ColorStudyProps) {
  const [harmony, setHarmony] = useState<HarmonyType>(DEFAULT_HARMONY)
  const baseColor = colors[BRAND_SLOT_INDEX]

  return (
    <section className="color-study" aria-labelledby="color-study-heading">
      <h2 id="color-study-heading" className="color-study__heading">
        Color Study
      </h2>
      <ColorWheel colors={colors} />
      {baseColor && (
        <HarmonyExplorer base={baseColor.hsl} harmony={harmony} onChange={setHarmony} />
      )}
    </section>
  )
}
