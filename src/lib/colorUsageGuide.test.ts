import { describe, expect, it } from 'vitest'
import { generatePalette } from './palette'
import type { PaletteColor } from './palette'
import { ROLE_ORDER } from './colorRoles'
import { getHueName, getUsageGuide } from './colorUsageGuide'

function colorAt(h: number, s: number, l: number): PaletteColor {
  // Only hsl is read by getHueName; hex/rgb are irrelevant filler.
  return { hex: '#000000', rgb: { r: 0, g: 0, b: 0 }, hsl: { h, s, l } }
}

describe('getHueName', () => {
  it('names a low-saturation color Neutral regardless of hue', () => {
    expect(getHueName(colorAt(210, 5, 50))).toBe('Neutral')
  })

  it('names saturated colors by their hue band', () => {
    expect(getHueName(colorAt(10, 80, 50))).toBe('Red')
    expect(getHueName(colorAt(40, 80, 50))).toBe('Orange')
    expect(getHueName(colorAt(60, 80, 50))).toBe('Yellow')
    expect(getHueName(colorAt(100, 80, 50))).toBe('Green')
    expect(getHueName(colorAt(180, 80, 50))).toBe('Teal')
    expect(getHueName(colorAt(220, 80, 50))).toBe('Blue')
    expect(getHueName(colorAt(270, 80, 50))).toBe('Purple')
    expect(getHueName(colorAt(310, 80, 50))).toBe('Pink')
    expect(getHueName(colorAt(350, 80, 50))).toBe('Red')
  })
})

describe('getUsageGuide', () => {
  const palette = generatePalette('#3366ff')!

  it('returns one entry per role, in ROLE_ORDER', () => {
    const guide = getUsageGuide(palette)
    expect(guide.map((g) => g.role)).toEqual(ROLE_ORDER)
  })

  it('titles combine the role label and the color\'s hue name', () => {
    const guide = getUsageGuide(palette)
    const primaryEntry = guide.find((g) => g.role === 'primary')!
    expect(primaryEntry.title).toBe(`Primary ${getHueName(primaryEntry.color)}`)
  })

  it('every role has non-empty, distinct guidance text', () => {
    const guide = getUsageGuide(palette)
    const guidanceTexts = guide.map((g) => g.guidance)
    guidanceTexts.forEach((text) => expect(text.length).toBeGreaterThan(0))
    expect(new Set(guidanceTexts).size).toBe(guidanceTexts.length)
  })

  it('primary guidance matches the design spec\'s own example wording', () => {
    const guide = getUsageGuide(palette)
    const primaryEntry = guide.find((g) => g.role === 'primary')!
    expect(primaryEntry.guidance).toContain('Best for CTAs')
    expect(primaryEntry.guidance).toContain('Avoid using across large backgrounds')
  })

  it('throws on an empty palette (inherited from getColorRoles)', () => {
    expect(() => getUsageGuide([])).toThrow()
  })

  it('is deterministic across repeated calls', () => {
    expect(getUsageGuide(palette)).toEqual(getUsageGuide(palette))
  })
})
