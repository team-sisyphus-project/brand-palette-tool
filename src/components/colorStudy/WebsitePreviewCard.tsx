import { getColorRoles } from '../../lib/colorRoles'
import { getBestTextColor } from '../../lib/colorPairing'
import type { PaletteColor } from '../../lib/palette'
import { CardShell } from './CardShell'
import './WebsitePreviewCard.css'

export interface WebsitePreviewCardProps {
  palette: PaletteColor[]
}

const CTA_TEXT_BY_CONTRAST: Record<'white' | 'black', string> = {
  white: '#ffffff',
  black: '#000000',
}

/**
 * Color Study card 5: "Website preview" (grain-5). A compact, non-interactive
 * mock of a real website interface - nav bar, hero heading/subtext, and a CTA
 * button - rendered entirely with the current palette's semantic roles
 * (`getColorRoles`: background/surface/primary/accent/text/border), so the
 * user can feel how the palette reads in an actual layout rather than as
 * isolated swatches.
 *
 * The whole mock is exposed as a single `role="img"` (mirroring
 * `DistributionCard`'s bar and `ContrastCheckerCard`'s preview swatches -
 * grain-4's established pattern for "this is a visual demonstration, not
 * interactive/informational content"); every element inside is `aria-hidden`
 * via the ancestor, including the CTA, which is a `<span>` rather than a
 * `<button>` since it triggers nothing.
 *
 * `getBestTextColor` (src/lib/colorPairing.ts, grain-3) picks the CTA's
 * white/black text for guaranteed-readable contrast against the primary
 * role color, same white/black contrast lookup `ContrastCheckerCard` already
 * uses - not a new design token, this is palette-derived data like every
 * other role color on this card.
 *
 * Same recompute-on-render / empty-palette-guard contract as every other
 * Color Study card (spec M-5).
 */
export function WebsitePreviewCard({ palette }: WebsitePreviewCardProps) {
  if (palette.length === 0) return null

  const roles = getColorRoles(palette)
  const byRole = new Map(roles.map((assignment) => [assignment.role, assignment.color]))
  const primary = byRole.get('primary')!
  const accent = byRole.get('accent')!
  const background = byRole.get('background')!
  const surface = byRole.get('surface')!
  const text = byRole.get('text')!
  const border = byRole.get('border')!
  const ctaTextColor = CTA_TEXT_BY_CONTRAST[getBestTextColor(primary)]

  return (
    <CardShell title="Website Preview" headingId="website-preview-card-heading">
      <div
        className="website-preview-card__frame"
        role="img"
        aria-label="Website mockup using the current palette"
        style={{ backgroundColor: background.hex, borderColor: border.hex }}
      >
        <div className="website-preview-card__nav" style={{ backgroundColor: surface.hex, borderColor: border.hex }}>
          <span className="website-preview-card__brand" style={{ color: primary.hex }} aria-hidden="true">
            Brand
          </span>
          <div className="website-preview-card__nav-links" style={{ color: text.hex }} aria-hidden="true">
            <span>Home</span>
            <span>Features</span>
            <span>Pricing</span>
          </div>
        </div>
        <div className="website-preview-card__hero" aria-hidden="true">
          <span className="website-preview-card__eyebrow" style={{ color: accent.hex }}>
            New
          </span>
          <span className="website-preview-card__heading" style={{ color: text.hex }}>
            Build something great
          </span>
          <span className="website-preview-card__subtext" style={{ color: text.hex }}>
            A live preview of your palette applied to a real interface.
          </span>
          <span
            className="website-preview-card__cta"
            style={{ backgroundColor: primary.hex, color: ctaTextColor }}
          >
            Get Started
          </span>
        </div>
      </div>
    </CardShell>
  )
}
