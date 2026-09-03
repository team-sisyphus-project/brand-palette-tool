import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { generatePalette } from '../../lib/palette'
import { getDesignTokens } from './designTokens'
import { DesignTokenCard } from './DesignTokenCard'

const palette = generatePalette('#3366ff')!
const otherPalette = generatePalette('#ff8800')!

describe('DesignTokenCard', () => {
  it('renders inside a rounded card tile labeled "Design Tokens"', () => {
    const { container } = render(<DesignTokenCard palette={palette} />)

    expect(screen.getByRole('heading', { name: 'Design Tokens', level: 3 })).toBeInTheDocument()
    expect(container.querySelector('.color-study-card')).not.toBeNull()
  })

  it('renders one token declaration per semantic role', () => {
    render(<DesignTokenCard palette={palette} />)

    const tokens = getDesignTokens(palette)
    const list = screen.getByRole('list', { name: 'Design token starter kit' })
    const items = within(list).getAllByRole('listitem')
    expect(items).toHaveLength(tokens.length)

    tokens.forEach((token, index) => {
      expect(within(items[index]).getByText(token.declaration)).toBeInTheDocument()
    })
  })

  it('token names follow the project\'s "--color-{role}" convention', () => {
    const tokens = getDesignTokens(palette)
    tokens.forEach((token) => {
      expect(token.declaration).toBe(`--color-${token.name.replace('color-', '')}: ${token.value};`)
    })
  })

  it('recomputes token values when the palette prop changes', () => {
    const { rerender } = render(<DesignTokenCard palette={palette} />)
    const before = getDesignTokens(palette)
    expect(screen.getByText(before[0].declaration)).toBeInTheDocument()

    rerender(<DesignTokenCard palette={otherPalette} />)
    const after = getDesignTokens(otherPalette)
    expect(screen.getByText(after[0].declaration)).toBeInTheDocument()
  })

  it('renders nothing for an empty palette instead of throwing', () => {
    const { container } = render(<DesignTokenCard palette={[]} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('contains no Korean text', () => {
    const { container } = render(<DesignTokenCard palette={palette} />)
    expect(container.textContent ?? '').not.toMatch(/[\u3131-\uD79D]/)
  })
})
