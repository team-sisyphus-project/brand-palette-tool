import { describe, expect, it } from 'vitest'
import { BRAND_SLOT_INDEX, PALETTE_SIZE, generatePalette } from './palette'
import {
  PALETTE_SLOT_ROLES,
  buildPaletteExportData,
  cssVariableNameForSlot,
  paletteJsonFilename,
  paletteToCssVariablesText,
  paletteToHexList,
  paletteToJsonText,
  roleForSlot,
  validateCssVariablesText,
  validatePaletteJson,
} from './paletteExport'

const samplePalette = generatePalette('#3366ff')!

/** Test helper: shallow-copies `obj` without the given key. */
function omit<T extends object, K extends keyof T>(obj: T, key: K): Omit<T, K> {
  const copy = { ...obj }
  delete copy[key]
  return copy
}

describe('cssVariableNameForSlot', () => {
  it('names the brand main slot (index 0) with the fixed semantic name', () => {
    expect(cssVariableNameForSlot(0)).toBe('--color-brand-main')
  })

  it('names every other slot with a stable 1-based order name', () => {
    expect(cssVariableNameForSlot(1)).toBe('--color-palette-2')
    expect(cssVariableNameForSlot(2)).toBe('--color-palette-3')
    expect(cssVariableNameForSlot(3)).toBe('--color-palette-4')
    expect(cssVariableNameForSlot(4)).toBe('--color-palette-5')
  })
})

describe('paletteToHexList', () => {
  it('joins every slot HEX code, one per line, in slot order', () => {
    const result = paletteToHexList(samplePalette)
    expect(result).toBe(samplePalette.map((c) => c.hex).join('\n'))
    expect(result.split('\n')).toHaveLength(5)
  })

  it('returns an empty string for an empty palette', () => {
    expect(paletteToHexList([])).toBe('')
  })
})

describe('paletteToCssVariablesText', () => {
  it('produces a :root block with one declaration per slot, brand slot first', () => {
    const text = paletteToCssVariablesText(samplePalette)
    expect(text.startsWith(':root {\n')).toBe(true)
    expect(text.endsWith('\n}')).toBe(true)
    expect(text).toContain(`--color-brand-main: ${samplePalette[0].hex};`)
    expect(text).toContain(`--color-palette-2: ${samplePalette[1].hex};`)
    expect(text).toContain(`--color-palette-5: ${samplePalette[4].hex};`)
  })

  it('accepts a custom selector', () => {
    const text = paletteToCssVariablesText(samplePalette, '.theme-brand')
    expect(text.startsWith('.theme-brand {\n')).toBe(true)
  })

  it('always generates text that passes validateCssVariablesText', () => {
    const text = paletteToCssVariablesText(samplePalette)
    expect(validateCssVariablesText(text)).toEqual({ valid: true, errors: [] })
  })
})

describe('validateCssVariablesText', () => {
  it('accepts a well-formed single-declaration block', () => {
    expect(validateCssVariablesText(':root {\n  --color-brand-main: #3366ff;\n}')).toEqual({
      valid: true,
      errors: [],
    })
  })

  it('accepts a well-formed multi-declaration block regardless of whitespace style', () => {
    const text = ':root{--a:#fff;--b:#000;}'
    const result = validateCssVariablesText(text)
    expect(result.valid).toBe(true)
    expect(result.errors).toEqual([])
  })

  it('rejects an empty string', () => {
    expect(validateCssVariablesText('').valid).toBe(false)
    expect(validateCssVariablesText('   ').valid).toBe(false)
  })

  it('rejects text with no braces at all', () => {
    const result = validateCssVariablesText('--color-brand-main: #3366ff;')
    expect(result.valid).toBe(false)
    expect(result.errors[0]).toMatch(/중괄호/)
  })

  it('rejects unbalanced braces', () => {
    const missingClose = validateCssVariablesText(':root { --a: #fff;')
    expect(missingClose.valid).toBe(false)
    expect(missingClose.errors[0]).toMatch(/중괄호/)

    const extraOpen = validateCssVariablesText(':root { { --a: #fff; }')
    expect(extraOpen.valid).toBe(false)
  })

  it('rejects a block with an empty selector', () => {
    const result = validateCssVariablesText('{ --a: #fff; }')
    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => e.includes('선택자'))).toBe(true)
  })

  it('rejects an empty declaration body', () => {
    const result = validateCssVariablesText(':root {}')
    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => e.includes('비어 있습니다'))).toBe(true)
  })

  it('rejects a body missing the trailing semicolon on the last declaration', () => {
    const result = validateCssVariablesText(':root {\n  --a: #fff\n}')
    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => e.includes('세미콜론'))).toBe(true)
  })

  it('rejects an invalid custom-property identifier (missing -- prefix)', () => {
    const result = validateCssVariablesText(':root {\n  color-a: #fff;\n}')
    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => e.includes('올바르지 않은 선언'))).toBe(true)
  })

  it('rejects an identifier starting with a digit after --', () => {
    const result = validateCssVariablesText(':root {\n  --1a: #fff;\n}')
    expect(result.valid).toBe(false)
  })

  it('rejects a declaration with an empty value', () => {
    const result = validateCssVariablesText(':root {\n  --a: ;\n}')
    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => e.includes('값이 비어 있습니다'))).toBe(true)
  })

  it('rejects duplicate variable names within the same block', () => {
    const result = validateCssVariablesText(':root {\n  --a: #fff;\n  --a: #000;\n}')
    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => e.includes('중복된 변수명'))).toBe(true)
  })

  it('reports every problem found, not just the first', () => {
    const result = validateCssVariablesText(':root {\n  bogus;\n  --b: ;\n}')
    expect(result.valid).toBe(false)
    expect(result.errors.length).toBeGreaterThanOrEqual(2)
  })
})

