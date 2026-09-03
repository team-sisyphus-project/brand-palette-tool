/**
 * Pure Markdown formatter/validator for handing a generated palette to
 * *another* LLM as design context (spec C "Markdown (.md) export for LLM input",
 * M-4). Unlike `paletteToJsonText` (grain-1 of paletteExport.ts), which
 * emits palette/role data only, this emits a self-contained explanatory
 * document: brand color, full palette + roles, the generation mode's own
 * harmony rationale, mood/aesthetic, and a placement-guideline prompt - the
 * "everything another LLM needs to treat this palette as ground truth"
 * bundle spec C describes.
 *
 * No UI, no Blob/file I/O - mirrors `paletteExport.ts`'s boundary. The
 * caller wraps `buildMarkdownExportText`'s return value in a `Blob` and
 * triggers the download, same division of labor as the JSON/PNG exports.
 */

import { BRAND_SLOT_INDEX, PALETTE_SIZE, type GenerationMode, type HSL, type PaletteColor, type RGB } from './palette'
import { roleForSlot } from './paletteExport'

/**
 * Per-mode harmony explanation, reproduced **verbatim** from `GenerationMode`'s
 * own JSDoc in `src/lib/palette.ts` (the single source of truth spec C
 * requires: "these explanatory sentences are taken verbatim from spec A...
 * and are not newly written in this document"). If `GenerationMode`'s JSDoc wording ever changes, update
 * these strings to match - do not paraphrase.
 */
export const MODE_DESCRIPTIONS: Record<GenerationMode, string> = {
  complementary: 'brand hue and its opposite (hue + 180) each get a lighter/darker pair.',
  analogous: 'the two neighboring hues (hue ± 30) each get a lighter/darker pair.',
  triadic: 'the two hues 120° apart on the wheel (hue + 120, hue + 240) each get a lighter/darker pair.',
  splitComplementary:
    'the two hues flanking the complement (hue + 150, hue + 210) each get a lighter/darker pair.',
  monochromatic:
    "hue and saturation held fixed at the brand's own values; only lightness varies, across 4 steps around the brand's own lightness.",
}

/**
 * The 60-30-10 placement-guideline prompt paragraph (spec C item 5). Both
 * the ratio and the CTA-only accent rule are flagged "(assumption — needs confirmation)" in
 * spec C itself - there is no conversation/spec basis for a specific ratio,
 * so the industry-standard 60-30-10 split is adopted as a placeholder.
 * Exported as a constant (rather than inlined in `buildMarkdownExportText`)
 * so `validateMarkdownExportText` checks against the exact same string -
 * one source of truth, no risk of the two drifting apart.
 */
export const EXTERNAL_LLM_GUIDELINE_TEXT =
  '(Assumption — needs confirmation) No specific placement ratio was specified for this palette, ' +
  'so the industry-standard 60-30-10 color split is adopted as a temporary default: use the ' +
  'background/neutral color for roughly 60% of the surface area, the primary and secondary colors ' +
  'together for roughly 30%, and the accent color for the remaining roughly 10%. Reserve the accent ' +
  'color strictly for calls-to-action and other action-driving elements (buttons, links, CTAs) - never ' +
  'use it for body copy. Body and paragraph text should use only the color assigned the background/' +
  'neutral (text) role, never the primary, secondary, or accent colors.'

/** Formats RGB as `rgb(r, g, b)`, each channel rounded to the nearest integer. */
function formatRgb(rgb: RGB): string {
  return `rgb(${Math.round(rgb.r)}, ${Math.round(rgb.g)}, ${Math.round(rgb.b)})`
}

/** Formats HSL as `hsl(h, s%, l%)`, each component rounded to the nearest integer. */
function formatHsl(hsl: HSL): string {
  return `hsl(${Math.round(hsl.h)}, ${Math.round(hsl.s)}%, ${Math.round(hsl.l)}%)`
}

