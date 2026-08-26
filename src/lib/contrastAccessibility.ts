/**
 * WCAG contrast ratio + grade, and the plain-language usage recommendation
 * that follows from it (Color Study card 3: "Contrast & accessibility
 * checker"). Built on top of `contrastRatio`/`relativeLuminance` in
 * src/lib/contrast.ts (the existing WCAG math) rather than re-deriving it -
 * this module only adds grading and the fixed set of combinations the
 * accessibility card checks.
 *
 * Pure and deterministic: the same `palette` always yields the same grades
 * and recommendations (Color Study spec M-5).
 */

import { contrastRatio, type RGB } from './contrast'
import { getColorRoles } from './colorRoles'
import type { PaletteColor } from './palette'

export type ContrastGrade = 'AAA' | 'AA' | 'Fail'

/** WCAG 2.1 normal-text thresholds: AAA requires 7:1, AA requires 4.5:1, anything below is a Fail. */
const AAA_THRESHOLD = 7
const AA_THRESHOLD = 4.5

/** Grades a raw contrast ratio against the WCAG 2.1 normal-text thresholds. */
export function getContrastGrade(ratio: number): ContrastGrade {
  if (ratio >= AAA_THRESHOLD) return 'AAA'
  if (ratio >= AA_THRESHOLD) return 'AA'
  return 'Fail'
}

/**
 * Plain-language action recommendation per grade, per the design spec's own
 * examples ("Best for body text" / "Best for CTA" / "Decorative only"):
 * AAA clears even small body text, AA clears large text/UI elements like
 * CTAs but not necessarily small body copy, and a Fail is safe only as a
 * non-text decorative accent.
 */
const CONTRAST_RECOMMENDATION: Record<ContrastGrade, string> = {
  AAA: 'Best for body text',
  AA: 'Best for CTA',
  Fail: 'Decorative only',
}

/** Looks up the fixed usage recommendation text for a contrast grade. */
export function getContrastRecommendation(grade: ContrastGrade): string {
  return CONTRAST_RECOMMENDATION[grade]
}

export interface ContrastCombination {
  label: string
  foregroundHex: string
  backgroundHex: string
  ratio: number
  grade: ContrastGrade
  recommendation: string
}

const WHITE: RGB = { r: 255, g: 255, b: 255 }
const BLACK: RGB = { r: 0, g: 0, b: 0 }

/**
 * Builds the fixed set of contrast combinations the accessibility card
 * checks, per the design spec's own examples: white text on Primary, dark
 * (black) text on Primary, and Accent on Background. Uses `getColorRoles` to
 * resolve Primary/Accent/Background, so it inherits the same "empty
 * palette throws" behavior.
 */
export function getContrastCombinations(palette: PaletteColor[]): ContrastCombination[] {
  const roles = getColorRoles(palette)
  const colorByRole = new Map(roles.map((assignment) => [assignment.role, assignment.color]))
  const primary = colorByRole.get('primary') as PaletteColor
  const accent = colorByRole.get('accent') as PaletteColor
  const background = colorByRole.get('background') as PaletteColor

  const combinations: Array<{ label: string; foreground: RGB; foregroundHex: string; background: RGB; backgroundHex: string }> = [
    { label: 'White text on Primary', foreground: WHITE, foregroundHex: '#ffffff', background: primary.rgb, backgroundHex: primary.hex },
    { label: 'Dark text on Primary', foreground: BLACK, foregroundHex: '#000000', background: primary.rgb, backgroundHex: primary.hex },
    { label: 'Accent on Background', foreground: accent.rgb, foregroundHex: accent.hex, background: background.rgb, backgroundHex: background.hex },
  ]

  return combinations.map(({ label, foreground, foregroundHex, background: bg, backgroundHex }) => {
    const ratio = contrastRatio(foreground, bg)
    const grade = getContrastGrade(ratio)
    return { label, foregroundHex, backgroundHex, ratio, grade, recommendation: getContrastRecommendation(grade) }
  })
}
