/**
 * 60/30/10 recommended color distribution data (Color Study card 2:
 * "Recommended color distribution"). The classic interior-design/UI ratio -
 * 60% neutral/background, 30% primary/supporting, 10% accent - expressed as
 * plain data so a renderer can draw it as a stacked bar, a mock screen, or a
 * mock slide without recomputing the ratio itself.
 *
 * Pure and deterministic: built directly on top of `getColorRoles`, so the
 * same `palette` always yields the same 3 segments (Color Study spec M-5).
 */

import { getColorRoles, type ColorRole } from './colorRoles'
import type { PaletteColor } from './palette'

export type DistributionTier = 'dominant' | 'supporting' | 'accent'

export interface DistributionSegment {
  tier: DistributionTier
  /** Human-readable label, e.g. "Neutral / Background". */
  label: string
  /** Percentage of the 60/30/10 rule this segment represents. Always sums to 100 across all segments. */
  percentage: number
  role: ColorRole
  color: PaletteColor
}

/**
 * Fixed tier -> (role, percentage, label) mapping implementing the 60/30/10
 * rule: the `background` role stands in for "Neutral/Background" (60%), the
 * `primary` role for "Primary/Supporting" (30%), and the `accent` role for
 * "Accent" (10%). Order matches the rule's own descending-percentage order.
 */
const DISTRIBUTION_PLAN: Array<{ tier: DistributionTier; label: string; percentage: number; role: ColorRole }> = [
  { tier: 'dominant', label: 'Neutral / Background', percentage: 60, role: 'background' },
  { tier: 'supporting', label: 'Primary / Supporting', percentage: 30, role: 'primary' },
  { tier: 'accent', label: 'Accent', percentage: 10, role: 'accent' },
]

/** Sum of every segment's `percentage`; always 100 by construction of `DISTRIBUTION_PLAN`. */
export const DISTRIBUTION_TOTAL_PERCENTAGE = DISTRIBUTION_PLAN.reduce((sum, entry) => sum + entry.percentage, 0)

/**
 * Builds the 3-segment 60/30/10 distribution for a generated palette, using
 * `getColorRoles` to resolve each tier's actual color. Throws under the same
 * condition `getColorRoles` does (empty palette).
 */
export function getColorDistribution(palette: PaletteColor[]): DistributionSegment[] {
  const roles = getColorRoles(palette)
  const colorByRole = new Map(roles.map((assignment) => [assignment.role, assignment.color]))

  return DISTRIBUTION_PLAN.map(({ tier, label, percentage, role }) => ({
    tier,
    label,
    percentage,
    role,
    color: colorByRole.get(role) as PaletteColor,
  }))
}
