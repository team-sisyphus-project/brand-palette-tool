import './MoodTag.css'

export interface MoodTagProps {
  /** 1-2 deterministic mood adjectives from getMoodTags(averageHsl(palette)). */
  tags: string[]
}

/**
 * Presentational display of spec A's emotion/mood tags (new, M-4): the 1-2
 * adjective words that src/lib/palette.ts's getMoodTags(averageHsl(palette))
 * computed for the current palette. This component owns no state and
 * computes nothing itself - it only renders whatever tags it is given.
 *
 * ColorGenerator always renders this alongside Palette whenever a palette
 * exists, so a mood tag is shown for every generated palette (M-4's "every
 * palette result shows emotion/mood tags").
 */
export function MoodTag({ tags }: MoodTagProps) {
  return (
    <ul className="mood-tag" aria-label="Palette mood tags">
      {tags.map((tag) => (
        <li className="mood-tag__item" key={tag}>
          {tag}
        </li>
      ))}
    </ul>
  )
}
