import './PaletteDescription.css'

export interface PaletteDescriptionProps {
  /** Deterministic display name from getPaletteName(averageHsl(palette)). */
  name: string
  /** Deterministic 2-sentence description from getPaletteDescription(averageHsl(palette)). */
  description: string[]
  /**
   * Deterministic vibe keywords from getVibeKeywords(averageHsl(palette)) -
   * the same source VibeKeywords (right/preview panel) renders, reused as-is
   * so the two panels never disagree about a palette's keywords.
   */
  keywords: string[]
}

/**
 * grain-3: left-panel Palette Description section that replaces the removed
 * ModeSelector/RecentPalettes markup (see ColorGenerator.tsx's class doc
 * comment). Purely presentational - mirrors MoodTag/AestheticMatch/
 * VibeKeywords's pattern: owns no state and computes nothing itself, only
 * rendering whatever name/description/keywords it is given.
 *
 * Large, confident title + generous whitespace + a plain (non-chip) keyword
 * list, per the card's "Apple landing page" visual brief - see
 * PaletteDescription.css for the token choices.
 */
export function PaletteDescription({ name, description, keywords }: PaletteDescriptionProps) {
  return (
    <section className="palette-description" aria-label="Palette description">
      <h2 className="palette-description__name">{name}</h2>
      <ul className="palette-description__lines" aria-label="Palette description text">
        {description.map((line, index) => (
          <li className="palette-description__line" key={index}>
            {line}
          </li>
        ))}
      </ul>
      <ul className="palette-description__keywords" aria-label="Palette keywords">
        {keywords.map((keyword) => (
          <li className="palette-description__keyword" key={keyword}>
            {keyword}
          </li>
        ))}
      </ul>
    </section>
  )
}
