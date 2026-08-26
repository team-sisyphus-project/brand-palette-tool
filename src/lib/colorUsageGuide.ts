/**
 * Non-designer-friendly usage guidance text (Color Study card 4: "Usage
 * recommendations"). For every semantic role, produces a title ("Primary
 * Blue") and a plain-English "best for X, avoid Y" sentence, per the design
 * spec's own example: "Primary Red - Best for CTAs, key brand moments,
 * highlights, and active states. Avoid using across large backgrounds
 * because of its visual intensity."
 *
 * Pure and deterministic: built on `getColorRoles`, so the same `palette`
 * always yields the same guide text (Color Study spec M-5). The hue-name and
 * per-role guidance vocabularies are "(assumption — needs confirmation)",
 * same status as the mood/vibe word banks in src/lib/palette.ts.
 */

import { getColorRoles, ROLE_LABELS, type ColorRole } from './colorRoles'
import type { PaletteColor } from './palette'

/**
 * Hue-name bands (degrees, exclusive upper bound), used to turn a role's raw
 * hue into a plain color word for the guide title. (assumption — needs
 * confirmation)
 */
const HUE_NAME_BANDS: Array<{ max: number; name: string }> = [
  { max: 15, name: 'Red' },
  { max: 45, name: 'Orange' },
  { max: 70, name: 'Yellow' },
  { max: 150, name: 'Green' },
  { max: 200, name: 'Teal' },
  { max: 250, name: 'Blue' },
  { max: 290, name: 'Purple' },
  { max: 330, name: 'Pink' },
  { max: 360, name: 'Red' },
]

/** Saturation below this is treated as "no real hue" and named `Neutral` instead. (assumption — needs confirmation) */
const NEUTRAL_SATURATION_MAX = 8

/** Maps a color's HSL to a plain-English hue word ("Blue", "Neutral", ...). */
export function getHueName(color: PaletteColor): string {
  if (color.hsl.s < NEUTRAL_SATURATION_MAX) return 'Neutral'
  const hue = ((color.hsl.h % 360) + 360) % 360
  const band = HUE_NAME_BANDS.find((entry) => hue < entry.max)
  return band?.name ?? 'Neutral'
}

/**
 * Fixed "best for X. Avoid Y." guidance per role. (assumption — needs
 * confirmation), same status as `getUsageGuideText`'s hue-name bands.
 */
const ROLE_GUIDANCE: Record<ColorRole, string> = {
  primary: 'Best for CTAs, key brand moments, highlights, and active states. Avoid using across large backgrounds because of its visual intensity.',
  secondary: 'Best for supporting UI elements, secondary buttons, and complementary accents. Avoid relying on it as the sole focal color.',
  accent: 'Best for highlights, badges, and drawing attention to specific elements. Avoid overusing it across large surfaces.',
  background: 'Best for page backgrounds and large neutral surfaces. Avoid using it for text or small UI elements.',
  surface: 'Best for cards, panels, and elevated surfaces. Avoid using it as the page-wide background.',
  text: 'Best for body copy, headings, and readable content. Avoid placing it on backgrounds with insufficient contrast.',
  border: 'Best for dividers, outlines, and subtle separation. Avoid using it for large fills.',
  success: 'Best for confirmation states, success messages, and positive indicators. Avoid using it for neutral or purely informational content.',
  warning: 'Best for caution states and messages that need attention. Avoid using it for critical, blocking errors.',
  error: 'Best for error states, validation failures, and destructive actions. Avoid using it for decorative purposes.',
}

export interface UsageGuideEntry {
  role: ColorRole
  /** e.g. "Primary Blue" - role label + plain hue name. */
  title: string
  guidance: string
  color: PaletteColor
}

/**
 * Builds the "best for / avoid" usage guide for every semantic role in a
 * generated palette. Throws under the same condition `getColorRoles` does
 * (empty palette).
 */
export function getUsageGuide(palette: PaletteColor[]): UsageGuideEntry[] {
  return getColorRoles(palette).map(({ role, color }) => ({
    role,
    title: `${ROLE_LABELS[role]} ${getHueName(color)}`,
    guidance: ROLE_GUIDANCE[role],
    color,
  }))
}
