/**
 * Pure HEX/RGB <-> HSL color math and 5-color palette generation.
 *
 * No UI, no state, no side effects. Every function here is deterministic:
 * the same input always produces the same output. This module is the
 * "brand main color in -> 5 color palette out" engine described in
 * spec A (Color Generator).
 */

export interface RGB {
  r: number
  g: number
  b: number
}

export interface HSL {
  h: number // 0-360
  s: number // 0-100
  l: number // 0-100
}

export interface PaletteColor {
  hex: string
  rgb: RGB
  hsl: HSL
}

/** Fixed array index the brand main color always occupies in a generated palette. */
export const BRAND_SLOT_INDEX = 0

/** Number of colors a generated palette always contains. */
export const PALETTE_SIZE = 5

/**
 * The 5 palette generation modes from spec A, each a standard color-wheel
 * harmony theory rather than an arbitrary axis. Every
 * mode is a fixed set of HSL arithmetic rules (no AI, no randomness at the
 * base level) that maps the same brand HSL to a different set of 4 derived
 * colors:
 *
 * - `complementary`: brand hue and its opposite (hue + 180) each get a
 *   lighter/darker pair.
 * - `analogous`: the two neighboring hues (hue ± 30) each get a
 *   lighter/darker pair.
 * - `triadic`: the two hues 120° apart on the wheel (hue + 120,
 *   hue + 240) each get a lighter/darker pair.
 * - `splitComplementary`: the two hues flanking the complement
 *   (hue + 150, hue + 210) each get a lighter/darker pair.
 * - `monochromatic`: hue and saturation held fixed at the
 *   brand's own values; only lightness varies, across 4 steps around the
 *   brand's own lightness.
 */
export type GenerationMode =
  | 'complementary'
  | 'analogous'
  | 'triadic'
  | 'splitComplementary'
  | 'monochromatic'

/** All generation modes, in a stable display order. */
export const GENERATION_MODES: GenerationMode[] = [
  'complementary',
  'analogous',
  'triadic',
  'splitComplementary',
  'monochromatic',
]

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

/** Normalizes a hue value into the [0, 360) range. */
function normalizeHue(h: number): number {
  const wrapped = h % 360
  return wrapped < 0 ? wrapped + 360 : wrapped
}

const HEX3_RE = /^#?([0-9a-f])([0-9a-f])([0-9a-f])$/i
const HEX6_RE = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i

/**
 * Parses a HEX color string (`#fff`, `fff`, `#ffffff`, `ffffff`) into RGB.
 * Returns null when the input is not a valid HEX color.
 */
export function hexToRgb(hex: string): RGB | null {
  const trimmed = hex.trim()

  const match6 = HEX6_RE.exec(trimmed)
  if (match6) {
    return {
      r: parseInt(match6[1], 16),
      g: parseInt(match6[2], 16),
      b: parseInt(match6[3], 16),
    }
  }

  const match3 = HEX3_RE.exec(trimmed)
  if (match3) {
    return {
      r: parseInt(match3[1] + match3[1], 16),
      g: parseInt(match3[2] + match3[2], 16),
      b: parseInt(match3[3] + match3[3], 16),
    }
  }

  return null
}

