import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { getChartColorSeries } from '../../lib/chartColors'
import { getColorRoles } from '../../lib/colorRoles'
import { getBestTextColor } from '../../lib/colorPairing'
import { generatePalette, type PaletteColor } from '../../lib/palette'
import { PresentationPreviewCard } from './PresentationPreviewCard'

const palette = generatePalette('#3366ff')!
const otherPalette = generatePalette('#ff8800')!

function primaryOf(p: PaletteColor[]) {
  return getColorRoles(p).find((assignment) => assignment.role === 'primary')!.color
}

describe('PresentationPreviewCard', () => {
  it('renders inside a rounded card tile labeled "Presentation Preview"', () => {
    const { container } = render(<PresentationPreviewCard palette={palette} />)

    expect(screen.getByRole('heading', { name: 'Presentation Preview', level: 3 })).toBeInTheDocument()
    expect(container.querySelector('.color-study-card')).not.toBeNull()
  })

  it('renders a single labeled mock image with a title, body, and chart slide', () => {
    render(<PresentationPreviewCard palette={palette} />)

    const mock = screen.getByRole('img', { name: 'Presentation slide mockups using the current palette' })
    expect(mock).toHaveTextContent('Title Slide')
    expect(mock).toHaveTextContent('Quarterly Brand Review')
    expect(mock).toHaveTextContent('Body Slide')
    expect(mock).toHaveTextContent('Key takeaway one')
    expect(mock).toHaveTextContent('Chart Slide')
  })

  it('colors the title slide with the primary role color and a contrast-safe text color', () => {
    const { container } = render(<PresentationPreviewCard palette={palette} />)

    const primary = primaryOf(palette)
    const slides = container.querySelectorAll('.presentation-preview-card__slide')
    const titleSlide = slides[0] as HTMLElement
    expect(titleSlide.style.backgroundColor).toBe(hexToRgbCss(primary.hex))
    const expectedTextColor = getBestTextColor(primary) === 'white' ? '#ffffff' : '#000000'
    expect(titleSlide.style.color).toBe(hexToRgbCss(expectedTextColor))
  })

  it('renders one chart bar per getChartColorSeries entry, each colored to match', () => {
    const { container } = render(<PresentationPreviewCard palette={palette} />)

    const series = getChartColorSeries(palette, 4)
    const bars = container.querySelectorAll('.presentation-preview-card__bar')
    expect(bars).toHaveLength(series.length)
    series.forEach((color, index) => {
      expect((bars[index] as HTMLElement).style.backgroundColor).toBe(hexToRgbCss(color.hex))
    })
  })

  it('recomputes slide colors when the palette prop changes', () => {
    const { container, rerender } = render(<PresentationPreviewCard palette={palette} />)
    const before = primaryOf(palette)

    rerender(<PresentationPreviewCard palette={otherPalette} />)
    const after = primaryOf(otherPalette)

    const titleSlide = container.querySelectorAll('.presentation-preview-card__slide')[0] as HTMLElement
    expect(titleSlide.style.backgroundColor).toBe(hexToRgbCss(after.hex))
    if (before.hex !== after.hex) {
      expect(titleSlide.style.backgroundColor).not.toBe(hexToRgbCss(before.hex))
    }
  })

  it('renders nothing for an empty palette instead of throwing', () => {
    const { container } = render(<PresentationPreviewCard palette={[]} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('contains no Korean text', () => {
    const { container } = render(<PresentationPreviewCard palette={palette} />)
    expect(container.textContent ?? '').not.toMatch(/[ㄱ-힝]/)
  })
})

/** jsdom normalizes inline `backgroundColor'/'color': '#rrggbb'` to `rgb(r, g, b)` - mirrors that for comparison. */
function hexToRgbCss(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgb(${r}, ${g}, ${b})`
}
