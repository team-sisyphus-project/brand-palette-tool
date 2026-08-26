/**
 * Semantic role mapping (Color Study card 1: "Color roles / semantic
 * mapping"). Maps a generated 5-color palette onto the 10 UI roles a design
 * system actually consumes - Primary, Secondary, Accent, Background,
 * Surface, Text, Border, Success, Warning, Error - so the result can be
 * pasted straight into a design system without the user doing the mapping
 * by hand.
 *
 * Pure, framework-free, deterministic: the same `palette` input always
 * produces the same 10 role assignments (Color Study spec M-5, "reactive
 * recomputation").
 *
 * Primary/Secondary/Accent reuse the palette's own generated colors (slots
 * 0-2) so the mapping stays tied to the brand color the user actually
 * generated. Background/Surface/Text/Border are derived from the primary
 * color's hue at fixed, near-neutral saturation/lightness - a "branded
 * neutral" convention common in design systems - rather than being flat
 * gray, so the whole role set reads as one coherent brand system.
 * Success/Warning/Error are deliberately *not* derived from the brand hue:
 * status colors are conventionally fixed (green/amber/red) so they stay
 * instantly recognizable regardless of brand color. Every fixed HSL constant
 * below is "(assumption — needs confirmation)", same status as the
 * unconfirmed thresholds in src/lib/palette.ts.
 */

import { hslToRgb, rgbToHex, type HSL, type PaletteColor } from './palette'

export type ColorRole =
  | 'primary'
  | 'secondary'
  | 'accent'
  | 'background'
  | 'surface'
  | 'text'
  | 'border'
  | 'success'
  | 'warning'
  | 'error'

/** Display order + label for every role, matching the design spec's card 1 list. */
export const ROLE_ORDER: ColorRole[] = [
  'primary',
  'secondary',
  'accent',
  'background',
  'surface',
  'text',
  'border',
  'success',
  'warning',
  'error',
]

export const ROLE_LABELS: Record<ColorRole, string> = {
  primary: 'Primary',
  secondary: 'Secondary',
  accent: 'Accent',
  background: 'Background',
  surface: 'Surface',
  text: 'Text',
  border: 'Border',
  success: 'Success',
  warning: 'Warning',
  error: 'Error',
}

export interface RoleAssignment {
  role: ColorRole
  label: string
  color: PaletteColor
}

function normalizeHue(h: number): number {
  const wrapped = h % 360
  return wrapped < 0 ? wrapped + 360 : wrapped
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

/** Builds a `PaletteColor` from raw HSL, clamping s/l and normalizing hue. */
function toPaletteColor(hsl: HSL): PaletteColor {
  const normalized: HSL = { h: normalizeHue(hsl.h), s: clamp(hsl.s, 0, 100), l: clamp(hsl.l, 0, 100) }
  const rgb = hslToRgb(normalized)
  return { hex: rgbToHex(rgb), rgb, hsl: normalized }
}

// Branded-neutral offsets applied to the primary color's own hue.
// (assumption — needs confirmation)
const BACKGROUND_SL = { s: 6, l: 96 } // (assumption — needs confirmation)
const SURFACE_SL = { s: 6, l: 99 } // (assumption — needs confirmation)
const TEXT_SL = { s: 12, l: 14 } // (assumption — needs confirmation)
const BORDER_SL = { s: 10, l: 82 } // (assumption — needs confirmation)

// Fixed, brand-independent status hues (green/amber/red).
// (assumption — needs confirmation)
const SUCCESS_HSL: HSL = { h: 142, s: 64, l: 42 } // (assumption — needs confirmation)
const WARNING_HSL: HSL = { h: 38, s: 92, l: 50 } // (assumption — needs confirmation)
const ERROR_HSL: HSL = { h: 4, s: 74, l: 50 } // (assumption — needs confirmation)

/**
 * Picks a palette slot by index, falling back to the first slot (the brand
 * color, guaranteed present by the guard in `getColorRoles`) when the
 * requested slot doesn't exist - keeps role mapping defined even for a
 * shorter-than-usual palette instead of throwing.
 */
function pickSlot(palette: PaletteColor[], index: number): PaletteColor {
  return palette[index] ?? palette[0]
}

/**
 * Maps a generated palette onto the 10 fixed semantic UI roles, in
 * `ROLE_ORDER`. Throws when `palette` is empty - there is no brand color to
 * derive anything from. Primary/Secondary/Accent are the palette's own
 * slots 0/1/2; Background/Surface/Text/Border are near-neutral tints of the
 * primary color's hue; Success/Warning/Error are fixed status hues
 * independent of the input palette.
 */
export function getColorRoles(palette: PaletteColor[]): RoleAssignment[] {
  if (palette.length === 0) {
    throw new Error('getColorRoles: palette must contain at least one color')
  }

  const primary = pickSlot(palette, 0)
  const secondary = pickSlot(palette, 1)
  const accent = pickSlot(palette, 2)
  const hue = primary.hsl.h

  const colorByRole: Record<ColorRole, PaletteColor> = {
    primary,
    secondary,
    accent,
    background: toPaletteColor({ h: hue, ...BACKGROUND_SL }),
    surface: toPaletteColor({ h: hue, ...SURFACE_SL }),
    text: toPaletteColor({ h: hue, ...TEXT_SL }),
    border: toPaletteColor({ h: hue, ...BORDER_SL }),
    success: toPaletteColor(SUCCESS_HSL),
    warning: toPaletteColor(WARNING_HSL),
    error: toPaletteColor(ERROR_HSL),
  }

  return ROLE_ORDER.map((role) => ({ role, label: ROLE_LABELS[role], color: colorByRole[role] }))
}
