import { generateShades, type PaletteColor } from '../lib/palette'
import './Shades.css'

export interface ShadesGroup {
  /** Short label identifying which color this ramp belongs to (e.g. "Base", "Accent 1"). */
  label: string
  color: PaletteColor
}

export interface ShadesProps {
  groups: ShadesGroup[]
}

/**
 * Lightness-step "Shades" visualization for Color Study (grain-3): one ramp
 * per group (the current base color, plus every accent color of the
 * selected harmony), each ramp computed via `generateShades` (src/lib/palette.ts) -
 * pure HSL arithmetic, no randomness. Purely presentational; `groups` is
 * fully owned/derived by the caller (`ColorStudy`).
 *
 * Each step's label combines its lightness percentage with its HEX
 * (`"50% #40bfbf"`), not the bare HEX alone. Two reasons: it tells a
 * non-expert user which lightness step they are looking at (this panel's own
 * "step by lightness" point), and - because `generateShades` intentionally
 * holds hue/saturation fixed and only steps lightness, a group's ramp can legitimately
 * reproduce the exact same HEX already shown elsewhere (e.g. `HarmonyExplorer`'s
 * accent swatch, when that accent's own lightness lands on one of
 * `generateShades`' sampled levels) - the percentage prefix keeps each
 * step's rendered text unique so it never collides with another element's
 * plain-HEX text.
 */
export function Shades({ groups }: ShadesProps) {
  return (
    <div className="shades" role="group" aria-label="Shades">
      {groups.map((group) => (
        <div className="shades__group" key={group.label}>
          <span className="shades__label">{group.label}</span>
          <div className="shades__ramp" role="list" aria-label={`${group.label} shades`}>
            {generateShades(group.color.hsl).map((shade, index) => (
              <div className="shades__step" role="listitem" key={`${index}-${shade.hex}`}>
                <div
                  className="shades__swatch"
                  style={{ backgroundColor: shade.hex }}
                  aria-hidden="true"
                />
                <span className="shades__hex">{`${Math.round(shade.hsl.l)}% ${shade.hex}`}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
