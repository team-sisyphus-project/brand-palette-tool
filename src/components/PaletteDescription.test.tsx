import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { PaletteDescription } from './PaletteDescription'

describe('PaletteDescription', () => {
  const name = 'Tropical'
  const description = [
    'Tropical — a warm and dynamic palette built around your brand color.',
    'Expect a warm, cozy, vibrant feel throughout every shade.',
  ]
  const keywords = ['warm', 'cozy', 'vibrant', 'bold', 'bright', 'cheerful']

  it('renders the name as a heading', () => {
    render(<PaletteDescription name={name} description={description} keywords={keywords} />)

    const panel = screen.getByRole('region', { name: 'Palette description' })
    expect(within(panel).getByRole('heading', { level: 2, name })).toBeInTheDocument()
  })

  it('renders every description line as its own list item, in order', () => {
    render(<PaletteDescription name={name} description={description} keywords={keywords} />)

    const lines = within(screen.getByRole('list', { name: 'Palette description text' })).getAllByRole('listitem')
    expect(lines.map((line) => line.textContent)).toEqual(description)
  })

  it('renders every keyword as its own list item, in order', () => {
    render(<PaletteDescription name={name} description={description} keywords={keywords} />)

    const items = within(screen.getByRole('list', { name: 'Palette keywords' })).getAllByRole('listitem')
    expect(items.map((item) => item.textContent)).toEqual(keywords)
  })

  it('renders exactly 1 name, at least 1 description line, and at least 1 keyword for a typical input', () => {
    render(<PaletteDescription name={name} description={description} keywords={keywords} />)

    const panel = screen.getByRole('region', { name: 'Palette description' })
    expect(within(panel).getAllByRole('heading', { level: 2 })).toHaveLength(1)
    expect(
      within(screen.getByRole('list', { name: 'Palette description text' })).getAllByRole('listitem').length,
    ).toBeGreaterThanOrEqual(1)
    expect(
      within(screen.getByRole('list', { name: 'Palette keywords' })).getAllByRole('listitem').length,
    ).toBeGreaterThanOrEqual(1)
  })

  it('still renders a name and the description/keyword lists for a single-line description and single keyword', () => {
    render(<PaletteDescription name="Custom Palette" description={['Just one line.']} keywords={['calm']} />)

    expect(screen.getByRole('heading', { level: 2, name: 'Custom Palette' })).toBeInTheDocument()
    expect(within(screen.getByRole('list', { name: 'Palette description text' })).getAllByRole('listitem')).toHaveLength(1)
    expect(within(screen.getByRole('list', { name: 'Palette keywords' })).getAllByRole('listitem')).toHaveLength(1)
  })
})

// grain-3 (2026-08-27, M-14): source-level CSS assertion, mirroring the
// pattern already used by ColorGenerator.test.tsx's "source-level" suite -
// jsdom does not apply external stylesheet rules to computed style during
// render(), so the 72px font-size is verified against the CSS source and
// its backing token instead.
describe('PaletteDescription.css: M-14 palette name font-size (source-level)', () => {
  const cssPath = path.join(path.dirname(fileURLToPath(import.meta.url)), 'PaletteDescription.css')
  const css = readFileSync(cssPath, 'utf-8')
  const indexCssPath = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'index.css')
  const indexCss = readFileSync(indexCssPath, 'utf-8')

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

  it('M-14: .palette-description__name renders at 72px via --text-display-xl-2', () => {
    const rule = extractRuleBody(css, '.palette-description__name {')
    expect(rule).toMatch(/font-size:\s*var\(--text-display-xl-2\)\s*;/)
    expect(indexCss).toMatch(/--text-display-xl-2:\s*72px\s*;/)
  })

  it('M-14: --text-display-xl-2 sits between the existing 48px/110px display rungs, neither of which changed', () => {
    expect(indexCss).toMatch(/--text-display-xl:\s*48px\s*;/)
    expect(indexCss).toMatch(/--text-display-2xl:\s*110px\s*;/)
  })
})
