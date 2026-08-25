import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { getHarmonyColors, type PaletteColor } from '../lib/palette'
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
})
