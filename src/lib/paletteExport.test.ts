import { describe, expect, it } from 'vitest'
import { generatePalette } from './palette'
import {
  cssVariableNameForSlot,
  paletteToCssVariablesText,
  paletteToHexList,
  validateCssVariablesText,
} from './paletteExport'

const samplePalette = generatePalette('#3366ff')!

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
