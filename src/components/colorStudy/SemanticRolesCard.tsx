import { getColorRoles } from '../../lib/colorRoles'
import type { PaletteColor } from '../../lib/palette'
import { CardShell } from './CardShell'
import './SemanticRolesCard.css'

export interface SemanticRolesCardProps {
  palette: PaletteColor[]
}

/**
 * Color Study card 1: "Color roles / semantic mapping" (grain-4). Renders
 * the 10 fixed semantic UI roles (Primary/Secondary/Accent/.../Error) this
 * palette maps onto, via `getColorRoles` (src/lib/colorRoles.ts) - the card
 * owns no state and no color math of its own, it only recomputes and
 * renders whatever that pure function returns for the current `palette`
 * prop (spec M-5: recomputes on every palette change since it's derived
 * directly from a render-time prop, no memoized/stale copy).
 *
 * `palette.length === 0` renders nothing rather than letting
 * `getColorRoles` throw - the same "no base color yet" guard `ColorStudy`
 * already applies to its own conditionally-rendered tiles.
 */
export function SemanticRolesCard({ palette }: SemanticRolesCardProps) {
  if (palette.length === 0) return null
  const roles = getColorRoles(palette)

  return (
    <CardShell title="Color Roles" headingId="semantic-roles-card-heading">
      <ul className="semantic-roles-card__list" aria-label="Semantic role mapping">
        {roles.map((assignment) => (
          <li key={assignment.role} className="semantic-roles-card__item">
            <span
              className="semantic-roles-card__swatch"
              style={{ backgroundColor: assignment.color.hex }}
              aria-hidden="true"
            />
            <span className="semantic-roles-card__label">{assignment.label}</span>
            <span className="semantic-roles-card__hex">{assignment.color.hex}</span>
          </li>
        ))}
      </ul>
    </CardShell>
  )
}
