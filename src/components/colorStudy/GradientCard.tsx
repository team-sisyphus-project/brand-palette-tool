import { getGradientSuggestions } from '../../lib/colorGradients'
import type { PaletteColor } from '../../lib/palette'
import { CardShell } from './CardShell'
import './GradientCard.css'

export interface GradientCardProps {
  palette: PaletteColor[]
}

/**
 * Color Study card 9: "Gradient suggestions" (grain-6). Renders the fixed
 * set of role-pair gradients from `getGradientSuggestions`
 * (src/lib/colorGradients.ts, grain-3) as live gradient swatches, each
 * labeled with its role pair and ready-to-paste `linear-gradient(...)` CSS.
 *
 * Same recompute-on-render / empty-palette-guard contract as every other
 * Color Study card (spec M-5).
 */
export function GradientCard({ palette }: GradientCardProps) {
  if (palette.length === 0) return null
  const gradients = getGradientSuggestions(palette)

  return (
    <CardShell title="Gradient Suggestions" headingId="gradient-card-heading">
      <ul className="gradient-card__list" aria-label="Gradient suggestions">
        {gradients.map((gradient) => (
          <li key={gradient.label} className="gradient-card__item">
            <span
              className="gradient-card__swatch"
              style={{ backgroundImage: gradient.css }}
              aria-hidden="true"
            />
            <div className="gradient-card__details">
              <span className="gradient-card__label">{gradient.label}</span>
              <code className="gradient-card__css">{gradient.css}</code>
            </div>
          </li>
        ))}
      </ul>
    </CardShell>
  )
}
