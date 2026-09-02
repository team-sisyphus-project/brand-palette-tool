import { getChartColorSeries } from '../../lib/chartColors'
import type { PaletteColor } from '../../lib/palette'
import { CardShell } from './CardShell'
import './ChartColorsCard.css'

export interface ChartColorsCardProps {
  palette: PaletteColor[]
}

/** Number of chart series listed - enough to read as a real chart legend without crowding a masonry tile. */
const SERIES_COUNT = 6

/**
 * Color Study card 10: "Chart / data visualization colors" (grain-6).
 * Lists the evenly-hue-spaced, guaranteed-distinct series from
 * `getChartColorSeries` (src/lib/chartColors.ts, grain-3) as a "Series N"
 * swatch + hex legend, in series order.
 *
 * Same recompute-on-render / empty-palette-guard contract as every other
 * Color Study card (spec M-5).
 */
export function ChartColorsCard({ palette }: ChartColorsCardProps) {
  if (palette.length === 0) return null
  const series = getChartColorSeries(palette, SERIES_COUNT)

  return (
    <CardShell title="Chart Colors" headingId="chart-colors-card-heading">
      <ul className="chart-colors-card__list" aria-label="Chart color series">
        {series.map((color, index) => (
          <li key={color.hex} className="chart-colors-card__item">
            <span className="chart-colors-card__swatch" style={{ backgroundColor: color.hex }} aria-hidden="true" />
            <span className="chart-colors-card__label">Series {index + 1}</span>
            <span className="chart-colors-card__hex">{color.hex}</span>
          </li>
        ))}
      </ul>
    </CardShell>
  )
}
