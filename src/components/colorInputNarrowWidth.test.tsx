import '@testing-library/jest-dom/vitest'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ColorGenerator } from './ColorGenerator'
import { ColorInput } from './ColorInput'

/**
 * grain-3 (M-8, input field width 60%): regression guard for spec A's
 * "homepage intake layout" delta - the Brand main color and Mood keyword
 * fields must render at 60% of `.color-generator__intake-form`'s width,
 * while every other intake field (the 4 optional additional Hex fields)
 * stays at full width.
 *
 * jsdom does not perform real layout, so a computed pixel width isn't
 * observable here (browser automation is out of bounds for this project -
 * see project conventions). Instead this asserts, at the component-contract
 * level, that:
 *  1. `ColorInput`'s `width="narrow"` prop applies the `color-input--narrow`
 *     modifier class (and defaults to not applying it), and
 *  2. `ColorGenerator` only passes `width="narrow"` to the brand and
 *     mood-keyword fields, never to the additional Hex fields,
 * plus a CSS-source-level check (same technique as
 * colorGeneratorIntakeFormBorder.test.ts) that the modifier class actually
 * resolves to `width: 60%`.
 */

const componentsDir = path.dirname(fileURLToPath(import.meta.url))
const colorInputCss = readFileSync(path.join(componentsDir, 'ColorInput.css'), 'utf-8')

function extractRuleBody(source: string, selector: string): string {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const pattern = new RegExp(`^${escaped} \\{`, 'm')
  const match = pattern.exec(source)
  if (!match) {
    throw new Error(`extractRuleBody: selector "${selector}" not found on its own line`)
  }
  const braceStart = match.index + match[0].length - 1
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

function extractDeclaration(ruleBody: string, property: string): string {
  const pattern = new RegExp(`(?:^|[\\s;{])${property}\\s*:\\s*([^;]+);`)
  const match = pattern.exec(ruleBody)
  if (!match) {
    throw new Error(`extractDeclaration: "${property}" not found in rule body`)
  }
  return match[1].trim()
}

describe('ColorInput width variant (M-8)', () => {
  it('defaults to no narrow modifier class', () => {
    render(<ColorInput id="w-default" label="Default width" placeholder="" value="" onChange={() => {}} />)
    const field = screen.getByLabelText('Default width')
    const root = field.closest('.color-input')
    expect(root).not.toBeNull()
    expect(root).not.toHaveClass('color-input--narrow')
  })

  it('applies the narrow modifier class when width="narrow"', () => {
    render(
      <ColorInput
        id="w-narrow"
        label="Narrow width"
        placeholder=""
        value=""
        onChange={() => {}}
        width="narrow"
      />,
    )
    const field = screen.getByLabelText('Narrow width')
    const root = field.closest('.color-input')
    expect(root).toHaveClass('color-input--narrow')
  })

  it('resolves the narrow modifier class to width: 60%', () => {
    const ruleBody = extractRuleBody(colorInputCss, '.color-input--narrow')
    expect(extractDeclaration(ruleBody, 'width')).toBe('60%')
  })
})

describe('ColorGenerator intake form field widths (M-8)', () => {
  it('renders Brand main color and Mood keyword at 60% width, and nothing else', () => {
    render(<ColorGenerator />)

    const brand = screen.getByLabelText('Brand main color').closest('.color-input')
    const mood = screen.getByLabelText('Mood keyword').closest('.color-input')
    expect(brand).toHaveClass('color-input--narrow')
    expect(mood).toHaveClass('color-input--narrow')

    // Reveal all 4 optional additional Hex fields (out of this grain's
    // scope per its "extra color field width" exclusion) and confirm none of
    // them picked up the narrow modifier - only brand + mood should ever be
    // narrow.
    const addColorButton = screen.getByRole('button', { name: 'Add another color' })
    fireEvent.click(addColorButton)
    fireEvent.click(addColorButton)
    fireEvent.click(addColorButton)
    fireEvent.click(addColorButton)
    for (let i = 1; i <= 4; i++) {
      const extra = screen.getByLabelText(`Additional color ${i}`).closest('.color-input')
      expect(extra).not.toHaveClass('color-input--narrow')
    }

    const narrowFields = document.querySelectorAll('.color-input--narrow')
    expect(narrowFields.length).toBe(2)
  })
})
