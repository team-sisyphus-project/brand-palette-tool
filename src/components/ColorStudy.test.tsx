import { fireEvent, render, screen, within } from '@testing-library/react'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { generateShades, getHarmonyColors, type PaletteColor } from '../lib/palette'
import { ColorStudy } from './ColorStudy'

function makeColor(hex: string, h: number): PaletteColor {
  return { hex, rgb: { r: 0, g: 0, b: 0 }, hsl: { h, s: 50, l: 50 } }
}

describe('ColorStudy', () => {
  const colors = [
    makeColor('#ff0000', 0),
    makeColor('#00ff00', 90),
    makeColor('#0000ff', 180),
    makeColor('#ffff00', 270),
    makeColor('#00ffff', 45),
  ]

  it('renders an independent section labeled by its own "Color Study" heading', () => {
    render(<ColorStudy colors={colors} />)

    const section = screen.getByRole('region', { name: 'Color Study' })
    expect(section).toBeInTheDocument()
    expect(section.tagName).toBe('SECTION')
    expect(screen.getByRole('heading', { name: 'Color Study', level: 2 })).toBeInTheDocument()
  })

  it('renders the color wheel inside the section', () => {
    const { container } = render(<ColorStudy colors={colors} />)

    const section = screen.getByRole('region', { name: 'Color Study' })
    expect(section.querySelectorAll('.color-wheel__marker')).toHaveLength(colors.length)
    expect(container.querySelector('.color-study .color-wheel')).not.toBeNull()
  })

  it('contains no Korean text', () => {
    const { container } = render(<ColorStudy colors={colors} />)
    expect(container.textContent ?? '').not.toMatch(/[ㄱ-힝]/)
  })

  it('renders the Complementary/Analogous/Triadic harmony button group under the wheel', () => {
    render(<ColorStudy colors={colors} />)

    const group = screen.getByRole('group', { name: 'Select color harmony' })
    expect(group).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Complementary harmony' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Analogous harmony' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Triadic harmony' })).toBeInTheDocument()
  })

  it('defaults to Complementary, derived from the brand main color (first slot)', () => {
    render(<ColorStudy colors={colors} />)

    expect(screen.getByRole('button', { name: 'Complementary harmony' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    const expected = getHarmonyColors(colors[0].hsl, 'complementary')
    for (const color of expected) {
      expect(screen.getByText(color.hex)).toBeInTheDocument()
    }
  })

  it('clicking Analogous toggles the pressed state and recomputes accent colors deterministically', () => {
    render(<ColorStudy colors={colors} />)

    fireEvent.click(screen.getByRole('button', { name: 'Analogous harmony' }))

    expect(screen.getByRole('button', { name: 'Analogous harmony' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    expect(screen.getByRole('button', { name: 'Complementary harmony' })).toHaveAttribute(
      'aria-pressed',
      'false',
    )
    const expected = getHarmonyColors(colors[0].hsl, 'analogous')
    for (const color of expected) {
      expect(screen.getByText(color.hex)).toBeInTheDocument()
    }
  })

  it('clicking Triadic then Complementary swaps between the two accent sets', () => {
    render(<ColorStudy colors={colors} />)

    fireEvent.click(screen.getByRole('button', { name: 'Triadic harmony' }))
    const triadicAccents = getHarmonyColors(colors[0].hsl, 'triadic')
    for (const color of triadicAccents) {
      expect(screen.getByText(color.hex)).toBeInTheDocument()
    }

    fireEvent.click(screen.getByRole('button', { name: 'Complementary harmony' }))
    const complementaryAccents = getHarmonyColors(colors[0].hsl, 'complementary')
    for (const color of complementaryAccents) {
      expect(screen.getByText(color.hex)).toBeInTheDocument()
    }
  })

  // grain-3: custom base color selection + Shades ramp
  it('defaults the base color to the brand main color (first slot) when baseColorIndex is omitted', () => {
    render(<ColorStudy colors={colors} />)

    const expected = getHarmonyColors(colors[0].hsl, 'complementary')
    for (const color of expected) {
      expect(screen.getByText(color.hex)).toBeInTheDocument()
    }
  })

  it('uses colors[baseColorIndex] as the base color when provided', () => {
    render(<ColorStudy colors={colors} baseColorIndex={2} />)

    const expected = getHarmonyColors(colors[2].hsl, 'complementary')
    for (const color of expected) {
      expect(screen.getByText(color.hex)).toBeInTheDocument()
    }
    // slot 0 (brand) is no longer the base - its complementary accent isn't shown.
    const brandExpected = getHarmonyColors(colors[0].hsl, 'complementary')
    expect(screen.queryByText(brandExpected[0].hex)).not.toBeInTheDocument()
  })

  it('falls back to the brand slot when baseColorIndex is out of range', () => {
    render(<ColorStudy colors={colors} baseColorIndex={99} />)

    const expected = getHarmonyColors(colors[0].hsl, 'complementary')
    for (const color of expected) {
      expect(screen.getByText(color.hex)).toBeInTheDocument()
    }
  })

  it('renders a Shades ramp for the base color and every current harmony accent', () => {
    render(<ColorStudy colors={colors} baseColorIndex={0} />)

    const shades = screen.getByRole('group', { name: 'Shades' })
    // Complementary (default harmony): 1 accent -> "Base" + "Accent 1" groups.
    const baseRamp = within(shades).getByRole('list', { name: 'Base shades' })
    const accentRamp = within(shades).getByRole('list', { name: 'Accent 1 shades' })

    const expectedBaseShades = generateShades(colors[0].hsl)
    for (const shade of expectedBaseShades) {
      expect(
        within(baseRamp).getByText(`${Math.round(shade.hsl.l)}% ${shade.hex}`),
      ).toBeInTheDocument()
    }

    const accent = getHarmonyColors(colors[0].hsl, 'complementary')[0]
    const expectedAccentShades = generateShades(accent.hsl)
    for (const shade of expectedAccentShades) {
      expect(
        within(accentRamp).getByText(`${Math.round(shade.hsl.l)}% ${shade.hex}`),
      ).toBeInTheDocument()
    }
  })

  it('Shades ramp gains a 2nd accent group when switching to Analogous/Triadic', () => {
    render(<ColorStudy colors={colors} baseColorIndex={0} />)

    fireEvent.click(screen.getByRole('button', { name: 'Triadic harmony' }))

    const shades = screen.getByRole('group', { name: 'Shades' })
    expect(within(shades).getByRole('list', { name: 'Base shades' })).toBeInTheDocument()
    expect(within(shades).getByRole('list', { name: 'Accent 1 shades' })).toBeInTheDocument()
    expect(within(shades).getByRole('list', { name: 'Accent 2 shades' })).toBeInTheDocument()
  })
})

// grain-2 (full-width masonry layout shell): the wheel/harmony/shades widgets
// each render inside their own `.color-study__tile` card, arranged through
// `.color-study__grid` (see the class doc comment on ColorStudy.tsx / M-2,
// M-3 in the card's Measures).
describe('ColorStudy: grain-2 masonry tile wrapping', () => {
  const colors = [
    makeColor('#ff0000', 0),
    makeColor('#00ff00', 90),
    makeColor('#0000ff', 180),
    makeColor('#ffff00', 270),
    makeColor('#00ffff', 45),
  ]

  it('wraps the color wheel, harmony explorer, and shades ramp each in their own masonry tile', () => {
    const { container } = render(<ColorStudy colors={colors} />)

    const grid = container.querySelector('.color-study .color-study__grid')
    expect(grid).not.toBeNull()

    const tiles = container.querySelectorAll('.color-study__grid > .color-study__tile')
    expect(tiles).toHaveLength(3)
    expect(tiles[0].querySelector('.color-wheel')).not.toBeNull()
    expect(tiles[1].querySelector('.harmony-explorer')).not.toBeNull()
    expect(tiles[2].querySelector('.shades')).not.toBeNull()
  })
})

describe('ColorStudy.css: grain-2 full-width container + 4-col masonry + rounded tiles (source-level)', () => {
  const cssPath = path.join(path.dirname(fileURLToPath(import.meta.url)), 'ColorStudy.css')
  const css = readFileSync(cssPath, 'utf-8')

  function extractRuleBody(source: string, selector: string): string {
    const index = source.indexOf(selector)
    if (index === -1) {
      throw new Error(`extractRuleBody: selector "${selector}" not found`)
    }
    const braceStart = source.indexOf('{', index)
    let depth = 0
    for (let i = braceStart; i < source.length; i++) {
      if (source[i] === '{') depth++
      else if (source[i] === '}') {
        depth--
        if (depth === 0) return source.slice(braceStart + 1, i)
      }
    }
    throw new Error(`extractRuleBody: unbalanced braces for selector "${selector}"`)
  }

  it('M-1: the section is a full-width container capped at 1920px', () => {
    const rule = extractRuleBody(css, '.color-study {')
    expect(rule).toMatch(/width:\s*100%\s*;/)
    expect(rule).toMatch(/max-width:\s*1920px\s*;/)
  })

  it('M-2: the masonry grid defaults to 4 columns on desktop', () => {
    const rule = extractRuleBody(css, '.color-study__grid {')
    expect(rule).toMatch(/columns:\s*4\s*;/)
  })

  it('M-2: the column count steps down at the 1024px and 768px breakpoints', () => {
    expect(css).toMatch(/@media \(max-width:\s*1024px\)[^]*?\.color-study__grid\s*\{[^}]*columns:\s*2\s*;/)
    expect(css).toMatch(/@media \(max-width:\s*768px\)[^]*?\.color-study__grid\s*\{[^}]*columns:\s*1\s*;/)
  })

  it('M-3: every tile shares one rounded-corner + subtle-border shell rule', () => {
    const rule = extractRuleBody(css, '.color-study__tile {')
    expect(rule).toMatch(/border-radius:\s*var\(--radius-card\)\s*;/)
    expect(rule).toMatch(/border:\s*var\(--border-width-default\)\s*solid\s*var\(--color-border-default\)\s*;/)
  })
})

// grain-7 (integration & polish): all 10 analysis cards wired into the
// masonry grid, each reacting to the same `colors`/`baseColorIndex` props
// the wheel/harmony/shades tiles already use (M-4, M-5).
describe('ColorStudy: grain-7 analysis card wiring', () => {
  const colors = [
    makeColor('#ff0000', 0),
    makeColor('#00ff00', 90),
    makeColor('#0000ff', 180),
    makeColor('#ffff00', 270),
    makeColor('#00ffff', 45),
  ]

  const CARD_HEADINGS = [
    'Color Roles',
    'Color Distribution',
    'Contrast Checker',
    'Usage Guide',
    'Website Preview',
    'Presentation Preview',
    'Design Tokens',
    'Pairing Guide',
    'Gradient Suggestions',
    'Chart Colors',
  ]

  it('M-4: renders all 10 analysis cards as headed regions inside the grid', () => {
    render(<ColorStudy colors={colors} />)

    const grid = screen.getByRole('region', { name: 'Color Study' }).querySelector('.color-study__grid')
    expect(grid).not.toBeNull()

    for (const heading of CARD_HEADINGS) {
      const region = screen.getByRole('region', { name: heading })
      expect(grid?.contains(region)).toBe(true)
      expect(within(region).getByRole('heading', { level: 3, name: heading })).toBeInTheDocument()
    }
  })

  it('does not double-wrap analysis cards in an extra .color-study__tile shell', () => {
    const { container } = render(<ColorStudy colors={colors} />)

    // The 3 pre-existing widget tiles are the only `.color-study__tile`
    // children - analysis cards carry their own `.color-study-card` shell.
    expect(container.querySelectorAll('.color-study__grid > .color-study__tile')).toHaveLength(3)
    expect(container.querySelectorAll('.color-study__grid > .color-study-card')).toHaveLength(
      CARD_HEADINGS.length,
    )
  })

  it('M-5: every analysis card recomputes when the palette changes', () => {
    const { rerender } = render(<ColorStudy colors={colors} baseColorIndex={0} />)

    expect(within(screen.getByRole('region', { name: 'Color Roles' })).getByText('#ff0000')).toBeInTheDocument()

    const updatedColors = [
      makeColor('#123456', 210),
      colors[1],
      colors[2],
      colors[3],
      colors[4],
    ]
    rerender(<ColorStudy colors={updatedColors} baseColorIndex={0} />)

    const rolesRegion = screen.getByRole('region', { name: 'Color Roles' })
    expect(within(rolesRegion).queryByText('#ff0000')).not.toBeInTheDocument()
    expect(within(rolesRegion).getByText('#123456')).toBeInTheDocument()
  })

  it('M-5: analysis cards no-op (render nothing) until a palette exists', () => {
    render(<ColorStudy colors={[]} />)

    for (const heading of CARD_HEADINGS) {
      expect(screen.queryByRole('region', { name: heading })).not.toBeInTheDocument()
    }
  })
})

describe('CardShell.css: grain-7 masonry column spacing (source-level)', () => {
  const cssPath = path.join(
    path.dirname(fileURLToPath(import.meta.url)),
    'colorStudy',
    'CardShell.css',
  )
  const css = readFileSync(cssPath, 'utf-8')

  it('gives .color-study-card the same margin-bottom .color-study__tile uses for column stacking', () => {
    const index = css.indexOf('.color-study-card {')
    expect(index).toBeGreaterThan(-1)
    const braceStart = css.indexOf('{', index)
    const braceEnd = css.indexOf('}', braceStart)
    const rule = css.slice(braceStart + 1, braceEnd)
    expect(rule).toMatch(/margin-bottom:\s*var\(--space-5\)\s*;/)
  })
})
