/**
 * Pure HEX/RGB <-> HSL color math and 5-color palette generation.
 *
 * No UI, no state, no side effects. Every function here is deterministic:
 * the same input always produces the same output. This module is the
 * "brand main color in -> 5 color palette out" engine described in
 * spec A (컬러 제너레이터).
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
 * The 5 palette generation modes from spec A. Each mode is a fixed set of
 * HSL arithmetic rules (no AI, no randomness at the base level) that maps
 * the same brand HSL to a different set of 4 derived colors:
 *
 * - `calm` (차분함): desaturated, gentle lightness gaps around the brand color.
 * - `bright` (밝음): high saturation, high lightness across the board.
 * - `contrast` (대비): lightness pushed to the extremes plus a complementary
 *   (hue + 180) accent for maximum visual contrast.
 * - `monotone` (모노톤): brand hue and saturation held fixed, only lightness
 *   ramps up/down around the brand's own lightness.
 * - `lightness` (명도): brand hue and saturation held fixed, lightness placed
 *   on a fixed absolute staircase (15/35/65/85) independent of the brand's
 *   own lightness.
 */
export type GenerationMode = 'calm' | 'bright' | 'contrast' | 'monotone' | 'lightness'

/** All generation modes, in a stable display order. */
export const GENERATION_MODES: GenerationMode[] = [
  'calm',
  'bright',
  'contrast',
  'monotone',
  'lightness',
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
 * Fixed (non-jittered) HSL arithmetic rules for each `GenerationMode`. Given
 * the same base HSL, each mode returns 4 HSL values that are numerically
 * distinct from every other mode's output - this is what guarantees the 5
 * generation modes produce different palettes for the same brand color.
 */
function deriveHslByMode(base: HSL, mode: GenerationMode): HSL[] {
  switch (mode) {
    case 'calm': {
      const s = clamp(base.s * 0.45, 8, 55)
      return [
        { h: base.h, s, l: clamp(base.l + 12, 5, 90) },
        { h: base.h, s, l: clamp(base.l - 12, 10, 95) },
        { h: normalizeHue(base.h + 20), s: clamp(s - 8, 8, 45), l: clamp(base.l + 4, 15, 85) },
        { h: normalizeHue(base.h - 20), s: clamp(s - 15, 5, 40), l: clamp(base.l - 4, 15, 85) },
      ]
    }
    case 'bright': {
      const s = clamp(Math.max(base.s, 70), 70, 100)
      return [
        { h: base.h, s, l: clamp(base.l + 28, 55, 96) },
        { h: base.h, s, l: clamp(base.l + 12, 45, 92) },
        { h: normalizeHue(base.h + 45), s, l: clamp(base.l + 20, 55, 94) },
        {
          h: normalizeHue(base.h - 45),
          s: clamp(s - 10, 60, 95),
          l: clamp(base.l + 34, 60, 97),
        },
      ]
    }
    case 'contrast': {
      const complementHue = normalizeHue(base.h + 180)
      return [
        { h: base.h, s: base.s, l: clamp(base.l + 42, 82, 98) },
        { h: base.h, s: base.s, l: clamp(base.l - 42, 2, 18) },
        { h: complementHue, s: clamp(base.s + 15, 55, 100), l: clamp(base.l, 25, 75) },
        { h: complementHue, s: base.s, l: clamp(100 - base.l, 8, 92) },
      ]
    }
    case 'monotone': {
      const s = base.s
      return [
        { h: base.h, s, l: clamp(base.l + 18, 5, 95) },
        { h: base.h, s, l: clamp(base.l - 18, 5, 95) },
        { h: base.h, s, l: clamp(base.l + 34, 5, 95) },
        { h: base.h, s, l: clamp(base.l - 34, 5, 95) },
      ]
    }
    case 'lightness': {
      const { h, s } = base
      return [15, 35, 65, 85].map((l) => ({ h, s, l }))
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
 */
function deriveByModeVaried(base: HSL, mode: GenerationMode, random: () => number): PaletteColor[] {
  const jitterH = () => randomOffset(random, 4)
  const jitterS = () => randomOffset(random, 6)
  const jitterL = () => randomOffset(random, 6)

  return deriveHslByMode(base, mode)
    .map((hsl) => ({
      h: normalizeHue(hsl.h + jitterH()),
      s: clamp(hsl.s + jitterS(), 0, 100),
      l: clamp(hsl.l + jitterL(), 0, 100),
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
 * Same fixed HSL arithmetic as `deriveSupportingColors`, but each offset is
 * jittered by an injectable `random` source (defaults to `Math.random`) so
 * repeated regeneration produces varied - but still harmonious - results.
 * Passing a seeded/deterministic `random` makes the output reproducible,
 * which is what regeneration tests rely on.
 */
function deriveSupportingColorsVaried(base: HSL, random: () => number): PaletteColor[] {
  const jitter = () => randomOffset(random, 10)

  const lighterTint: HSL = { h: base.h, s: base.s, l: clamp(base.l + 20 + jitter(), 0, 95) }
  const darkerShade: HSL = { h: base.h, s: base.s, l: clamp(base.l - 20 + jitter(), 5, 100) }
  const analogousAccent: HSL = {
    h: normalizeHue(base.h + 30 + jitter()),
    s: clamp(base.s + jitter(), 15, 100),
    l: clamp(base.l - 10 + jitter(), 10, 90),
  }
  const mutedVariant: HSL = {
    h: base.h,
    s: clamp(base.s - 40 + jitter(), 10, 100),
    l: clamp(base.l + (base.l < 50 ? 15 : -15) + jitter(), 5, 95),
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
