import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

/**
 * grain-1 (2026-08-27, wide column gap): pins `.color-generator__intake`'s
 * `gap` contract directly against source - jsdom does not run Vitest's CSS
 * pipeline, so a rendered component's `getComputedStyle` would not reflect
 * a real browser's cascade (see PaletteSwatch.test.tsx's doc comment).
 * Mirrors ColorGenerator.title.test.ts / pageBackground.test.ts's
 * convention of extracting a rule body from the actual CSS file and
 * asserting its declarations.
 */

const dirname = path.dirname(fileURLToPath(import.meta.url))
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

describe('.color-generator__intake gap', () => {
  it('sets gap to 120px between the intro and intake-form columns', () => {
    const rule = extractRuleBody(colorGeneratorCss, '.color-generator__intake {')
    expect(extractToken(rule, 'gap')).toBe('120px')
  })

  it('keeps align-items: stretch (height balance between the two columns is unaffected)', () => {
    const rule = extractRuleBody(colorGeneratorCss, '.color-generator__intake {')
    expect(extractToken(rule, 'align-items')).toBe('stretch')
  })

  it('the stacked (<=768px) breakpoint keeps its own smaller gap, unaffected by the wide-viewport 120px value', () => {
    const stackedRule = extractRuleBody(
      colorGeneratorCss,
      '@media (max-width: 768px) {\n  .color-generator__intake {'
    )
    expect(extractToken(stackedRule, 'gap')).toBe('var(--space-4)')
  })
})
