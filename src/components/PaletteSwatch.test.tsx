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

describe('PaletteSwatch: inline hex code click-to-edit (grain-3)', () => {
  it('renders the hex as a clickable trigger, not a plain span', () => {
    renderSwatch()

    expect(screen.getByRole('button', { name: 'Edit #3366ff hex code' })).toHaveTextContent(
      '#3366ff',
    )
  })

  it('clicking the hex trigger swaps it for a text input pre-filled with the current hex, without firing onSelectBase', () => {
    const { onSelectBase } = renderSwatch()

    fireEvent.click(screen.getByRole('button', { name: 'Edit #3366ff hex code' }))

    const input = screen.getByRole('textbox', { name: 'Edit #3366ff hex code' })
    expect(input).toHaveValue('#3366ff')
    expect(onSelectBase).not.toHaveBeenCalled()
  })

  it('pressing Enter/Space on the hex trigger does not also fire onSelectBase', () => {
    const { onSelectBase } = renderSwatch()

    fireEvent.keyDown(screen.getByRole('button', { name: 'Edit #3366ff hex code' }), {
      key: 'Enter',
    })

    expect(onSelectBase).not.toHaveBeenCalled()
  })

  it('committing a valid hex via Enter calls onColorChange and closes the input', () => {
    const { onColorChange, onSelectBase } = renderSwatch()

    fireEvent.click(screen.getByRole('button', { name: 'Edit #3366ff hex code' }))
    const input = screen.getByRole('textbox', { name: 'Edit #3366ff hex code' })
    fireEvent.change(input, { target: { value: '#00ff00' } })
    fireEvent.keyDown(input, { key: 'Enter' })

    expect(onColorChange).toHaveBeenCalledWith('#00ff00')
    expect(onSelectBase).not.toHaveBeenCalled()
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
  })

  it('committing a valid hex via blur calls onColorChange', () => {
    const { onColorChange } = renderSwatch()

    fireEvent.click(screen.getByRole('button', { name: 'Edit #3366ff hex code' }))
    const input = screen.getByRole('textbox', { name: 'Edit #3366ff hex code' })
    fireEvent.change(input, { target: { value: '#abc123' } })
    fireEvent.blur(input)

    expect(onColorChange).toHaveBeenCalledWith('#abc123')
  })

  it('committing an invalid hex does not call onColorChange, reverts to the original hex, and shows an error', () => {
    const { onColorChange } = renderSwatch()

    fireEvent.click(screen.getByRole('button', { name: 'Edit #3366ff hex code' }))
    const input = screen.getByRole('textbox', { name: 'Edit #3366ff hex code' })
    fireEvent.change(input, { target: { value: 'not-a-color' } })
    fireEvent.keyDown(input, { key: 'Enter' })

    expect(onColorChange).not.toHaveBeenCalled()
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveTextContent(/valid hex/i)
    expect(screen.getByRole('button', { name: 'Edit #3366ff hex code' })).toHaveTextContent(
      '#3366ff',
    )
  })

  it('pressing Escape cancels the edit without calling onColorChange and without showing an error', () => {
    const { onColorChange } = renderSwatch()

    fireEvent.click(screen.getByRole('button', { name: 'Edit #3366ff hex code' }))
    const input = screen.getByRole('textbox', { name: 'Edit #3366ff hex code' })
    fireEvent.change(input, { target: { value: 'garbage' } })
    fireEvent.keyDown(input, { key: 'Escape' })

    expect(onColorChange).not.toHaveBeenCalled()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Edit #3366ff hex code' })).toHaveTextContent(
      '#3366ff',
    )
  })

  it('clicking or typing inside the input never bubbles to fire onSelectBase', () => {
    const { onSelectBase } = renderSwatch()

    fireEvent.click(screen.getByRole('button', { name: 'Edit #3366ff hex code' }))
    const input = screen.getByRole('textbox', { name: 'Edit #3366ff hex code' })
    fireEvent.click(input)
    fireEvent.keyDown(input, { key: 'a' })

    expect(onSelectBase).not.toHaveBeenCalled()
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

  it('the hex trigger signals editability on hover/focus (grain-3)', () => {
    expect(css).toMatch(/\.palette-swatch__hex:hover[^{]*\{[^}]*text-decoration:\s*underline/)
  })
})

/**
 * grain-1: `code-analysis/risks.md` flagged two unverified points left over
 * from grain-3/grain-4 - (1) nothing confirmed the lock icons actually
 * render as `lucide-react` icons rather than the old emoji glyphs, and (2)
 * nothing confirmed the `[aria-pressed='true']` opacity-1 rule actually
 * targets the class+attribute combination the locked button renders with
 * (only the rule's *existence* was regex-checked, not that its selector
 * matches the real DOM node). These tests close both gaps without adding a
 * CSS engine to jsdom: the icon test asserts against the rendered SVG's
 * lucide class names (`lucide-lock`/`lucide-unlock`, per
 * lucide-react's `createLucideIcon`), and the opacity test pairs a render
 * assertion (the locked button really does carry both
 * `.palette-swatch__lock` and `aria-pressed="true"`) with a source-level
 * extraction of that exact selector's rule body.
 */
describe('PaletteSwatch: lucide icon + locked-opacity requirements (grain-1)', () => {
  const tsxPath = path.join(path.dirname(fileURLToPath(import.meta.url)), 'PaletteSwatch.tsx')
  const tsx = readFileSync(tsxPath, 'utf-8')
  const cssPath = path.join(path.dirname(fileURLToPath(import.meta.url)), 'PaletteSwatch.css')
  const css = readFileSync(cssPath, 'utf-8')

  // Matches the old lock/unlock emoji glyphs plus the broader emoji ranges,
  // so a future reintroduction of *any* emoji (not just these two) fails
  // this test rather than slipping back in unnoticed.
  const EMOJI_PATTERN = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u
  // The JSDoc comment above intentionally *mentions* the old 🔒/🔓 glyphs as
  // history ("the emoji glyphs (🔒/🔓) are replaced with..."), so this check
  // strips comments first - it is scoped to code (JSX/strings), not to
  // prose that documents the migration away from emoji.
  const tsxWithoutComments = tsx.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '')

  it('contains no emoji literals in the component code (🔒/🔓 fully removed from rendering)', () => {
    expect(tsxWithoutComments).not.toMatch(EMOJI_PATTERN)
  })

  it('imports Lock and Unlock from lucide-react', () => {
    expect(tsx).toMatch(/from ['"]lucide-react['"]/)
    expect(tsx).toMatch(/\bLock\b/)
    expect(tsx).toMatch(/\bUnlock\b/)
  })

  it('renders the lucide Lock icon (not emoji) when the slot is locked', () => {
    renderSwatch({ isLocked: true })

    const lockButton = screen.getByRole('button', { name: 'Toggle lock for #3366ff color' })
    const icon = lockButton.querySelector('svg')
    expect(icon).not.toBeNull()
    expect(icon).toHaveClass('lucide-lock')
    expect(lockButton).not.toHaveTextContent(/[\u{1F300}-\u{1FAFF}]/u)
  })

  it('renders the lucide Unlock icon (not emoji) when the slot is unlocked', () => {
    renderSwatch({ isLocked: false })

    const lockButton = screen.getByRole('button', { name: 'Toggle lock for #3366ff color' })
    const icon = lockButton.querySelector('svg')
    expect(icon).not.toBeNull()
    // lucide-react's `Unlock` export is an alias for its `lock-open` icon
    // (see createLucideIcon - the class name follows the icon's canonical
    // name, not the export name), so the rendered class is
    // `lucide-lock-open` rather than `lucide-unlock`.
    expect(icon).toHaveClass('lucide-lock-open')
  })

  it("the locked button's real class+attribute combination is exactly what [aria-pressed='true'] targets, and that rule sets opacity: 1", () => {
    renderSwatch({ isLocked: true })

    const lockButton = screen.getByRole('button', { name: 'Toggle lock for #3366ff color' })
    // Confirms the selector `.palette-swatch__lock[aria-pressed='true']`
    // actually matches this rendered node - not just that the class/attr
    // exist independently, but that both hold on the same element.
    expect(lockButton).toHaveClass('palette-swatch__lock')
    expect(lockButton).toHaveAttribute('aria-pressed', 'true')

    const selector = ".palette-swatch__lock[aria-pressed='true']"
    const index = css.indexOf(selector)
    expect(index).toBeGreaterThan(-1)
    const braceStart = css.indexOf('{', index)
    const braceEnd = css.indexOf('}', braceStart)
    const ruleBody = css.slice(braceStart + 1, braceEnd)
    expect(ruleBody).toMatch(/opacity:\s*1\s*;/)
  })

  it('the lock overlay sits at the bottom-center of the preview (position: absolute, bottom + translateX(-50%))', () => {
    const index = css.indexOf('.palette-swatch__lock {')
    const braceStart = css.indexOf('{', index)
    const braceEnd = css.indexOf('}', braceStart)
    const ruleBody = css.slice(braceStart + 1, braceEnd)

    expect(ruleBody).toMatch(/position:\s*absolute\s*;/)
    expect(ruleBody).toMatch(/bottom:\s*var\(--content-padding-sm\)\s*;/)
    expect(ruleBody).toMatch(/left:\s*50%\s*;/)
    expect(ruleBody).toMatch(/transform:\s*translateX\(-50%\)\s*;/)
  })

  it("the HEX label's font-family and font-weight match the app title's tokens (--font-display / --weight-display-bold)", () => {
    const index = css.indexOf('.palette-swatch__hex {')
    const braceStart = css.indexOf('{', index)
    const braceEnd = css.indexOf('}', braceStart)
    const ruleBody = css.slice(braceStart + 1, braceEnd)

    expect(ruleBody).toMatch(/font-family:\s*var\(--font-display\)\s*;/)
    expect(ruleBody).toMatch(/font-weight:\s*var\(--weight-display-bold\)\s*;/)
    // Bigger than the pre-grain-4 mono size (13px / --text-mono-md) - still
    // its own step on the display scale, not literally the title's size.
    expect(ruleBody).not.toMatch(/var\(--text-mono-md\)/)
    expect(ruleBody).toMatch(/font-size:\s*var\(--text-display-xs\)\s*;/)
  })
})
