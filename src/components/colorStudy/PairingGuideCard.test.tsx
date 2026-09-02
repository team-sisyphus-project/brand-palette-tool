import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { generatePalette } from '../../lib/palette'
import { getColorPairings } from '../../lib/colorPairing'
import { PairingGuideCard } from './PairingGuideCard'

const palette = generatePalette('#3366ff')!
const otherPalette = generatePalette('#ff8800')!

describe('PairingGuideCard', () => {
  it('renders inside a rounded card tile labeled "Pairing Guide"', () => {
    const { container } = render(<PairingGuideCard palette={palette} />)

    expect(screen.getByRole('heading', { name: 'Pairing Guide', level: 3 })).toBeInTheDocument()
    expect(container.querySelector('.color-study-card')).not.toBeNull()
  })

  it('renders a label and pairs-with text for every role', () => {
    render(<PairingGuideCard palette={palette} />)

    const pairings = getColorPairings(palette)
    const list = screen.getByRole('list', { name: 'Color pairing guide' })
    const items = within(list).getAllByRole('listitem')
    expect(items).toHaveLength(pairings.length)

    pairings.forEach((pairing, index) => {
      expect(within(items[index]).getByText(pairing.label)).toBeInTheDocument()
      expect(
        within(items[index]).getByText(`Pairs well with → ${pairing.pairsWith.join(', ')}`),
      ).toBeInTheDocument()
    })
  })

  it('recomputes pairings when the palette prop changes', () => {
    const { rerender } = render(<PairingGuideCard palette={palette} />)
    const before = getColorPairings(palette)
    expect(screen.getByText(before[0].label)).toBeInTheDocument()

    rerender(<PairingGuideCard palette={otherPalette} />)
    const after = getColorPairings(otherPalette)
    expect(screen.getByText(after[0].label)).toBeInTheDocument()
  })

  it('renders nothing for an empty palette instead of throwing', () => {
    const { container } = render(<PairingGuideCard palette={[]} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('contains no Korean text', () => {
    const { container } = render(<PairingGuideCard palette={palette} />)
    expect(container.textContent ?? '').not.toMatch(/[ㄱ-힝]/)
  })
})
