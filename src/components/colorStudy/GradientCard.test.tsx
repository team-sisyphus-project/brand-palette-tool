import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { generatePalette } from '../../lib/palette'
import { getGradientSuggestions } from '../../lib/colorGradients'
import { GradientCard } from './GradientCard'

const palette = generatePalette('#3366ff')!
const otherPalette = generatePalette('#ff8800')!

describe('GradientCard', () => {
  it('renders inside a rounded card tile labeled "Gradient Suggestions"', () => {
    const { container } = render(<GradientCard palette={palette} />)

    expect(screen.getByRole('heading', { name: 'Gradient Suggestions', level: 3 })).toBeInTheDocument()
    expect(container.querySelector('.color-study-card')).not.toBeNull()
  })

  it('renders the fixed gradients with label and CSS value', () => {
    render(<GradientCard palette={palette} />)

    const gradients = getGradientSuggestions(palette)
    const list = screen.getByRole('list', { name: 'Gradient suggestions' })
    const items = within(list).getAllByRole('listitem')
    expect(items).toHaveLength(gradients.length)

    gradients.forEach((gradient, index) => {
      expect(within(items[index]).getByText(gradient.label)).toBeInTheDocument()
      expect(within(items[index]).getByText(gradient.css)).toBeInTheDocument()
    })
  })

  it('recomputes gradients when the palette prop changes', () => {
    const { rerender } = render(<GradientCard palette={palette} />)
    const before = getGradientSuggestions(palette)
    expect(screen.getByText(before[0].css)).toBeInTheDocument()

    rerender(<GradientCard palette={otherPalette} />)
    const after = getGradientSuggestions(otherPalette)
    expect(screen.getByText(after[0].css)).toBeInTheDocument()
  })

  it('renders nothing for an empty palette instead of throwing', () => {
    const { container } = render(<GradientCard palette={[]} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('contains no Korean text', () => {
    const { container } = render(<GradientCard palette={palette} />)
    expect(container.textContent ?? '').not.toMatch(/[ㄱ-힝]/)
  })
})
