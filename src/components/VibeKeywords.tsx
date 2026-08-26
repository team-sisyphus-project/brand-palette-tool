import './VibeKeywords.css'

export interface VibeKeywordsProps {
  /** 5+ deterministic vibe keywords from getVibeKeywords(averageHsl(palette)). */
  keywords: string[]
}

/**
 * Presentational display of the "keyword:" vibe-explanation line (design-spec
 * grain-2, "provide intuitive vibe keywords"): renders the fixed "keyword:"
 * label followed by every keyword src/lib/palette.ts's
 * getVibeKeywords(averageHsl(palette)) returned for the current palette,
 * comma-joined on a single line (e.g. "keyword: warm, cozy, vibrant, bold,
 * bright, cheerful") so a non-expert can read the palette's mood at a glance.
 *
 * Mirrors MoodTag's/AestheticMatch's prop pattern: this component owns no
 * state and computes nothing itself - it only renders whatever keywords it is
 * given.
 *
 * ColorGenerator always renders this alongside MoodTag/AestheticMatch
 * whenever a palette exists, recomputing `keywords` on every palette change.
 */
export function VibeKeywords({ keywords }: VibeKeywordsProps) {
  return (
    <p className="vibe-keywords" role="status" aria-label="Palette vibe keywords">
      <span className="vibe-keywords__label">keyword:</span> {keywords.join(', ')}
    </p>
  )
}
