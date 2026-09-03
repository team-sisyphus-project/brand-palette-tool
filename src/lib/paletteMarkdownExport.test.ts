import { describe, expect, it } from 'vitest'
import { BRAND_SLOT_INDEX, averageHsl, generatePalette, getMoodTags, matchAesthetic } from './palette'
import {
  EXTERNAL_LLM_GUIDELINE_TEXT,
  MODE_DESCRIPTIONS,
  buildMarkdownExportText,
  paletteMarkdownFilename,
  validateMarkdownExportText,
} from './paletteMarkdownExport'

const samplePalette = generatePalette('#3366ff', 'complementary')!
const sampleMood = getMoodTags(averageHsl(samplePalette))
const sampleAesthetic = matchAesthetic(averageHsl(samplePalette))

describe('MODE_DESCRIPTIONS', () => {
  it('has an entry for every GenerationMode', () => {
    expect(Object.keys(MODE_DESCRIPTIONS).sort()).toEqual(
      ['analogous', 'complementary', 'monochromatic', 'splitComplementary', 'triadic'].sort(),
    )
  })

  it('every description is non-empty text', () => {
    Object.values(MODE_DESCRIPTIONS).forEach((description) => {
      expect(description.length).toBeGreaterThan(0)
    })
  })
})

describe('buildMarkdownExportText', () => {
  it('includes the brand main color Hex/RGB/HSL', () => {
    const text = buildMarkdownExportText(samplePalette, 'complementary', sampleMood, sampleAesthetic)
    const brand = samplePalette[BRAND_SLOT_INDEX]
    expect(text).toContain(brand.hex)
    expect(text).toContain(`rgb(${brand.rgb.r}, ${brand.rgb.g}, ${brand.rgb.b})`)
    expect(text).toContain(`hsl(${Math.round(brand.hsl.h)}, ${Math.round(brand.hsl.s)}%, ${Math.round(brand.hsl.l)}%)`)
  })

  it('includes all 5 colors with Hex/RGB/HSL and role', () => {
    const text = buildMarkdownExportText(samplePalette, 'complementary', sampleMood, sampleAesthetic)
    samplePalette.forEach((color) => {
      expect(text).toContain(color.hex)
    })
    expect(text).toContain('Primary')
    expect(text).toContain('Secondary')
    expect(text).toContain('Accent')
    expect(text).toContain('Background/Neutral')
  })

  it('includes the exact mode description for the given mode', () => {
    const text = buildMarkdownExportText(samplePalette, 'monochromatic', sampleMood, sampleAesthetic)
    expect(text).toContain(MODE_DESCRIPTIONS.monochromatic)
  })

  it('includes every mood tag', () => {
    const text = buildMarkdownExportText(samplePalette, 'complementary', ['Warm', 'Vibrant'], null)
    expect(text).toContain('Warm')
    expect(text).toContain('Vibrant')
  })

  it('includes the aesthetic match name when non-null', () => {
    const text = buildMarkdownExportText(samplePalette, 'complementary', sampleMood, 'Coastal')
    expect(text).toContain('Aesthetic match: Coastal')
  })

  it('omits the aesthetic section entirely when aestheticMatch is null', () => {
    const text = buildMarkdownExportText(samplePalette, 'complementary', sampleMood, null)
    expect(text).not.toContain('Aesthetic match')
  })

  it('includes the 60-30-10 placement-guideline prompt, flagged as an assumption, with a CTA-only accent rule', () => {
    const text = buildMarkdownExportText(samplePalette, 'complementary', sampleMood, sampleAesthetic)
    expect(text).toContain(EXTERNAL_LLM_GUIDELINE_TEXT)
    expect(text).toContain('60')
    expect(text).toContain('30')
    expect(text).toContain('10')
    expect(text).toMatch(/Assumption/i)
    expect(text).toMatch(/calls-to-action/i)
  })

  it('always generates text that passes validateMarkdownExportText for the same inputs', () => {
    const text = buildMarkdownExportText(samplePalette, 'complementary', sampleMood, sampleAesthetic)
    expect(validateMarkdownExportText(text, samplePalette, 'complementary', sampleMood, sampleAesthetic)).toEqual({
      valid: true,
      errors: [],
    })
  })

  it('always generates valid text when aestheticMatch is null too', () => {
    const text = buildMarkdownExportText(samplePalette, 'analogous', sampleMood, null)
    expect(validateMarkdownExportText(text, samplePalette, 'analogous', sampleMood, null)).toEqual({
      valid: true,
      errors: [],
    })
  })
})

