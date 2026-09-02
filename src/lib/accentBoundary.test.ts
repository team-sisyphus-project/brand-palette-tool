import { readFileSync, readdirSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

/**
 * Regression guard for design spec §1.2 (Deference) / §6: every UI chrome
 * element (panel, button, badge, border) must stay on the semantic grayscale
 * token scale. The only sanctioned *saturation* exceptions anywhere in the UI
 * are the palette swatch fill and the color wheel marker fill, both of which
 * render the user's own generated colors (`color.hex`), not a design token.
 *
 * grain-3 (2026-08-26, left-panel Palette Description panel): the single
 * sanctioned accent exception this describe block used to guard - the
 * selected ModeSelector chip (`--color-accent` / `--color-action-bg-strong`)
 * - no longer exists in the UI. ModeSelector was removed wholesale (see
 * ColorGenerator.tsx's class doc comment, "(assumption — needs
 * confirmation)"), and it was the only chrome CSS consumer of
 * `--color-action-bg-strong` anywhere in the codebase (verified by grep
 * before deletion). The guard below is updated accordingly: it now asserts
 * no UI chrome CSS file consumes either token at all, rather than carving out
 * one sanctioned exception - see context/decisions/ for the full rationale.
 * `src/index.css` is intentionally excluded from the "no hardcoded color
 * literals" scan below: it is the Token Group *definition* file (where
 * `--color-accent`, `--color-status-*`, etc. are declared as literal hex
 * values in the first place), not a piece of UI chrome consuming those
 * tokens. Its `--color-action-bg-strong` derivation
 * (`color-mix(in srgb, var(--color-accent) 82%, black)`) is the accent
 * token's own definition, not an additional usage site, so it is likewise
 * excluded from the "single usage site" scan — see
 * design-spec/token-groups/color/base.md.
 */

const srcDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const componentsDir = path.join(srcDir, 'components')

/** Recursively lists every `.css` file under `dir`. */
function listCssFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) return listCssFiles(fullPath)
    return entry.name.endsWith('.css') ? [fullPath] : []
  })
}

/** Matches `var(--token)` / `var(--token, fallback)`, not `--token-suffix`. */
function varUsagePattern(token: string): RegExp {
  return new RegExp(`var\\(\\s*${token}(?![\\w-])`, 'g')
}

const indexCssPath = path.join(srcDir, 'index.css')
/**
 * `--color-action-bg-strong` used to be the token painted onto UI chrome (via
 * `var()` in the now-deleted ModeSelector.css's selected-chip rule).
 * `--color-accent` itself is never consumed directly by any chrome CSS — its
 * only consumer anywhere is that single `--color-action-bg-strong:
 * color-mix(in srgb, var(--color-accent) 82%, black);` derivation line in
 * `index.css` (the token layer, not chrome). grain-3: with ModeSelector gone,
 * `--color-action-bg-strong` now has zero chrome consumers - "single accent
 * location" below means neither token is painted onto any chrome element at
 * all, not "painted in exactly one sanctioned place".
 */
const CHROME_CONSUMED_ACCENT_TOKEN = '--color-action-bg-strong'
const ROOT_ACCENT_TOKEN = '--color-accent'

describe('single accent location guard (design spec §1.2 exception)', () => {
  const chromeCssFiles = listCssFiles(srcDir).filter((file) => file !== indexCssPath)

  it('sanity check: scans a non-empty set of CSS files', () => {
    expect(chromeCssFiles.length).toBeGreaterThan(0)
  })

  it(`${CHROME_CONSUMED_ACCENT_TOKEN} is not referenced by any UI chrome CSS file`, () => {
    const pattern = varUsagePattern(CHROME_CONSUMED_ACCENT_TOKEN)
    const filesUsingToken = chromeCssFiles.filter((file) => pattern.test(readFileSync(file, 'utf-8')))
    expect(filesUsingToken).toEqual([])
  })

  it(`${ROOT_ACCENT_TOKEN} is never consumed directly by UI chrome CSS`, () => {
    const pattern = varUsagePattern(ROOT_ACCENT_TOKEN)
    const filesUsingToken = chromeCssFiles.filter((file) => pattern.test(readFileSync(file, 'utf-8')))
    expect(filesUsingToken).toEqual([])
  })

  it(`${ROOT_ACCENT_TOKEN}'s only consumer anywhere is the ${CHROME_CONSUMED_ACCENT_TOKEN} derivation in index.css`, () => {
    const indexCss = readFileSync(indexCssPath, 'utf-8')
    const pattern = varUsagePattern(ROOT_ACCENT_TOKEN)
    const occurrences = indexCss.match(pattern) ?? []
    expect(occurrences).toHaveLength(1)

    const derivationLinePattern = new RegExp(
      `${CHROME_CONSUMED_ACCENT_TOKEN}\\s*:\\s*color-mix\\([^;]*var\\(\\s*${ROOT_ACCENT_TOKEN}(?![\\w-])`,
    )
    expect(indexCss).toMatch(derivationLinePattern)
  })
})

describe('UI chrome CSS stays grayscale (design spec §1.2 Deference / §6)', () => {
  const cssFiles = listCssFiles(srcDir).filter((file) => file !== path.join(srcDir, 'index.css'))
  const colorLiteralPattern = /#[0-9a-fA-F]{3,8}\b|\brgba?\(|\bhsla?\(/

  it.each(cssFiles.map((file) => path.relative(srcDir, file)))(
    '%s has no hardcoded color literals (semantic tokens only)',
    (relativePath) => {
      const css = readFileSync(path.join(srcDir, relativePath), 'utf-8')
      expect(colorLiteralPattern.test(css)).toBe(false)
    },
  )
})

describe('palette swatch / color wheel are the sanctioned saturation exceptions', () => {
  const paletteSwatchTsx = readFileSync(path.join(componentsDir, 'PaletteSwatch.tsx'), 'utf-8')
  const colorWheelTsx = readFileSync(path.join(componentsDir, 'ColorWheel.tsx'), 'utf-8')

  it('PaletteSwatch renders the swatch fill from color.hex inline (not a token)', () => {
    expect(paletteSwatchTsx).toMatch(/backgroundColor:\s*color\.hex/)
  })

  it('ColorWheel renders the marker fill from color.hex inline (not a token)', () => {
    expect(colorWheelTsx).toMatch(/fill=\{color\.hex\}/)
  })
})
