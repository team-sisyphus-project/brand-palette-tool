import { describe, expect, it } from 'vitest'
import { generatePalette } from './palette'
import {
  getContrastCombinations,
  getContrastGrade,
  getContrastRecommendation,
} from './contrastAccessibility'

describe('getContrastGrade', () => {
  it('grades a ratio at or above 7:1 as AAA', () => {
    expect(getContrastGrade(7)).toBe('AAA')
    expect(getContrastGrade(21)).toBe('AAA')
  })

  it('grades a ratio at or above 4.5:1 but below 7:1 as AA', () => {
    expect(getContrastGrade(4.5)).toBe('AA')
    expect(getContrastGrade(6.999)).toBe('AA')
  })

  it('grades a ratio below 4.5:1 as Fail', () => {
    expect(getContrastGrade(4.499)).toBe('Fail')
    expect(getContrastGrade(1)).toBe('Fail')
  })
})

describe('getContrastRecommendation', () => {
  it('maps each grade to its fixed recommendation text', () => {
    expect(getContrastRecommendation('AAA')).toBe('Best for body text')
    expect(getContrastRecommendation('AA')).toBe('Best for CTA')
    expect(getContrastRecommendation('Fail')).toBe('Decorative only')
  })
})

describe('getContrastCombinations', () => {
  it('returns the 3 fixed combinations the accessibility card checks', () => {
    const palette = generatePalette('#3366ff')!
    const combos = getContrastCombinations(palette)
    expect(combos.map((c) => c.label)).toEqual(['White text on Primary', 'Dark text on Primary', 'Accent on Background'])
  })

  it('grades white-on-black primary as AAA (ratio 21) and recommends body text', () => {
    const palette = generatePalette('#000000')!
    const combos = getContrastCombinations(palette)
    const whiteOnPrimary = combos.find((c) => c.label === 'White text on Primary')!
    expect(whiteOnPrimary.ratio).toBeCloseTo(21, 0)
    expect(whiteOnPrimary.grade).toBe('AAA')
    expect(whiteOnPrimary.recommendation).toBe('Best for body text')
  })

  it('grades dark-on-black primary as Fail (ratio 1) and recommends decorative only', () => {
    const palette = generatePalette('#000000')!
    const combos = getContrastCombinations(palette)
    const darkOnPrimary = combos.find((c) => c.label === 'Dark text on Primary')!
    expect(darkOnPrimary.ratio).toBeCloseTo(1, 5)
    expect(darkOnPrimary.grade).toBe('Fail')
    expect(darkOnPrimary.recommendation).toBe('Decorative only')
  })

  it('grades dark-on-white primary as AAA and white-on-white primary as Fail', () => {
    const palette = generatePalette('#ffffff')!
    const combos = getContrastCombinations(palette)
    const whiteOnPrimary = combos.find((c) => c.label === 'White text on Primary')!
    const darkOnPrimary = combos.find((c) => c.label === 'Dark text on Primary')!
    expect(whiteOnPrimary.grade).toBe('Fail')
    expect(darkOnPrimary.grade).toBe('AAA')
  })

  it('every combination grade always has a matching recommendation', () => {
    const palette = generatePalette('#3366ff')!
    getContrastCombinations(palette).forEach((combo) => {
      expect(combo.recommendation).toBe(getContrastRecommendation(combo.grade))
    })
  })

  it('is deterministic across repeated calls', () => {
    const palette = generatePalette('#3366ff')!
    expect(getContrastCombinations(palette)).toEqual(getContrastCombinations(palette))
  })
})
