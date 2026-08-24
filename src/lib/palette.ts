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
 * The 5 palette generation modes from spec A, each a standard color-wheel
 * harmony theory (표준 색상환 조화 이론) rather than an arbitrary axis. Every
 * mode is a fixed set of HSL arithmetic rules (no AI, no randomness at the
 * base level) that maps the same brand HSL to a different set of 4 derived
 * colors:
 *
 * - `complementary` (보색): brand hue and its opposite (hue + 180) each get a
 *   lighter/darker pair.
 * - `analogous` (유사색): the two neighboring hues (hue ± 30) each get a
 *   lighter/darker pair.
 * - `triadic` (트라이애딕): the two hues 120° apart on the wheel (hue + 120,
 *   hue + 240) each get a lighter/darker pair.
 * - `splitComplementary` (스플릿보색): the two hues flanking the complement
 *   (hue + 150, hue + 210) each get a lighter/darker pair.
 * - `monochromatic` (모노크로매틱): hue and saturation held fixed at the
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
 * hue offset(s) below are the theory itself (보색/유사색/트라이애딕/
 * 스플릿보색/모노크로매틱), not an arbitrary choice.
 */
function deriveHslByMode(base: HSL, mode: GenerationMode): HSL[] {
  switch (mode) {
    case 'complementary': {
      // 보색: brand hue + its direct opposite (+180°).
      const complementHue = normalizeHue(base.h + 180)
      return [
        ...tintShadePair(base.h, base.s, base.l),
        ...tintShadePair(complementHue, base.s, base.l),
      ]
    }
    case 'analogous': {
      // 유사색: the two hues adjacent to the brand hue (±30°).
      return [
        ...tintShadePair(normalizeHue(base.h + 30), base.s, base.l),
        ...tintShadePair(normalizeHue(base.h - 30), base.s, base.l),
      ]
    }
    case 'triadic': {
      // 트라이애딕: the two hues evenly spaced 120° apart (+120°/+240°).
      return [
        ...tintShadePair(normalizeHue(base.h + 120), base.s, base.l),
        ...tintShadePair(normalizeHue(base.h + 240), base.s, base.l),
      ]
    }
    case 'splitComplementary': {
      // 스플릿보색: the two hues flanking the direct complement (+150°/+210°).
      return [
        ...tintShadePair(normalizeHue(base.h + 150), base.s, base.l),
        ...tintShadePair(normalizeHue(base.h + 210), base.s, base.l),
      ]
    }
    case 'monochromatic': {
      // 모노크로매틱: hue and saturation held fixed, only lightness varies.
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
 * "평균 H·S·L") into a single HSL summary used by `getMoodTags` (M-4). Hue is
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
 * Deterministic, non-AI adjective mood-tag lookup for spec A's "감정/무드
 * 태그" (M-4). Every boundary below is a fixed threshold chosen to divide
 * the H/S/L ranges into named bands - it is not derived from a cited study,
 * so each is marked "(가정 — 확인 필요)" per spec A's instruction to flag
 * assumed thresholds for confirmation.
 *
 * - H (색온도, hue): warm/cool/neutral bands.
 * - S (채도) x L (명도): a 3x3 lookup table, chosen per spec A's cited
 *   rationale that saturation correlates with arousal and lightness
 *   correlates with valence in color-psychology research.
 */

// H 색온도 구간 경계. 0-60°/300-360°(빨강~주황~자주)는 난색, 180-300°(청록~
// 파랑~보라)는 한색, 그 사이(60-180°, 노랑~초록~청록)는 중성으로 분류한다.
const WARM_HUE_MAX = 60 // (가정 — 확인 필요)
const COOL_HUE_MIN = 180 // (가정 — 확인 필요)
const COOL_HUE_MAX = 300 // (가정 — 확인 필요)

function hueMoodWord(h: number): string {
  const hue = normalizeHue(h)
  if (hue >= COOL_HUE_MIN && hue < COOL_HUE_MAX) return '차가운'
  if (hue >= WARM_HUE_MAX && hue < COOL_HUE_MIN) return '자연스러운'
  return '따뜻한'
}

type Band = 'low' | 'mid' | 'high'

// S 채도 구간 경계 (채도-각성 상관: 고채도 = 높은 각성, 저채도 = 낮은 각성).
const LOW_SATURATION_MAX = 30 // (가정 — 확인 필요)
const HIGH_SATURATION_MIN = 60 // (가정 — 확인 필요)

function saturationBand(s: number): Band {
  if (s < LOW_SATURATION_MAX) return 'low'
  if (s >= HIGH_SATURATION_MIN) return 'high'
  return 'mid'
}

// L 명도 구간 경계 (명도-정서 상관: 고명도 = 밝은/긍정적 정서, 저명도 = 무거운 정서).
const LOW_LIGHTNESS_MAX = 35 // (가정 — 확인 필요)
const HIGH_LIGHTNESS_MIN = 65 // (가정 — 확인 필요)

function lightnessBand(l: number): Band {
  if (l < LOW_LIGHTNESS_MAX) return 'low'
  if (l >= HIGH_LIGHTNESS_MIN) return 'high'
  return 'mid'
}

/**
 * S(각성) x L(정서) 조합 룩업 테이블 (가정 — 확인 필요). 각 셀은 채도-각성,
 * 명도-정서 상관에 근거한 형용사 하나로 고정 매핑되며 값 변경 시 룩업표만
 * 갱신하면 된다 (AI 판단 없음).
 */
const SATURATION_LIGHTNESS_MOOD: Record<Band, Record<Band, string>> = {
  high: { high: '발랄한', mid: '역동적인', low: '강렬한' },
  mid: { high: '산뜻한', mid: '균형 잡힌', low: '묵직한' },
  low: { high: '은은한', mid: '차분한', low: '고요한' },
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
 * One aesthetic archetype's display name and center HSL for `matchAesthetic`
 * (spec A "Aesthetic 이름 매칭", M-5).
 */
export interface AestheticArchetype {
  name: string
  hsl: HSL
}

/**
 * 10 fixed aesthetic archetypes (사전 정의된 아키타입 10종) with a representative
 * center HSL each. Every name and center value here is "(가정 — 확인 필요)" -
 * spec A explicitly calls out that the archetype list, center values, and
 * match threshold are all unconfirmed assumptions to be validated later, not
 * a cited/researched list. The 10 were picked to spread across common
 * "aesthetic" vocabulary (mood-board style categories) and across the hue
 * wheel / saturation / lightness space so a typical brand color has a
 * meaningfully closest one rather than all 10 being equidistant.
 */
export const AESTHETIC_ARCHETYPES: AestheticArchetype[] = [
  { name: '파스텔', hsl: { h: 330, s: 45, l: 88 } }, // (가정 — 확인 필요)
  { name: '미니멀', hsl: { h: 210, s: 8, l: 95 } }, // (가정 — 확인 필요)
  { name: '빈티지', hsl: { h: 35, s: 30, l: 58 } }, // (가정 — 확인 필요)
  { name: '네온', hsl: { h: 300, s: 95, l: 55 } }, // (가정 — 확인 필요)
  { name: '어스톤', hsl: { h: 40, s: 45, l: 40 } }, // (가정 — 확인 필요)
  { name: '모노크롬', hsl: { h: 0, s: 0, l: 50 } }, // (가정 — 확인 필요)
  { name: '다크 아카데미아', hsl: { h: 25, s: 35, l: 22 } }, // (가정 — 확인 필요)
  { name: '트로피컬', hsl: { h: 165, s: 70, l: 50 } }, // (가정 — 확인 필요)
  { name: '럭셔리', hsl: { h: 270, s: 45, l: 30 } }, // (가정 — 확인 필요)
  { name: '코스탈', hsl: { h: 200, s: 50, l: 65 } }, // (가정 — 확인 필요)
]

/**
 * Maximum HSL distance (see `hslDistance`) for `matchAesthetic` to still
 * report a match. Distances at or above this are treated as "no aesthetic is
 * actually close" per spec A's "근거 없는 매칭을 강제로 보여주지 않는다"
 * principle. Unconfirmed assumption - "(가정 — 확인 필요)".
 */
const AESTHETIC_MATCH_THRESHOLD = 45 // (가정 — 확인 필요)

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
 * combination - it is a reasonable "(가정 — 확인 필요)" choice, same as the
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
 * single closest archetype's name (spec A's "매칭되면 1개 이름만 표시(복수
 * 후보 동시 노출 안 함)", M-5). When even the closest archetype's distance is
 * at or above `AESTHETIC_MATCH_THRESHOLD`, returns `null` instead - spec A's
 * "거리가 임계값 이상이면 아무 것도 표시하지 않는다": an aesthetic match is
 * only ever asserted when something is actually close, never forced.
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
