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
