import { useState } from 'react'
import { BRAND_SLOT_INDEX, getHarmonyColors, type HarmonyType, type PaletteColor } from '../lib/palette'
import { ColorWheel } from './ColorWheel'
import { HarmonyExplorer } from './HarmonyExplorer'
import { Shades, type ShadesGroup } from './Shades'
import './ColorStudy.css'

export interface ColorStudyProps {
  colors: PaletteColor[]
  /**
   * Which `colors` slot to use as the base color (grain-3: custom base color
   * selection, set by clicking a Palette chip - see ColorGenerator). Falls
   * back to `BRAND_SLOT_INDEX` when omitted or out of range, matching the
   * pre-grain-3 default behavior.
   */
  baseColorIndex?: number
}

/** English display label for a Shades ramp group, given its position among the current harmony's accents. */
function accentLabel(index: number): string {
  return `Accent ${index + 1}`
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
 *
 * grain-3 (custom base color + Shades): the base color driving both
 * `HarmonyExplorer` and the new `Shades` ramp is no longer hardcoded to the
 * brand slot - it is `colors[baseColorIndex]`, where `baseColorIndex` is
 * owned by `ColorGenerator` and updated whenever a Palette chip is clicked
 * (Extension: Base Color Selection, see
 * design-spec/components/color-study/base-color-selection.md). Below the
 * harmony explorer, a `Shades` panel renders one lightness-step ramp
 * (`generateShades`) per color currently in play: the base color itself,
 * plus every accent color of the selected harmony (Extension: Shades, see
 * design-spec/components/color-study/shades.md).
 */
export function ColorStudy({ colors, baseColorIndex }: ColorStudyProps) {
  const [harmony, setHarmony] = useState<HarmonyType>(DEFAULT_HARMONY)
  const resolvedIndex =
    baseColorIndex !== undefined && colors[baseColorIndex] ? baseColorIndex : BRAND_SLOT_INDEX
  const baseColor = colors[resolvedIndex]

  const shadeGroups: ShadesGroup[] = baseColor
    ? [
        { label: 'Base', color: baseColor },
        ...getHarmonyColors(baseColor.hsl, harmony).map((color, index) => ({
          label: accentLabel(index),
          color,
        })),
      ]
    : []

  return (
    <section className="color-study" aria-labelledby="color-study-heading">
      <h2 id="color-study-heading" className="color-study__heading">
        Color Study
      </h2>
      <ColorWheel colors={colors} />
      {baseColor && (
        <>
          <HarmonyExplorer base={baseColor.hsl} harmony={harmony} onChange={setHarmony} />
          <Shades groups={shadeGroups} />
        </>
      )}
    </section>
  )
}
