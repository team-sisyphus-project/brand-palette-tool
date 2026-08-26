/**
 * Pure text formatters for copying a generated palette out of the app
 * (spec C "HEX 코드 일괄 복사" / "CSS 변수 형식 복사", M-1).
 *
 * No UI, no Clipboard API calls, no file I/O - every function here only
 * turns a `PaletteColor[]` into a plain string (or validates one). The
 * actual `navigator.clipboard.writeText(...)` call is the caller's job.
 */

import { BRAND_SLOT_INDEX, PALETTE_SIZE, hexToRgb, type HSL, type PaletteColor, type RGB } from './palette'

/**
 * The selector `paletteToCssVariablesText` wraps declarations in by default.
 * `:root` is the standard place to declare global CSS custom properties so
 * the pasted block works in any project without extra wiring.
 */
export const CSS_ROOT_SELECTOR = ':root'

/**
 * CSS custom-property name for one palette slot.
 *
 * Naming decision (recorded in the design spec's `color` Token Group):
 * - The brand main color always lives at `BRAND_SLOT_INDEX` regardless of
 *   generation mode, so it gets the fixed semantic name `--color-brand-main`.
 * - The other 4 slots' color-wheel role changes with the generation mode
 *   (e.g. slot 1 is a complement under `complementary` but an adjacent hue
 *   under `analogous`), so a mode-specific semantic name would drift. They
 *   get the stable, order-based name `--color-palette-{1-based slot}`
 *   instead, which never changes meaning as the mode changes.
 */
export function cssVariableNameForSlot(slotIndex: number): string {
  return slotIndex === BRAND_SLOT_INDEX ? '--color-brand-main' : `--color-palette-${slotIndex + 1}`
}

/**
 * Formats a palette as a plain list of HEX codes, one per line, in slot
 * order - the "HEX 코드 일괄 복사" feature. Ready to paste as-is (e.g. into
 * a text file or chat), no extra punctuation.
 */
export function paletteToHexList(palette: PaletteColor[]): string {
  return palette.map((color) => color.hex).join('\n')
}

/**
 * Formats a palette as a CSS custom-properties block - the "CSS 변수 형식
 * 복사" feature. The result is ready to paste directly into any project's
 * CSS/stylesheet: a `selector { --name: value; ... }` block using
 * `cssVariableNameForSlot` for each slot's name and the slot's own HEX code
 * as the value. `validateCssVariablesText` confirms the output always
 * satisfies that "paste-ready" contract.
 */
export function paletteToCssVariablesText(
  palette: PaletteColor[],
  selector: string = CSS_ROOT_SELECTOR,
): string {
  const declarations = palette
    .map((color, index) => `  ${cssVariableNameForSlot(index)}: ${color.hex};`)
    .join('\n')
  return `${selector} {\n${declarations}\n}`
}

/** Result of validating a CSS custom-properties text block. */
export interface CssValidationResult {
  valid: boolean
  errors: string[]
}

// A valid CSS custom-property declaration: `--identifier: value` (the
// trailing `;` is stripped before this is tested, see below). The
// identifier must start with `--` followed by a letter or underscore, then
// any run of letters/digits/hyphens/underscores. The value half is captured
// even when empty (`.*`) so an empty-value declaration still matches here
// and gets its own dedicated "값이 비어 있습니다" error below, rather than
// falling through to the generic "올바르지 않은 선언" message.
const DECLARATION_RE = /^(--[a-zA-Z_][a-zA-Z0-9_-]*)\s*:\s*(.*)$/

// A single `selector { body }` block spanning the whole (trimmed) input.
// The selector half allows zero length (`*`, not `+`) so an empty selector
// (e.g. `{ --a: #fff; }`) still matches the block shape and gets its own
// dedicated "선택자가 비어 있습니다" error below.
const BLOCK_RE = /^([^{}]*)\{([\s\S]*)\}$/

/**
 * Validates that `text` is a syntactically correct, paste-ready CSS
 * custom-properties block (M-1: "실제 웹 프로젝트에 바로 적용 가능한
 * 문법"). Checks, in order:
 *
 * - Non-empty input.
 * - Exactly one matched pair of `{`/`}` (one `selector { ... }` block).
 * - A non-empty selector before the `{`.
 * - A non-empty declaration body, ending in `;` (so the last declaration is
 *   terminated, not just the ones before it).
 * - Every `;`-separated declaration matches `--name: value;` with a valid
 *   custom-property identifier and a non-empty value.
 * - No duplicate variable names within the block.
 *
 * Returns every problem found (not just the first) so a caller can surface
 * a complete diagnosis, plus `valid: true` only when the list is empty.
 */