describe('roleForSlot / PALETTE_SLOT_ROLES', () => {
  it('has exactly PALETTE_SIZE role entries, brand slot first', () => {
    expect(PALETTE_SLOT_ROLES).toHaveLength(PALETTE_SIZE)
    expect(PALETTE_SLOT_ROLES[BRAND_SLOT_INDEX]).toBe('주조색')
  })

  it('assigns 보조색 to slots 1-2, 강조색 to slot 3, 배경·중성색 to slot 4', () => {
    expect(roleForSlot(1)).toBe('보조색')
    expect(roleForSlot(2)).toBe('보조색')
    expect(roleForSlot(3)).toBe('강조색')
    expect(roleForSlot(4)).toBe('배경·중성색')
  })

  it('falls back to a defensive label for an out-of-range slot', () => {
    expect(roleForSlot(99)).toBe('미분류')
  })
})

describe('buildPaletteExportData', () => {
  it('includes every slot with its full color data and mapped role, in slot order', () => {
    const data = buildPaletteExportData(samplePalette)
    expect(data.colors).toHaveLength(PALETTE_SIZE)
    data.colors.forEach((entry, index) => {
      expect(entry.slot).toBe(index)
      expect(entry.role).toBe(roleForSlot(index))
      expect(entry.hex).toBe(samplePalette[index].hex)
      expect(entry.rgb).toEqual(samplePalette[index].rgb)
      expect(entry.hsl).toEqual(samplePalette[index].hsl)
    })
  })
})

describe('paletteToJsonText', () => {
  it('serializes buildPaletteExportData as pretty-printed JSON', () => {
    const text = paletteToJsonText(samplePalette)
    expect(JSON.parse(text)).toEqual(buildPaletteExportData(samplePalette))
    expect(text).toContain('\n')
  })

  it('always generates text that passes validatePaletteJson', () => {
    expect(validatePaletteJson(paletteToJsonText(samplePalette))).toEqual({
      valid: true,
      errors: [],
    })
  })
})

