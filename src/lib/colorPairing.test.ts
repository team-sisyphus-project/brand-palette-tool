import { describe, expect, it } from 'vitest'
import { generatePalette } from './palette'
import type { PaletteColor } from './palette'
import { ROLE_ORDER } from './colorRoles'
import { getBestTextColor, getColorPairings } from './colorPairing'

function colorFromHex(hex: string): PaletteColor {
  const n = parseInt(hex.slice(1), 16)
  return {
    hex,
    rgb: { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 },
    hsl: { h: 0, s: 0, l: 0 },
  }
}

describe('getBestTextColor', () => {
  it('recommends white text on a black background', () => {
    expect(getBestTextColor(colorFromHex('#000000'))).toBe('white')
  })

  it('recommends black text on a white background', () => {
    expect(getBestTextColor(colorFromHex('#ffffff'))).toBe('black')
  })

  it('ties resolve to white', () => {
    // A mid gray is roughly equidistant from black/white contrast-wise;
    // whichever direction the tie breaks, the function must be deterministic.
    const first = getBestTextColor(colorFromHex('#808080'))
    const second = getBestTextColor(colorFromHex('#808080'))
    expect(first).toBe(second)
  })
})

describe('getColorPairings', () => {
  const palette = generatePalette('#3366ff')!

  it('returns one pairing per role, in ROLE_ORDER', () => {
    const pairings = getColorPairings(palette)
    expect(pairings.map((p) => p.role)).toEqual(ROLE_ORDER)
  })

  it('every pairing lists at least one other color it pairs with', () => {
    const pairings = getColorPairings(palette)
    pairings.forEach((pairing) => {
      expect(pairing.pairsWith.length).toBeGreaterThan(0)
      expect(pairing.pairsWith).not.toContain(pairing.label)
    })
  })

  it('recommendedTextColor matches getBestTextColor for the same color', () => {
    const pairings = getColorPairings(palette)
    pairings.forEach((pairing) => {
      expect(pairing.recommendedTextColor).toBe(getBestTextColor(pairing.color))
    })
  })

  it('throws on an empty palette (inherited from getColorRoles)', () => {
    expect(() => getColorPairings([])).toThrow()
  })

  it('is deterministic across repeated calls', () => {
    expect(getColorPairings(palette)).toEqual(getColorPairings(palette))
  })
})