/** One row of the "full palette" table: a slot's color data plus its role label. */
function paletteTableRow(color: PaletteColor, index: number): string {
  return `| ${index + 1} | ${roleForSlot(index)} | ${color.hex} | ${formatRgb(color.rgb)} | ${formatHsl(color.hsl)} |`
}

/**
 * Builds the "## 4. Mood & Aesthetic" section body. Mood tags always render;
 * the aesthetic line is included only when `aestheticMatch` is non-null -
 * when the on-screen `AestheticMatch` component would render nothing (spec
 * A's "no forced match" rule), this file omits the aesthetic item entirely
 * too (spec C: "the on-screen display rule... applies identically to the file").
 */
function moodAestheticSection(moodTags: string[], aestheticMatch: string | null): string {
  const lines = [`- Mood tags: ${moodTags.join(', ')}`]
  if (aestheticMatch !== null) {
    lines.push(`- Aesthetic match: ${aestheticMatch}`)
  }
  return lines.join('\n')
}

/**
 * Builds the full `.md` export text - spec C's 5 required items, in order:
 * (1) brand main color Hex/RGB/HSL, (2) all 5 colors' Hex/RGB/HSL + role,
 * (3) the generation mode's harmony explanation (`MODE_DESCRIPTIONS`),
 * (4) mood tags + aesthetic match (aesthetic omitted when null), and
 * (5) the 60-30-10 placement-guideline prompt (`EXTERNAL_LLM_GUIDELINE_TEXT`).
 *
 * Pure formatting only - every value comes from the caller (`palette`,
 * `mode`, `moodTags`, `aestheticMatch`); this function does not recompute
 * mood/aesthetic/derived colors itself (that is `palette.ts`'s job).
 */
export function buildMarkdownExportText(
  palette: PaletteColor[],
  mode: GenerationMode,
  moodTags: string[],
  aestheticMatch: string | null,
): string {
  const brand = palette[BRAND_SLOT_INDEX]
  const tableRows = palette.map((color, index) => paletteTableRow(color, index)).join('\n')

  return `# Brand Palette Export

This file describes a 5-color brand palette so another LLM (website builder, slide generator, etc.) can use it as design context. Treat every color below as fixed - do not invent or substitute other colors.

## 1. Brand Main Color

- Hex: ${brand.hex}
- RGB: ${formatRgb(brand.rgb)}
- HSL: ${formatHsl(brand.hsl)}

## 2. Full Palette (5 Colors)

| Slot | Role | Hex | RGB | HSL |
| --- | --- | --- | --- | --- |
${tableRows}

## 3. Generation Mode: ${mode}

${MODE_DESCRIPTIONS[mode]}

## 4. Mood & Aesthetic

${moodAestheticSection(moodTags, aestheticMatch)}

## 5. Design Guideline Prompt for External LLMs

${EXTERNAL_LLM_GUIDELINE_TEXT}
`
}

/** Result of validating a `.md` export's text against the palette/mode/mood/aesthetic it was built from. */
export interface MarkdownExportValidationResult {
  valid: boolean
  errors: string[]
}

/**
 * Validates that `text` completely and correctly represents spec C's 5
 * required items for the given `palette`/`mode`/`moodTags`/`aestheticMatch`
 * (M-4: "whether the 5 items actually exist in the file text, and whether
 * items 3 (mode description) and 4 (mood/Aesthetic) match spec A's current
 * values"). Checks, in
 * order:
 *
 * - Non-empty input.
 * - Item 1: the brand slot's Hex/RGB/HSL text all present.
 * - Item 2: every slot's Hex/RGB/HSL and `roleForSlot` role text present.
 * - Item 3: the current mode's `MODE_DESCRIPTIONS` text present verbatim
 *   (this is the "match" check - a stale/wrong mode description fails here).
 * - Item 4: every current mood tag present; when `aestheticMatch` is
 *   non-null its name must be present, when null the "Aesthetic match" line
 *   must be entirely absent (mirrors the on-screen omission rule).
 * - Item 5: the `EXTERNAL_LLM_GUIDELINE_TEXT` guideline paragraph present
 *   verbatim.
 *
 * Returns every problem found (not just the first), mirroring
 * `validatePaletteJson`/`validateCssVariablesText`'s "report everything"
 * contract.
 */
