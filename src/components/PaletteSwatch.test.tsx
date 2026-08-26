import '@testing-library/jest-dom/vitest'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { fireEvent, render, screen } from '@testing-library/react'
import type { ComponentProps } from 'react'
import { describe, expect, it, vi } from 'vitest'
import type { PaletteColor } from '../lib/palette'
import { PaletteSwatch } from './PaletteSwatch'

/**
 * grain-2 (rounder palette squares + hover-only lock overlay). Two kinds of
 * assertions here, mirroring the project's existing split
 * (accentBoundary.test.ts / pageBackground.test.ts vs. ColorGenerator.test.tsx):
 *
 * - Behavioral/structural assertions render the real component (jsdom does
 *   not run Vitest's CSS pipeline for `:hover`/`:focus-visible`, so hover
 *   reveal itself cannot be observed via getComputedStyle here).
 * - The actual "hidden by default, shown on hover/focus" CSS contract is
 *   instead asserted directly against PaletteSwatch.css's source, the same
 *   way pageBackground.test.ts pins index.css's token wiring.
 */

const color: PaletteColor = {
  hex: '#3366ff',
  rgb: { r: 51, g: 102, b: 255 },
  hsl: { h: 225, s: 100, l: 60 },
}

function renderSwatch(overrides: Partial<ComponentProps<typeof PaletteSwatch>> = {}) {
  const onToggleLock = vi.fn()
  const onColorChange = vi.fn()
  const onSelectBase = vi.fn()
  render(
    <PaletteSwatch
      color={color}
      isBrand={false}
      isLocked={false}
      onToggleLock={onToggleLock}
      onColorChange={onColorChange}
      onSelectBase={onSelectBase}
      {...overrides}
    />,
  )
  return { onToggleLock, onColorChange, onSelectBase }
}

describe('PaletteSwatch: lock overlay markup (contract unchanged)', () => {
  it('renders the lock button inside the preview (overlay), not as a sibling row', () => {
    renderSwatch()

    const lock = screen.getByRole('button', { name: 'Toggle lock for #3366ff color' })
    const preview = document.querySelector('.palette-swatch__preview') as HTMLElement
    expect(preview).toContainElement(lock)
  })

  it('keeps the same accessible name/aria-pressed contract for both lock states', () => {
    const { rerender } = render(
      <PaletteSwatch
        color={color}
        isBrand={false}
        isLocked={false}
        onToggleLock={() => {}}
        onColorChange={() => {}}
        onSelectBase={() => {}}
      />,
    )
    expect(screen.getByRole('button', { name: 'Toggle lock for #3366ff color' })).toHaveAttribute(
      'aria-pressed',
      'false',
    )

    rerender(
      <PaletteSwatch
        color={color}
        isBrand={false}
        isLocked={true}
        onToggleLock={() => {}}
        onColorChange={() => {}}
        onSelectBase={() => {}}
      />,
    )
    expect(screen.getByRole('button', { name: 'Toggle lock for #3366ff color' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
  })

  it('clicking the lock overlay still calls onToggleLock and does not also fire onSelectBase', () => {
    const { onToggleLock, onSelectBase } = renderSwatch()

    fireEvent.click(screen.getByRole('button', { name: 'Toggle lock for #3366ff color' }))

    expect(onToggleLock).toHaveBeenCalledTimes(1)
    expect(onSelectBase).not.toHaveBeenCalled()
  })

  it('the lock overlay button remains a normal focusable element (reachable via keyboard)', () => {
    renderSwatch()

    const lock = screen.getByRole('button', { name: 'Toggle lock for #3366ff color' })
    lock.focus()
    expect(document.activeElement).toBe(lock)
  })
})

describe('PaletteSwatch.css: rounder squares + hover/focus-only lock reveal (source-level)', () => {
  const cssPath = path.join(path.dirname(fileURLToPath(import.meta.url)), 'PaletteSwatch.css')
  const css = readFileSync(cssPath, 'utf-8')

  function extractRuleBody(source: string, selector: string): string {
    const index = source.indexOf(selector)
    if (index === -1) {
      throw new Error(`extractRuleBody: selector "${selector}" not found`)
    }
    const braceStart = source.indexOf('{', index)
    let depth = 0
    for (let i = braceStart; i < source.length; i++) {
      if (source[i] === '{') depth++
      else if (source[i] === '}') {
        depth--
        if (depth === 0) return source.slice(braceStart + 1, i)
      }
    }
    throw new Error(`extractRuleBody: unbalanced braces for selector "${selector}"`)
  }

  it('the color square uses --radius-container (rounder than the pre-existing --radius-card)', () => {
    const rule = extractRuleBody(css, '.palette-swatch__color {')
    expect(rule).toMatch(/border-radius:\s*var\(--radius-container\)/)
    expect(rule).not.toMatch(/var\(--radius-card\)/)
  })

  it('the lock overlay is hidden by default (opacity: 0)', () => {
    const rule = extractRuleBody(css, '.palette-swatch__lock {')
    expect(rule).toMatch(/opacity:\s*0\s*;/)
    expect(rule).toMatch(/position:\s*absolute\s*;/)
  })

  it('the lock overlay is revealed when the preview is hovered', () => {
    expect(css).toMatch(/\.palette-swatch__preview:hover \.palette-swatch__lock[^{]*\{[^}]*opacity:\s*1/)
  })

  it('the lock overlay is revealed on keyboard focus (:focus-visible)', () => {
    expect(css).toMatch(/\.palette-swatch__lock:focus-visible[^{]*\{[^}]*opacity:\s*1/)
  })
})
