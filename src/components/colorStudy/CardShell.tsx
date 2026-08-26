import type { ReactNode } from 'react'
import './CardShell.css'

export interface CardShellProps {
  /** Visible card heading text (h3, e.g. "Color Roles"). */
  title: string
  /** DOM id for the heading, wired to the section's `aria-labelledby`. Must be unique per rendered card. */
  headingId: string
  children: ReactNode
}

/**
 * Shared rounded-card tile shell for every Color Study analysis card
 * (grain-4). Mirrors the tile-shell rule already recorded in the Design
 * Spec for `ColorStudy`'s own masonry tiles (rounded corners +
 * `--radius-card`, subtle `--color-border-default` border, `--color-bg-surface`
 * fill, `--space-5` padding - see design-spec/components/color-study/base.md's
 * "Tile shell" entry) rather than introducing a second set of tile tokens.
 *
 * This grain's Boundary is `src/components/colorStudy/*` only - `ColorStudy.tsx`
 * (which currently also wraps each of its 3 widgets in its own
 * `.color-study__tile`) is out of scope here, so this shell is intentionally
 * self-contained rather than assuming a `.color-study__tile` ancestor.
 * Wiring these cards into `ColorStudy`'s grid is later grains' scope; see
 * this grain's decision record for the resulting double-wrapping note a
 * future wiring grain needs to resolve (drop one of the two wrappers).
 */
export function CardShell({ title, headingId, children }: CardShellProps) {
  return (
    <section className="color-study-card" aria-labelledby={headingId}>
      <h3 id={headingId} className="color-study-card__heading">
        {title}
      </h3>
      {children}
    </section>
  )
}
