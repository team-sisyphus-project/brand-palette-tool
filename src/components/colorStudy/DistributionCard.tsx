import { getColorDistribution } from '../../lib/colorDistribution'
import type { PaletteColor } from '../../lib/palette'
import { CardShell } from './CardShell'
import './DistributionCard.css'

export interface DistributionCardProps {
  palette: PaletteColor[]
}

/**
 * Color Study card 2: "Recommended color distribution" (grain-4). Renders
 * the fixed 60/30/10 rule (Neutral/Background, Primary/Supporting, Accent)
 * as a single proportional stacked bar plus a legend, via
 * `getColorDistribution` (src/lib/colorDistribution.ts) - each segment's
 * `flexGrow` is set to its own `percentage`, so the 3 segments always sum to
 * a full-width bar without hardcoding pixel widths.
 *
 * Same "no color math here, just render whatever the palette resolves to
 * right now" contract as `SemanticRolesCard` - recomputes every render
 * (spec M-5), and renders nothing for an empty palette instead of letting
 * the underlying `getColorRoles` call throw.
 */
export function DistributionCard({ palette }: DistributionCardProps) {
  if (palette.length === 0) return null
  const segments = getColorDistribution(palette)

  return (
    <CardShell title="Color Distribution" headingId="distribution-card-heading">
      <div
        className="distribution-card__bar"
        role="img"
        aria-label="60/30/10 recommended color distribution"
      >
        {segments.map((segment) => (
          <div
            key={segment.tier}
            className="distribution-card__segment"
            style={{ backgroundColor: segment.color.hex, flexGrow: segment.percentage }}
          />
        ))}
      </div>
      <ul className="distribution-card__legend" aria-label="Distribution legend">
        {segments.map((segment) => (
          <li key={segment.tier} className="distribution-card__item">
            <span
              className="distribution-card__swatch"
              style={{ backgroundColor: segment.color.hex }}
              aria-hidden="true"
            />
            <span className="distribution-card__label">{segment.label}</span>
            <span className="distribution-card__percentage">{segment.percentage}%</span>
          </li>
        ))}
      </ul>
    </CardShell>
  )
}