export function validateCssVariablesText(text: string): CssValidationResult {
  const trimmed = text.trim()

  if (!trimmed) {
    return { valid: false, errors: ['입력이 비어 있습니다.'] }
  }

  const openCount = (trimmed.match(/\{/g) ?? []).length
  const closeCount = (trimmed.match(/\}/g) ?? []).length
  if (openCount !== 1 || closeCount !== 1) {
    return {
      valid: false,
      errors: [
        `중괄호 짝이 맞지 않습니다 (여는 중괄호 ${openCount}개, 닫는 중괄호 ${closeCount}개, 각각 1개여야 합니다).`,
      ],
    }
  }

  const blockMatch = BLOCK_RE.exec(trimmed)
  if (!blockMatch) {
    return { valid: false, errors: ['`selector { ... }` 형태의 블록을 찾을 수 없습니다.'] }
  }

  const errors: string[] = []
  const [, rawSelector, rawBody] = blockMatch

  if (!rawSelector.trim()) {
    errors.push('선택자가 비어 있습니다.')
  }

  const body = rawBody.trim()
  if (!body) {
    errors.push('선언 블록이 비어 있습니다 (변수가 하나도 없습니다).')
    return { valid: false, errors }
  }

  if (!rawBody.trimEnd().endsWith(';')) {
    errors.push('마지막 선언이 세미콜론(;)으로 끝나지 않습니다.')
  }

  const declarations = body
    .split(';')
    .map((part) => part.trim())
    .filter((part) => part.length > 0)

  const seenNames = new Set<string>()
  for (const declaration of declarations) {
    const declMatch = DECLARATION_RE.exec(declaration)
    if (!declMatch) {
      errors.push(`올바르지 않은 선언입니다: "${declaration}" (형식: --name: value;)`)
      continue
    }

    const [, name, value] = declMatch
    if (!value.trim()) {
      errors.push(`값이 비어 있습니다: "${name}"`)
    }
    if (seenNames.has(name)) {
      errors.push(`중복된 변수명입니다: "${name}"`)
    }
    seenNames.add(name)
  }

  return { valid: errors.length === 0, errors }
}

/**
 * Slot (0-based, `BRAND_SLOT_INDEX` first) -> palette role name, for the
 * "JSON 다운로드 파일이 팔레트 색상·역할 정보를 빠짐없이 포함함" feature
 * (spec C M-2). Spec C defines role names for the first time (spec A only
 * defines the 5-color *generation* rule, not role names) and explicitly
 * flags the slot-to-role assignment itself as an assumption:
 *
 * "실제 역할-슬롯 매핑은 (가정 — 확인 필요): 생성 순서상 1번(브랜드 메인)을
 * 주조색, 2~3번을 보조색, 4번을 강조색, 5번을 배경/중성색으로 임시 배정한다."
 *
 * Recorded in the design spec's `content-copy` Token Group (grain-1).
 */
export const PALETTE_SLOT_ROLES: readonly string[] = [
  '주조색', // slot 0 (BRAND_SLOT_INDEX) - 가정 — 확인 필요
  '보조색', // slot 1 - 가정 — 확인 필요
  '보조색', // slot 2 - 가정 — 확인 필요
  '강조색', // slot 3 - 가정 — 확인 필요
  '배경·중성색', // slot 4 - 가정 — 확인 필요
]

/** Fallback role name for a slot index beyond `PALETTE_SLOT_ROLES` (defensive; a valid palette never has more than `PALETTE_SIZE` slots). */
const UNKNOWN_SLOT_ROLE = '미분류'

/** Looks up the role name for a given 0-based slot index; see `PALETTE_SLOT_ROLES`. */
export function roleForSlot(slotIndex: number): string {
  return PALETTE_SLOT_ROLES[slotIndex] ?? UNKNOWN_SLOT_ROLE
}

/** One color's full color data plus its mapped role - one entry of `PaletteExportData.colors`. */
export interface PaletteExportColorEntry {
  slot: number
  role: string
  hex: string
  rgb: RGB
  hsl: HSL
}

/** The structured JSON export shape built by `buildPaletteExportData` (spec C M-2). */
export interface PaletteExportData {
  colors: PaletteExportColorEntry[]
}

/**
 * Builds the structured export payload for the "JSON 다운로드" feature: every
 * palette slot's full color data (hex/rgb/hsl) plus its mapped role name
 * (`roleForSlot`), in slot order - so the payload is complete enough that
 * `validatePaletteJson` can confirm nothing is missing (M-2).
 */
export function buildPaletteExportData(palette: PaletteColor[]): PaletteExportData {
  return {
    colors: palette.map((color, index) => ({
      slot: index,
      role: roleForSlot(index),
      hex: color.hex,
      rgb: color.rgb,
      hsl: color.hsl,
    })),
  }
}

/**
 * Formats a palette as pretty-printed JSON text - the "JSON 다운로드" file
 * contents. Built from `buildPaletteExportData` so the emitted JSON always
 * satisfies `validatePaletteJson`.
 */
export function paletteToJsonText(palette: PaletteColor[]): string {
  return JSON.stringify(buildPaletteExportData(palette), null, 2)
}

