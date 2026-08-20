import { describe, expect, it } from 'vitest'
import {
  BRAND_SLOT_INDEX,
  GENERATION_MODES,
  PALETTE_SIZE,
  averageHsl,
  createInitialLocks,
  generatePalette,
  getMoodTags,
  hexToRgb,
  hslToRgb,
  parseColorInput,
  parseRgbString,
  regeneratePalette,
  rgbToHex,
  rgbToHsl,
  updateSlotColor,
  type GenerationMode,
  type HSL,
  type PaletteColor,
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

  // Edge cases called out explicitly by grain-1: surrounding whitespace,
  // upper/mixed case HEX, and 3-digit shorthand HEX must all parse the same
  // as their canonical form so M-1 ("HEX 입력만으로 즉시 팔레트 생성") holds
  // for real-world typed input, not just the canonical lowercase 6-digit form.
  it('trims surrounding whitespace around hex input', () => {
    expect(parseColorInput('  #3366ff  ')).toEqual({ r: 51, g: 102, b: 255 })
  })

  it('accepts uppercase and mixed-case hex input', () => {
    expect(parseColorInput('#3366FF')).toEqual({ r: 51, g: 102, b: 255 })
    expect(parseColorInput('#3366Ff')).toEqual({ r: 51, g: 102, b: 255 })
  })

  it('accepts 3-digit shorthand hex input', () => {
    expect(parseColorInput('#36f')).toEqual({ r: 51, g: 102, b: 255 })
    expect(parseColorInput('36F')).toEqual({ r: 51, g: 102, b: 255 })
  })

  it('trims surrounding whitespace and tolerates spacing around rgb commas', () => {
    expect(parseColorInput('  51 , 102 , 255  ')).toEqual({ r: 51, g: 102, b: 255 })
    expect(parseColorInput(' rgb(51,102,255) ')).toEqual({ r: 51, g: 102, b: 255 })
  })

  it('accepts uppercase RGB() function syntax', () => {
    expect(parseColorInput('RGB(51, 102, 255)')).toEqual({ r: 51, g: 102, b: 255 })
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

  it('produces the same brand-slot color for whitespace-padded, uppercase, and 3-digit hex variants (M-1 edge cases)', () => {
    const canonical = generatePalette('#3366ff')!
    const paddedUpper = generatePalette('  #3366FF  ')!
    const shorthand = generatePalette('#36f')!

    expect(paddedUpper[BRAND_SLOT_INDEX].hex).toBe(canonical[BRAND_SLOT_INDEX].hex)
    expect(shorthand[BRAND_SLOT_INDEX].hex).toBe(canonical[BRAND_SLOT_INDEX].hex)
  })

  it('produces the same brand-slot color for whitespace-padded rgb input', () => {
    const canonical = generatePalette('#3366ff')!
    const paddedRgb = generatePalette('  51 , 102 , 255  ')!

    expect(paddedRgb[BRAND_SLOT_INDEX].hex).toBe(canonical[BRAND_SLOT_INDEX].hex)
  })
})

describe('GenerationMode', () => {
  const BRAND = '#3366ff'

  it('exposes exactly the 5 modes from spec A', () => {
    expect(GENERATION_MODES).toEqual([
      'complementary',
      'analogous',
      'triadic',
      'splitComplementary',
      'monochromatic',
    ])
  })

  it('produces a full 5-color palette for every mode', () => {
    for (const mode of GENERATION_MODES) {
      const palette = generatePalette(BRAND, mode)
      expect(palette).not.toBeNull()
      expect(palette).toHaveLength(PALETTE_SIZE)
    }
  })

  it('keeps the brand color fixed at BRAND_SLOT_INDEX regardless of mode', () => {
    for (const mode of GENERATION_MODES) {
      const palette = generatePalette(BRAND, mode)!
      expect(palette[BRAND_SLOT_INDEX].hex).toBe(BRAND)
    }
  })

  it('returns only valid, in-range, NaN-free colors for every mode', () => {
    for (const mode of GENERATION_MODES) {
      const palette = generatePalette(BRAND, mode)!
      for (const color of palette) {
        expect(color.hex).toMatch(/^#[0-9a-f]{6}$/)
        expect(Number.isNaN(color.hsl.h)).toBe(false)
        expect(color.hsl.s).toBeGreaterThanOrEqual(0)
        expect(color.hsl.s).toBeLessThanOrEqual(100)
        expect(color.hsl.l).toBeGreaterThanOrEqual(0)
        expect(color.hsl.l).toBeLessThanOrEqual(100)
      }
    }
  })

  it('is deterministic per mode for the same input', () => {
    for (const mode of GENERATION_MODES) {
      expect(generatePalette(BRAND, mode)).toEqual(generatePalette(BRAND, mode))
    }
  })

  it('produces a pairwise different hex set for every pair of the 5 modes', () => {
    const hexSets = new Map<GenerationMode, Set<string>>()
    for (const mode of GENERATION_MODES) {
      const palette = generatePalette(BRAND, mode)!
      hexSets.set(mode, new Set(palette.map((c) => c.hex)))
    }

    const setsAreEqual = (a: Set<string>, b: Set<string>) =>
      a.size === b.size && [...a].every((hex) => b.has(hex))

    for (let i = 0; i < GENERATION_MODES.length; i += 1) {
      for (let j = i + 1; j < GENERATION_MODES.length; j += 1) {
        const modeA = GENERATION_MODES[i]
        const modeB = GENERATION_MODES[j]
        expect(setsAreEqual(hexSets.get(modeA)!, hexSets.get(modeB)!)).toBe(false)
      }
    }
  })

  it('mode-based generation differs from the legacy no-mode default', () => {
    const legacy = new Set(generatePalette(BRAND)!.map((c) => c.hex))
    for (const mode of GENERATION_MODES) {
      const modeSet = new Set(generatePalette(BRAND, mode)!.map((c) => c.hex))
      expect([...modeSet].every((hex) => legacy.has(hex)) && modeSet.size === legacy.size).toBe(
        false,
      )
    }
  })

  it('regeneratePalette respects mode for unlocked slots while keeping locked slots and brand color intact', () => {
    const palette = generatePalette(BRAND, 'analogous')!
    const locks = createInitialLocks()
    locks[1] = true

    const regenerated = regeneratePalette(palette, BRAND, locks, seededRandom(5), 'triadic')!

    expect(regenerated[BRAND_SLOT_INDEX].hex).toBe(BRAND)
    expect(regenerated[1]).toEqual(palette[1])
    for (const slot of [2, 3, 4]) {
      expect(Number.isNaN(regenerated[slot].hsl.h)).toBe(false)
    }
  })

  it('regeneratePalette with different modes yields different unlocked results for the same seed', () => {
    const palette = generatePalette(BRAND, 'complementary')!
    const locks = createInitialLocks()

    const complementaryRegen = regeneratePalette(
      palette,
      BRAND,
      locks,
      seededRandom(11),
      'complementary',
    )!
    const monochromaticRegen = regeneratePalette(
      palette,
      BRAND,
      locks,
      seededRandom(11),
      'monochromatic',
    )!

    const changed = [1, 2, 3, 4].some(
      (slot) => complementaryRegen[slot].hex !== monochromaticRegen[slot].hex,
    )
    expect(changed).toBe(true)
  })

  // code-analysis/unknowns.md gap: the NaN-safety checks for achromatic brand
  // input only ran through the no-mode default path. `contrast`'s
  // `100 - base.l` and every other mode's arithmetic must also stay
  // NaN-free/in-range when the brand color is fully desaturated (s=0).
  it('produces NaN-free, in-range colors for every mode with achromatic brand input (black/white)', () => {
    for (const achromatic of ['#000000', '#ffffff']) {
      for (const mode of GENERATION_MODES) {
        const palette = generatePalette(achromatic, mode)!
        expect(palette).toHaveLength(PALETTE_SIZE)
        for (const color of palette) {
          expect(color.hex).toMatch(/^#[0-9a-f]{6}$/)
          expect(Number.isNaN(color.hsl.h)).toBe(false)
          expect(Number.isNaN(color.hsl.s)).toBe(false)
          expect(Number.isNaN(color.hsl.l)).toBe(false)
          expect(Number.isNaN(color.rgb.r)).toBe(false)
          expect(Number.isNaN(color.rgb.g)).toBe(false)
          expect(Number.isNaN(color.rgb.b)).toBe(false)
          expect(color.hsl.s).toBeGreaterThanOrEqual(0)
          expect(color.hsl.s).toBeLessThanOrEqual(100)
          expect(color.hsl.l).toBeGreaterThanOrEqual(0)
          expect(color.hsl.l).toBeLessThanOrEqual(100)
        }
      }
    }
  })

  it('regeneratePalette stays NaN-free for achromatic brand input combined with locks, for every mode', () => {
    for (const achromatic of ['#000000', '#ffffff']) {
      for (const mode of GENERATION_MODES) {
        const palette = generatePalette(achromatic, mode)!
        const locks = createInitialLocks()
        locks[2] = true // lock an extra derived slot alongside the brand slot

        const regenerated = regeneratePalette(palette, achromatic, locks, seededRandom(13), mode)!

        expect(regenerated[BRAND_SLOT_INDEX].hex).toBe(achromatic)
        expect(regenerated[2]).toEqual(palette[2])
        for (const color of regenerated) {
          expect(Number.isNaN(color.hsl.h)).toBe(false)
          expect(Number.isNaN(color.hsl.s)).toBe(false)
          expect(Number.isNaN(color.hsl.l)).toBe(false)
        }
      }
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

  it('keeps multiple simultaneously-locked derived slots unchanged across repeated regenerations while the rest keep varying', () => {
    const palette = generatePalette('#3366ff')!
    const locks = createInitialLocks()
    // Lock two non-adjacent derived slots at once, leave 2 and 4 unlocked.
    locks[1] = true
    locks[3] = true

    let current = palette
    const unlockedSignatures = new Set<string>()
    for (let seed = 1; seed <= 4; seed += 1) {
      current = regeneratePalette(current, '#3366ff', locks, seededRandom(seed))!

      expect(current[1]).toEqual(palette[1])
      expect(current[3]).toEqual(palette[3])
      unlockedSignatures.add(`${current[2].hex},${current[4].hex}`)
    }

    // The two unlocked slots actually vary across rounds - locking some slots
    // does not accidentally freeze the others too.
    expect(unlockedSignatures.size).toBeGreaterThan(1)
  })

  it('unlocking a previously-locked slot lets it change again on the next regeneration', () => {
    const palette = generatePalette('#3366ff')!
    const locks = createInitialLocks()
    locks[1] = true
    locks[3] = true

    const stillLocked = regeneratePalette(palette, '#3366ff', locks, seededRandom(21))!
    expect(stillLocked[1]).toEqual(palette[1])
    expect(stillLocked[3]).toEqual(palette[3])

    // Unlock slot 1 only; slot 3 remains locked.
    const nextLocks = locks.slice()
    nextLocks[1] = false
    const afterUnlock = regeneratePalette(stillLocked, '#3366ff', nextLocks, seededRandom(22))!

    expect(afterUnlock[1]).not.toEqual(stillLocked[1])
    expect(afterUnlock[3]).toEqual(palette[3])
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

/**
 * Builds a `PaletteColor` from just an HSL triplet for averageHsl/getMoodTags
 * tests - hex/rgb are irrelevant to those functions (they only read `.hsl`),
 * so dummy values avoid coupling these tests to hslToRgb rounding.
 */
function colorWithHsl(hsl: HSL): PaletteColor {
  return { hex: '#000000', rgb: { r: 0, g: 0, b: 0 }, hsl }
}

/** Shortest angular distance between two hues, wraparound-aware. */
function hueDistance(a: number, b: number): number {
  const diff = Math.abs(a - b) % 360
  return Math.min(diff, 360 - diff)
}

describe('averageHsl', () => {
  it('averages S and L arithmetically when hue is uniform (no wraparound involved)', () => {
    const palette = [
      { h: 0, s: 0, l: 10 },
      { h: 0, s: 20, l: 30 },
      { h: 0, s: 40, l: 50 },
      { h: 0, s: 60, l: 70 },
      { h: 0, s: 80, l: 90 },
    ].map(colorWithHsl)

    const result = averageHsl(palette)
    expect(result.s).toBeCloseTo(40)
    expect(result.l).toBeCloseTo(50)
    expect(hueDistance(result.h, 0)).toBeLessThan(0.001)
  })

  it('averages hue circularly across the 0/360 wraparound instead of arithmetically', () => {
    // Arithmetic mean of {10, 350} would be 180 (perceptually opposite side
    // of the wheel) - the correct, wraparound-aware answer is ~0.
    const palette = [
      { h: 10, s: 50, l: 50 },
      { h: 350, s: 50, l: 50 },
      { h: 10, s: 50, l: 50 },
      { h: 350, s: 50, l: 50 },
      { h: 0, s: 50, l: 50 },
    ].map(colorWithHsl)

    const result = averageHsl(palette)
    expect(hueDistance(result.h, 0)).toBeLessThan(0.001)
    expect(hueDistance(result.h, 180)).toBeGreaterThan(100)
    expect(result.s).toBeCloseTo(50)
    expect(result.l).toBeCloseTo(50)
  })

  it('returns the same HSL unchanged when every palette color is identical', () => {
    const palette = Array.from({ length: 5 }, () => colorWithHsl({ h: 123, s: 45, l: 67 }))
    const result = averageHsl(palette)

    expect(hueDistance(result.h, 123)).toBeLessThan(0.001)
    expect(result.s).toBeCloseTo(45)
    expect(result.l).toBeCloseTo(67)
  })

  it('is deterministic: the same palette always averages to the same HSL', () => {
    const palette = generatePalette('#3366ff')!
    expect(averageHsl(palette)).toEqual(averageHsl(palette))
  })
})

describe('getMoodTags', () => {
  it('is a pure function: the same HSL input always yields the same tags', () => {
    const hsl: HSL = { h: 200, s: 55, l: 40 }
    expect(getMoodTags(hsl)).toEqual(getMoodTags(hsl))
    expect(getMoodTags({ ...hsl })).toEqual(getMoodTags({ ...hsl }))
  })

  it('always returns 1 or 2 tags across the H/S/L band grid', () => {
    const hues = [0, 30, 60, 90, 150, 180, 240, 299, 300, 330, 359]
    const levels = [0, 15, 30, 45, 60, 75, 90, 100]

    for (const h of hues) {
      for (const s of levels) {
        for (const l of levels) {
          const tags = getMoodTags({ h, s, l })
          expect(tags.length).toBeGreaterThanOrEqual(1)
          expect(tags.length).toBeLessThanOrEqual(2)
          expect(new Set(tags).size).toBe(tags.length) // no duplicate tags
        }
      }
    }
  })

  it('maps a warm, vivid, bright HSL to warm + high-arousal/high-valence adjectives', () => {
    expect(getMoodTags({ h: 30, s: 70, l: 80 })).toEqual(['따뜻한', '발랄한'])
  })

  it('maps a cool, muted, dark HSL to cool + low-arousal/low-valence adjectives', () => {
    expect(getMoodTags({ h: 240, s: 10, l: 20 })).toEqual(['차가운', '고요한'])
  })

  it('maps a neutral-hue, mid-saturation, mid-lightness HSL to neutral + balanced adjectives', () => {
    expect(getMoodTags({ h: 120, s: 45, l: 50 })).toEqual(['자연스러운', '균형 잡힌'])
  })

  it('treats the neutral hue band boundary (60deg) as neutral, not warm', () => {
    expect(getMoodTags({ h: 60, s: 45, l: 50 })[0]).toBe('자연스러운')
  })

  it('treats the cool hue band boundary (300deg) as warm, not cool', () => {
    expect(getMoodTags({ h: 300, s: 45, l: 50 })[0]).toBe('따뜻한')
  })
})
