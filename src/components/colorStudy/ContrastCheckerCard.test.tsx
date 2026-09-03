import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { getContrastCombinations } from '../../lib/contrastAccessibility'
import { generatePalette } from '../../lib/palette'
import { ContrastCheckerCard } from './ContrastCheckerCard'

const palette = generatePalette('#3366ff')!
const otherPalette = generatePalette('#ff8800')!

describe('ContrastCheckerCard', () => {
  it('renders inside a rounded card tile labeled "Contrast Checker"', () => {
    const { container } = render(<ContrastCheckerCard palette={palette} />)

    expect(screen.getByRole('heading', { name: 'Contrast Checker', level: 3 })).toBeInTheDocument()
    expect(container.querySelector('.color-study-card')).not.toBeNull()
  })

  it('renders the 3 fixed combinations with ratio, grade, and recommendation', () => {
    render(<ContrastCheckerCard palette={palette} />)

    const combos = getContrastCombinations(palette)
    const list = screen.getByRole('list', { name: 'Contrast combinations' })
    const items = within(list).getAllByRole('listitem')
    expect(items).toHaveLength(3)

    combos.forEach((combo, index) => {
      expect(within(items[index]).getByText(combo.label)).toBeInTheDocument()
      expect(within(items[index]).getByText(`${combo.ratio.toFixed(2)}:1`)).toBeInTheDocument()
      expect(within(items[index]).getByText(combo.grade)).toBeInTheDocument()
      expect(within(items[index]).getByText(combo.recommendation)).toBeInTheDocument()
    })
  })

  it('recomputes ratios and grades when the palette prop changes', () => {
    const { rerender } = render(<ContrastCheckerCard palette={palette} />)
    const before = getContrastCombinations(palette)
    expect(screen.getByText(`${before[0].ratio.toFixed(2)}:1`)).toBeInTheDocument()

    rerender(<ContrastCheckerCard palette={otherPalette} />)
    const after = getContrastCombinations(otherPalette)
    expect(screen.getByText(`${after[0].ratio.toFixed(2)}:1`)).toBeInTheDocument()
  })

  it('renders nothing for an empty palette instead of throwing', () => {
    const { container } = render(<ContrastCheckerCard palette={[]} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('contains no Korean text', () => {
    const { container } = render(<ContrastCheckerCard palette={palette} />)
    expect(container.textContent ?? '').not.toMatch(/[\u3131-\uD79D]/)
  })
})
