import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

/**
 * grain-1 (2026-08-27, title copy + 110px revert): pins the
 * `.color-generator__intro-title` font-size contract directly against
 * source - jsdom does not run Vitest's CSS pipeline, so a rendered
 * component's `getComputedStyle` would not reflect a real browser's
 * cascade (see PaletteSwatch.test.tsx's doc comment). Mirrors
 * pageBackground.test.ts's convention of extracting a rule body from the
 * actual CSS file and asserting its declarations.
 *
 * Two halves make up the "computed font-size is 110px" guarantee:
 * 1. `.color-generator__intro-title` (ColorGenerator.css) sets
 *    `font-size: var(--text-display-2xl)`.
 * 2. `--text-display-2xl` (src/index.css `:root`) resolves to `110px`.
 */

const dirname = path.dirname(fileURLToPath(import.meta.url))
const indexCss = readFileSync(path.join(dirname, '../index.css'), 'utf-8')
const colorGeneratorCss = readFileSync(path.join(dirname, 'ColorGenerator.css'), 'utf-8')

/** Mirrors pageBackground.test.ts's brace-balanced rule-body extractor. */
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

/** Mirrors pageBackground.test.ts's single-declaration token reader. */
function extractToken(ruleBody: string, tokenName: string): string {
  const pattern = new RegExp(`(?:^|[\\s;{])${tokenName}\\s*:\\s*([^;]+);`)
  const match = pattern.exec(ruleBody)
  if (!match) {
    throw new Error(`extractToken: "${tokenName}" not found in rule body`)
  }
  return match[1].trim()
}

describe('.color-generator__intro-title font-size (--text-display-2xl)', () => {
  it('sets font-size from the --text-display-2xl token (not a hardcoded value)', () => {
    const rule = extractRuleBody(colorGeneratorCss, '.color-generator__intro-title {')
    expect(extractToken(rule, 'font-size')).toBe('var(--text-display-2xl)')
  })

  it('--text-display-2xl resolves to 110px', () => {
    const rootRule = extractRuleBody(indexCss, ':root {')
    expect(extractToken(rootRule, '--text-display-2xl')).toBe('110px')
  })

  it('--text-display-2xl is used nowhere else in ColorGenerator.css but this one title class', () => {
    const usages = colorGeneratorCss.match(/--text-display-2xl/g) ?? []
    // Exactly one usage: the font-size declaration itself (comments above
    // it mention the token name in prose, so this counts CSS-declaration
    // occurrences specifically, not comment text).
    const declarationUsages = colorGeneratorCss.match(/font-size:\s*var\(--text-display-2xl\)/g) ?? []
    expect(declarationUsages).toHaveLength(1)
    expect(usages.length).toBeGreaterThanOrEqual(declarationUsages.length)
  })
})
