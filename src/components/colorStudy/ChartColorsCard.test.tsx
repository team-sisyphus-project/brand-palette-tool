import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { generatePalette } from '../../lib/palette'
import { getChartColorSeries } from '../../lib/chartColors'
import { ChartColorsCard } from './ChartColorsCard'

const palette = generatePalette('#3366ff')!
const otherPalette = generatePalette('#ff8800')!
const SERIES_COUNT = 6

describe('ChartColorsCard', () => {
  it('renders inside a rounded card tile labeled "Chart Colors"', () => {
    const { container } = render(<ChartColorsCard palette={palette} />)

    expect(screen.getByRole('heading', { name: 'Chart Colors', level: 3 })).toBeInTheDocument()
    expect(container.querySelector('.color-study-card')).not.toBeNull()
  })

  it('renders a "Series N" label and hex for every series color, in order', () => {
    render(<ChartColorsCard palette={palette} />)

    const series = getChartColorSeries(palette, SERIES_COUNT)
    const list = screen.getByRole('list', { name: 'Chart color series' })
    const items = within(list).getAllByRole('listitem')
    expect(items).toHaveLength(series.length)

    series.forEach((color, index) => {
      expect(within(items[index]).getByText(`Series ${index + 1}`)).toBeInTheDocument()
      expect(within(items[index]).getByText(color.hex)).toBeInTheDocument()
    })
  })

  it('recomputes the series when the palette prop changes', () => {
    const { rerender } = render(<ChartColorsCard palette={palette} />)
    const before = getChartColorSeries(palette, SERIES_COUNT)
    expect(screen.getByText(before[0].hex)).toBeInTheDocument()

    rerender(<ChartColorsCard palette={otherPalette} />)
    const after = getChartColorSeries(otherPalette, SERIES_COUNT)
    expect(screen.getByText(after[0].hex)).toBeInTheDocument()
  })

  it('renders nothing for an empty palette instead of throwing', () => {
    const { container } = render(<ChartColorsCard palette={[]} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('contains no Korean text', () => {
    const { container } = render(<ChartColorsCard palette={palette} />)
    expect(container.textContent ?? '').not.toMatch(/[ㄱ-힝]/)
  })
})