describe('validateMarkdownExportText', () => {
  it('rejects an empty string', () => {
    expect(validateMarkdownExportText('', samplePalette, 'complementary', sampleMood, null).valid).toBe(false)
    expect(validateMarkdownExportText('   ', samplePalette, 'complementary', sampleMood, null).valid).toBe(false)
  })

  it('rejects text missing the brand main color', () => {
    const text = buildMarkdownExportText(samplePalette, 'complementary', sampleMood, sampleAesthetic)
    const broken = text.split(samplePalette[BRAND_SLOT_INDEX].hex).join('#000000')
    const result = validateMarkdownExportText(broken, samplePalette, 'complementary', sampleMood, sampleAesthetic)
    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => e.includes('brand main color'))).toBe(true)
  })

  it('rejects text missing one of the 5 colors', () => {
    const text = buildMarkdownExportText(samplePalette, 'complementary', sampleMood, sampleAesthetic)
    const broken = text.split(samplePalette[3].hex).join('#abcdef')
    const result = validateMarkdownExportText(broken, samplePalette, 'complementary', sampleMood, sampleAesthetic)
    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => e.includes('colors[3]'))).toBe(true)
  })

  it('rejects text whose mode description does not match the given mode', () => {
    const text = buildMarkdownExportText(samplePalette, 'complementary', sampleMood, sampleAesthetic)
    const result = validateMarkdownExportText(text, samplePalette, 'triadic', sampleMood, sampleAesthetic)
    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => e.includes('generation mode'))).toBe(true)
  })

  it('rejects text missing a mood tag that is expected to be present', () => {
    const text = buildMarkdownExportText(samplePalette, 'complementary', ['Warm'], sampleAesthetic)
    const result = validateMarkdownExportText(
      text,
      samplePalette,
      'complementary',
      ['Warm', 'Vibrant'],
      sampleAesthetic,
    )
    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => e.includes('Mood tag'))).toBe(true)
  })

  it('rejects text whose aesthetic name does not match the given aestheticMatch', () => {
    const text = buildMarkdownExportText(samplePalette, 'complementary', sampleMood, 'Coastal')
    const result = validateMarkdownExportText(text, samplePalette, 'complementary', sampleMood, 'Luxury')
    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => e.includes('Aesthetic'))).toBe(true)
  })

  it('rejects text that includes an aesthetic match when aestheticMatch is null', () => {
    const text = buildMarkdownExportText(samplePalette, 'complementary', sampleMood, 'Coastal')
    const result = validateMarkdownExportText(text, samplePalette, 'complementary', sampleMood, null)
    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => e.includes('must not include'))).toBe(true)
  })

  it('rejects text missing the 60-30-10 guideline paragraph', () => {
    const text = buildMarkdownExportText(samplePalette, 'complementary', sampleMood, sampleAesthetic).replace(
      EXTERNAL_LLM_GUIDELINE_TEXT,
      '',
    )
    const result = validateMarkdownExportText(text, samplePalette, 'complementary', sampleMood, sampleAesthetic)
    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => e.includes('guideline'))).toBe(true)
  })

  it('reports every problem found, not just the first', () => {
    const result = validateMarkdownExportText('some unrelated text', samplePalette, 'complementary', sampleMood, sampleAesthetic)
    expect(result.valid).toBe(false)
    expect(result.errors.length).toBeGreaterThan(3)
  })
})

describe('paletteMarkdownFilename', () => {
  it('builds brand-palette-{HEX}-{YYYYMMDD}.md using the brand slot hex (# stripped)', () => {
    const filename = paletteMarkdownFilename(samplePalette, new Date(2026, 7, 26))
    const expectedHex = samplePalette[BRAND_SLOT_INDEX].hex.replace('#', '')
    expect(filename).toBe(`brand-palette-${expectedHex}-20260826.md`)
  })

  it('zero-pads single-digit month and day', () => {
    const filename = paletteMarkdownFilename(samplePalette, new Date(2026, 0, 5))
    const expectedHex = samplePalette[BRAND_SLOT_INDEX].hex.replace('#', '')
    expect(filename).toBe(`brand-palette-${expectedHex}-20260105.md`)
  })

  it('falls back to a generic slug for an empty palette', () => {
    expect(paletteMarkdownFilename([], new Date(2026, 7, 26))).toBe('brand-palette-palette-20260826.md')
  })
})
