import { useState } from 'react'
import { BRAND_SLOT_INDEX, getHarmonyColors, type HarmonyType, type PaletteColor } from '../lib/palette'
import { ChartColorsCard } from './colorStudy/ChartColorsCard'
import { ContrastCheckerCard } from './colorStudy/ContrastCheckerCard'
import { DesignTokenCard } from './colorStudy/DesignTokenCard'
import { DistributionCard } from './colorStudy/DistributionCard'
import { GradientCard } from './colorStudy/GradientCard'
import { PairingGuideCard } from './colorStudy/PairingGuideCard'
import { PresentationPreviewCard } from './colorStudy/PresentationPreviewCard'
import { SemanticRolesCard } from './colorStudy/SemanticRolesCard'
import { UsageGuideCard } from './colorStudy/UsageGuideCard'
import { WebsitePreviewCard } from './colorStudy/WebsitePreviewCard'
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
 *
 * grain-2 (full-width masonry layout shell): this section is no longer
 * mounted inside ColorGenerator's `panel-preview` column - it now renders as
 * an independent, full-width sibling of the `panel-generator`/`panel-preview`
 * pair (see ColorGenerator.tsx), so its width is no longer capped by the
 * preview column (`flex: 6; min-width: 480px`). Internally, `ColorWheel`,
 * `HarmonyExplorer`, and `Shades` are each wrapped in a `.color-study__tile`
 * card (rounded corners + subtle border, `--radius-card`/
 * `--color-border-default`) and laid out through `.color-study__grid`, a
 * CSS-multi-column ("masonry") container that reflows to 4 columns on
 * desktop, 2 at <=1024px, and 1 at <=768px (see ColorStudy.css). CSS columns
 * were chosen over CSS Grid because these tiles vary in height and columns
 * fill top-to-bottom without needing a manually-computed `grid-row: span N`
 * per tile - see context/decisions/. This grain only builds the shell and
 * wraps the 3 pre-existing widgets; the 10 analysis cards the full spec
 * calls for are later grains' scope.
 *
 * grain-7 (integration & polish): the 10 analysis cards built in grains 4-6
 * (SemanticRolesCard/DistributionCard/ContrastCheckerCard/UsageGuideCard/
 * WebsitePreviewCard/PresentationPreviewCard/DesignTokenCard/
 * PairingGuideCard/GradientCard/ChartColorsCard) are now mounted as direct
 * children of `.color-study__grid`, each fed `palette={colors}` so every
 * card recomputes from the same live palette prop the wheel/harmony/shades
 * tiles already react to (M-5: no local snapshotting, no memoization -
 * a palette/lock change flows straight through on the next render). They
 * are *not* additionally wrapped in `.color-study__tile` - each card's own
 * `CardShell` already renders the identical rounded-border tile shell
 * (`--radius-card` / `--color-border-default` / `--color-bg-surface`), so a
 * second wrapper would double the border/background per card. The one gap
 * CardShell's shell was missing for masonry stacking (`margin-bottom`
 * between cards stacked in the same CSS column) is fixed in
 * `colorStudy/CardShell.css`, not here - see context/decisions/.
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
      <div className="color-study__grid">
        <div className="color-study__tile">
          <ColorWheel colors={colors} />
        </div>
        {baseColor && (
          <>
            <div className="color-study__tile">
              <HarmonyExplorer base={baseColor.hsl} harmony={harmony} onChange={setHarmony} />
            </div>
            <div className="color-study__tile">
              <Shades groups={shadeGroups} />
            </div>
          </>
        )}
        <SemanticRolesCard palette={colors} />
        <DistributionCard palette={colors} />
        <ContrastCheckerCard palette={colors} />
        <UsageGuideCard palette={colors} />
        <WebsitePreviewCard palette={colors} />
        <PresentationPreviewCard palette={colors} />
        <DesignTokenCard palette={colors} />
        <PairingGuideCard palette={colors} />
        <GradientCard palette={colors} />
        <ChartColorsCard palette={colors} />
      </div>
    </section>
  )
}
