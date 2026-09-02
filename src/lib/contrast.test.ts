import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { contrastOfTextOnBackground } from './contrast'

const WCAG_AA_NORMAL_TEXT = 4.5

const cssPath = path.join(path.dirname(fileURLToPath(import.meta.url)), '../index.css')
const css = readFileSync(cssPath, 'utf-8')

/**
 * Extracts the `{ ... }` body of the first rule whose selector is exactly
 * `selector` (not a substring match inside a longer selector, e.g. this
 * distinguishes `:root[data-theme='light']` from
 * `:root:not([data-theme='light'])`).
 */
function extractRuleBody(source: string, selector: string): string {
  let searchFrom = 0
  while (true) {
    const index = source.indexOf(selector, searchFrom)
    if (index === -1) {
      throw new Error(`extractRuleBody: selector "${selector}" not found in index.css`)
    }
    const precedingChar = source[index - 1]
    // Reject matches where `selector` is a tail of a longer selector, e.g.
    // ":not([data-theme='light'])" contains "[data-theme='light']" but not
    // as the start of a rule — guard by requiring a non-identifier char (or
    // start of file) immediately before the match.
    if (index === 0 || !/[\w-]/.test(precedingChar)) {
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
    searchFrom = index + selector.length
  }
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

interface ThemeTokens {
  bgPrimary: string
  bgSecondary: string
  textPrimary: string
  textSecondary: string
}

function readThemeTokens(theme: 'light' | 'dark'): ThemeTokens {
  const body = extractRuleBody(css, `:root[data-theme='${theme}']`)
  return {
    bgPrimary: extractToken(body, '--color-system-bg-primary'),
    bgSecondary: extractToken(body, '--color-system-bg-secondary'),
    textPrimary: extractToken(body, '--color-text-primary'),
    textSecondary: extractToken(body, '--color-text-secondary'),
  }
}

/**
 * `--color-text-on-action` is declared once, at `:root`, and is not
 * re-declared per theme (it stays `#ffffff` regardless of theme) — so it is
 * read from the base `:root` rule rather than from a themed rule body.
 */
function readBaseRootToken(tokenName: string): string {
  const body = extractRuleBody(css, ':root {')
  return extractToken(body, tokenName)
}

describe('WCAG AA contrast — body text vs background (design spec §3 / M-2)', () => {
  const themes: Array<'light' | 'dark'> = ['light', 'dark']

  describe.each(themes)('%s theme', (theme) => {
    const tokens = readThemeTokens(theme)

    const textPairs: Array<['textPrimary' | 'textSecondary', string]> = [
      ['textPrimary', tokens.textPrimary],
      ['textSecondary', tokens.textSecondary],
    ]
    const bgPairs: Array<['bgPrimary' | 'bgSecondary', string]> = [
      ['bgPrimary', tokens.bgPrimary],
      ['bgSecondary', tokens.bgSecondary],
    ]

    const cases = textPairs.flatMap(([textName, textValue]) =>
      bgPairs.map(([bgName, bgValue]) => ({ textName, textValue, bgName, bgValue })),
    )

    it.each(cases)('--color-$textName vs --color-system-$bgName meets 4.5:1', ({ textName, textValue, bgName, bgValue }) => {
      const ratio = contrastOfTextOnBackground(textValue, bgValue)
      expect(ratio, `${textName} (${textValue}) vs ${bgName} (${bgValue}) = ${ratio.toFixed(3)}`).toBeGreaterThanOrEqual(
        WCAG_AA_NORMAL_TEXT,
      )
    })
  })
})

describe('WCAG AA contrast — neutral gray action/focus tokens vs --color-text-on-action', () => {
  // --color-border-focus / --color-action-bg were narrowed from --color-accent
  // (blue) to opaque neutral grays so the only remaining accent usage is the
  // selected ModeSelector chip (via --color-action-bg-strong). Any element
  // painted with --color-action-bg (e.g. the "재생성"/Regenerate button)
  // renders --color-text-on-action text/icon on top of it, so that pairing
  // must still clear WCAG AA.
  const textOnAction = readBaseRootToken('--color-text-on-action')

  const themes: Array<'light' | 'dark'> = ['light', 'dark']

  it.each(themes)('%s theme: --color-action-bg vs --color-text-on-action meets 4.5:1', (theme) => {
    const body = extractRuleBody(css, `:root[data-theme='${theme}']`)
    const actionBg = extractToken(body, '--color-action-bg')
    const ratio = contrastOfTextOnBackground(textOnAction, actionBg)
    expect(ratio, `${theme} --color-action-bg (${actionBg}) vs --color-text-on-action (${textOnAction}) = ${ratio.toFixed(3)}`).toBeGreaterThanOrEqual(
      WCAG_AA_NORMAL_TEXT,
    )
  })

  it.each(themes)('%s theme: --color-border-focus vs --color-text-on-action meets 4.5:1', (theme) => {
    const body = extractRuleBody(css, `:root[data-theme='${theme}']`)
    const borderFocus = extractToken(body, '--color-border-focus')
    const ratio = contrastOfTextOnBackground(textOnAction, borderFocus)
    expect(ratio, `${theme} --color-border-focus (${borderFocus}) vs --color-text-on-action (${textOnAction}) = ${ratio.toFixed(3)}`).toBeGreaterThanOrEqual(
      WCAG_AA_NORMAL_TEXT,
    )
  })

  // --color-action-bg-fixed (grain-1, 2026-08-26): the Generate/Regenerate
  // CTA's fixed pure-black background - declared once at the base :root
  // (not re-declared per theme), so it must read identically, and clear
  // WCAG AA against --color-text-on-action, in both themes.
  it.each(themes)('%s theme: --color-action-bg-fixed vs --color-text-on-action meets 4.5:1', (theme) => {
    void theme
    const actionBgFixed = readBaseRootToken('--color-action-bg-fixed')
    const ratio = contrastOfTextOnBackground(textOnAction, actionBgFixed)
    expect(ratio, `${theme} --color-action-bg-fixed (${actionBgFixed}) vs --color-text-on-action (${textOnAction}) = ${ratio.toFixed(3)}`).toBeGreaterThanOrEqual(
      WCAG_AA_NORMAL_TEXT,
    )
  })

  it('--color-action-bg-fixed is #000000 (non-adaptive: same literal value regardless of theme)', () => {
    expect(readBaseRootToken('--color-action-bg-fixed').toLowerCase()).toBe('#000000')
  })
})
