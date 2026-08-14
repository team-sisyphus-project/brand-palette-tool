import { describe, expect, it } from 'vitest'
import {
  BRAND_SLOT_INDEX,
  PALETTE_SIZE,
  createInitialLocks,
  generatePalette,
  hexToRgb,
  hslToRgb,
  parseColorInput,
  parseRgbString,
  regeneratePalette,
  rgbToHex,
  rgbToHsl,
  updateSlotColor,
} from './palette'

/** Deterministic, seedable PRNG (mulberry32) so regeneration tests are reproducible. */
function seededRandom(seed: number): () => number {
  let state = seed
  return () => {
    state |= 0
    state = (state + 0x6d2b79f5) | 0
    let t = Math.imul(state ^ (state >>> 15), 1 | state)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

describe('hexToRgb', () => {
  it('parses 6-digit hex with a leading #', () => {
    expect(hexToRgb('#3366ff')).toEqual({ r: 51, g: 102, b: 255 })
  })

  it('parses 6-digit hex without a leading #', () => {
    expect(hexToRgb('3366FF')).toEqual({ r: 51, g: 102, b: 255 })
  })

  it('expands 3-digit shorthand hex', () => {
    expect(hexToRgb('#0f0')).toEqual({ r: 0, g: 255, b: 0 })
  })

  it('returns null for invalid hex', () => {
    expect(hexToRgb('not-a-color')).toBeNull()
    expect(hexToRgb('#12345')).toBeNull()
  })
})

describe('rgbToHex', () => {
  it('round-trips rgb to lowercase hex', () => {
    expect(rgbToHex({ r: 51, g: 102, b: 255 })).toBe('#3366ff')
  })

  it('pads single-digit hex channels', () => {
    expect(rgbToHex({ r: 0, g: 5, b: 255 })).toBe('#0005ff')
  })
})

describe('parseRgbString', () => {
  it('parses rgb(...) syntax', () => {
    expect(parseRgbString('rgb(51, 102, 255)')).toEqual({ r: 51, g: 102, b: 255 })
  })

  it('parses bare comma-separated triplets', () => {
    expect(parseRgbString('51,102,255')).toEqual({ r: 51, g: 102, b: 255 })
  })

  it('returns null for out-of-range channels', () => {
    expect(parseRgbString('300,0,0')).toBeNull()
  })

  it('returns null for malformed input', () => {
    expect(parseRgbString('red')).toBeNull()
  })
})

describe('parseColorInput', () => {
  it('accepts hex input', () => {
    expect(parseColorInput('#3366ff')).toEqual({ r: 51, g: 102, b: 255 })
  })

  it('accepts rgb input', () => {
    expect(parseColorInput('rgb(51, 102, 255)')).toEqual({ r: 51, g: 102, b: 255 })
  })

  it('returns null for garbage input', () => {
    expect(parseColorInput('totally invalid')).toBeNull()
  })
})

describe('rgbToHsl / hslToRgb round trip', () => {
  it('converts pure red correctly', () => {
    const hsl = rgbToHsl({ r: 255, g: 0, b: 0 })
    expect(hsl.h).toBeCloseTo(0)
    expect(hsl.s).toBeCloseTo(100)
    expect(hsl.l).toBeCloseTo(50)
  })

  it('converts white and black correctly', () => {
    expect(rgbToHsl({ r: 255, g: 255, b: 255 })).toEqual({ h: 0, s: 0, l: 100 })
    expect(rgbToHsl({ r: 0, g: 0, b: 0 })).toEqual({ h: 0, s: 0, l: 0 })
  })

  it('round-trips arbitrary colors within rounding tolerance', () => {
    const samples = [
      { r: 51, g: 102, b: 255 },
      { r: 200, g: 50, b: 90 },
      { r: 10, g: 200, b: 120 },
      { r: 128, g: 128, b: 128 },
    ]

    for (const rgb of samples) {
      const roundTripped = hslToRgb(rgbToHsl(rgb))
      expect(roundTripped.r).toBeCloseTo(rgb.r, 0)
      expect(roundTripped.g).toBeCloseTo(rgb.g, 0)
      expect(roundTripped.b).toBeCloseTo(rgb.b, 0)
    }
  })
})

describe('generatePalette', () => {
  it('immediately produces a 5-color array from a hex input', () => {
    const palette = generatePalette('#3366ff')
    expect(palette).not.toBeNull()
    expect(palette).toHaveLength(PALETTE_SIZE)
  })

  it('immediately produces a 5-color array from an rgb input', () => {
    const palette = generatePalette('rgb(51, 102, 255)')
    expect(palette).not.toBeNull()
    expect(palette).toHaveLength(PALETTE_SIZE)
  })

  it('keeps the brand main color at the fixed slot', () => {
    const palette = generatePalette('#3366ff')!
    expect(palette[BRAND_SLOT_INDEX].hex).toBe('#3366ff')
    expect(palette[BRAND_SLOT_INDEX].rgb).toEqual({ r: 51, g: 102, b: 255 })
  })

  it('keeps the brand slot fixed across different inputs', () => {
    const a = generatePalette('#ff0000')!
    const b = generatePalette('#00ff00')!
    expect(a[BRAND_SLOT_INDEX].hex).toBe('#ff0000')
    expect(b[BRAND_SLOT_INDEX].hex).toBe('#00ff00')
  })

  it('produces 5 distinct colors for a typical brand color', () => {
    const palette = generatePalette('#3366ff')!
    const uniqueHexes = new Set(palette.map((c) => c.hex))
    expect(uniqueHexes.size).toBe(PALETTE_SIZE)
  })

  it('is deterministic for the same input', () => {
    const first = generatePalette('#3366ff')
    const second = generatePalette('#3366ff')
    expect(first).toEqual(second)
  })

  it('returns valid hex/rgb/hsl for every generated slot', () => {
    const palette = generatePalette('#3366ff')!
    for (const color of palette) {
      expect(color.hex).toMatch(/^#[0-9a-f]{6}$/)
      expect(color.rgb.r).toBeGreaterThanOrEqual(0)
      expect(color.rgb.r).toBeLessThanOrEqual(255)
      expect(color.hsl.h).toBeGreaterThanOrEqual(0)
      expect(color.hsl.h).toBeLessThan(360)
      expect(color.hsl.s).toBeGreaterThanOrEqual(0)
      expect(color.hsl.s).toBeLessThanOrEqual(100)
      expect(color.hsl.l).toBeGreaterThanOrEqual(0)
      expect(color.hsl.l).toBeLessThanOrEqual(100)
    }
  })

  it('returns null for unparseable input', () => {
    expect(generatePalette('not a color')).toBeNull()
  })

  it('handles edge-case achromatic input (black) without NaN', () => {
    const palette = generatePalette('#000000')!
    expect(palette).toHaveLength(PALETTE_SIZE)
    for (const color of palette) {
      expect(Number.isNaN(color.hsl.h)).toBe(false)
      expect(Number.isNaN(color.rgb.r)).toBe(false)
    }
  })

  it('handles edge-case achromatic input (white) without NaN', () => {
    const palette = generatePalette('#ffffff')!
    expect(palette).toHaveLength(PALETTE_SIZE)
    for (const color of palette) {
      expect(Number.isNaN(color.hsl.h)).toBe(false)
      expect(Number.isNaN(color.rgb.r)).toBe(false)
    }
  })
})

describe('createInitialLocks', () => {
  it('locks only the brand slot by default', () => {
    const locks = createInitialLocks()
    expect(locks).toHaveLength(PALETTE_SIZE)
    expect(locks[BRAND_SLOT_INDEX]).toBe(true)
    locks.forEach((locked, slot) => {
      if (slot !== BRAND_SLOT_INDEX) expect(locked).toBe(false)
    })
  })
})

describe('regeneratePalette', () => {
  it('returns null for unparseable brand input', () => {
    const palette = generatePalette('#3366ff')!
    const locks = createInitialLocks()
    expect(regeneratePalette(palette, 'not a color', locks, seededRandom(1))).toBeNull()
  })

  it('always reflects the current brand input in the brand slot, even when unlocked', () => {
    const palette = generatePalette('#3366ff')!
    const locks = createInitialLocks()
    locks[BRAND_SLOT_INDEX] = false

    const regenerated = regeneratePalette(palette, '#ff9900', locks, seededRandom(1))!
    expect(regenerated[BRAND_SLOT_INDEX].hex).toBe('#ff9900')
  })

  it('keeps locked derived slots byte-for-byte identical while unlocked slots change', () => {
    const palette = generatePalette('#3366ff')!
    const locks = createInitialLocks()
    // Lock one derived slot in addition to the brand slot; leave the rest unlocked.
    locks[1] = true

    const regenerated = regeneratePalette(palette, '#3366ff', locks, seededRandom(42))!

    expect(regenerated[BRAND_SLOT_INDEX]).toEqual(palette[BRAND_SLOT_INDEX])
    expect(regenerated[1]).toEqual(palette[1])

    for (const slot of [2, 3, 4]) {
      expect(regenerated[slot]).not.toEqual(palette[slot])
    }
  })

  it('produces different unlocked results across successive regenerations with different random streams', () => {
    const palette = generatePalette('#3366ff')!
    const locks = createInitialLocks()

    const first = regeneratePalette(palette, '#3366ff', locks, seededRandom(1))!
    const second = regeneratePalette(palette, '#3366ff', locks, seededRandom(2))!

    const changedBetweenRuns = [1, 2, 3, 4].some(
      (slot) => first[slot].hex !== second[slot].hex,
    )
    expect(changedBetweenRuns).toBe(true)
  })

  it('is reproducible for the same seeded random source', () => {
    const palette = generatePalette('#3366ff')!
    const locks = createInitialLocks()

    const first = regeneratePalette(palette, '#3366ff', locks, seededRandom(7))!
    const second = regeneratePalette(palette, '#3366ff', locks, seededRandom(7))!

    expect(first).toEqual(second)
  })

  it('keeps every slot valid (in-range, no NaN) after regeneration', () => {
    const palette = generatePalette('#3366ff')!
    const locks = createInitialLocks()

    const regenerated = regeneratePalette(palette, '#3366ff', locks, seededRandom(99))!
    for (const color of regenerated) {
      expect(color.hex).toMatch(/^#[0-9a-f]{6}$/)
      expect(Number.isNaN(color.hsl.h)).toBe(false)
      expect(color.hsl.s).toBeGreaterThanOrEqual(0)
      expect(color.hsl.s).toBeLessThanOrEqual(100)
      expect(color.hsl.l).toBeGreaterThanOrEqual(0)
      expect(color.hsl.l).toBeLessThanOrEqual(100)
    }
  })

  it('when all derived slots are locked, only the brand slot can change', () => {
    const palette = generatePalette('#3366ff')!
    const locks = [true, true, true, true, true]

    const regenerated = regeneratePalette(palette, '#00aa55', locks, seededRandom(3))!
    expect(regenerated[BRAND_SLOT_INDEX].hex).toBe('#00aa55')
    for (const slot of [1, 2, 3, 4]) {
      expect(regenerated[slot]).toEqual(palette[slot])
    }
  })
})

describe('updateSlotColor', () => {
  it('replaces only the targeted slot, leaving the other 4 untouched', () => {
    const palette = generatePalette('#3366ff')!

    const updated = updateSlotColor(palette, 2, '#ff9900')

    expect(updated[2].hex).toBe('#ff9900')
    expect(updated[2].rgb).toEqual({ r: 255, g: 153, b: 0 })
    for (const slot of [0, 1, 3, 4]) {
      expect(updated[slot]).toEqual(palette[slot])
    }
  })

  it('recomputes hex/rgb/hsl consistently for the updated slot', () => {
    const palette = generatePalette('#3366ff')!
    const updated = updateSlotColor(palette, 3, '#123abc')

    const expectedRgb = hexToRgb('#123abc')!
    const expectedHsl = rgbToHsl(expectedRgb)
    expect(updated[3]).toEqual({ hex: '#123abc', rgb: expectedRgb, hsl: expectedHsl })
  })

  it('allows editing the brand slot (index 0) just like any other slot', () => {
    const palette = generatePalette('#3366ff')!
    const updated = updateSlotColor(palette, BRAND_SLOT_INDEX, '#00ff00')

    expect(updated[BRAND_SLOT_INDEX].hex).toBe('#00ff00')
    for (const slot of [1, 2, 3, 4]) {
      expect(updated[slot]).toEqual(palette[slot])
    }
  })

  it('accepts 3-digit shorthand hex input', () => {
    const palette = generatePalette('#3366ff')!
    const updated = updateSlotColor(palette, 1, '#0f0')

    expect(updated[1].hex).toBe('#00ff00')
  })

  it('returns the original palette unchanged when hexInput is invalid', () => {
    const palette = generatePalette('#3366ff')!
    const updated = updateSlotColor(palette, 2, 'not-a-color')

    expect(updated).toEqual(palette)
    expect(updated).toBe(palette)
  })

  it('returns the original palette unchanged when index is out of range', () => {
    const palette = generatePalette('#3366ff')!
    const updated = updateSlotColor(palette, 10, '#ff9900')

    expect(updated).toBe(palette)
  })

  it('returns the original palette unchanged for a negative index', () => {
    const palette = generatePalette('#3366ff')!
    const updated = updateSlotColor(palette, -1, '#ff9900')

    expect(updated).toBe(palette)
  })
})
