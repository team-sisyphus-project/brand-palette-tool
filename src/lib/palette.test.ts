import { describe, expect, it } from 'vitest'
import {
  AESTHETIC_ARCHETYPES,
  BRAND_SLOT_INDEX,
  DEFAULT_PALETTE_NAME,
  GENERATION_MODES,
  HARMONY_TYPES,
  PALETTE_SIZE,
  SHADE_STEPS,
  averageHsl,
  createInitialLocks,
  generatePalette,
  generateShades,
  getHarmonyColors,
  getMoodTags,
  getPaletteDescription,
  getPaletteName,
  getVibeKeywords,
  hexToRgb,
  hslToRgb,
  matchAesthetic,
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
  // as their canonical form so M-1 ("generate a palette immediately from HEX input alone") holds
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

describe('regeneratePalette jitter range (grain-1: widened hue/S/L variety)', () => {
  const BRAND = '#3366ff'

  /** Shortest angular distance between two hues (0-180), wraparound-aware. */
  function hueDelta(a: number, b: number): number {
    const diff = Math.abs(a - b) % 360
    return Math.min(diff, 360 - diff)
  }

  it('mode-based regeneration reaches hue deltas within the +/-15..30deg band across repeated seeded runs, never beyond it', () => {
    const palette = generatePalette(BRAND, 'complementary')!
    const locks = createInitialLocks()

    let maxDelta = 0
    for (let seed = 1; seed <= 60; seed += 1) {
      const regenerated = regeneratePalette(palette, BRAND, locks, seededRandom(seed), 'complementary')!
      for (const slot of [1, 2, 3, 4]) {
        const delta = hueDelta(regenerated[slot].hsl.h, palette[slot].hsl.h)
        maxDelta = Math.max(maxDelta, delta)
        // Never jitters past the documented upper bound.
        expect(delta).toBeLessThanOrEqual(30 + 0.001)
        expect(Number.isNaN(regenerated[slot].hsl.h)).toBe(false)
      }
    }

    // Across enough seeded runs, the widened range actually gets used, not
    // just a narrow sliver near 0 (old behavior maxed out around 4deg).
    expect(maxDelta).toBeGreaterThan(15)
  })

  it('legacy (no-mode) regeneration also reaches hue deltas within the +/-15..30deg band on the analogous-accent slot', () => {
    const palette = generatePalette(BRAND)!
    const locks = createInitialLocks()

    let maxDelta = 0
    for (let seed = 1; seed <= 60; seed += 1) {
      const regenerated = regeneratePalette(palette, BRAND, locks, seededRandom(seed))!
      // Slot 3 is the analogous-accent slot in the legacy derivation order
      // (lighterTint, darkerShade, analogousAccent, mutedVariant).
      const delta = hueDelta(regenerated[3].hsl.h, palette[3].hsl.h)
      maxDelta = Math.max(maxDelta, delta)
      expect(delta).toBeLessThanOrEqual(30 + 0.001)
      expect(Number.isNaN(regenerated[3].hsl.h)).toBe(false)
    }

    expect(maxDelta).toBeGreaterThan(15)
  })

  it('S/L deviation width is no longer uniform across unlocked slots for mode-based regeneration', () => {
    const palette = generatePalette(BRAND, 'complementary')!
    const locks = createInitialLocks()

    const regenerated = regeneratePalette(palette, BRAND, locks, seededRandom(4), 'complementary')!
    const sDeltas = [1, 2, 3, 4].map((slot) => Math.abs(regenerated[slot].hsl.s - palette[slot].hsl.s))
    const lDeltas = [1, 2, 3, 4].map((slot) => Math.abs(regenerated[slot].hsl.l - palette[slot].hsl.l))

    // Not every unlocked slot's S/L deviation is the same magnitude - proves
    // the jitter width itself varies per slot rather than sharing one flat
    // width for the whole palette.
    expect(new Set(sDeltas.map((d) => d.toFixed(4))).size).toBeGreaterThan(1)
    expect(new Set(lDeltas.map((d) => d.toFixed(4))).size).toBeGreaterThan(1)
  })

  it('S/L deviation width is no longer uniform across unlocked slots for legacy (no-mode) regeneration', () => {
    const palette = generatePalette(BRAND)!
    const locks = createInitialLocks()

    const regenerated = regeneratePalette(palette, BRAND, locks, seededRandom(9))!
    const lDeltas = [1, 2, 3, 4].map((slot) => Math.abs(regenerated[slot].hsl.l - palette[slot].hsl.l))

    expect(new Set(lDeltas.map((d) => d.toFixed(4))).size).toBeGreaterThan(1)
  })

  it('stays in-range and NaN-free across many seeded mode-based regenerations, even at the widened jitter magnitude', () => {
    for (const mode of GENERATION_MODES) {
      const palette = generatePalette(BRAND, mode)!
      const locks = createInitialLocks()

      for (let seed = 1; seed <= 20; seed += 1) {
        const regenerated = regeneratePalette(palette, BRAND, locks, seededRandom(seed), mode)!
        for (const color of regenerated) {
          expect(Number.isNaN(color.hsl.h)).toBe(false)
          expect(Number.isNaN(color.hsl.s)).toBe(false)
          expect(Number.isNaN(color.hsl.l)).toBe(false)
          expect(color.hsl.h).toBeGreaterThanOrEqual(0)
          expect(color.hsl.h).toBeLessThan(360)
          expect(color.hsl.s).toBeGreaterThanOrEqual(0)
          expect(color.hsl.s).toBeLessThanOrEqual(100)
          expect(color.hsl.l).toBeGreaterThanOrEqual(0)
          expect(color.hsl.l).toBeLessThanOrEqual(100)
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
    expect(getMoodTags({ h: 30, s: 70, l: 80 })).toEqual(['Warm', 'Vibrant'])
  })

  it('maps a cool, muted, dark HSL to cool + low-arousal/low-valence adjectives', () => {
    expect(getMoodTags({ h: 240, s: 10, l: 20 })).toEqual(['Cold', 'Serene'])
  })

  it('maps a neutral-hue, mid-saturation, mid-lightness HSL to neutral + balanced adjectives', () => {
    expect(getMoodTags({ h: 120, s: 45, l: 50 })).toEqual(['Natural', 'Balanced'])
  })

  it('treats the neutral hue band boundary (60deg) as neutral, not warm', () => {
    expect(getMoodTags({ h: 60, s: 45, l: 50 })[0]).toBe('Natural')
  })

  it('treats the cool hue band boundary (300deg) as warm, not cool', () => {
    expect(getMoodTags({ h: 300, s: 45, l: 50 })[0]).toBe('Warm')
  })
})

describe('getVibeKeywords', () => {
  it('is a pure function: the same HSL input always yields the same keywords', () => {
    const hsl: HSL = { h: 200, s: 55, l: 40 }
    expect(getVibeKeywords(hsl)).toEqual(getVibeKeywords(hsl))
    expect(getVibeKeywords({ ...hsl })).toEqual(getVibeKeywords({ ...hsl }))
  })

  it('always returns 5+ unique, non-empty, plain-English adjectives across the H/S/L band grid', () => {
    const hues = [0, 30, 60, 90, 150, 180, 240, 299, 300, 330, 359]
    const levels = [0, 15, 30, 45, 60, 75, 90, 100]

    for (const h of hues) {
      for (const s of levels) {
        for (const l of levels) {
          const keywords = getVibeKeywords({ h, s, l })
          expect(keywords.length).toBeGreaterThanOrEqual(5)
          expect(new Set(keywords).size).toBe(keywords.length) // no duplicate keywords
          for (const word of keywords) {
            expect(word.length).toBeGreaterThan(0)
            expect(word).toMatch(/^[a-z]+$/) // plain-English, lowercase, no Korean/AI-punctuation
          }
        }
      }
    }
  })

  it('maps a warm, vivid, bright HSL to its 6-bin hue x 5-bin saturation x 5-bin lightness vocabulary', () => {
    expect(getVibeKeywords({ h: 30, s: 70, l: 80 })).toEqual([
      'fiery',
      'sunny',
      'vivid',
      'lush',
      'radiant',
      'luminous',
    ])
  })

  it('maps a cool, muted, dark HSL to its 6-bin hue x 5-bin saturation x 5-bin lightness vocabulary', () => {
    expect(getVibeKeywords({ h: 240, s: 10, l: 20 })).toEqual([
      'dreamy',
      'mystic',
      'muted',
      'faded',
      'deep',
      'moody',
    ])
  })

  it('maps a mid-hue, mid-saturation, mid-lightness HSL to its 6-bin hue x 5-bin saturation x 5-bin lightness vocabulary', () => {
    expect(getVibeKeywords({ h: 120, s: 45, l: 50 })).toEqual([
      'verdant',
      'minty',
      'balanced',
      'even',
      'grounded',
      'steady',
    ])
  })

  // grain-2 decision record: sat/lightness split into 5 bins (20 points each)
  // and hue into 6 bins (60deg each) so the keyword-*set* itself has 150
  // possible combinations, comfortably clearing the 100+ unique keyword-set
  // requirement (M3) across a representative HSL sample.
  it('produces at least 100 unique keyword sets across a 900-sample HSL grid (grain-2 M3)', () => {
    const samples: HSL[] = []
    for (let h = 0; h < 360; h += 10) {
      for (const s of [10, 30, 50, 70, 90]) {
        for (const l of [10, 30, 50, 70, 90]) {
          samples.push({ h, s, l })
        }
      }
    }
    expect(samples.length).toBe(900)

    const keywordSets = new Set(
      samples.map((hsl) => getVibeKeywords(hsl).slice().sort().join(',')),
    )
    expect(keywordSets.size).toBeGreaterThanOrEqual(100)

    // M5: keyword-count contract (>=5) holds for every sample, not just the
    // handful covered by the band-grid test above.
    for (const hsl of samples) {
      expect(getVibeKeywords(hsl).length).toBeGreaterThanOrEqual(5)
    }
  })

  it('is deterministic across repeated calls for the same HSL input (grain-2 M4)', () => {
    const hsl: HSL = { h: 217, s: 63, l: 52 }
    const results = Array.from({ length: 10 }, () => getVibeKeywords(hsl).join(','))
    expect(new Set(results).size).toBe(1)
  })
})

describe('matchAesthetic', () => {
  it('exposes exactly 10 aesthetic archetypes', () => {
    expect(AESTHETIC_ARCHETYPES).toHaveLength(10)
  })

  it('every archetype name is unique', () => {
    const names = new Set(AESTHETIC_ARCHETYPES.map((a) => a.name))
    expect(names.size).toBe(AESTHETIC_ARCHETYPES.length)
  })

  it('is a pure function: the same HSL input always yields the same result', () => {
    const hsl: HSL = { h: 165, s: 70, l: 50 }
    expect(matchAesthetic(hsl)).toBe(matchAesthetic({ ...hsl }))
  })

  it('returns the exact archetype name when the input HSL equals that archetype center (distance 0, well within threshold)', () => {
    const tropical = AESTHETIC_ARCHETYPES.find((a) => a.name === 'Tropical')!
    expect(matchAesthetic(tropical.hsl)).toBe('Tropical')
  })

  it('returns the closest archetype name for an HSL near - but not exactly at - a center', () => {
    const tropical = AESTHETIC_ARCHETYPES.find((a) => a.name === 'Tropical')!
    const nearby: HSL = { h: tropical.hsl.h + 3, s: tropical.hsl.s - 2, l: tropical.hsl.l + 2 }
    expect(matchAesthetic(nearby)).toBe('Tropical')
  })

  it('returns only a single name (never an array/multiple candidates) on match', () => {
    const tropical = AESTHETIC_ARCHETYPES.find((a) => a.name === 'Tropical')!
    const result = matchAesthetic(tropical.hsl)
    expect(typeof result).toBe('string')
  })

  it('returns null when every archetype is farther than the threshold (M-5: no match displayed when outside threshold)', () => {
    // Averaged HSL of a very dark, fully-saturated yellow-green brand color -
    // this lands ~79 distance from its nearest archetype (Earth Tone), far above
    // the threshold; verified via the calibration used to derive this fixture.
    const farFromEverything: HSL = { h: 89.41, s: 100, l: 12 }
    expect(matchAesthetic(farFromEverything)).toBeNull()
  })

  it('is deterministic for a palette-derived average HSL', () => {
    const palette = generatePalette('#3366ff')!
    const avg = averageHsl(palette)
    expect(matchAesthetic(avg)).toBe(matchAesthetic(avg))
  })
})

// grain-2: full-pipeline scenario tests for spec A's M-4/M-5, driven by
// concrete brand-color HEX fixtures through the *entire* real path
// (generatePalette -> averageHsl -> getMoodTags/matchAesthetic) rather than
// hand-built HSL values - this is what "every generated palette" in M-4/M-5's
// wording actually means, distinct from the HSL-input unit tests above.
// Every (hex -> expected match/null) pairing below was verified against this
// module's own implementation before being hard-coded here (a throwaway
// calibration script printed generatePalette(hex) -> averageHsl ->
// matchAesthetic/getMoodTags for each candidate hex; the script itself was
// never committed - only the confirmed hex/expectation pairs were kept).
describe('M-4/M-5 scenarios: concrete hex fixtures through the full generatePalette pipeline', () => {
  // Brand colors deliberately spread across hue (warm/cool/neutral),
  // saturation, and lightness so this is not just re-testing one region of
  // the H/S/L space that happens to work.
  const DIVERSE_BRAND_HEXES = [
    '#3366ff', // cool, vivid, mid-lightness blue
    '#ff6600', // warm, vivid, mid-lightness orange
    '#33cc99', // neutral-hue, mid-saturation teal/green
    '#996633', // warm, mid-saturation, mid-dark brown
    '#e0e0e0', // near-neutral, low-saturation, high-lightness gray
    '#1a1a2e', // cool, low-mid saturation, low-lightness near-black
  ] as const

  it('M-4: every generated palette (across diverse brand hex fixtures) yields 1-2 non-empty mood tags', () => {
    for (const hex of DIVERSE_BRAND_HEXES) {
      const palette = generatePalette(hex)
      expect(palette).not.toBeNull()

      const avg = averageHsl(palette!)
      const tags = getMoodTags(avg)

      expect(tags.length).toBeGreaterThanOrEqual(1)
      expect(tags.length).toBeLessThanOrEqual(2)
      tags.forEach((tag) => expect(tag.length).toBeGreaterThan(0))
      expect(new Set(tags).size).toBe(tags.length) // no duplicate tags
    }
  })

  it('M-4: mood tags are produced for every one of a brand color\'s 5 generation-mode palettes', () => {
    for (const mode of GENERATION_MODES) {
      const palette = generatePalette('#3366ff', mode)!
      const tags = getMoodTags(averageHsl(palette))
      expect(tags.length).toBeGreaterThanOrEqual(1)
      expect(tags.length).toBeLessThanOrEqual(2)
    }
  })

  it('M-5 (in-threshold branch): shows exactly one archetype name for brand hexes whose generated-palette average HSL lands close to an archetype center', () => {
    const IN_THRESHOLD_FIXTURES: Array<[string, string]> = [
      ['#33cc99', 'Tropical'],
      ['#996633', 'Earth Tone'],
      ['#5b3a29', 'Dark Academia'],
      ['#9fb8cc', 'Coastal'],
    ]

    for (const [hex, expectedName] of IN_THRESHOLD_FIXTURES) {
      const palette = generatePalette(hex)!
      const avg = averageHsl(palette)
      expect(matchAesthetic(avg)).toBe(expectedName)
    }
  })

  it('M-5 (out-of-threshold branch): shows no archetype name for brand hexes whose generated-palette average HSL is far from every archetype center', () => {
    const OUT_OF_THRESHOLD_FIXTURES = ['#3366ff', '#ff6600']

    for (const hex of OUT_OF_THRESHOLD_FIXTURES) {
      const palette = generatePalette(hex)!
      const avg = averageHsl(palette)
      expect(matchAesthetic(avg)).toBeNull()
    }
  })
})

describe('generateShades', () => {
  const base: HSL = { h: 210, s: 60, l: 45 }

  it('returns SHADE_STEPS colors', () => {
    expect(generateShades(base)).toHaveLength(SHADE_STEPS)
    expect(SHADE_STEPS).toBe(5)
  })

  it('holds hue and saturation fixed, stepping only lightness, lightest first', () => {
    const shades = generateShades(base)
    for (const shade of shades) {
      expect(shade.hsl.h).toBeCloseTo(base.h)
      expect(shade.hsl.s).toBeCloseTo(base.s)
    }
    for (let i = 1; i < shades.length; i += 1) {
      expect(shades[i].hsl.l).toBeLessThan(shades[i - 1].hsl.l)
    }
  })

  it('spans a fixed lightness range regardless of the base color own lightness', () => {
    const light = generateShades({ h: 0, s: 50, l: 95 })
    const dark = generateShades({ h: 0, s: 50, l: 5 })
    expect(light.map((c) => c.hsl.l)).toEqual(dark.map((c) => c.hsl.l))
  })

  it('is deterministic: the same base always returns the same ramp', () => {
    expect(generateShades(base)).toEqual(generateShades({ ...base }))
  })

  it('returns valid, in-range hex/rgb/hsl for every step', () => {
    for (const shade of generateShades(base)) {
      expect(shade.hex).toMatch(/^#[0-9a-f]{6}$/)
      expect(Number.isNaN(shade.hsl.h)).toBe(false)
      expect(shade.hsl.s).toBeGreaterThanOrEqual(0)
      expect(shade.hsl.s).toBeLessThanOrEqual(100)
      expect(shade.hsl.l).toBeGreaterThanOrEqual(0)
      expect(shade.hsl.l).toBeLessThanOrEqual(100)
    }
  })

  it('produces different ramps for different base hues', () => {
    const blue = generateShades({ h: 210, s: 60, l: 50 })
    const red = generateShades({ h: 0, s: 60, l: 50 })
    expect(blue.map((c) => c.hex)).not.toEqual(red.map((c) => c.hex))
  })
})

describe('getHarmonyColors', () => {
  const base: HSL = { h: 40, s: 60, l: 50 }

  it('exposes exactly the 3 harmony types, in a stable order', () => {
    expect(HARMONY_TYPES).toEqual(['complementary', 'analogous', 'triadic'])
  })

  it('complementary returns exactly 1 accent, at the opposite hue (+180deg)', () => {
    const accents = getHarmonyColors(base, 'complementary')
    expect(accents).toHaveLength(1)
    expect(accents[0].hsl.h).toBeCloseTo(220)
    expect(accents[0].hsl.s).toBeCloseTo(base.s)
    expect(accents[0].hsl.l).toBeCloseTo(base.l)
  })

  it('analogous returns exactly 2 accents, at +/-30deg from the base hue', () => {
    const accents = getHarmonyColors(base, 'analogous')
    expect(accents).toHaveLength(2)
    expect(accents[0].hsl.h).toBeCloseTo(70)
    expect(accents[1].hsl.h).toBeCloseTo(10)
  })

  it('triadic returns exactly 2 accents, evenly spaced 120deg from the base hue', () => {
    const accents = getHarmonyColors(base, 'triadic')
    expect(accents).toHaveLength(2)
    expect(accents[0].hsl.h).toBeCloseTo(160)
    expect(accents[1].hsl.h).toBeCloseTo(280)
  })

  it('wraps hues into [0, 360) rather than returning negative or >=360 values', () => {
    const nearZero: HSL = { h: 10, s: 50, l: 50 }
    const accents = getHarmonyColors(nearZero, 'analogous')
    // 10 - 30 = -20, must normalize to 340
    expect(accents[1].hsl.h).toBeCloseTo(340)
  })

  it('is deterministic: the same base/harmony pair always returns the same colors', () => {
    expect(getHarmonyColors(base, 'triadic')).toEqual(getHarmonyColors({ ...base }, 'triadic'))
  })

  it('every harmony type returns colors matching valid hex output', () => {
    for (const harmony of HARMONY_TYPES) {
      for (const color of getHarmonyColors(base, harmony)) {
        expect(color.hex).toMatch(/^#[0-9a-f]{6}$/)
      }
    }
  })
})

describe('getPaletteName', () => {
  it('is deterministic: the same HSL input always yields the same name', () => {
    const hsl: HSL = { h: 165, s: 70, l: 50 }
    expect(getPaletteName(hsl)).toBe(getPaletteName({ ...hsl }))
  })

  // grain-2: the name is now "{modifier} {archetype}" (a modifier prefix
  // combined with the archetype matchAesthetic resolves), not the bare
  // archetype name - so this checks the name still ends with/contains the
  // matched archetype rather than being an exact match to it.
  it('ends with the matched archetype name when matchAesthetic finds one', () => {
    const tropical = AESTHETIC_ARCHETYPES.find((a) => a.name === 'Tropical')!
    expect(matchAesthetic(tropical.hsl)).toBe('Tropical')
    expect(getPaletteName(tropical.hsl).endsWith(matchAesthetic(tropical.hsl)!)).toBe(true)
  })

  it('includes DEFAULT_PALETTE_NAME when matchAesthetic returns null (no archetype within threshold)', () => {
    // Same "far from every archetype" fixture matchAesthetic's own test suite uses.
    const farFromEverything: HSL = { h: 89.41, s: 100, l: 12 }
    expect(matchAesthetic(farFromEverything)).toBeNull()
    expect(getPaletteName(farFromEverything).endsWith(DEFAULT_PALETTE_NAME)).toBe(true)
  })

  it('always returns a non-empty string, matched or fallback', () => {
    const matched = getPaletteName(AESTHETIC_ARCHETYPES[0].hsl)
    const fallback = getPaletteName({ h: 89.41, s: 100, l: 12 })
    expect(matched.length).toBeGreaterThan(0)
    expect(fallback.length).toBeGreaterThan(0)
  })

  // grain-2 decision record: modifier is deliberately independent of
  // archetype-match variety (12 hue bins x 16 saturation/lightness bins =
  // 192 unique modifier phrases alone) precisely so the 100+ unique name
  // requirement (M1) holds even when most sampled colors fall back to
  // DEFAULT_PALETTE_NAME rather than matching one of the 10 archetypes.
  it('produces at least 100 unique names across a 900-sample HSL grid (grain-2 M1)', () => {
    const samples: HSL[] = []
    for (let h = 0; h < 360; h += 10) {
      for (const s of [10, 30, 50, 70, 90]) {
        for (const l of [10, 30, 50, 70, 90]) {
          samples.push({ h, s, l })
        }
      }
    }
    expect(samples.length).toBe(900)

    const names = new Set(samples.map((hsl) => getPaletteName(hsl)))
    expect(names.size).toBeGreaterThanOrEqual(100)
  })

  it('is deterministic across repeated calls for the same HSL input (grain-2 M4)', () => {
    const hsl: HSL = { h: 217, s: 63, l: 52 }
    const results = Array.from({ length: 10 }, () => getPaletteName(hsl))
    expect(new Set(results).size).toBe(1)
  })
})

describe('getPaletteDescription', () => {
  const base: HSL = { h: 165, s: 70, l: 50 }

  it('is deterministic: the same HSL input always yields the same sentences', () => {
    expect(getPaletteDescription(base)).toEqual(getPaletteDescription({ ...base }))
  })

  it('returns at least 1 non-empty sentence', () => {
    const sentences = getPaletteDescription(base)
    expect(sentences.length).toBeGreaterThanOrEqual(1)
    for (const sentence of sentences) {
      expect(typeof sentence).toBe('string')
      expect(sentence.length).toBeGreaterThan(0)
    }
  })

  it('opens with the same name getPaletteName returns for the same HSL', () => {
    const sentences = getPaletteDescription(base)
    expect(sentences[0].startsWith(getPaletteName(base))).toBe(true)
  })

  it('produces different descriptions for meaningfully different HSL inputs', () => {
    const warm = getPaletteDescription({ h: 20, s: 80, l: 55 })
    const cool = getPaletteDescription({ h: 210, s: 80, l: 55 })
    expect(warm).not.toEqual(cool)
  })

  it('still returns non-empty sentences when matchAesthetic finds no archetype (fallback name path)', () => {
    const farFromEverything: HSL = { h: 89.41, s: 100, l: 12 }
    const sentences = getPaletteDescription(farFromEverything)
    expect(sentences.length).toBeGreaterThanOrEqual(1)
    expect(sentences[0].includes(DEFAULT_PALETTE_NAME)).toBe(true)
  })

  it('is deterministic for a palette-derived average HSL', () => {
    const palette = generatePalette('#3366ff')!
    const avg = averageHsl(palette)
    expect(getPaletteDescription(avg)).toEqual(getPaletteDescription({ ...avg }))
  })

  // grain-2 decision record: sentence 1 embeds getPaletteName's output
  // verbatim, and that name alone spans 192 unique modifier phrases, so the
  // description inherits 100+ unique combinations across a representative
  // HSL sample without needing its own independent vocabulary expansion.
  it('produces at least 100 unique descriptions across a 900-sample HSL grid (grain-2 M2)', () => {
    const samples: HSL[] = []
    for (let h = 0; h < 360; h += 10) {
      for (const s of [10, 30, 50, 70, 90]) {
        for (const l of [10, 30, 50, 70, 90]) {
          samples.push({ h, s, l })
        }
      }
    }
    expect(samples.length).toBe(900)

    const descriptions = new Set(samples.map((hsl) => getPaletteDescription(hsl).join('\n')))
    expect(descriptions.size).toBeGreaterThanOrEqual(100)
  })

  it('is deterministic across repeated calls for the same HSL input (grain-2 M4)', () => {
    const hsl: HSL = { h: 217, s: 63, l: 52 }
    const results = Array.from({ length: 10 }, () => getPaletteDescription(hsl).join('\n'))
    expect(new Set(results).size).toBe(1)
  })
})
