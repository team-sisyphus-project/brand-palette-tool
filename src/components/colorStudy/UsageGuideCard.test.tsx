import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { getUsageGuide } from '../../lib/colorUsageGuide'
import { generatePalette } from '../../lib/palette'
import { UsageGuideCard } from './UsageGuideCard'

const palette = generatePalette('#3366ff')!
const otherPalette = generatePalette('#ff8800')!

describe('UsageGuideCard', () => {
  it('renders inside a rounded card tile labeled "Usage Guide"', () => {
    const { container } = render(<UsageGuideCard palette={palette} />)

    expect(screen.getByRole('heading', { name: 'Usage Guide', level: 3 })).toBeInTheDocument()
    expect(container.querySelector('.color-study-card')).not.toBeNull()
  })

  it('renders a title and guidance sentence for every role', () => {
    render(<UsageGuideCard palette={palette} />)

    const entries = getUsageGuide(palette)
    const list = screen.getByRole('list', { name: 'Color usage guide' })
    const items = within(list).getAllByRole('listitem')
    expect(items).toHaveLength(entries.length)

    entries.forEach((entry, index) => {
      expect(within(items[index]).getByText(entry.title)).toBeInTheDocument()
      expect(within(items[index]).getByText(entry.guidance)).toBeInTheDocument()
    })
  })

  it('recomputes titles when the palette prop changes', () => {
    const { rerender } = render(<UsageGuideCard palette={palette} />)
    const before = getUsageGuide(palette)
    expect(screen.getByText(before[0].title)).toBeInTheDocument()

    rerender(<UsageGuideCard palette={otherPalette} />)
    const after = getUsageGuide(otherPalette)
    expect(screen.getByText(after[0].title)).toBeInTheDocument()
  })

  it('renders nothing for an empty palette instead of throwing', () => {
    const { container } = render(<UsageGuideCard palette={[]} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('contains no Korean text', () => {
    const { container } = render(<UsageGuideCard palette={palette} />)
    expect(container.textContent ?? '').not.toMatch(/[ㄱ-힝]/)
  })
})