/** Result of validating a palette JSON export payload. */
export interface PaletteJsonValidationResult {
  valid: boolean
  errors: string[]
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

/**
 * Validates that `jsonText` is a complete `PaletteExportData` payload - the
 * "다운로드된 JSON 데이터가 누락 없이 모든 색상 및 역할 정보를 포함하고
 * 있는지 검증" requirement (M-2). Checks, in order:
 *
 * - `jsonText` is non-empty and parses as JSON.
 * - The parsed value has a `colors` array with exactly `PALETTE_SIZE` entries
 *   (a palette is always fixed-size, spec A).
 * - Every entry has a `slot` matching its array position, a non-empty `role`,
 *   a parseable `hex`, an `rgb` object with `r`/`g`/`b` in [0, 255], and an
 *   `hsl` object with `h` in [0, 360] and `s`/`l` in [0, 100].
 *
 * Returns every problem found (not just the first), mirroring
 * `validateCssVariablesText`'s "report everything" contract.
 */
export function validatePaletteJson(jsonText: string): PaletteJsonValidationResult {
  const trimmed = jsonText.trim()
  if (!trimmed) {
    return { valid: false, errors: ['입력이 비어 있습니다.'] }
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(trimmed)
  } catch {
    return { valid: false, errors: ['올바른 JSON이 아닙니다.'] }
  }

  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    return { valid: false, errors: ['최상위 값이 객체가 아닙니다.'] }
  }

  const colors = (parsed as { colors?: unknown }).colors
  if (!Array.isArray(colors)) {
    return { valid: false, errors: ['"colors" 배열이 없습니다.'] }
  }

  const errors: string[] = []
  if (colors.length !== PALETTE_SIZE) {
    errors.push(`"colors" 배열의 길이가 ${PALETTE_SIZE}이 아닙니다 (실제: ${colors.length}).`)
  }

  colors.forEach((entry, index) => {
    if (typeof entry !== 'object' || entry === null || Array.isArray(entry)) {
      errors.push(`colors[${index}]: 객체가 아닙니다.`)
      return
    }

    const record = entry as Record<string, unknown>

    if (record.slot !== index) {
      errors.push(`colors[${index}]: "slot" 값이 없거나 배열 위치(${index})와 일치하지 않습니다.`)
    }

    if (typeof record.role !== 'string' || !record.role.trim()) {
      errors.push(`colors[${index}]: "role"이 없거나 비어 있습니다.`)
    }

    if (typeof record.hex !== 'string' || !hexToRgb(record.hex)) {
      errors.push(`colors[${index}]: "hex"가 없거나 올바르지 않습니다.`)
    }

    const rgb = record.rgb as Partial<RGB> | undefined
    if (
      typeof rgb !== 'object' ||
      rgb === null ||
      !['r', 'g', 'b'].every((key) => {
        const value = (rgb as Record<string, unknown>)[key]
        return isFiniteNumber(value) && value >= 0 && value <= 255
      })
    ) {
      errors.push(`colors[${index}]: "rgb"가 없거나 r/g/b 중 누락·범위 초과 값이 있습니다.`)
    }

    const hsl = record.hsl as Partial<HSL> | undefined
    const hslValid =
      typeof hsl === 'object' &&
      hsl !== null &&
      isFiniteNumber((hsl as Record<string, unknown>).h) &&
      (hsl as HSL).h >= 0 &&
      (hsl as HSL).h <= 360 &&
      isFiniteNumber((hsl as Record<string, unknown>).s) &&
      (hsl as HSL).s >= 0 &&
      (hsl as HSL).s <= 100 &&
      isFiniteNumber((hsl as Record<string, unknown>).l) &&
      (hsl as HSL).l >= 0 &&
      (hsl as HSL).l <= 100
    if (!hslValid) {
      errors.push(`colors[${index}]: "hsl"이 없거나 h/s/l 중 누락·범위 초과 값이 있습니다.`)
    }
  })

  return { valid: errors.length === 0, errors }
}

/** Zero-padded `YYYYMMDD` for a local `Date` - used by `paletteJsonFilename`. */
function formatYyyyMmDd(date: Date): string {
  const year = date.getFullYear().toString().padStart(4, '0')
  const month = (date.getMonth() + 1).toString().padStart(2, '0')
  const day = date.getDate().toString().padStart(2, '0')
  return `${year}${month}${day}`
}

/**
 * Builds the JSON export filename: `brand-palette-{HEX}-{YYYYMMDD}.json`,
 * mirroring the `.md` export's filename convention from spec C
 * ("파일명은 브랜드 메인 컬러 Hex와 생성 일시를 포함해 재다운로드 시 구분
 * 가능하게 한다" - also "(가정 — 확인 필요)"), so re-downloading the same
 * palette on a different day (or a different brand color) never collides.
 * The leading `#` of the brand HEX is stripped since it is not filename-safe
 * on every platform. `date` defaults to `new Date()` but is injectable for
 * deterministic tests.
 */
export function paletteJsonFilename(palette: PaletteColor[], date: Date = new Date()): string {
  const brandHex = palette[BRAND_SLOT_INDEX]?.hex.replace('#', '') ?? 'palette'
  return `brand-palette-${brandHex}-${formatYyyyMmDd(date)}.json`
}
