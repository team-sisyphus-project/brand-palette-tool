import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { PaletteColor } from '../lib/palette'
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
})
