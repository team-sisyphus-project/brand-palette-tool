/**
 * Color pairing guide (Color Study card 8: "Color pairing guide"). For every
 * semantic role, recommends which other roles it "pairs well with" (per the
 * design spec's "title / background / button / button text" organic
 * relationships) and which of white/black reads best as text on top of it.
 *
 * Pure and deterministic: built on `getColorRoles`, so the same `palette`
 * always yields the same pairings (Color Study spec M-5). The pairing graph
 * below is "(assumption — needs confirmation)", same status as the other
 * fixed lookup tables in this Color Study logic engine.
 */

import { contrastRatio, type RGB } from './contrast'
import { getColorRoles, ROLE_LABELS, type ColorRole } from './colorRoles'
import type { PaletteColor } from './palette'

/**
 * Fixed role -> roles-it-pairs-with graph, covering the title/background/
 * button/button-text relationships the design spec calls out.
 * (assumption — needs confirmation)
 */
const PAIRING_MAP: Record<ColorRole, ColorRole[]> = {
  primary: ['background', 'text', 'accent'],
  secondary: ['background', 'surface'],
  accent: ['background', 'surface'],
  background: ['text', 'primary'],
  surface: ['text', 'border'],
  text: ['background', 'surface'],
  border: ['surface', 'background'],
  success: ['background', 'text'],
  warning: ['background', 'text'],
  error: ['background', 'text'],
}

const WHITE: RGB = { r: 255, g: 255, b: 255 }
const BLACK: RGB = { r: 0, g: 0, b: 0 }

/**
 * Picks whichever of white/black text has the higher WCAG contrast ratio
 * against `color`. Ties (both equal) resolve to white.
 */
export function getBestTextColor(color: PaletteColor): 'white' | 'black' {
  const whiteRatio = contrastRatio(WHITE, color.rgb)
  const blackRatio = contrastRatio(BLACK, color.rgb)
  return blackRatio > whiteRatio ? 'black' : 'white'
}

export interface ColorPairing {
  role: ColorRole
  label: string
  color: PaletteColor
  recommendedTextColor: 'white' | 'black'
  /** Labels (not roles) of the other roles this color pairs well with, per `PAIRING_MAP`. */
  pairsWith: string[]
}

/**
 * Builds the pairing guide for every semantic role in a generated palette.
 * Throws under the same condition `getColorRoles` does (empty palette).
 */
export function getColorPairings(palette: PaletteColor[]): ColorPairing[] {
  const roles = getColorRoles(palette)
  const labelByRole = new Map(roles.map((assignment) => [assignment.role, assignment.label]))

  return roles.map(({ role, label, color }) => ({
    role,
    label,
    color,
    recommendedTextColor: getBestTextColor(color),
    pairsWith: PAIRING_MAP[role].map((pairedRole) => labelByRole.get(pairedRole) ?? ROLE_LABELS[pairedRole]),
  }))
}
