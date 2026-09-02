import { getColorPairings } from '../../lib/colorPairing'
import type { PaletteColor } from '../../lib/palette'
import { CardShell } from './CardShell'
import './PairingGuideCard.css'

export interface PairingGuideCardProps {
  palette: PaletteColor[]
}

/**
 * Color Study card 8: "Color pairing guide" (grain-6). Renders, per
 * semantic role, its swatch, recommended text color (white/black), and the
 * "Pairs well with -> ..." role labels from `getColorPairings`
 * (src/lib/colorPairing.ts, grain-3).
 *
 * Same recompute-on-render / empty-palette-guard contract as every other
 * Color Study card (spec M-5).
 */
export function PairingGuideCard({ palette }: PairingGuideCardProps) {
  if (palette.length === 0) return null
  const pairings = getColorPairings(palette)

  return (
    <CardShell title="Pairing Guide" headingId="pairing-guide-card-heading">
      <ul className="pairing-guide-card__list" aria-label="Color pairing guide">
        {pairings.map((pairing) => (
          <li key={pairing.role} className="pairing-guide-card__item">
            <span
              className="pairing-guide-card__swatch"
              style={{ backgroundColor: pairing.color.hex, color: pairing.recommendedTextColor }}
              aria-hidden="true"
            >
              Aa
            </span>
            <div className="pairing-guide-card__details">
              <span className="pairing-guide-card__label">{pairing.label}</span>
              <span className="pairing-guide-card__pairs">Pairs well with → {pairing.pairsWith.join(', ')}</span>
            </div>
          </li>
        ))}
      </ul>
    </CardShell>
  )
}
