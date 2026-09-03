/**
 * Pure text formatters for copying a generated palette out of the app
 * (spec C "bulk HEX code copy" / "copy as CSS variables", M-1).
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
 * order - the "bulk HEX code copy" feature. Ready to paste as-is (e.g. into
 * a text file or chat), no extra punctuation.
 */
export function paletteToHexList(palette: PaletteColor[]): string {
  return palette.map((color) => color.hex).join('\n')
}

/**
 * Formats a palette as a CSS custom-properties block - the "copy as CSS
 * variables" feature. The result is ready to paste directly into any project's
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
// and gets its own dedicated "value is empty" error below, rather than
// falling through to the generic "invalid declaration" message.
const DECLARATION_RE = /^(--[a-zA-Z_][a-zA-Z0-9_-]*)\s*:\s*(.*)$/

// A single `selector { body }` block spanning the whole (trimmed) input.
// The selector half allows zero length (`*`, not `+`) so an empty selector
// (e.g. `{ --a: #fff; }`) still matches the block shape and gets its own
// dedicated "selector is empty" error below.
const BLOCK_RE = /^([^{}]*)\{([\s\S]*)\}$/

/**
 * Validates that `text` is a syntactically correct, paste-ready CSS
 * custom-properties block (M-1: "syntax that can be applied
 * directly to a real web project"). Checks, in order:
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
    return { valid: false, errors: ['Input is empty.'] }
  }

  const openCount = (trimmed.match(/\{/g) ?? []).length
  const closeCount = (trimmed.match(/\}/g) ?? []).length
  if (openCount !== 1 || closeCount !== 1) {
    return {
      valid: false,
      errors: [
        `Braces are not balanced (${openCount} opening brace(s), ${closeCount} closing brace(s); there must be exactly one of each).`,
      ],
    }
  }

  const blockMatch = BLOCK_RE.exec(trimmed)
  if (!blockMatch) {
    return { valid: false, errors: ['Could not find a `selector { ... }` block.'] }
  }

  const errors: string[] = []
  const [, rawSelector, rawBody] = blockMatch

  if (!rawSelector.trim()) {
    errors.push('Selector is empty.')
  }

  const body = rawBody.trim()
  if (!body) {
    errors.push('Declaration block is empty (contains no variables).')
    return { valid: false, errors }
  }

  if (!rawBody.trimEnd().endsWith(';')) {
    errors.push('The last declaration does not end with a semicolon (;).')
  }

  const declarations = body
    .split(';')
    .map((part) => part.trim())
    .filter((part) => part.length > 0)

  const seenNames = new Set<string>()
  for (const declaration of declarations) {
    const declMatch = DECLARATION_RE.exec(declaration)
    if (!declMatch) {
      errors.push(`Invalid declaration: "${declaration}" (expected format: --name: value;)`)
      continue
    }

    const [, name, value] = declMatch
    if (!value.trim()) {
      errors.push(`Value is empty: "${name}"`)
    }
    if (seenNames.has(name)) {
      errors.push(`Duplicate variable name: "${name}"`)
    }
    seenNames.add(name)
  }

  return { valid: errors.length === 0, errors }
}

/**
 * Slot (0-based, `BRAND_SLOT_INDEX` first) -> palette role name, for the
 * "the JSON download file contains every palette color and role" feature
 * (spec C M-2). Spec C defines role names for the first time (spec A only
 * defines the 5-color *generation* rule, not role names) and explicitly
 * flags the slot-to-role assignment itself as an assumption:
 *
 * "The actual role-slot mapping is (assumption — needs confirmation): provisionally
 * assign #1 in generation order (brand main) as Primary, #2-3 as Secondary,
 * #4 as Accent, and #5 as Background/Neutral."
 *
 * Recorded in the design spec's `content-copy` Token Group (grain-1).
 */
export const PALETTE_SLOT_ROLES: readonly string[] = [
  'Primary', // slot 0 (BRAND_SLOT_INDEX) - assumption — needs confirmation
  'Secondary', // slot 1 - assumption — needs confirmation
  'Secondary', // slot 2 - assumption — needs confirmation
  'Accent', // slot 3 - assumption — needs confirmation
  'Background/Neutral', // slot 4 - assumption — needs confirmation
]

/** Fallback role name for a slot index beyond `PALETTE_SLOT_ROLES` (defensive; a valid palette never has more than `PALETTE_SIZE` slots). */
const UNKNOWN_SLOT_ROLE = 'Unassigned'

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
 * Builds the structured export payload for the "JSON download" feature: every
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
 * Formats a palette as pretty-printed JSON text - the "JSON download" file
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
 * "verify the downloaded JSON data contains every color and role value with
 * nothing missing" requirement (M-2). Checks, in order:
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
    return { valid: false, errors: ['Input is empty.'] }
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(trimmed)
  } catch {
    return { valid: false, errors: ['Not valid JSON.'] }
  }

  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    return { valid: false, errors: ['The top-level value is not an object.'] }
  }

  const colors = (parsed as { colors?: unknown }).colors
  if (!Array.isArray(colors)) {
    return { valid: false, errors: ['The "colors" array is missing.'] }
  }

  const errors: string[] = []
  if (colors.length !== PALETTE_SIZE) {
    errors.push(`The "colors" array length is not ${PALETTE_SIZE} (actual: ${colors.length}).`)
  }

  colors.forEach((entry, index) => {
    if (typeof entry !== 'object' || entry === null || Array.isArray(entry)) {
      errors.push(`colors[${index}]: not an object.`)
      return
    }

    const record = entry as Record<string, unknown>

    if (record.slot !== index) {
      errors.push(`colors[${index}]: "slot" is missing or does not match the array position (${index}).`)
    }

    if (typeof record.role !== 'string' || !record.role.trim()) {
      errors.push(`colors[${index}]: "role" is missing or empty.`)
    }

    if (typeof record.hex !== 'string' || !hexToRgb(record.hex)) {
      errors.push(`colors[${index}]: "hex" is missing or invalid.`)
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
      errors.push(`colors[${index}]: "rgb" is missing, or one of r/g/b is missing or out of range.`)
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
      errors.push(`colors[${index}]: "hsl" is missing, or one of h/s/l is missing or out of range.`)
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
 * ("the filename includes the brand main color Hex and the generation date so
 * re-downloads stay distinguishable" - also "(assumption — needs confirmation)"), so re-downloading the same
 * palette on a different day (or a different brand color) never collides.
 * The leading `#` of the brand HEX is stripped since it is not filename-safe
 * on every platform. `date` defaults to `new Date()` but is injectable for
 * deterministic tests.
 */
export function paletteJsonFilename(palette: PaletteColor[], date: Date = new Date()): string {
  const brandHex = palette[BRAND_SLOT_INDEX]?.hex.replace('#', '') ?? 'palette'
  return `brand-palette-${brandHex}-${formatYyyyMmDd(date)}.json`
}
