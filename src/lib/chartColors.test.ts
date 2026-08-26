import { describe, expect, it } from 'vitest'
import { averageHsl, generatePalette } from './palette'
import { DEFAULT_CHART_SERIES_COUNT, getChartColorSeries } from './chartColors'

const palette = generatePalette('#3366ff')!

describe('getChartColorSeries', () => {
  it('returns DEFAULT_CHART_SERIES_COUNT colors when count is omitted', () => {
    const series = getChartColorSeries(palette)
    expect(series).toHaveLength(DEFAULT_CHART_SERIES_COUNT)
  })

  it('returns distinct series colors (no two series share a hex) for a typical count', () => {
    const series = getChartColorSeries(palette, 8)
    const hexes = series.map((c) => c.hex)
    expect(new Set(hexes).size).toBe(hexes.length)
  })

  it('returns distinct series colors for a larger count too', () => {
    const series = getChartColorSeries(palette, 12)
    const hexes = series.map((c) => c.hex)
    expect(new Set(hexes).size).toBe(hexes.length)
  })

  it('returns an empty array for count 0 or negative', () => {
    expect(getChartColorSeries(palette, 0)).toEqual([])
    expect(getChartColorSeries(palette, -3)).toEqual([])
  })

  it('returns exactly 1 color, at the palette\'s average hue, for count 1', () => {
    const series = getChartColorSeries(palette, 1)
    expect(series).toHaveLength(1)
    expect(series[0].hsl.h).toBeCloseTo(averageHsl(palette).h, 5)
  })

  it('spaces series hues evenly by 360 / count', () => {
    const count = 4
    const series = getChartColorSeries(palette, count)
    const step = 360 / count
    for (let i = 1; i < series.length; i++) {
      const delta = ((series[i].hsl.h - series[i - 1].hsl.h) % 360 + 360) % 360
      expect(delta).toBeCloseTo(step, 5)
    }
  })

  it('is deterministic: same palette/count always yields the same series', () => {
    expect(getChartColorSeries(palette, 6)).toEqual(getChartColorSeries(palette, 6))
  })
})
