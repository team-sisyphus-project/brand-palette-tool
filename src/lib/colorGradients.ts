/**
 * Gradient suggestions (Color Study card 9: "Gradient suggestions"). Derives
 * a fixed set of ready-to-use gradient pairs from a generated palette's
 * semantic roles, per the design spec's own examples (Primary -> Accent,
 * Primary 70 -> Primary 30 [here: Primary -> Secondary], Accent -> Neutral
 * [here: Accent -> Background]).
 *
 * Pure and deterministic: built on `getColorRoles`, so the same `palette`
 * always yields the same gradients (Color Study spec M-5). The specific
 * role-pair list below is "(assumption — needs confirmation)".
 */

import { getColorRoles, type ColorRole } from './colorRoles'
import type { PaletteColor } from './palette'

/** CSS gradient angle used for every suggestion's `css` output. (assumption — needs confirmation) */
const GRADIENT_ANGLE_DEG = 135

/** Fixed set of role-pairs the gradient card suggests. (assumption — needs confirmation) */
const GRADIENT_DEFS: Array<{ label: string; from: ColorRole; to: ColorRole }> = [
  { label: 'Primary → Accent', from: 'primary', to: 'accent' },
  { label: 'Primary → Secondary', from: 'primary', to: 'secondary' },
  { label: 'Accent → Background', from: 'accent', to: 'background' },
  { label: 'Secondary → Accent', from: 'secondary', to: 'accent' },
]

export interface GradientSuggestion {
  label: string
  from: PaletteColor
  to: PaletteColor
  /** Ready-to-use `linear-gradient(...)` CSS value. */
  css: string
}

/**
 * Builds the fixed set of gradient suggestions for a generated palette.
 * Throws under the same condition `getColorRoles` does (empty palette).
 */
export function getGradientSuggestions(palette: PaletteColor[]): GradientSuggestion[] {
  const roles = getColorRoles(palette)
  const colorByRole = new Map(roles.map((assignment) => [assignment.role, assignment.color]))

  return GRADIENT_DEFS.map(({ label, from, to }) => {
    const fromColor = colorByRole.get(from) as PaletteColor
    const toColor = colorByRole.get(to) as PaletteColor
    return {
      label,
      from: fromColor,
      to: toColor,
      css: `linear-gradient(${GRADIENT_ANGLE_DEG}deg, ${fromColor.hex}, ${toColor.hex})`,
    }
  })
}
