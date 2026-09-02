import { getContrastCombinations } from '../../lib/contrastAccessibility'
import type { PaletteColor } from '../../lib/palette'
import { CardShell } from './CardShell'
import './ContrastCheckerCard.css'

export interface ContrastCheckerCardProps {
  palette: PaletteColor[]
}

/**
 * Color Study card 3: "Contrast & accessibility checker" (grain-4). Renders
 * the 3 fixed combinations `getContrastCombinations`
 * (src/lib/contrastAccessibility.ts) checks - White text on Primary, Dark
 * text on Primary, Accent on Background - each as a live "Aa" preview swatch
 * (actual foreground-on-background pairing, not just two side-by-side
 * chips) plus its WCAG ratio, grade, and the grade's recommendation text.
 *
 * `ratio.toFixed(2)` is purely a display concern (the underlying number
 * stays full-precision in the data layer); grade badges reuse the existing
 * `--color-state-success`/`--color-state-error` semantic tokens for
 * AAA/Fail. There is no `--color-state-warning` token yet in this
 * codebase's Design Spec (only success/error have a "state" pairing - see
 * src/index.css), so AA - already a WCAG *pass*, not a failure - reuses the
 * same neutral `--color-text-secondary`/`--color-border-default` tokens as
 * this card's own body text instead of introducing an unregistered raw
 * color; recorded as a deviation in this grain's decision record.
 *
 * Same recompute-on-render / empty-palette-guard contract as the other
 * cards in this grain (spec M-5).
 */
export function ContrastCheckerCard({ palette }: ContrastCheckerCardProps) {
  if (palette.length === 0) return null
  const combinations = getContrastCombinations(palette)

  return (
    <CardShell title="Contrast Checker" headingId="contrast-checker-card-heading">
      <ul className="contrast-checker-card__list" aria-label="Contrast combinations">
        {combinations.map((combo) => (
          <li key={combo.label} className="contrast-checker-card__item">
            <div
              className="contrast-checker-card__preview"
              style={{ backgroundColor: combo.backgroundHex, color: combo.foregroundHex }}
              aria-hidden="true"
            >
              Aa
            </div>
            <div className="contrast-checker-card__details">
              <span className="contrast-checker-card__label">{combo.label}</span>
              <span className="contrast-checker-card__ratio">{combo.ratio.toFixed(2)}:1</span>
              <span className="contrast-checker-card__grade" data-grade={combo.grade}>
                {combo.grade}
              </span>
              <span className="contrast-checker-card__recommendation">{combo.recommendation}</span>
            </div>
          </li>
        ))}
      </ul>
    </CardShell>
  )
}