export function validateMarkdownExportText(
  text: string,
  palette: PaletteColor[],
  mode: GenerationMode,
  moodTags: string[],
  aestheticMatch: string | null,
): MarkdownExportValidationResult {
  const trimmed = text.trim()
  if (!trimmed) {
    return { valid: false, errors: ['Input is empty.'] }
  }

  const errors: string[] = []

  const brand = palette[BRAND_SLOT_INDEX]
  if (brand) {
    if (!text.includes(brand.hex)) errors.push('The brand main color Hex value is missing.')
    if (!text.includes(formatRgb(brand.rgb))) errors.push('The brand main color RGB value is missing.')
    if (!text.includes(formatHsl(brand.hsl))) errors.push('The brand main color HSL value is missing.')
  } else {
    errors.push('The brand main color is missing.')
  }

  if (palette.length !== PALETTE_SIZE) {
    errors.push(`Palette length is not ${PALETTE_SIZE} (actual: ${palette.length}).`)
  }

  palette.forEach((color, index) => {
    if (!text.includes(color.hex)) errors.push(`colors[${index}]: Hex value is missing.`)
    if (!text.includes(formatRgb(color.rgb))) errors.push(`colors[${index}]: RGB value is missing.`)
    if (!text.includes(formatHsl(color.hsl))) errors.push(`colors[${index}]: HSL value is missing.`)
    if (!text.includes(roleForSlot(index))) errors.push(`colors[${index}]: role value is missing.`)
  })

  if (!text.includes(MODE_DESCRIPTIONS[mode])) {
    errors.push('The generation mode (harmony mode) description is missing or does not match the current mode.')
  }

  moodTags.forEach((tag) => {
    if (!text.includes(tag)) errors.push(`Mood tag is missing: "${tag}"`)
  })

  if (aestheticMatch !== null) {
    if (!text.includes(`Aesthetic match: ${aestheticMatch}`)) {
      errors.push('The Aesthetic match name is missing or does not match the current value.')
    }
  } else if (text.includes('Aesthetic match')) {
    errors.push('When there is no Aesthetic match, the file must not include the Aesthetic item.')
  }

  if (!text.includes(EXTERNAL_LLM_GUIDELINE_TEXT)) {
    errors.push('The 60-30-10 placement-guideline prompt is missing.')
  }

  return { valid: errors.length === 0, errors }
}

/** Zero-padded `YYYYMMDD` for a local `Date` - mirrors `paletteExport.ts`'s own (unexported) date formatter. */
function formatYyyyMmDd(date: Date): string {
  const year = date.getFullYear().toString().padStart(4, '0')
  const month = (date.getMonth() + 1).toString().padStart(2, '0')
  const day = date.getDate().toString().padStart(2, '0')
  return `${year}${month}${day}`
}

/**
 * Builds the `.md` export filename: `brand-palette-{HEX}-{YYYYMMDD}.md`,
 * mirroring `paletteJsonFilename`/`palettePngFilename`'s convention (spec C:
 * "the filename includes the brand main color Hex and the generation date so
 * re-downloads stay distinguishable" - also "(assumption — needs confirmation)") so re-downloading the same
 * palette on a different day, or as a different export format, never
 * collides. The leading `#` of the brand HEX is stripped since it is not
 * filename-safe on every platform. `date` defaults to `new Date()` but is
 * injectable for deterministic tests.
 */
export function paletteMarkdownFilename(palette: PaletteColor[], date: Date = new Date()): string {
  const brandHex = palette[BRAND_SLOT_INDEX]?.hex.replace('#', '') ?? 'palette'
  return `brand-palette-${brandHex}-${formatYyyyMmDd(date)}.md`
}