describe('validatePaletteJson', () => {
  it('accepts a complete 5-color set', () => {
    const result = validatePaletteJson(paletteToJsonText(samplePalette))
    expect(result).toEqual({ valid: true, errors: [] })
  })

  it('rejects an empty string', () => {
    expect(validatePaletteJson('').valid).toBe(false)
    expect(validatePaletteJson('   ').valid).toBe(false)
  })

  it('rejects malformed JSON', () => {
    const result = validatePaletteJson('{ not valid json')
    expect(result.valid).toBe(false)
    expect(result.errors[0]).toMatch(/JSON/)
  })

  it('rejects a JSON array at the top level', () => {
    const result = validatePaletteJson('[1, 2, 3]')
    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => e.includes('객체'))).toBe(true)
  })

  it('rejects a payload missing the colors array', () => {
    const result = validatePaletteJson('{}')
    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => e.includes('colors'))).toBe(true)
  })

  it('rejects a colors array with the wrong length', () => {
    const data = buildPaletteExportData(samplePalette)
    const short = { colors: data.colors.slice(0, 4) }
    const result = validatePaletteJson(JSON.stringify(short))
    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => e.includes(`${PALETTE_SIZE}`))).toBe(true)
  })

  it('rejects a payload with a color entry missing the role field', () => {
    const data = buildPaletteExportData(samplePalette)
    const withMissingRole = {
      colors: data.colors.map((entry, index) =>
        index === 2 ? { ...entry, role: undefined } : entry,
      ),
    }
    const result = validatePaletteJson(JSON.stringify(withMissingRole))
    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => e.includes('colors[2]') && e.includes('role'))).toBe(true)
  })

  it('rejects a payload with a color entry missing the hex field', () => {
    const data = buildPaletteExportData(samplePalette)
    const withMissingHex = {
      colors: data.colors.map((entry, index) => (index === 0 ? omit(entry, 'hex') : entry)),
    }
    const result = validatePaletteJson(JSON.stringify(withMissingHex))
    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => e.includes('colors[0]') && e.includes('hex'))).toBe(true)
  })

  it('rejects a payload with a color entry missing the rgb field', () => {
    const data = buildPaletteExportData(samplePalette)
    const withMissingRgb = {
      colors: data.colors.map((entry, index) => (index === 1 ? omit(entry, 'rgb') : entry)),
    }
    const result = validatePaletteJson(JSON.stringify(withMissingRgb))
    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => e.includes('colors[1]') && e.includes('rgb'))).toBe(true)
  })

  it('rejects a payload with a color entry missing the hsl field', () => {
    const data = buildPaletteExportData(samplePalette)
    const withMissingHsl = {
      colors: data.colors.map((entry, index) => (index === 3 ? omit(entry, 'hsl') : entry)),
    }
    const result = validatePaletteJson(JSON.stringify(withMissingHsl))
    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => e.includes('colors[3]') && e.includes('hsl'))).toBe(true)
  })

  it('rejects a payload with a slot value that does not match its array position', () => {
    const data = buildPaletteExportData(samplePalette)
    const withWrongSlot = {
      colors: data.colors.map((entry, index) => (index === 4 ? { ...entry, slot: 0 } : entry)),
    }
    const result = validatePaletteJson(JSON.stringify(withWrongSlot))
    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => e.includes('colors[4]') && e.includes('slot'))).toBe(true)
  })

  it('rejects a payload with an out-of-range rgb value', () => {
    const data = buildPaletteExportData(samplePalette)
    const withBadRgb = {
      colors: data.colors.map((entry, index) =>
        index === 0 ? { ...entry, rgb: { ...entry.rgb, r: 999 } } : entry,
      ),
    }
    const result = validatePaletteJson(JSON.stringify(withBadRgb))
    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => e.includes('colors[0]') && e.includes('rgb'))).toBe(true)
  })

  it('reports every problem found, not just the first', () => {
    const withMultipleIssues = {
      colors: [
        { slot: 0, role: '', hex: 'not-a-color', rgb: { r: 0, g: 0, b: 0 }, hsl: { h: 0, s: 0, l: 0 } },
      ],
    }
    const result = validatePaletteJson(JSON.stringify(withMultipleIssues))
    expect(result.valid).toBe(false)
    expect(result.errors.length).toBeGreaterThanOrEqual(3)
  })
})

describe('paletteJsonFilename', () => {
  it('builds brand-palette-{HEX}-{YYYYMMDD}.json using the brand slot hex (# stripped)', () => {
    const filename = paletteJsonFilename(samplePalette, new Date(2026, 7, 26))
    const expectedHex = samplePalette[BRAND_SLOT_INDEX].hex.replace('#', '')
    expect(filename).toBe(`brand-palette-${expectedHex}-20260826.json`)
  })

  it('zero-pads single-digit month and day', () => {
    const filename = paletteJsonFilename(samplePalette, new Date(2026, 0, 5))
    const expectedHex = samplePalette[BRAND_SLOT_INDEX].hex.replace('#', '')
    expect(filename).toBe(`brand-palette-${expectedHex}-20260105.json`)
  })

  it('falls back to a generic slug for an empty palette', () => {
    expect(paletteJsonFilename([], new Date(2026, 7, 26))).toBe('brand-palette-palette-20260826.json')
  })
})