/** Converts RGB (0-255 each) into a lowercase `#rrggbb` HEX string. */
export function rgbToHex({ r, g, b }: RGB): string {
  const toHex = (channel: number) =>
    clamp(Math.round(channel), 0, 255).toString(16).padStart(2, '0')
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`
}

/**
 * Parses an RGB string in the form `rgb(r, g, b)` or `r, g, b` into RGB.
 * Returns null when the input is not a valid RGB triplet in [0, 255].
 */
export function parseRgbString(input: string): RGB | null {
  const trimmed = input.trim()
  const inner = /^rgba?\(([^)]+)\)$/i.exec(trimmed)?.[1] ?? trimmed
  const parts = inner.split(',').map((part) => part.trim())

  if (parts.length !== 3 && parts.length !== 4) return null

  const [r, g, b] = parts.map(Number)
  if ([r, g, b].some((n) => !Number.isFinite(n) || n < 0 || n > 255)) return null

  return { r, g, b }
}

/**
 * Parses either a HEX (`#3366ff`) or RGB (`rgb(51, 102, 255)` / `51,102,255`)
 * color string into RGB. Returns null when neither format matches.
 */
export function parseColorInput(input: string): RGB | null {
  return hexToRgb(input) ?? parseRgbString(input)
}

/** Converts RGB (0-255 each) into HSL (h: 0-360, s/l: 0-100). */
export function rgbToHsl({ r, g, b }: RGB): HSL {
  const rn = r / 255
  const gn = g / 255
  const bn = b / 255

  const max = Math.max(rn, gn, bn)
  const min = Math.min(rn, gn, bn)
  const delta = max - min

  let h = 0
  if (delta !== 0) {
    if (max === rn) {
      h = 60 * (((gn - bn) / delta) % 6)
    } else if (max === gn) {
      h = 60 * ((bn - rn) / delta + 2)
    } else {
      h = 60 * ((rn - gn) / delta + 4)
    }
  }
  h = normalizeHue(h)

  const l = (max + min) / 2
  const s = delta === 0 ? 0 : delta / (1 - Math.abs(2 * l - 1))

  return { h, s: s * 100, l: l * 100 }
}

/** Converts HSL (h: 0-360, s/l: 0-100) into RGB (0-255 each, rounded). */
export function hslToRgb({ h, s, l }: HSL): RGB {
  const hn = normalizeHue(h)
  const sn = clamp(s, 0, 100) / 100
  const ln = clamp(l, 0, 100) / 100

  const c = (1 - Math.abs(2 * ln - 1)) * sn
  const x = c * (1 - Math.abs(((hn / 60) % 2) - 1))
  const m = ln - c / 2

  let [rp, gp, bp] = [0, 0, 0]
  if (hn < 60) [rp, gp, bp] = [c, x, 0]
  else if (hn < 120) [rp, gp, bp] = [x, c, 0]
  else if (hn < 180) [rp, gp, bp] = [0, c, x]
  else if (hn < 240) [rp, gp, bp] = [0, x, c]
  else if (hn < 300) [rp, gp, bp] = [x, 0, c]
  else [rp, gp, bp] = [c, 0, x]

  return {
    r: Math.round((rp + m) * 255),
    g: Math.round((gp + m) * 255),
    b: Math.round((bp + m) * 255),
  }
}

function hslToPaletteColor(hsl: HSL): PaletteColor {
  const normalized: HSL = {
    h: normalizeHue(hsl.h),
    s: clamp(hsl.s, 0, 100),
    l: clamp(hsl.l, 0, 100),
  }
  const rgb = hslToRgb(normalized)
  return { hex: rgbToHex(rgb), rgb, hsl: normalized }
}

/**
 * Generates the 4 supporting colors around a base HSL using fixed HSL
 * arithmetic offsets: a lighter tint, a darker shade, an analogous accent
 * (hue-shifted), and a muted/desaturated variant.
 */
function deriveSupportingColors(base: HSL): PaletteColor[] {
  const lighterTint: HSL = { h: base.h, s: base.s, l: clamp(base.l + 20, 0, 95) }
  const darkerShade: HSL = { h: base.h, s: base.s, l: clamp(base.l - 20, 5, 100) }
  const analogousAccent: HSL = {
    h: normalizeHue(base.h + 30),
    s: clamp(base.s, 15, 100),
    l: clamp(base.l - 10, 10, 90),
  }
  const mutedVariant: HSL = {
    h: base.h,
    s: clamp(base.s - 40, 10, 100),
    l: clamp(base.l + (base.l < 50 ? 15 : -15), 5, 95),
  }

  return [lighterTint, darkerShade, analogousAccent, mutedVariant].map(hslToPaletteColor)
}

/**
 * Builds the standard "one accent hue gets a lighter/darker pair" shape
 * shared by `complementary`/`analogous`/`triadic`/`splitComplementary`: the
 * brand hue itself is not repeated - only the two accent hues appear, each
 * as a tint (lighter) and a shade (darker) of the brand's own saturation.
 */
function tintShadePair(h: number, s: number, l: number): [HSL, HSL] {
  return [
    { h, s, l: clamp(l + 10, 5, 95) },
    { h, s, l: clamp(l - 10, 5, 95) },
  ]
}

/**
 * Fixed (non-jittered) HSL arithmetic rules for each `GenerationMode`. Given
 * the same base HSL, each mode returns 4 HSL values that are numerically
 * distinct from every other mode's output - this is what guarantees the 5
 * generation modes produce different palettes for the same brand color.
 *
 * Each mode implements one standard color-wheel harmony theory: the fixed
 * hue offset(s) below are the theory itself (complementary/analogous/triadic/
 * split-complementary/monochromatic), not an arbitrary choice.
 */
function deriveHslByMode(base: HSL, mode: GenerationMode): HSL[] {
  switch (mode) {
    case 'complementary': {
      // Complementary: brand hue + its direct opposite (+180°).
      const complementHue = normalizeHue(base.h + 180)
      return [
        ...tintShadePair(base.h, base.s, base.l),
        ...tintShadePair(complementHue, base.s, base.l),
      ]
    }
    case 'analogous': {
      // Analogous: the two hues adjacent to the brand hue (±30°).
      return [
        ...tintShadePair(normalizeHue(base.h + 30), base.s, base.l),
        ...tintShadePair(normalizeHue(base.h - 30), base.s, base.l),
      ]
    }
    case 'triadic': {
      // Triadic: the two hues evenly spaced 120° apart (+120°/+240°).
      return [
        ...tintShadePair(normalizeHue(base.h + 120), base.s, base.l),
        ...tintShadePair(normalizeHue(base.h + 240), base.s, base.l),
      ]
    }
    case 'splitComplementary': {
      // Split complementary: the two hues flanking the direct complement (+150°/+210°).
      return [
        ...tintShadePair(normalizeHue(base.h + 150), base.s, base.l),
        ...tintShadePair(normalizeHue(base.h + 210), base.s, base.l),
      ]
    }
    case 'monochromatic': {
      // Monochromatic: hue and saturation held fixed, only lightness varies.
      const { h, s } = base
      return [30, 15, -15, -30].map((delta) => ({ h, s, l: clamp(base.l + delta, 5, 95) }))
    }
    default: {
      const exhaustive: never = mode
      throw new Error(`Unknown generation mode: ${String(exhaustive)}`)
    }
  }
}

/**
 * Same rule set as `deriveHslByMode`, jittered by an injectable `random`
 * source so repeated regeneration within a mode still varies while staying
 * within that mode's character (mirrors `deriveSupportingColorsVaried`).
 * Uses `jitterHue`/`jitterSL` (see below) so each unlocked slot gets its own
 * randomized hue swing width (up to +/-30deg) and its own, independently
 * randomized S/L deviation width rather than one shared jitter magnitude for
 * the whole palette.
 */
function deriveByModeVaried(base: HSL, mode: GenerationMode, random: () => number): PaletteColor[] {
  return deriveHslByMode(base, mode)
    .map((hsl) => ({
      h: normalizeHue(hsl.h + jitterHue(random)),
      s: clamp(hsl.s + jitterSL(random), 0, 100),
      l: clamp(hsl.l + jitterSL(random), 0, 100),
    }))
    .map(hslToPaletteColor)
}

/**
 * Generates a fixed-size 5-color palette from a brand main color input
 * (HEX or RGB string). The brand main color always occupies
 * `BRAND_SLOT_INDEX` in the returned array; the remaining 4 slots are
 * derived deterministically via HSL arithmetic. Returns null when the
 * input cannot be parsed as a color.
 *
 * When `mode` is omitted, the original fixed HSL offsets are used (kept for
 * backward compatibility with existing callers). When a `GenerationMode` is
 * passed, that mode's rules (see `GenerationMode`) drive the 4 derived
 * colors instead, so each of the 5 modes yields a different palette for the
 * same brand input.
 */
export function generatePalette(input: string, mode?: GenerationMode): PaletteColor[] | null {
  const rgb = parseColorInput(input)
  if (!rgb) return null

  const hsl = rgbToHsl(rgb)
  const brand: PaletteColor = { hex: rgbToHex(rgb), hsl, rgb }
  const supporting = mode
    ? deriveHslByMode(hsl, mode).map(hslToPaletteColor)
    : deriveSupportingColors(hsl)

  const palette: PaletteColor[] = []
  let supportingIndex = 0
  for (let slot = 0; slot < PALETTE_SIZE; slot += 1) {
    palette.push(slot === BRAND_SLOT_INDEX ? brand : supporting[supportingIndex++])
  }

  return palette
}

/**
 * Per-slot lock state for a generated palette. `locks[slot] === true` means
 * that slot's color must survive a regeneration unchanged.
 */
export type Locks = boolean[]

/**
 * Builds the initial lock state for a freshly generated palette: only the
 * brand main color slot (`BRAND_SLOT_INDEX`) starts locked, every derived
 * slot starts unlocked.
 */
export function createInitialLocks(): Locks {
  return Array.from({ length: PALETTE_SIZE }, (_, slot) => slot === BRAND_SLOT_INDEX)
}

/** Returns a pseudo-random offset in the range [-range, range] using the injected `random`. */
function randomOffset(random: () => number, range: number): number {
  return (random() * 2 - 1) * range
}

/**
 * Hue jitter swing-width bounds (degrees). Regeneration no longer jitters
 * hue within one fixed magnitude - instead, for every jittered hue, a fresh
 * *range* is rolled from within [MIN, MAX] and the actual offset is drawn
 * from +/- that range. That two-step randomization (range, then offset
 * within it) is what makes the swing width itself vary between slots and
 * between regenerations - some land near a subtle 15deg nudge, others swing
 * close to the full 30deg - rather than every jitter looking like uniform
 * noise of the same width.
 */
const HUE_JITTER_MIN_RANGE = 15
const HUE_JITTER_MAX_RANGE = 30

/** Draws one randomized-width hue offset; see `HUE_JITTER_MIN_RANGE`/`_MAX_RANGE`. */
function jitterHue(random: () => number): number {
  const range = HUE_JITTER_MIN_RANGE + random() * (HUE_JITTER_MAX_RANGE - HUE_JITTER_MIN_RANGE)
  return randomOffset(random, range)
}

/**
 * Saturation/lightness jitter swing-width bounds (percentage points), same
 * randomized-range-then-offset shape as `jitterHue`. Every call rolls its
 * own width independently, so S/L deviation is differentiated per slot (and
 * per channel) instead of every slot sharing one flat jitter magnitude.
 */
const SL_JITTER_MIN_RANGE = 5
const SL_JITTER_MAX_RANGE = 20

/** Draws one randomized-width saturation/lightness offset; see `SL_JITTER_MIN_RANGE`/`_MAX_RANGE`. */
function jitterSL(random: () => number): number {
  const range = SL_JITTER_MIN_RANGE + random() * (SL_JITTER_MAX_RANGE - SL_JITTER_MIN_RANGE)
  return randomOffset(random, range)
}

/**
 * Same fixed HSL arithmetic as `deriveSupportingColors`, but each offset is
 * jittered by an injectable `random` source (defaults to `Math.random`) so
 * repeated regeneration produces varied - but still harmonious - results.
 * Passing a seeded/deterministic `random` makes the output reproducible,
 * which is what regeneration tests rely on. Hue jitter (`jitterHue`) only
 * applies to `analogousAccent`, mirroring the non-jittered rule's own shape
 * where only that slot's hue is offset from the base; S/L jitter (`jitterSL`)
 * is rolled independently per field so deviation width differs slot-to-slot.
 */
function deriveSupportingColorsVaried(base: HSL, random: () => number): PaletteColor[] {
  const lighterTint: HSL = { h: base.h, s: base.s, l: clamp(base.l + 20 + jitterSL(random), 0, 95) }
  const darkerShade: HSL = { h: base.h, s: base.s, l: clamp(base.l - 20 + jitterSL(random), 5, 100) }
  const analogousAccent: HSL = {
    h: normalizeHue(base.h + 30 + jitterHue(random)),
    s: clamp(base.s + jitterSL(random), 15, 100),
    l: clamp(base.l - 10 + jitterSL(random), 10, 90),
  }
  const mutedVariant: HSL = {
    h: base.h,
    s: clamp(base.s - 40 + jitterSL(random), 10, 100),
    l: clamp(base.l + (base.l < 50 ? 15 : -15) + jitterSL(random), 5, 95),
  }

  return [lighterTint, darkerShade, analogousAccent, mutedVariant].map(hslToPaletteColor)
}

/**
 * Directly overrides a single palette slot with a user-chosen HEX color
 * (e.g. from a color picker). Any slot - including the brand main color at
 * `BRAND_SLOT_INDEX` - can be edited this way; there is no special-casing
 * for the brand slot.
 *
 * - When `hexInput` is a valid HEX color and `index` is within bounds, returns
 *   a new palette array with only that slot replaced by a freshly computed
 *   `PaletteColor` (hex/rgb/hsl all recalculated from the input). All other
 *   slots are the same object references as in the input `palette`.
 * - When `hexInput` is not a valid HEX color, or `index` is out of range,
 *   returns the original `palette` unchanged (same reference).
 */
export function updateSlotColor(
  palette: PaletteColor[],
  index: number,
  hexInput: string,
): PaletteColor[] {
  if (index < 0 || index >= palette.length) return palette

  const rgb = hexToRgb(hexInput)
  if (!rgb) return palette

  const hsl = rgbToHsl(rgb)
  const updated: PaletteColor = { hex: rgbToHex(rgb), rgb, hsl }

  const result = palette.slice()
  result[index] = updated
  return result
}

/**
 * Recomputes a palette while respecting per-slot locks.
 *
 * - The brand main color slot (`BRAND_SLOT_INDEX`) always reflects the
 *   current `brandInput`, regardless of its lock state.
 * - Locked derived slots keep their existing color from `palette` unchanged.
 * - Unlocked derived slots are recomputed via jittered HSL arithmetic, using
 *   `random` (defaults to `Math.random`) as the source of variation so
 *   callers can inject a seeded generator for deterministic tests.
 *
 * When `mode` is omitted, the original fixed offsets are used (unchanged
 * behavior for existing callers). When a `GenerationMode` is passed, the
 * unlocked slots are derived using that mode's rules instead.
 *
 * Returns null when `brandInput` cannot be parsed as a color.
 */
export function regeneratePalette(
  palette: PaletteColor[],
  brandInput: string,
  locks: Locks,
  random: () => number = Math.random,
  mode?: GenerationMode,
): PaletteColor[] | null {
  const rgb = parseColorInput(brandInput)
  if (!rgb) return null

  const hsl = rgbToHsl(rgb)
  const brand: PaletteColor = { hex: rgbToHex(rgb), hsl, rgb }
  const varied = mode
    ? deriveByModeVaried(hsl, mode, random)
    : deriveSupportingColorsVaried(hsl, random)

  const result: PaletteColor[] = []
  let derivedIndex = 0
  for (let slot = 0; slot < PALETTE_SIZE; slot += 1) {
    if (slot === BRAND_SLOT_INDEX) {
      result.push(brand)
      continue
    }

    const variedColor = varied[derivedIndex]
    derivedIndex += 1
    const isLocked = locks[slot] ?? false
    result.push(isLocked ? palette[slot] : variedColor)
  }

  return result
}

/**
 * The 3 color-wheel harmony types the Color Study section's harmony
 * explorer lets a user step through (grain-2). Deliberately a distinct,
 * smaller type from `GenerationMode` above: this is the "explore accent
 * hues around one base color" tool (no tint/shade split, no jitter, no
 * palette-slot mutation), not the 5-color palette generator.
 */
export type HarmonyType = 'complementary' | 'analogous' | 'triadic'

/** All harmony types, in a stable display order. */
export const HARMONY_TYPES: HarmonyType[] = ['complementary', 'analogous', 'triadic']

/**
 * Pure HSL arithmetic for the harmony explorer (grain-2): given a base HSL
 * and one of the 3 `HarmonyType`s, returns the accent color(s) that harmony
 * theory places around the base hue, at the base's own saturation/lightness
 * (no tint/shade pairing - that's `deriveHslByMode`'s job for the 5-color
 * palette generator, and shade variation is a later grain's "Shades"
 * visualization, out of scope here).
 *
 * - `complementary`: 1 accent, the hue directly opposite the base (+180deg).
 * - `analogous`: 2 accents, the hues neighboring the base (+/-30deg).
 * - `triadic`: 2 accents, the hues evenly spaced 120deg from the base
 *   (+120deg/+240deg).
 *
 * Deterministic: the same `base`/`harmony` pair always returns the same
 * colors, so toggling harmony types is a pure recomputation, not a
 * randomized regenerate.
 */
export function getHarmonyColors(base: HSL, harmony: HarmonyType): PaletteColor[] {
  const accentHues: number[] = (() => {
    switch (harmony) {
      case 'complementary':
        return [base.h + 180]
      case 'analogous':
        return [base.h + 30, base.h - 30]
      case 'triadic':
        return [base.h + 120, base.h + 240]
      default: {
        const exhaustive: never = harmony
        throw new Error(`Unknown harmony type: ${String(exhaustive)}`)
      }
    }
  })()

  return accentHues.map((h) => hslToPaletteColor({ h: normalizeHue(h), s: base.s, l: base.l }))
}

/**
 * Fixed lightness levels (0-100, lightest first) `generateShades` samples to
 * build one color's shade ramp (grain-3: Color Study "Shades" visualization).
 * Deliberately absolute (not relative to the input color's own lightness) so
 * every ramp - for the base color or for any harmony accent - spans the same
 * visible lightness range and reads as one consistent ladder, the way a
 * conventional 50/100/.../900 design-token shade scale does.
 */
const SHADE_LIGHTNESS_LEVELS = [90, 70, 50, 30, 10]

/** Number of steps `generateShades` always returns. */
export const SHADE_STEPS = SHADE_LIGHTNESS_LEVELS.length

/**
 * Generates a fixed-size lightness-step ramp ("Shades") for one HSL color:
 * hue and saturation held fixed at `base`'s own values, lightness stepped
 * across `SHADE_LIGHTNESS_LEVELS`. Pure and deterministic - the same `base`
 * always returns the same `SHADE_STEPS`-length array, lightest first.
 *
 * Distinct from `deriveHslByMode`'s tint/shade *pair* (2 fixed offsets around
 * one lightness) and from `getHarmonyColors` (accent hues at the base's own
 * lightness) - this is the dedicated "vary lightness only, show the whole
 * ladder" tool for Color Study's Shades panel.
 */
export function generateShades(base: HSL): PaletteColor[] {
  return SHADE_LIGHTNESS_LEVELS.map((l) => hslToPaletteColor({ h: base.h, s: base.s, l }))
}

/**
 * Circular (vector) mean of a set of hue angles (degrees). A plain
 * arithmetic mean is wrong for hue because it wraps at 360 - e.g. averaging
 * 350 and 10 arithmetically gives 180 (the opposite side of the wheel) when
 * the perceptually correct answer is 0. Averaging each hue's unit vector
 * (cos, sin) and taking the angle back out handles the wraparound correctly.
 */
function circularMeanHue(hues: number[]): number {
  const radians = hues.map((h) => (normalizeHue(h) * Math.PI) / 180)
  const sumSin = radians.reduce((acc, r) => acc + Math.sin(r), 0)
  const sumCos = radians.reduce((acc, r) => acc + Math.cos(r), 0)
  const meanRad = Math.atan2(sumSin / radians.length, sumCos / radians.length)
  return normalizeHue((meanRad * 180) / Math.PI)
}

/**
 * Averages every color in a generated palette (brand slot included - spec A
 * "average H/S/L") into a single HSL summary used by `getMoodTags` (M-4). Hue is
 * averaged circularly via `circularMeanHue` since it is a wraparound angle;
 * saturation and lightness are plain arithmetic means.
 */
export function averageHsl(palette: PaletteColor[]): HSL {
  const h = circularMeanHue(palette.map((color) => color.hsl.h))
  const s = palette.reduce((sum, color) => sum + color.hsl.s, 0) / palette.length
  const l = palette.reduce((sum, color) => sum + color.hsl.l, 0) / palette.length
  return { h, s, l }
}

/**
 * Deterministic, non-AI adjective mood-tag lookup for spec A's "emotion/mood
 * tags" (M-4). Every boundary below is a fixed threshold chosen to divide
 * the H/S/L ranges into named bands - it is not derived from a cited study,
 * so each is marked "(assumption — needs confirmation)" per spec A's
 * instruction to flag assumed thresholds for confirmation.
 *
 * - H (hue temperature): warm/cool/neutral bands.
 * - S (saturation) x L (lightness): a 3x3 lookup table, chosen per spec A's
 *   cited rationale that saturation correlates with arousal and lightness
 *   correlates with valence in color-psychology research.
 */

// H hue-temperature band boundaries. 0-60°/300-360° (red-orange-magenta) is
// classified warm, 180-300° (cyan-blue-purple) is classified cool, and the
// range between (60-180°, yellow-green-cyan) is classified neutral.
const WARM_HUE_MAX = 60 // (assumption — needs confirmation)
const COOL_HUE_MIN = 180 // (assumption — needs confirmation)
const COOL_HUE_MAX = 300 // (assumption — needs confirmation)

function hueMoodWord(h: number): string {
  const hue = normalizeHue(h)
  if (hue >= COOL_HUE_MIN && hue < COOL_HUE_MAX) return 'Cold'
  if (hue >= WARM_HUE_MAX && hue < COOL_HUE_MIN) return 'Natural'
  return 'Warm'
}

type Band = 'low' | 'mid' | 'high'

// S saturation band boundaries (saturation-arousal correlation: high
// saturation = high arousal, low saturation = low arousal).
const LOW_SATURATION_MAX = 30 // (assumption — needs confirmation)
const HIGH_SATURATION_MIN = 60 // (assumption — needs confirmation)

function saturationBand(s: number): Band {
  if (s < LOW_SATURATION_MAX) return 'low'
  if (s >= HIGH_SATURATION_MIN) return 'high'
  return 'mid'
}

// L lightness band boundaries (lightness-valence correlation: high
// lightness = bright/positive valence, low lightness = heavy valence).
const LOW_LIGHTNESS_MAX = 35 // (assumption — needs confirmation)
const HIGH_LIGHTNESS_MIN = 65 // (assumption — needs confirmation)

function lightnessBand(l: number): Band {
  if (l < LOW_LIGHTNESS_MAX) return 'low'
  if (l >= HIGH_LIGHTNESS_MIN) return 'high'
  return 'mid'
}

/**
 * S (arousal) x L (valence) combination lookup table (assumption — needs
 * confirmation). Each cell is a fixed mapping to one adjective, based on the
 * saturation-arousal, lightness-valence correlation; changing a value only
 * requires updating this lookup table (no AI judgment involved).
 */
const SATURATION_LIGHTNESS_MOOD: Record<Band, Record<Band, string>> = {
  high: { high: 'Vibrant', mid: 'Dynamic', low: 'Intense' },
  mid: { high: 'Fresh', mid: 'Balanced', low: 'Heavy' },
  low: { high: 'Subtle', mid: 'Calm', low: 'Serene' },
}

function saturationLightnessMoodWord(s: number, l: number): string {
  return SATURATION_LIGHTNESS_MOOD[saturationBand(s)][lightnessBand(l)]
}

/**
 * Pure function: the same HSL input always yields the same 1-2 adjectives
 * (no AI, no randomness) - spec A's M-4 requirement. Combines a hue-based
 * color-temperature word with a saturation x lightness (arousal x valence)
 * word, each from the fixed lookup tables above. The two lookups draw from
 * disjoint vocabularies so they are deduped defensively in case a future
 * table edit makes them collide, but always return at least 1 word.
 */
export function getMoodTags(hsl: HSL): string[] {
  const hueWord = hueMoodWord(hsl.h)
  const slWord = saturationLightnessMoodWord(hsl.s, hsl.l)
  return hueWord === slWord ? [hueWord] : [hueWord, slWord]
}

/**
 * Band-index helpers for `getVibeKeywords`'s vocabulary lookup below.
 * Deliberately *not* `hueMoodWord`/`saturationBand`/`lightnessBand` (which
 * `getMoodTags` owns) - grain-2 ("100+ unique name/description/keyword-set
 * combinations") needs a finer partition of H/S/L than `getMoodTags`'s 3x3x3
 * grid can offer (only 27 cells, too few to reach the 100+ unique
 * keyword-*set* requirement across a representative HSL sample - see the
 * grain-2 decision record), so `getVibeKeywords` gets its own, more
 * fine-grained bands: hue split into 6 bins (60deg each) instead of 3
 * temperature bands, saturation/lightness each split into 5 bins (20 points
 * each) instead of 3. That is 6 x 5 x 5 = 150 possible band combinations -
 * kept entirely separate from `hueMoodWord`/`saturationBand`/`lightnessBand`
 * so `getMoodTags`'s existing thresholds and output are untouched.
 */
function vibeHueBandIndex(h: number): number {
  return Math.min(5, Math.floor(normalizeHue(h) / 60))
}

function vibeSaturationBandIndex(s: number): number {
  return Math.min(4, Math.floor(clamp(s, 0, 100) / 20))
}

function vibeLightnessBandIndex(l: number): number {
  return Math.min(4, Math.floor(clamp(l, 0, 100) / 20))
}

/**
 * Plain-English, non-expert-friendly vibe vocabulary for `getVibeKeywords`
 * (grain-2: "rich vibe-keyword generation logic", 100+ unique keyword-set
 * requirement). Every entry is "(assumption — needs confirmation)", same
 * status as `getMoodTags`'s bands and `AESTHETIC_ARCHETYPES` above - these
 * are reasonable emotional-adjective choices, not a cited vocabulary study.
 *
 * Deliberately a *separate* word bank from `getMoodTags`'s single-word-per-
 * axis output (`hueMoodWord`/`SATURATION_LIGHTNESS_MOOD`): `getMoodTags`
 * exists for the compact 1-2 word `MoodTag` pill display, while this bank
 * feeds the richer "keyword:" line - two words per band, one band per axis
 * (hue / saturation / lightness), so a normal HSL input contributes
 * 2+2+2 = 6 candidate words. 6 hue bins x 5 saturation bins x 5 lightness
 * bins = 150 possible band combinations, each with its own 2+2+2 word set.
 *
 * Every word across all three banks (32 words total: 6x2 + 5x2 + 5x2) is
 * unique (no word appears twice) by construction, which is what lets
 * `getVibeKeywords` guarantee 5+ *unique* adjectives without ever needing to
 * pad or repeat.
 */
const VIBE_HUE_WORDS: [string, string][] = [
  ['fiery', 'sunny'], // (assumption — needs confirmation) 0-60deg
  ['zesty', 'citrusy'], // (assumption — needs confirmation) 60-120deg
  ['verdant', 'minty'], // (assumption — needs confirmation) 120-180deg
  ['oceanic', 'breezy'], // (assumption — needs confirmation) 180-240deg
  ['dreamy', 'mystic'], // (assumption — needs confirmation) 240-300deg
  ['playful', 'romantic'], // (assumption — needs confirmation) 300-360deg
]

const VIBE_SATURATION_WORDS: [string, string][] = [
  ['muted', 'faded'], // (assumption — needs confirmation) 0-20%
  ['soft', 'gentle'], // (assumption — needs confirmation) 20-40%
  ['balanced', 'even'], // (assumption — needs confirmation) 40-60%
  ['vivid', 'lush'], // (assumption — needs confirmation) 60-80%
  ['bold', 'intense'], // (assumption — needs confirmation) 80-100%
]

const VIBE_LIGHTNESS_WORDS: [string, string][] = [
  ['shadowy', 'somber'], // (assumption — needs confirmation) 0-20%
  ['deep', 'moody'], // (assumption — needs confirmation) 20-40%
  ['grounded', 'steady'], // (assumption — needs confirmation) 40-60%
  ['airy', 'light'], // (assumption — needs confirmation) 60-80%
  ['radiant', 'luminous'], // (assumption — needs confirmation) 80-100%
]

/**
 * Pure function: the same HSL input always yields the same 6 unique,
 * plain-English emotional adjectives (no AI, no randomness) describing a
 * palette's vibe for users with no color-theory background. Same
 * hue/saturation/lightness axis structure `getMoodTags` established, but
 * with its own finer-grained bands (`vibeHueBandIndex`/
 * `vibeSaturationBandIndex`/`vibeLightnessBandIndex`, 6x5x5 = 150 cells) so
 * the keyword-*set* itself has 100+ unique combinations across a
 * representative HSL sample - see the grain-2 decision record.
 *
 * Always returns at least 5 (in practice exactly 6, since the 3 word banks
 * are disjoint by construction) unique adjectives, ready to be joined with
 * `', '` for the "keyword:" line - "5+ clear, emotional keywords on one line"
 * per spec.
 */
export function getVibeKeywords(hsl: HSL): string[] {
  const words = [
    ...VIBE_HUE_WORDS[vibeHueBandIndex(hsl.h)],
    ...VIBE_SATURATION_WORDS[vibeSaturationBandIndex(hsl.s)],
    ...VIBE_LIGHTNESS_WORDS[vibeLightnessBandIndex(hsl.l)],
  ]
  return Array.from(new Set(words))
}

/**
 * One aesthetic archetype's display name and center HSL for `matchAesthetic`
 * (spec A "Aesthetic name matching", M-5).
 */
export interface AestheticArchetype {
  name: string
  hsl: HSL
}

/**
 * 10 fixed aesthetic archetypes (10 predefined archetypes) with a
 * representative center HSL each. Every name and center value here is
 * "(assumption — needs confirmation)" - spec A explicitly calls out that the
 * archetype list, center values, and match threshold are all unconfirmed
 * assumptions to be validated later, not a cited/researched list. The 10
 * were picked to spread across common "aesthetic" vocabulary (mood-board
 * style categories) and across the hue wheel / saturation / lightness space
 * so a typical brand color has a meaningfully closest one rather than all 10
 * being equidistant.
 */
export const AESTHETIC_ARCHETYPES: AestheticArchetype[] = [
  { name: 'Pastel', hsl: { h: 330, s: 45, l: 88 } }, // (assumption — needs confirmation)
  { name: 'Minimal', hsl: { h: 210, s: 8, l: 95 } }, // (assumption — needs confirmation)
  { name: 'Vintage', hsl: { h: 35, s: 30, l: 58 } }, // (assumption — needs confirmation)
  { name: 'Neon', hsl: { h: 300, s: 95, l: 55 } }, // (assumption — needs confirmation)
  { name: 'Earth Tone', hsl: { h: 40, s: 45, l: 40 } }, // (assumption — needs confirmation)
  { name: 'Monochrome', hsl: { h: 0, s: 0, l: 50 } }, // (assumption — needs confirmation)
  { name: 'Dark Academia', hsl: { h: 25, s: 35, l: 22 } }, // (assumption — needs confirmation)
  { name: 'Tropical', hsl: { h: 165, s: 70, l: 50 } }, // (assumption — needs confirmation)
  { name: 'Luxury', hsl: { h: 270, s: 45, l: 30 } }, // (assumption — needs confirmation)
  { name: 'Coastal', hsl: { h: 200, s: 50, l: 65 } }, // (assumption — needs confirmation)
]

/**
 * Maximum HSL distance (see `hslDistance`) for `matchAesthetic` to still
 * report a match. Distances at or above this are treated as "no aesthetic is
 * actually close" per spec A's "never force an unsupported match to be
 * shown" principle. Unconfirmed assumption - "(assumption — needs
 * confirmation)".
 */
const AESTHETIC_MATCH_THRESHOLD = 45 // (assumption — needs confirmation)

/** Shortest angular distance between two hues (0-180), wraparound-aware. */
function hueDistance(a: number, b: number): number {
  const diff = Math.abs(normalizeHue(a) - normalizeHue(b)) % 360
  return Math.min(diff, 360 - diff)
}

/**
 * Combined HSL color distance between two HSL values, used to find the
 * closest aesthetic archetype. Hue uses the circular (wraparound-aware)
 * distance from `hueDistance` rather than plain subtraction - the same
 * wraparound concern `circularMeanHue` handles for averaging applies here,
 * since e.g. hue 350 and hue 10 are only 20deg apart, not 340. Saturation and
 * lightness use plain linear distance. The three are combined via Euclidean
 * distance; there is no cited perceptual color-distance formula backing this
 * combination - it is a reasonable "(assumption — needs confirmation)" choice, same as the
 * archetype centers and threshold above.
 */
function hslDistance(a: HSL, b: HSL): number {
  const hDelta = hueDistance(a.h, b.h)
  const sDelta = a.s - b.s
  const lDelta = a.l - b.l
  return Math.sqrt(hDelta * hDelta + sDelta * sDelta + lDelta * lDelta)
}

/**
 * Pure function: compares `hsl` (typically `averageHsl(palette)`) against
 * every `AESTHETIC_ARCHETYPES` center by `hslDistance` and returns only the
 * single closest archetype's name (spec A's "show only 1 name on a match (no
 * multiple simultaneous candidates)", M-5). When even the closest
 * archetype's distance is at or above `AESTHETIC_MATCH_THRESHOLD`, returns
 * `null` instead - spec A's "display nothing when the distance is at or
 * above the threshold": an aesthetic match is only ever asserted when
 * something is actually close, never forced.
 */
export function matchAesthetic(hsl: HSL): string | null {
  let closest: { name: string; distance: number } | null = null

  for (const archetype of AESTHETIC_ARCHETYPES) {
    const distance = hslDistance(hsl, archetype.hsl)
    if (!closest || distance < closest.distance) {
      closest = { name: archetype.name, distance }
    }
  }

  if (!closest || closest.distance >= AESTHETIC_MATCH_THRESHOLD) return null
  return closest.name
}

/**
 * Fallback display name for the Palette Description panel (grain-2) when
 * `matchAesthetic` finds no archetype close enough to name (distance at or
 * above `AESTHETIC_MATCH_THRESHOLD`). The panel's typography is always-present
 * ("large, confident title" per the design brief), so a palette without a
 * matched aesthetic still needs a name rather than an empty slot.
 * "(assumption — needs confirmation)", same status as the archetype names it
 * stands in for.
 */
export const DEFAULT_PALETTE_NAME = 'Custom Palette' // (assumption — needs confirmation)

/**
 * Hue-modifier vocabulary for `getPaletteName`'s "modifier + archetype"
 * combination (grain-2: 100+ unique palette names). One word per 30deg hue
 * bin (12 bins spanning the full wheel) - deliberately its own vocabulary,
 * disjoint in *purpose* from `getVibeKeywords`'s hue words: those describe a
 * "vibe" in plain-English adjectives, this is a naming-brand-style modifier
 * meant to read naturally in front of an archetype noun (e.g. "Sunset
 * Tropical", "Cobalt Coastal"). "(assumption — needs confirmation)", same
 * status as every other word bank in this module.
 */
const HUE_NAME_MODIFIERS: string[] = [
  'Crimson', // 0-30deg
  'Sunset', // 30-60deg
  'Amber', // 60-90deg
  'Golden', // 90-120deg
  'Citrus', // 120-150deg
  'Meadow', // 150-180deg
  'Emerald', // 180-210deg
  'Teal', // 210-240deg
  'Azure', // 240-270deg
  'Cobalt', // 270-300deg
  'Violet', // 300-330deg
  'Magenta', // 330-360deg
]

function hueNameModifier(h: number): string {
  const index = Math.min(HUE_NAME_MODIFIERS.length - 1, Math.floor(normalizeHue(h) / 30))
  return HUE_NAME_MODIFIERS[index]
}

/**
 * Saturation x lightness modifier vocabulary for `getPaletteName` (grain-2).
 * A 4x4 lookup (saturation quartile x lightness quartile, 16 cells) - finer
 * than `getMoodTags`'s 3x3 `SATURATION_LIGHTNESS_MOOD` table so that, paired
 * with the 12 `HUE_NAME_MODIFIERS`, the modifier alone spans 12 x 16 = 192
 * unique strings. That is deliberate: `matchAesthetic` only ever resolves to
 * 1 of 10 archetypes or `DEFAULT_PALETTE_NAME` (11 possible bases), and many
 * HSL inputs fall outside every archetype's match threshold and land on the
 * `DEFAULT_PALETTE_NAME` fallback - so the 100+ unique *name* requirement
 * cannot depend on archetype-match variety alone. Keeping the modifier's own
 * combinatorics (192) well above 100 guarantees the requirement holds even
 * when every sampled color falls back to `DEFAULT_PALETTE_NAME`. See the
 * grain-2 decision record for the full rationale and rejected alternatives.
 * "(assumption — needs confirmation)", same status as every other word bank.
 */
const SATURATION_LIGHTNESS_NAME_MODIFIERS: string[][] = [
  ['Ashen', 'Dusty', 'Chalky', 'Powdery'], // saturation 0-25%
  ['Charcoal', 'Weathered', 'Muted', 'Hazy'], // saturation 25-50%
  ['Deep', 'Rich', 'Fresh', 'Airy'], // saturation 50-75%
  ['Midnight', 'Bold', 'Vivid', 'Radiant'], // saturation 75-100%
]

function saturationLightnessNameModifier(s: number, l: number): string {
  const satIndex = Math.min(3, Math.floor(clamp(s, 0, 100) / 25))
  const lightIndex = Math.min(3, Math.floor(clamp(l, 0, 100) / 25))
  return SATURATION_LIGHTNESS_NAME_MODIFIERS[satIndex][lightIndex]
}

/**
 * Combines the two independent modifier axes above into one "{S/L modifier}
 * {Hue modifier}" phrase (e.g. "Vivid Sunset", "Ashen Teal") - 16 x 12 = 192
 * unique phrases, entirely determined by `hsl`.
 */
function paletteNameModifier(hsl: HSL): string {
  return `${saturationLightnessNameModifier(hsl.s, hsl.l)} ${hueNameModifier(hsl.h)}`
}

/**
 * Pure function: deterministic display name for a generated palette's
 * Palette Description panel (grain-2: "100+ unique palette names"). Builds
 * on `matchAesthetic`'s closest-archetype lookup exactly as before (matching
 * logic/threshold untouched - out of scope for grain-2), but now prefixes
 * the resolved archetype name (or `DEFAULT_PALETTE_NAME` fallback) with
 * `paletteNameModifier`'s deterministic "{S/L} {Hue}" adjective phrase, e.g.
 * "Vivid Sunset Tropical" or "Ashen Teal Custom Palette". That modifier alone
 * spans 192 unique phrases (see `SATURATION_LIGHTNESS_NAME_MODIFIERS`),
 * which is what guarantees 100+ unique names regardless of how often
 * `matchAesthetic` resolves to an archetype vs. falls back to
 * `DEFAULT_PALETTE_NAME`. Same input always yields the same name.
 */
export function getPaletteName(hsl: HSL): string {
  const base = matchAesthetic(hsl) ?? DEFAULT_PALETTE_NAME
  return `${paletteNameModifier(hsl)} ${base}`
}

/**
 * Joins adjectives into an English list with "and" before the final item
 * ("warm", "warm and cozy", "warm, cozy and bold"). Used by
 * `getPaletteDescription` to turn `getMoodTags`'s 1-2 word array into a
 * grammatical phrase. Pure string composition - no locale/pluralization
 * concerns since every input word is a fixed-vocabulary adjective.
 */
function joinWithAnd(words: string[]): string {
  if (words.length === 0) return ''
  if (words.length === 1) return words[0]
  return `${words.slice(0, -1).join(', ')} and ${words[words.length - 1]}`
}

/**
 * Deterministic pseudo-hash of an HSL triplet into a bounded index, used
 * below to pick a sentence template without adding randomness (grain-2:
 * "expanded description templates"). Rounds each component so tiny floating
 * point differences (e.g. from `averageHsl`) don't change which template is
 * picked, then combines them with distinct prime-ish weights per axis so the
 * opener/closer picks (which weight h/s/l differently, see
 * `getPaletteDescription`) decorrelate rather than always moving together.
 */
function templateIndex(a: number, b: number, c: number, poolSize: number): number {
  const raw = Math.round(a) * 13 + Math.round(b) * 7 + Math.round(c) * 3
  return ((raw % poolSize) + poolSize) % poolSize
}

/**
 * Opening-sentence templates for `getPaletteDescription` (grain-2: "expanded
 * description templates"). Every template starts with `${name}` verbatim -
 * that invariant is relied on by callers that check the description opens
 * with `getPaletteName`'s output. "(assumption — needs confirmation)" word
 * choices, same status as every other template/vocabulary in this module.
 */
const DESCRIPTION_OPENERS: Array<(name: string, moodPhrase: string) => string> = [
  (name, mood) => `${name} — a ${mood} palette built around your brand color.`,
  (name, mood) => `${name} brings a ${mood} feel to your brand color.`,
  (name, mood) => `${name} wraps your brand color in a ${mood} mood.`,
  (name, mood) => `${name} gives your brand color a ${mood} character.`,
]

/** Closing-sentence templates for `getPaletteDescription` (grain-2). */
const DESCRIPTION_CLOSERS: Array<(keywordPhrase: string) => string> = [
  (kw) => `Expect a ${kw} feel throughout every shade.`,
  (kw) => `Every shade carries a ${kw} undertone.`,
  (kw) => `This palette reads as ${kw} across the board.`,
  (kw) => `Each shade leans ${kw} from tint to shade.`,
]

/**
 * Pure function: deterministic 2-sentence description for the Palette
 * Description panel (grain-2), composed entirely from this module's existing
 * mood/vibe lookups - `getPaletteName` (which itself wraps `matchAesthetic`),
 * `getMoodTags`, and `getVibeKeywords`. No AI, no randomness: fixed sentence
 * templates filled from those functions' outputs, so the same `hsl` input
 * (typically `averageHsl(palette)`) always returns the same 2 sentences.
 *
 * - Sentence 1 names the palette and states its mood, via `getPaletteName`
 *   and `getMoodTags` (1-2 adjectives), picking one of `DESCRIPTION_OPENERS`.
 * - Sentence 2 surfaces one word from each of `getVibeKeywords`'s 3 axes
 *   (hue/saturation/lightness) for anyone who wants more than the compact
 *   mood pair, picking one of `DESCRIPTION_CLOSERS`.
 *
 * Both sentences are always non-empty because `getMoodTags` guarantees at
 * least 1 word and `getVibeKeywords` guarantees at least 5. Because sentence
 * 1 embeds `getPaletteName`'s output verbatim, and that name alone spans 100+
 * unique combinations (see `getPaletteName`), the description also reaches
 * 100+ unique combinations across a representative HSL sample.
 */
export function getPaletteDescription(hsl: HSL): string[] {
  const name = getPaletteName(hsl)
  const moodPhrase = joinWithAnd(getMoodTags(hsl).map((tag) => tag.toLowerCase()))
  const vibeWords = getVibeKeywords(hsl)
  const keywordPhrase = [vibeWords[0], vibeWords[2], vibeWords[4]].filter(Boolean).join(', ')

  const opener = DESCRIPTION_OPENERS[templateIndex(hsl.h, hsl.s, hsl.l, DESCRIPTION_OPENERS.length)]
  const closer = DESCRIPTION_CLOSERS[templateIndex(hsl.s, hsl.l, hsl.h, DESCRIPTION_CLOSERS.length)]

  return [opener(name, moodPhrase), closer(keywordPhrase)]
}
