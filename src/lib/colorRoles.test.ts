import { describe, expect, it } from 'vitest'
import { generatePalette } from './palette'
import { ROLE_LABELS, ROLE_ORDER, getColorRoles } from './colorRoles'

const palette = generatePalette('#3366ff')!

describe('getColorRoles', () => {
  it('returns all 10 roles, in ROLE_ORDER, each with a matching label', () => {
    const roles = getColorRoles(palette)
    expect(roles.map((r) => r.role)).toEqual(ROLE_ORDER)
    roles.forEach((assignment) => {
      expect(assignment.label).toBe(ROLE_LABELS[assignment.role])
    })
  })

  it('maps primary/secondary/accent to the palette\'s own slots 0/1/2', () => {
    const roles = getColorRoles(palette)
    const byRole = new Map(roles.map((r) => [r.role, r.color]))
    expect(byRole.get('primary')).toEqual(palette[0])
    expect(byRole.get('secondary')).toEqual(palette[1])
    expect(byRole.get('accent')).toEqual(palette[2])
  })

  it('derives background/surface/text/border from the primary hue at near-neutral saturation', () => {
    const roles = getColorRoles(palette)
    const byRole = new Map(roles.map((r) => [r.role, r.color]))
    const primaryHue = palette[0].hsl.h
    ;(['background', 'surface', 'text', 'border'] as const).forEach((role) => {
      const color = byRole.get(role)!
      expect(color.hsl.h).toBeCloseTo(primaryHue, 5)
      expect(color.hsl.s).toBeLessThan(20)
    })
    // background/surface are near-white, text is near-black, border sits in between.
    expect(byRole.get('background')!.hsl.l).toBeGreaterThan(80)
    expect(byRole.get('surface')!.hsl.l).toBeGreaterThan(80)
    expect(byRole.get('text')!.hsl.l).toBeLessThan(30)
    expect(byRole.get('border')!.hsl.l).toBeGreaterThan(byRole.get('text')!.hsl.l)
  })

  it('uses fixed, brand-independent hues for success/warning/error regardless of the input palette', () => {
    const otherPalette = generatePalette('#ff8800')!
    const rolesA = getColorRoles(palette)
    const rolesB = getColorRoles(otherPalette)
    const byRoleA = new Map(rolesA.map((r) => [r.role, r.color]))
    const byRoleB = new Map(rolesB.map((r) => [r.role, r.color]))
    ;(['success', 'warning', 'error'] as const).forEach((role) => {
      expect(byRoleA.get(role)!.hex).toBe(byRoleB.get(role)!.hex)
    })
    // sanity: the three status colors are hue-distinct from each other.
    const hexes = (['success', 'warning', 'error'] as const).map((role) => byRoleA.get(role)!.hex)
    expect(new Set(hexes).size).toBe(3)
  })

  it('is deterministic: the same palette always yields the same role assignments', () => {
    expect(getColorRoles(palette)).toEqual(getColorRoles(palette))
  })

  it('throws on an empty palette', () => {
    expect(() => getColorRoles([])).toThrow()
  })

  it('falls back secondary/accent to the first slot when the palette is shorter than expected', () => {
    const shortPalette = [palette[0]]
    const roles = getColorRoles(shortPalette)
    const byRole = new Map(roles.map((r) => [r.role, r.color]))
    expect(byRole.get('secondary')).toEqual(palette[0])
    expect(byRole.get('accent')).toEqual(palette[0])
  })
})
