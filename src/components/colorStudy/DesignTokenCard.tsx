import { getDesignTokens } from './designTokens'
import type { PaletteColor } from '../../lib/palette'
import { CardShell } from './CardShell'
import './DesignTokenCard.css'

export interface DesignTokenCardProps {
  palette: PaletteColor[]
}

/**
 * Color Study card 7: "Design token output" (grain-6). Renders one
 * ready-to-paste `--color-{role}: #hex;` CSS custom property declaration
 * per semantic role, via `getDesignTokens` (./designTokens.ts) - the
 * starter-kit view the design spec calls for "beyond hex code notation",
 * distinct from `SemanticRolesCard` (grain-4)'s plain role/hex list.
 *
 * Same recompute-on-render / empty-palette-guard contract as every other
 * Color Study card (spec M-5).
 */
export function DesignTokenCard({ palette }: DesignTokenCardProps) {
  if (palette.length === 0) return null
  const tokens = getDesignTokens(palette)

  return (
    <CardShell title="Design Tokens" headingId="design-token-card-heading">
      <ul className="design-token-card__list" aria-label="Design token starter kit">
        {tokens.map((token) => (
          <li key={token.name} className="design-token-card__item">
            <span
              className="design-token-card__swatch"
              style={{ backgroundColor: token.value }}
              aria-hidden="true"
            />
            <code className="design-token-card__declaration">{token.declaration}</code>
          </li>
        ))}
      </ul>
    </CardShell>
  )
}
