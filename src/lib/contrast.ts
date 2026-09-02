/**
 * WCAG 2.x contrast-ratio math, used to verify design tokens (§3 of the
 * design spec) meet AA (4.5:1) for body text against its background.
 *
 * Pure, framework-free — no DOM access — so it can run in any test
 * environment and be reused by future non-UI token audits.
 */

export interface RGB {
  r: number
  g: number
  b: number
}

export interface RGBA extends RGB {
  a: number
}

/**
 * Parses a CSS color string in `#rrggbb` or `rgba(r, g, b, a)` form (the two
 * forms used by this project's color tokens). Throws on anything else so a
 * malformed/unsupported token value fails loudly rather than silently
 * producing a wrong ratio.
 */
export function parseColor(input: string): RGBA {
  const value = input.trim()

  const hexMatch = /^#([0-9a-f]{6})$/i.exec(value)
  if (hexMatch) {
    const hex = hexMatch[1]
    return {
      r: parseInt(hex.slice(0, 2), 16),
      g: parseInt(hex.slice(2, 4), 16),
      b: parseInt(hex.slice(4, 6), 16),
      a: 1,
    }
  }

  const rgbaMatch = /^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*(?:,\s*([\d.]+)\s*)?\)$/i.exec(value)
  if (rgbaMatch) {
    return {
      r: Number(rgbaMatch[1]),
      g: Number(rgbaMatch[2]),
      b: Number(rgbaMatch[3]),
      a: rgbaMatch[4] === undefined ? 1 : Number(rgbaMatch[4]),
    }
  }

  throw new Error(`parseColor: unsupported color format "${input}"`)
}

/** Alpha-composites `fg` over an opaque `bg` (simple "source over" blend). */
export function compositeOver(fg: RGBA, bg: RGB): RGB {
  return {
    r: fg.r * fg.a + bg.r * (1 - fg.a),
    g: fg.g * fg.a + bg.g * (1 - fg.a),
    b: fg.b * fg.a + bg.b * (1 - fg.a),
  }
}

/** WCAG relative luminance (https://www.w3.org/TR/WCAG21/#dfn-relative-luminance). */
export function relativeLuminance({ r, g, b }: RGB): number {
  const channel = (value: number): number => {
    const srgb = value / 255
    return srgb <= 0.03928 ? srgb / 12.92 : ((srgb + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)
}

/** WCAG contrast ratio between two colors, in the range [1, 21]. */
export function contrastRatio(a: RGB, b: RGB): number {
  const l1 = relativeLuminance(a)
  const l2 = relativeLuminance(b)
  const lighter = Math.max(l1, l2)
  const darker = Math.min(l1, l2)
  return (lighter + 0.05) / (darker + 0.05)
}

/**
 * Contrast ratio of a (possibly translucent) foreground color, as used by
 * text tokens, against an opaque background color — composites first, then
 * measures. This is what "text token vs background token" means for tokens
 * like `--color-text-secondary` that are defined as `rgba(...)`.
 */
export function contrastOfTextOnBackground(textColor: string, backgroundColor: string): number {
  const bg = parseColor(backgroundColor)
  const fg = parseColor(textColor)
  const composited = compositeOver(fg, bg)
  return contrastRatio(composited, bg)
}
