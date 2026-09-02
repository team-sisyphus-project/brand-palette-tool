import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

/**
 * grain-1 (theme toggle placement + pure white light background): the page
 * (`body`) background must be a dedicated `--color-bg-page` token, pinned to
 * pure white in the light theme — independent from `--color-bg-muted`
 * (which stays the pre-existing `--color-system-bg-secondary`, `#f2f2f7`, and
 * is still used by e.g. MoodTag/PaletteSwatch chrome). This guards both
 * halves of that contract directly against `src/index.css`'s source, the
 * same style `accentBoundary.test.ts` uses for its token-usage guards.
 */

const indexCssPath = path.join(path.dirname(fileURLToPath(import.meta.url)), 'index.css')
const css = readFileSync(indexCssPath, 'utf-8')

/**
 * Extracts the `{ ... }` body of the rule whose selector text is exactly
 * `selector` (matched as a literal substring, brace-balanced from the first
 * `{` after it) — mirrors accentBoundary.test.ts's helper.
 */
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

/** Reads a single `--token: value;` declaration out of a CSS rule body. */
function extractToken(ruleBody: string, tokenName: string): string {
  const pattern = new RegExp(`(?:^|[\\s;{])${tokenName}\\s*:\\s*([^;]+);`)
  const match = pattern.exec(ruleBody)
  if (!match) {
    throw new Error(`extractToken: "${tokenName}" not found in rule body`)
  }
  return match[1].trim()
}

describe('page background token (--color-bg-page)', () => {
  it('body paints its background from --color-bg-page', () => {
    const bodyRule = extractRuleBody(css, 'body {')
    expect(extractToken(bodyRule, 'background')).toBe('var(--color-bg-page)')
  })

  it('the light theme pins --color-bg-page to pure white', () => {
    const lightRule = extractRuleBody(css, ":root[data-theme='light']")
    expect(extractToken(lightRule, '--color-bg-page')).toBe('#ffffff')
  })

  it('--color-bg-page is a distinct token from --color-bg-muted (light theme)', () => {
    const rootRule = extractRuleBody(css, ':root {')
    const lightRule = extractRuleBody(css, ":root[data-theme='light']")

    // --color-bg-muted is declared once, at :root, and not overridden by the
    // light theme rule — it keeps tracking --color-system-bg-secondary.
    expect(extractToken(rootRule, '--color-bg-muted')).toBe('var(--color-system-bg-secondary)')
    expect(lightRule).not.toMatch(/--color-bg-muted\s*:/)

    const lightBgPage = extractToken(lightRule, '--color-bg-page')
    const lightBgMutedResolved = extractToken(lightRule, '--color-system-bg-secondary')
    expect(lightBgPage).not.toBe(lightBgMutedResolved)
  })

  it('the dark theme does not override --color-bg-page (dark palette values are out of scope for this grain)', () => {
    const darkRule = extractRuleBody(css, ":root[data-theme='dark']")
    expect(darkRule).not.toMatch(/--color-bg-page\s*:/)
  })
})
