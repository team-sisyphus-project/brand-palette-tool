import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { BRAND_SLOT_INDEX, type PaletteColor } from '../lib/palette'
import { ColorWheel } from './ColorWheel'

const VIEWBOX_SIZE = 200
const CENTER = VIEWBOX_SIZE / 2
const WHEEL_RADIUS = 84

function makeColor(hex: string, h: number): PaletteColor {
  return { hex, rgb: { r: 0, g: 0, b: 0 }, hsl: { h, s: 50, l: 50 } }
}

/** Mirrors ColorWheel's own hue -> point math (hue 0 = top, clockwise) so the
 * test asserts the geometry independently of the component's internals. */
function expectedPoint(hue: number): { x: number; y: number } {
  const angleRad = ((-90 + hue) * Math.PI) / 180
  return {
    x: CENTER + WHEEL_RADIUS * Math.cos(angleRad),
    y: CENTER + WHEEL_RADIUS * Math.sin(angleRad),
  }
}

describe('ColorWheel', () => {
  const colors = [
    makeColor('#ff0000', 0),
    makeColor('#00ff00', 90),
    makeColor('#0000ff', 180),
    makeColor('#ffff00', 270),
    makeColor('#00ffff', 45),
  ]

  it('positions every marker at the angle matching its own hsl.h', () => {
    const { container } = render(<ColorWheel colors={colors} />)
    const markers = container.querySelectorAll('.color-wheel__marker')
    expect(markers).toHaveLength(colors.length)

    markers.forEach((marker, index) => {
      const { x, y } = expectedPoint(colors[index].hsl.h)
      expect(Number(marker.getAttribute('cx'))).toBeCloseTo(x, 5)
      expect(Number(marker.getAttribute('cy'))).toBeCloseTo(y, 5)
    })
  })

  it('renders a marker filled with each color own hex', () => {
    const { container } = render(<ColorWheel colors={colors} />)
    const markers = container.querySelectorAll('.color-wheel__marker')
    markers.forEach((marker, index) => {
      expect(marker.getAttribute('fill')).toBe(colors[index].hex)
    })
  })

  it('visually distinguishes the brand slot with a larger radius and an outline ring', () => {
    const { container } = render(<ColorWheel colors={colors} />)
    const markers = container.querySelectorAll('.color-wheel__marker')
    const brandRadius = Number(markers[BRAND_SLOT_INDEX].getAttribute('r'))

    markers.forEach((marker, index) => {
      if (index === BRAND_SLOT_INDEX) return
      expect(brandRadius).toBeGreaterThan(Number(marker.getAttribute('r')))
    })

    expect(container.querySelectorAll('.color-wheel__marker-ring')).toHaveLength(1)
  })

  it('contains no Korean text', () => {
    const { container } = render(<ColorWheel colors={colors} />)
    expect(container.textContent ?? '').not.toMatch(/[ㄱ-힝]/)
  })
})
