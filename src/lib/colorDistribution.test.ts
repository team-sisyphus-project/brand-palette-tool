import { describe, expect, it } from 'vitest'
import { generatePalette } from './palette'
import { getColorRoles } from './colorRoles'
import { DISTRIBUTION_TOTAL_PERCENTAGE, getColorDistribution } from './colorDistribution'

const palette = generatePalette('#3366ff')!

describe('getColorDistribution', () => {
  it('returns the 3 tiers of the 60/30/10 rule, in descending percentage order', () => {
    const segments = getColorDistribution(palette)
    expect(segments.map((s) => s.tier)).toEqual(['dominant', 'supporting', 'accent'])
    expect(segments.map((s) => s.percentage)).toEqual([60, 30, 10])
  })

  it('percentages always sum to 100', () => {
    const segments = getColorDistribution(palette)
    const sum = segments.reduce((total, s) => total + s.percentage, 0)
    expect(sum).toBe(100)
    expect(DISTRIBUTION_TOTAL_PERCENTAGE).toBe(100)
  })

  it('maps dominant/supporting/accent to background/primary/accent roles', () => {
    const segments = getColorDistribution(palette)
    expect(segments.map((s) => s.role)).toEqual(['background', 'primary', 'accent'])
  })

  it('colors match getColorRoles for the same palette', () => {
    const segments = getColorDistribution(palette)
    const roles = getColorRoles(palette)
    const byRole = new Map(roles.map((r) => [r.role, r.color]))
    segments.forEach((segment) => {
      expect(segment.color).toEqual(byRole.get(segment.role))
    })
  })

  it('throws on an empty palette (inherited from getColorRoles)', () => {
    expect(() => getColorDistribution([])).toThrow()
  })
})
