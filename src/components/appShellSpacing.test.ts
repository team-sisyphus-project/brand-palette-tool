import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

/**
 * grain-5 (M-10, app-shell top padding + intake column gap): regression
 * guard for spec A's "page margins/spacing" delta - `.app-shell` must render a
 * 140px top padding and `.color-generator__intake` must render a 120px gap
 * between its title/form columns.
 *
 * Both numbers are literal instructions from the spec, not steps on the
 * `--space-*` scale (max rung is `--space-9` / 64px), so this test asserts
 * the literal `140px` / `120px` declarations directly at the CSS source
 * level - same approach `colorGeneratorIntakeFormBorder.test.ts` uses for
 * M-7's token-derived height, adapted here for plain literals since there is
 * no token to derive from (see
 * context/decisions/2026-08-27-grain-5-fixed-px-spacing.md for why literals
 * were chosen over inventing new `--space-*` steps).
 */

const componentsDir = path.dirname(fileURLToPath(import.meta.url))
const srcDir = path.join(componentsDir, '..')

const appCss = readFileSync(path.join(srcDir, 'App.css'), 'utf-8')
const colorGeneratorCss = readFileSync(path.join(componentsDir, 'ColorGenerator.css'), 'utf-8')

/**
 * Extracts the `{ ... }` body of the LAST rule whose selector line is
 * exactly `selector` (own line, not part of a comma-separated selector
 * list) - mirrors `colorGeneratorIntakeFormBorder.test.ts`'s helper.
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

describe('.app-shell top padding (M-10)', () => {
  const appShellRule = extractRuleBody(appCss, '.app-shell')

  it('overrides the shared padding shorthand with a literal 140px top padding', () => {
    expect(extractDeclaration(appShellRule, 'padding-top')).toBe('140px')
  })

  it('keeps the padding-top override declared after the shared padding shorthand (source order wins)', () => {
    const paddingIndex = appShellRule.indexOf('padding:')
    const paddingTopIndex = appShellRule.indexOf('padding-top:')
    expect(paddingTopIndex).toBeGreaterThan(paddingIndex)
  })
})

describe('.color-generator__intake column gap (M-10)', () => {
  const intakeRule = extractRuleBody(colorGeneratorCss, '.color-generator__intake')

  it('renders a literal 120px gap between the title and form columns', () => {
    expect(extractDeclaration(intakeRule, 'gap')).toBe('120px')
  })
})
