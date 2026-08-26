import { getColorRoles } from '../../lib/colorRoles'
import { getBestTextColor } from '../../lib/colorPairing'
import { getChartColorSeries } from '../../lib/chartColors'
import type { PaletteColor } from '../../lib/palette'
import { CardShell } from './CardShell'
import './PresentationPreviewCard.css'

export interface PresentationPreviewCardProps {
  palette: PaletteColor[]
}

/** Number of chart series shown on the mock chart slide - enough to read as a real chart without crowding a masonry tile. */
const CHART_SERIES_COUNT = 4

/** Fixed mock bar heights (%) for the chart slide - decorative sample data, not derived from the palette. */
const CHART_BAR_HEIGHTS = [42, 78, 58, 92]

const SLIDE_TEXT_BY_CONTRAST: Record<'white' | 'black', string> = {
  white: '#ffffff',
  black: '#000000',
}

/**
 * Color Study card 6: "Presentation preview" (grain-5). Three compact slide
 * mocks - title, body, chart - stacked vertically, each rendered with the
 * current palette's semantic roles (`getColorRoles`) the way the design spec
 * describes a real deck picking up the same brand palette.
 *
 * Title slide fills with the `primary` role and picks white/black text via
 * `getBestTextColor` (same lookup `WebsitePreviewCard`'s CTA and
 * `ContrastCheckerCard` already use). Body slide uses `surface` +
 * `border`/`text`. Chart slide reuses `getChartColorSeries`
 * (src/lib/chartColors.ts, grain-3) for its bars - the same
 * guaranteed-distinct series `chartColors.ts`'s own doc comment describes
 * for card 10, applied here as one *use* of that series inside a mock
 * chart rather than card 10's own listing (out of this grain's scope).
 *
 * Whole mock exposed as one `role="img"` (grain-4's established pattern -
 * see `DistributionCard`/`ContrastCheckerCard`), which removes its subtree
 * from the accessibility tree per the `img` role's presentational-children
 * semantics - so the 3 slide-type labels (Title/Body/Chart Slide) are plain
 * visible text rather than a per-slide `aria-label` that AT would never
 * reach anyway.
 *
 * Same recompute-on-render / empty-palette-guard contract as every other
 * Color Study card (spec M-5).
 */
export function PresentationPreviewCard({ palette }: PresentationPreviewCardProps) {
  if (palette.length === 0) return null

  const roles = getColorRoles(palette)
  const byRole = new Map(roles.map((assignment) => [assignment.role, assignment.color]))
  const primary = byRole.get('primary')!
  const surface = byRole.get('surface')!
  const background = byRole.get('background')!
  const text = byRole.get('text')!
  const border = byRole.get('border')!
  const titleTextColor = SLIDE_TEXT_BY_CONTRAST[getBestTextColor(primary)]
  const chartSeries = getChartColorSeries(palette, CHART_SERIES_COUNT)

  return (
    <CardShell title="Presentation Preview" headingId="presentation-preview-card-heading">
      <div
        className="presentation-preview-card__slides"
        role="img"
        aria-label="Presentation slide mockups using the current palette"
      >
        <div
          className="presentation-preview-card__slide"
          style={{ backgroundColor: primary.hex, color: titleTextColor, borderColor: border.hex }}
        >
          <span className="presentation-preview-card__kicker">Title Slide</span>
          <span className="presentation-preview-card__title">Quarterly Brand Review</span>
        </div>

        <div
          className="presentation-preview-card__slide"
          style={{ backgroundColor: surface.hex, color: text.hex, borderColor: border.hex }}
        >
          <span className="presentation-preview-card__kicker">Body Slide</span>
          <ul className="presentation-preview-card__bullets">
            <li>Key takeaway one</li>
            <li>Key takeaway two</li>
            <li>Key takeaway three</li>
          </ul>
        </div>

        <div
          className="presentation-preview-card__slide"
          style={{ backgroundColor: background.hex, color: text.hex, borderColor: border.hex }}
        >
          <span className="presentation-preview-card__kicker">Chart Slide</span>
          <div className="presentation-preview-card__chart">
            {chartSeries.map((color, index) => (
              <span
                key={color.hex}
                className="presentation-preview-card__bar"
                style={{ backgroundColor: color.hex, height: `${CHART_BAR_HEIGHTS[index] ?? 50}%` }}
              />
            ))}
          </div>
        </div>
      </div>
    </CardShell>
  )
}
