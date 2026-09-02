/**
 * Chart / data visualization color series (Color Study card 10: "Chart /
 * data visualization colors"). Generates an ordered, evenly-hue-spaced
 * series of colors around a palette's average hue, so chart series never
 * collide and stay legible regardless of how many series a chart needs.
 *
 * Pure and deterministic: built on `averageHsl` (src/lib/palette.ts), so the
 * same `palette`/`count` always yields the same series (Color Study spec
 * M-5). Fixed saturation/lightness below is "(assumption — needs
 * confirmation)", chosen for readability across both light and dark
 * surfaces rather than derived from a cited data-viz palette.
 */

import { averageHsl, hslToRgb, rgbToHex, type PaletteColor } from './palette'

/** Default number of series colors when a caller doesn't specify a count. */
export const DEFAULT_CHART_SERIES_COUNT = 6

/** Fixed saturation/lightness every chart series color shares - only hue varies. (assumption — needs confirmation) */
const SERIES_SATURATION = 62
const SERIES_LIGHTNESS = 52

function normalizeHue(h: number): number {
  const wrapped = h % 360
  return wrapped < 0 ? wrapped + 360 : wrapped
}

/**
 * Generates `count` distinct, evenly-hue-spaced colors around the palette's
 * average hue (via `averageHsl`). Each series color's hue is offset by
 * `360 / count` degrees from the last, so every returned color is hue-distinct
 * from every other (no two series ever collide) as long as `count` stays
 * within a sane chart-legend size. Returns `[]` when `count <= 0`.
 */
export function getChartColorSeries(
  palette: PaletteColor[],
  count: number = DEFAULT_CHART_SERIES_COUNT,
): PaletteColor[] {
  if (count <= 0) return []

  const base = averageHsl(palette)
  const step = 360 / count

  return Array.from({ length: count }, (_, index) => {
    const hsl = { h: normalizeHue(base.h + index * step), s: SERIES_SATURATION, l: SERIES_LIGHTNESS }
    const rgb = hslToRgb(hsl)
    return { hex: rgbToHex(rgb), rgb, hsl }
  })
}
