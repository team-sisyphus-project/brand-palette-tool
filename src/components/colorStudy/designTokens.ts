/**
 * Design token output (Color Study card 7: "Design token output"). Beyond
 * plain hex codes, maps every semantic role from `getColorRoles`
 * (src/lib/colorRoles.ts, grain-3) onto a ready-to-paste CSS custom
 * property name, so the card can render a small starter kit instead of a
 * second hex-only list (`SemanticRolesCard`, grain-4, already covers that).
 *
 * Naming follows this codebase's own convention for single-value color
 * tokens - `--color-{role}` - the same shape as the real tokens already
 * declared in src/index.css (`--color-accent`, `--color-border-focus`,
 * `--color-action-bg`, etc.), rather than inventing a numeric-scale
 * convention (e.g. `brand-primary-500`) this project doesn't otherwise use.
 * See this grain's decision record for why.
 *
 * Pure and deterministic: built on `getColorRoles`, so the same `palette`
 * always yields the same tokens (Color Study spec M-5).
 */

import { getColorRoles } from '../../lib/colorRoles'
import type { PaletteColor } from '../../lib/palette'

export interface DesignToken {
  /** Bare token name, e.g. `color-primary`. */
  name: string
  /** CSS custom property name, e.g. `--color-primary`. */
  cssVariable: string
  /** Ready-to-paste `--token: value;` declaration. */
  declaration: string
  /** Hex value the token resolves to. */
  value: string
}

/**
 * Builds one `--color-{role}` design token per semantic role in a generated
 * palette, in the same fixed order `getColorRoles` returns. Throws under
 * the same condition `getColorRoles` does (empty palette).
 */
export function getDesignTokens(palette: PaletteColor[]): DesignToken[] {
  return getColorRoles(palette).map(({ role, color }) => {
    const name = `color-${role}`
    const cssVariable = `--${name}`
    return {
      name,
      cssVariable,
      declaration: `${cssVariable}: ${color.hex};`,
      value: color.hex,
    }
  })
}
