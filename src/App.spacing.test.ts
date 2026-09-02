import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

/**
 * grain-1 (2026-08-27, page-top whitespace): pins `.app-shell`'s
 * `padding-top` contract directly against source - jsdom does not run
 * Vitest's CSS pipeline, so a rendered component's `getComputedStyle` would
 * not reflect a real browser's cascade (see PaletteSwatch.test.tsx's doc
 * comment). Mirrors pageBackground.test.ts / ColorGenerator.title.test.ts's
 * convention of extracting a rule body from the actual CSS file and
 * asserting its declarations.
 */

const dirname = path.dirname(fileURLToPath(import.meta.url))
const appCss = readFileSync(path.join(dirname, 'App.css'), 'utf-8')

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

describe('.app-shell padding-top', () => {
  it('sets padding-top to 140px', () => {
    const rule = extractRuleBody(appCss, '.app-shell {')
    expect(extractToken(rule, 'padding-top')).toBe('140px')
  })

  it('keeps the base padding shorthand (var(--space-6)) - padding-top only overrides the top side', () => {
    const rule = extractRuleBody(appCss, '.app-shell {')
    expect(extractToken(rule, 'padding')).toBe('var(--space-6)')
  })

  it('declares padding-top after the padding shorthand, so it wins the cascade', () => {
    const rule = extractRuleBody(appCss, '.app-shell {')
    const paddingIndex = rule.search(/(?:^|[\s;{])padding\s*:/)
    const paddingTopIndex = rule.search(/(?:^|[\s;{])padding-top\s*:/)
    expect(paddingTopIndex).toBeGreaterThan(paddingIndex)
  })
})
