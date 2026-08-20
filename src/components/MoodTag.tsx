import './MoodTag.css'

export interface MoodTagProps {
  /** 1-2 deterministic mood adjectives from getMoodTags(averageHsl(palette)). */
  tags: string[]
}

/**
 * Presentational display of spec A's 감정/무드 태그 (신규, M-4): the 1-2
 * adjective words that src/lib/palette.ts's getMoodTags(averageHsl(palette))
 * computed for the current palette. This component owns no state and
 * computes nothing itself - it only renders whatever tags it is given.
 *
 * ColorGenerator always renders this alongside Palette whenever a palette
 * exists, so a mood tag is shown for every generated palette (M-4's "팔레트
 * 결과마다 감정/무드 태그가 표시됨").
 */
export function MoodTag({ tags }: MoodTagProps) {
  return (
    <ul className="mood-tag" aria-label="팔레트 무드 태그">
      {tags.map((tag) => (
        <li className="mood-tag__item" key={tag}>
          {tag}
        </li>
      ))}
    </ul>
  )
}
