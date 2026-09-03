import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { getColorDistribution } from '../../lib/colorDistribution'
import { generatePalette } from '../../lib/palette'
import { DistributionCard } from './DistributionCard'

const palette = generatePalette('#3366ff')!
const otherPalette = generatePalette('#ff8800')!

describe('DistributionCard', () => {
  it('renders inside a rounded card tile labeled "Color Distribution"', () => {
    const { container } = render(<DistributionCard palette={palette} />)

    expect(screen.getByRole('heading', { name: 'Color Distribution', level: 3 })).toBeInTheDocument()
    expect(container.querySelector('.color-study-card')).not.toBeNull()
  })

  it('renders the 3 segments (60/30/10) as a proportional bar and a matching legend', () => {
    const { container } = render(<DistributionCard palette={palette} />)

    const segments = getColorDistribution(palette)
    const bar = screen.getByRole('img', { name: '60/30/10 recommended color distribution' })
    const barSegments = bar.querySelectorAll('.distribution-card__segment')
    expect(barSegments).toHaveLength(segments.length)
    segments.forEach((segment, index) => {
      expect((barSegments[index] as HTMLElement).style.backgroundColor).not.toBe('')
      expect((barSegments[index] as HTMLElement).style.flexGrow).toBe(String(segment.percentage))
    })

    const legend = screen.getByRole('list', { name: 'Distribution legend' })
    const items = within(legend).getAllByRole('listitem')
    expect(items).toHaveLength(segments.length)
    segments.forEach((segment, index) => {
      expect(within(items[index]).getByText(segment.label)).toBeInTheDocument()
      expect(within(items[index]).getByText(`${segment.percentage}%`)).toBeInTheDocument()
    })

    expect(container).toBeInTheDocument()
  })

  it('segment percentages always sum to 100', () => {
    render(<DistributionCard palette={palette} />)
    const total = getColorDistribution(palette).reduce((sum, s) => sum + s.percentage, 0)
    expect(total).toBe(100)
  })

  it('recomputes segment colors when the palette prop changes', () => {
    const { rerender } = render(<DistributionCard palette={palette} />)
    const before = getColorDistribution(palette)
    expect(screen.getByText(before[1].label)).toBeInTheDocument()

    rerender(<DistributionCard palette={otherPalette} />)
    const after = getColorDistribution(otherPalette)
    const legend = screen.getByRole('list', { name: 'Distribution legend' })
    const items = within(legend).getAllByRole('listitem')
    expect((items[1].querySelector('.distribution-card__swatch') as HTMLElement).style.backgroundColor).toBe(
      hexToRgbCss(after[1].color.hex),
    )
  })

  it('renders nothing for an empty palette instead of throwing', () => {
    const { container } = render(<DistributionCard palette={[]} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('contains no Korean text', () => {
    const { container } = render(<DistributionCard palette={palette} />)
    expect(container.textContent ?? '').not.toMatch(/[\u3131-\uD79D]/)
  })
})

/** jsdom normalizes inline `backgroundColor: '#rrggbb'` to `rgb(r, g, b)` - mirrors that for comparison. */
function hexToRgbCss(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgb(${r}, ${g}, ${b})`
}
