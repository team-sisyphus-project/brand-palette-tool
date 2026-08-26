import { describe, expect, it } from 'vitest'
import { generatePalette } from './palette'
import { getColorRoles } from './colorRoles'
import { getGradientSuggestions } from './colorGradients'

const palette = generatePalette('#3366ff')!

describe('getGradientSuggestions', () => {
  it('returns the fixed 4 role-pair gradients, in order', () => {
    const gradients = getGradientSuggestions(palette)
    expect(gradients.map((g) => g.label)).toEqual([
      'Primary → Accent',
      'Primary → Secondary',
      'Accent → Background',
      'Secondary → Accent',
    ])
  })

  it('css is a linear-gradient string built from the from/to hex codes', () => {
    const gradients = getGradientSuggestions(palette)
    gradients.forEach((gradient) => {
      expect(gradient.css).toBe(`linear-gradient(135deg, ${gradient.from.hex}, ${gradient.to.hex})`)
    })
  })

  it('from/to colors match the roles named in each label', () => {
    const roles = getColorRoles(palette)
    const byRole = new Map(roles.map((r) => [r.role, r.color]))
    const gradients = getGradientSuggestions(palette)
    expect(gradients[0].from).toEqual(byRole.get('primary'))
    expect(gradients[0].to).toEqual(byRole.get('accent'))
    expect(gradients[2].from).toEqual(byRole.get('accent'))
    expect(gradients[2].to).toEqual(byRole.get('background'))
  })

  it('throws on an empty palette (inherited from getColorRoles)', () => {
    expect(() => getGradientSuggestions([])).toThrow()
  })

  it('is deterministic across repeated calls', () => {
    expect(getGradientSuggestions(palette)).toEqual(getGradientSuggestions(palette))
  })
})
