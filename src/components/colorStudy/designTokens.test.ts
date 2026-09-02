import { describe, expect, it } from 'vitest'
import { generatePalette } from '../../lib/palette'
import { getColorRoles } from '../../lib/colorRoles'
import { getDesignTokens } from './designTokens'

const palette = generatePalette('#3366ff')!

describe('getDesignTokens', () => {
  it('returns one token per semantic role, in role order', () => {
    const roles = getColorRoles(palette)
    const tokens = getDesignTokens(palette)
    expect(tokens).toHaveLength(roles.length)
    expect(tokens.map((t) => t.name)).toEqual(roles.map((r) => `color-${r.role}`))
  })

  it('names tokens with the project\'s "--color-{role}" convention', () => {
    const tokens = getDesignTokens(palette)
    tokens.forEach((token) => {
      expect(token.name).toMatch(/^color-[a-z]+$/)
      expect(token.cssVariable).toBe(`--${token.name}`)
    })
  })

  it('declaration is a ready-to-paste "--token: #hex;" CSS custom property', () => {
    const tokens = getDesignTokens(palette)
    tokens.forEach((token) => {
      expect(token.declaration).toBe(`${token.cssVariable}: ${token.value};`)
    })
  })

  it('value matches the hex of the role it derives from', () => {
    const roles = getColorRoles(palette)
    const tokens = getDesignTokens(palette)
    roles.forEach((role, index) => {
      expect(tokens[index].value).toBe(role.color.hex)
    })
  })

  it('throws on an empty palette (inherited from getColorRoles)', () => {
    expect(() => getDesignTokens([])).toThrow()
  })

  it('is deterministic across repeated calls', () => {
    expect(getDesignTokens(palette)).toEqual(getDesignTokens(palette))
  })
})
