import { getUsageGuide } from '../../lib/colorUsageGuide'
import type { PaletteColor } from '../../lib/palette'
import { CardShell } from './CardShell'
import './UsageGuideCard.css'

export interface UsageGuideCardProps {
  palette: PaletteColor[]
}

/**
 * Color Study card 4: "Usage recommendations" (grain-4). Renders, per
 * semantic role, the "{Role} {HueName}" title and "best for X. Avoid Y."
 * guidance sentence from `getUsageGuide` (src/lib/colorUsageGuide.ts) - one
 * row per role, swatch first so the color the guidance is describing is
 * always visible next to its text.
 *
 * Same recompute-on-render / empty-palette-guard contract as the other
 * cards in this grain (spec M-5).
 */
export function UsageGuideCard({ palette }: UsageGuideCardProps) {
  if (palette.length === 0) return null
  const entries = getUsageGuide(palette)

  return (
    <CardShell title="Usage Guide" headingId="usage-guide-card-heading">
      <ul className="usage-guide-card__list" aria-label="Color usage guide">
        {entries.map((entry) => (
          <li key={entry.role} className="usage-guide-card__item">
            <span
              className="usage-guide-card__swatch"
              style={{ backgroundColor: entry.color.hex }}
              aria-hidden="true"
            />
            <div className="usage-guide-card__text">
              <span className="usage-guide-card__title">{entry.title}</span>
              <p className="usage-guide-card__guidance">{entry.guidance}</p>
            </div>
          </li>
        ))}
      </ul>
    </CardShell>
  )
}
