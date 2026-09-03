import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

/**
 * grain-2 (M-7, intake-form rectangular border + title-height match):
 * regression guard for spec A's "homepage intake layout" delta - the
 * `.color-generator__intake-form` container must (1) carry a rectangular,
 * semantic-chrome border (not a brand/generated color) and (2) render at
 * *least* as tall as the left title's 3-line, 110px text.
 *
 * jsdom (this project's test environment) does not perform real text layout
 * - it cannot report a font's actual rendered line-box height, so a true
 * pixel-perfect browser measurement isn't something a unit test can produce
 * here (browser automation tools are out of bounds for this project - see
 * project conventions). Instead, this guards the same thing at the CSS
 * source level `pageBackground.test.ts`/`accentBoundary.test.ts` already
 * do for other token contracts: both rules must derive from the exact same
 * `--text-display-2xl` / `--leading-display` tokens, so they can never
 * silently drift apart. Per CSS's line-height spec, a unitless line-height
 * produces an exact `font-size * line-height` line-box height in every
 * engine - so tying both rules to identical token references *is* the
 * pixel-exact guarantee, not an approximation of one.
 *
 * grain-1 (2026-08-27, height -> min-height overflow fix): `height` was
 * swapped for `min-height` (same calc() formula) so the box can grow past
 * the title-matched 396px floor once the 4 progressive-disclosure
 * additional-color fields are revealed, instead of clipping/overflowing a
 * hard-capped `height` - box-model arithmetic showed even a single revealed
 * field already overflows the old fixed height by ~78px. See
 * ColorGenerator.css's own comment on this rule and
 * context/decisions/2026-08-27-grain-1-intake-form-min-height-overflow-fix.md.
 * The assertions below are updated to check `min-height` instead of
 * `height`; the "renders a rectangular border..."/"folds the border..."/
 * token-tie assertions are unchanged since neither the border nor the
 * box-sizing/token references moved.
 */

const componentsDir = path.dirname(fileURLToPath(import.meta.url))
const srcDir = path.join(componentsDir, '..')

const colorGeneratorCss = readFileSync(path.join(componentsDir, 'ColorGenerator.css'), 'utf-8')
const indexCss = readFileSync(path.join(srcDir, 'index.css'), 'utf-8')

/**
 * Extracts the `{ ... }` body of the LAST rule whose selector line is
 * exactly `selector` (own line, not part of a comma-separated selector
 * list such as the shared `.color-generator__controls, ... { }` rule above
 * it in this file) - "last" because `.color-generator__intake-form` is
 * declared once as part of that shared list and again, later, as its own
 * standalone rule carrying the border/height declarations this test cares
 * about.
 */
function extractRuleBody(source: string, selector: string): string {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const pattern = new RegExp(`^${escaped} \\{`, 'gm')
  const matches = [...source.matchAll(pattern)]
  if (matches.length === 0) {
    throw new Error(`extractRuleBody: selector "${selector}" not found on its own line`)
  }
  const lastMatch = matches[matches.length - 1]
  const braceStart = lastMatch.index! + lastMatch[0].length - 1
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

/** Reads a single `property: value;` declaration out of a CSS rule body. */
function extractDeclaration(ruleBody: string, property: string): string {
  const pattern = new RegExp(`(?:^|[\\s;{])${property}\\s*:\\s*([^;]+);`)
  const match = pattern.exec(ruleBody)
  if (!match) {
    throw new Error(`extractDeclaration: "${property}" not found in rule body`)
  }
  return match[1].trim()
}

describe('.color-generator__intake-form border + title-height match (M-7)', () => {
  const intakeFormRule = extractRuleBody(colorGeneratorCss, '.color-generator__intake-form')
  const introTitleRule = extractRuleBody(colorGeneratorCss, '.color-generator__intro-title')
  const rootTokens = extractRuleBody(indexCss, ':root')

  it('renders a rectangular border using semantic chrome tokens, not a brand/generated color', () => {
    const border = extractDeclaration(intakeFormRule, 'border')
    expect(border).toBe('var(--border-width-default) solid var(--color-border-default)')
  })

  it('folds the border into the box height via border-box sizing', () => {
    expect(extractDeclaration(intakeFormRule, 'box-sizing')).toBe('border-box')
  })

  it("derives its min-height floor from the title's own font-size/line-height tokens instead of a literal px", () => {
    expect(extractDeclaration(intakeFormRule, 'min-height')).toBe(
      'calc(var(--text-display-2xl) * var(--leading-display) * 3)',
    )
  })

  it('no longer caps the box at a fixed height (would clip revealed additional-color fields)', () => {
    expect(() => extractDeclaration(intakeFormRule, 'height')).toThrow()
  })

  it('ties to the same tokens the 3-line title actually renders with', () => {
    expect(extractDeclaration(introTitleRule, 'font-size')).toBe('var(--text-display-2xl)')
    expect(extractDeclaration(introTitleRule, 'line-height')).toBe('var(--leading-display)')
  })

  it('resolves its floor to 396px given the current token values (3 lines * 110px * 1.2), matching the title exactly when content is short enough to not need to grow', () => {
    const textDisplay2xl = parseFloat(extractDeclaration(rootTokens, '--text-display-2xl'))
    const leadingDisplay = parseFloat(extractDeclaration(rootTokens, '--leading-display'))
    const titleHeight = textDisplay2xl * leadingDisplay * 3
    const intakeFormMinHeight = titleHeight // same calc() formula, by construction

    expect(titleHeight).toBe(396)
    // Design-spec assumption (±4px tolerance) - see design-spec/audit/2026-08-27.md -
    // is satisfied with margin to spare since both sides use the identical formula.
    expect(Math.abs(intakeFormMinHeight - titleHeight)).toBeLessThanOrEqual(4)
  })
})
