import './AestheticMatch.css'

export interface AestheticMatchProps {
  /** The single closest archetype name from matchAesthetic(averageHsl(palette)), or null when no archetype is close enough. */
  match: string | null
}

/**
 * Presentational display of spec A's aesthetic archetype match (new, M-5): the
 * single closest aesthetic archetype name that src/lib/palette.ts's
 * matchAesthetic(averageHsl(palette)) computed for the current palette. This
 * component owns no state and computes nothing itself - it only renders
 * whatever match it is given, mirroring MoodTag's pattern.
 *
 * When `match` is null (no archetype's center is within the threshold
 * distance), this renders nothing at all - spec A's "when the distance is at
 * or beyond the threshold, show nothing": an unconfirmed/too-distant match is
 * never forced onto the screen.
 */
export function AestheticMatch({ match }: AestheticMatchProps) {
  if (!match) return null

  return (
    <p className="aesthetic-match" role="status" aria-label="Palette aesthetic match">
      {match}
    </p>
  )
}
