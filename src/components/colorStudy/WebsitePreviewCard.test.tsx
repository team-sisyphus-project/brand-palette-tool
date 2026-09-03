import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { getColorRoles } from '../../lib/colorRoles'
import { getBestTextColor } from '../../lib/colorPairing'
import { generatePalette, type PaletteColor } from '../../lib/palette'
import { WebsitePreviewCard } from './WebsitePreviewCard'

const palette = generatePalette('#3366ff')!
const otherPalette = generatePalette('#ff8800')!

function primaryOf(p: PaletteColor[]) {
  return getColorRoles(p).find((assignment) => assignment.role === 'primary')!.color
}

describe('WebsitePreviewCard', () => {
  it('renders inside a rounded card tile labeled "Website Preview"', () => {
    const { container } = render(<WebsitePreviewCard palette={palette} />)

    expect(screen.getByRole('heading', { name: 'Website Preview', level: 3 })).toBeInTheDocument()
    expect(container.querySelector('.color-study-card')).not.toBeNull()
  })

  it('renders a single labeled mock image with nav, hero, and CTA content', () => {
    render(<WebsitePreviewCard palette={palette} />)

    const mock = screen.getByRole('img', { name: 'Website mockup using the current palette' })
    expect(mock).toBeInTheDocument()
    expect(mock).toHaveTextContent('Brand')
    expect(mock).toHaveTextContent('Home')
    expect(mock).toHaveTextContent('Features')
    expect(mock).toHaveTextContent('Pricing')
    expect(mock).toHaveTextContent('Build something great')
    expect(mock).toHaveTextContent('Get Started')
  })

  it('colors the CTA with the primary role color and a contrast-safe text color', () => {
    const { container } = render(<WebsitePreviewCard palette={palette} />)

    const primary = primaryOf(palette)
    const cta = container.querySelector('.website-preview-card__cta') as HTMLElement
    expect(cta.style.backgroundColor).toBe(hexToRgbCss(primary.hex))
    const expectedTextColor = getBestTextColor(primary) === 'white' ? '#ffffff' : '#000000'
    expect(cta.style.color).toBe(hexToRgbCss(expectedTextColor))
  })

  it('recomputes role colors when the palette prop changes', () => {
    const { container, rerender } = render(<WebsitePreviewCard palette={palette} />)
    const before = primaryOf(palette)

    rerender(<WebsitePreviewCard palette={otherPalette} />)
    const after = primaryOf(otherPalette)

    const cta = container.querySelector('.website-preview-card__cta') as HTMLElement
    expect(cta.style.backgroundColor).toBe(hexToRgbCss(after.hex))
    if (before.hex !== after.hex) {
      expect(cta.style.backgroundColor).not.toBe(hexToRgbCss(before.hex))
    }
  })

  it('renders nothing for an empty palette instead of throwing', () => {
    const { container } = render(<WebsitePreviewCard palette={[]} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('contains no Korean text', () => {
    const { container } = render(<WebsitePreviewCard palette={palette} />)
    expect(container.textContent ?? '').not.toMatch(/[\u3131-\uD79D]/)
  })
})

/** jsdom normalizes inline `backgroundColor'/'color': '#rrggbb'` to `rgb(r, g, b)` - mirrors that for comparison. */
function hexToRgbCss(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgb(${r}, ${g}, ${b})`
}
