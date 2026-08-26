import { useMemo, useState } from 'react'
import {
  BRAND_SLOT_INDEX,
  GENERATION_MODES,
  averageHsl,
  createInitialLocks,
  generatePalette,
  getMoodTags,
  getPaletteDescription,
  getPaletteName,
  getVibeKeywords,
  matchAesthetic,
  parseColorInput,
  regeneratePalette,
  updateSlotColor,
  type GenerationMode,
  type Locks,
  type PaletteColor,
} from '../lib/palette'
import type { Theme } from '../lib/theme'
import { AestheticMatch } from './AestheticMatch'
import { ColorInput } from './ColorInput'
import { ColorStudy } from './ColorStudy'
import { Palette } from './Palette'
import { PaletteDescription } from './PaletteDescription'
import { PaletteExportActions } from './PaletteExportActions'
import { ThemeToggle } from './ThemeToggle'
import './ColorGenerator.css'

const INVALID_COLOR_MESSAGE =
  'Enter a valid HEX (#3366ff) or RGB (51, 102, 255) value.'

/** Default generation mode selected before the user picks one explicitly. */
const DEFAULT_MODE: GenerationMode = GENERATION_MODES[0]

/** Number of optional additional brand-color Hex fields the intake form offers (grain-1). */
const ADDITIONAL_COLOR_COUNT = 4

/** Placeholder shared by the optional additional Hex fields (grain-1). */
const ADDITIONAL_COLOR_PLACEHOLDER = '#3366ff or 51, 102, 255 (optional)'

/** No-op fallback so ColorGenerator stays mountable without a theme wired up (e.g. in tests). */
const NOOP_TOGGLE_THEME = () => {}

export interface ColorGeneratorProps {
  /**
   * Currently resolved theme, owned by App's `useTheme()`. Optional (defaults
   * to 'light') so existing call sites/tests that don't care about theming
   * can keep mounting `<ColorGenerator />` bare.
   */
  theme?: Theme
  /** Called when the user activates the color panel's theme toggle. */
  onToggleTheme?: () => void
}

/**
 * Feature-level container for spec A's color generator.
 *
 * grain-1 (intake form + generate gate): alongside the brand main color
 * field, the intake form also offers up to 4 optional additional Hex color
 * fields and 1 mood-keyword field (see `ADDITIONAL_COLOR_COUNT`). Each
 * additional Hex field is independently validated via `parseColorInput`
 * (reused from src/lib/palette.ts) when non-empty; an empty field is valid
 * (all 4 are optional). The mood-keyword field takes free text with no
 * format validation.
 *
 * The 4 extra colors and the keyword are captured in local state only -
 * they are not read by `generatePalette` (out of scope for this grain; see
 * design-spec/spec/grain-1-intake-form-generate-gate.md).
 *
 * grain-1 also supersedes the previous "auto-render on mount / on every
 * keystroke" behavior (flagged as an assumption - see the design spec
 * draft): the palette/result section now only renders after the user clicks
 * "Generate" while the brand main color is valid (`hasGenerated`). Editing
 * any field before that first successful Generate click never reveals the
 * result section. The brand input still defaults to `#E84C40` for
 * convenience, but nothing is generated from it until Generate is clicked.
 *
 * A single HEX/RGB brand input feeds src/lib/palette.ts's generatePalette()
 * and the 5-color palette re-renders on every keystroke *after* Generate has
 * been clicked once (M-1). Invalid input shows a validation message instead
 * of a stale/partial palette.
 *
 * Each palette slot can be locked/unlocked (brand slot starts locked via
 * createInitialLocks()). Regenerate re-derives only the unlocked slots via
 * regeneratePalette(), leaving locked slots untouched (M-2).
 *
 * A slot's color can also be edited directly via PaletteSwatch's native
 * color picker. Editing a slot applies updateSlotColor() and auto-locks
 * that slot (see context/decisions/) so a manual edit is never silently
 * overwritten by the next Regenerate click.
 *
 * Right below the palette, a PaletteExportActions renders whenever `palette`
 * exists: a "Copy CSS Variables" button that copies grain-1's
 * paletteToCssVariablesText() output to the clipboard (spec C M-1), with a
 * transient success/failure message. (grain-1, 2026-08-26: the former
 * "Copy HEX" button was removed from that toolbar - see
 * PaletteExportActions.tsx's class doc comment.)
 *
 * grain-3 (Harmony mode selector removal - assumption — needs confirmation):
 * the left panel's ModeSelector (5 standard color-wheel harmony mode buttons -
 * Complementary/Analogous/Triadic/Split Complementary/Monochromatic, see
 * GenerationMode) has been removed entirely per the card's "Harmony
 * 선택기 버튼들을 완전히 제거" instruction, in favor of the new
 * PaletteDescription panel below. Generation now always uses `mode`, fixed at
 * `DEFAULT_MODE` (Complementary) - there is no remaining UI affordance to
 * change it. This is a genuine capability loss versus the prior M-3 behavior
 * (5 selectable harmony modes), not just a markup relocation, so it is
 * explicitly flagged as an assumption needing human confirmation rather than
 * silently dropped.
 *
 * getMoodTags(averageHsl(palette)) still derives the current palette's 1-2
 * deterministic mood adjectives from a fixed lookup table - no AI judgment
 * (M-4) - and `moodTags` is still threaded to PaletteExportActions for its MD
 * export (spec C). It recomputes on every palette change (regenerate, mode
 * switch, lock, or manual color edit) since all of those replace `palette`.
 *
 * grain-1 (2026-08-26, MoodTag chip removal - assumption — needs
 * confirmation): the right-panel MoodTag chip list that used to render these
 * adjectives as pill chips has been removed entirely per the card's "칩 형태
 * 태그 제거" instruction; `MoodTag.tsx`/`.css` are deleted (no remaining
 * caller). `moodTags` is no longer dropped once computed - it is instead
 * merged into `paletteKeywords` below (case-insensitively deduped against
 * `vibeKeywords`) and shown as plain text in the left PaletteDescription
 * panel's keyword list, so the same words survive, just relocated and no
 * longer rendered as standalone chips.
 *
 * An AestheticMatch is always computed alongside MoodTag via
 * matchAesthetic(averageHsl(palette)) - the closest of 10 predefined
 * aesthetic archetypes by HSL distance, or null when even the closest one is
 * too far (M-5). AestheticMatch itself renders nothing when the match is
 * null, so no aesthetic name is ever forced onto the screen without a close
 * enough candidate.
 *
 * grain-2 (vibe keyword line): a VibeKeywords also renders alongside
 * MoodTag/AestheticMatch, fed by getVibeKeywords(averageHsl(palette)) - a
 * richer set of 5+ unique, plain-English adjectives (vs. MoodTag's compact
 * 1-2 word pill) rendered as a single "keyword: a, b, c, ..." line for users
 * with no color-theory background. It recomputes on every palette change the
 * same way moodTags/aestheticMatch do, since all three derive from the same
 * `palette` memo dependency.
 *
 * Below AestheticMatch, a ColorStudy section renders whenever `palette`
 * exists: a read-only SVG dial (ColorWheel) mapping each of the 5 palette
 * colors' hue onto a 360° circle (M-6), so the geometric harmony the current
 * GenerationMode encodes (complementary/triadic/etc.) is visible at a glance.
 *
 * grain-1 (Color Study section shell): ColorWheel itself no longer renders
 * inline with Palette/MoodTag/AestheticMatch - it is wrapped by ColorStudy,
 * an independent section with its own "Color Study" heading, visually
 * separated (top divider) from the group above it. Composition-only change;
 * ColorWheel's own rendering/geometry is untouched (see ColorStudy.tsx).
 *
 * grain-2 (generated result view): once `showResult` is true, the intake
 * form (brand field, 4 additional Hex fields, mood-keyword field, Generate
 * button) is unmounted entirely from `panel-generator`. This **supersedes**
 * grain-1's "brand input stays visible/editable and the palette keeps
 * live-updating from it after Generate" behavior: since the brand field is
 * gone, the only ways to change the palette after Generate are Regenerate,
 * lock/unlock, and per-swatch color-picker edits (see context/decisions/ for
 * which pre-existing tests this superseded and why). Regenerate moves into
 * `panel-preview`, rendered directly above the color chips, and the whole
 * preview panel is center-aligned via the `color-generator__preview--result`
 * modifier class.
 *
 * grain-3 (Palette Description panel): once `showResult` is true,
 * `panel-generator` now renders a PaletteDescription instead of the removed
 * ModeSelector - a large-typography, generous-whitespace panel (Apple
 * landing page-style, per the card's visual brief) showing the current
 * palette's deterministic name/description/keywords, all derived from
 * grain-2's src/lib/palette.ts additions
 * (getPaletteName/getPaletteDescription) plus the same getVibeKeywords()
 * output VibeKeywords already renders on the right. Like
 * AestheticMatch/VibeKeywords, this recomputes on every palette change since
 * `paletteName`/`paletteDescriptionLines` are memoized off the same
 * `palette` dependency.
 *
 * grain-4 (2026-08-26, export actions relocation + duplicate keyword line
 * removal): `PaletteExportActions` (the CSS Variables/PNG/JSON/MD export
 * toolbar) now renders directly below `PaletteDescription` inside
 * `panel-generator`, instead of below the palette chips inside
 * `panel-preview`. Same props, same `palette`/`mode`/`moodTags`/
 * `aestheticMatch` values - composition-only move, no change to what the
 * toolbar itself does (see PaletteExportActions.tsx). The right panel's
 * standalone `VibeKeywords` "keyword: a, b, c" line - which duplicated the
 * same words `PaletteDescription`'s keyword list already renders on the left
 * - is removed entirely; `vibeKeywords` is still computed and still feeds
 * `paletteKeywords` below, it just no longer has a second, separate renderer.
 *
 * grain-1 (2026-08-26, keyword relocation): PaletteDescription's `keywords`
 * prop is now `paletteKeywords` rather than `vibeKeywords` reused as-is -
 * `vibeKeywords` followed by whichever `moodTags` words are not already
 * present in it (case-insensitive comparison, since `getMoodTags` capitalizes
 * its words - e.g. "Warm" - while `getVibeKeywords` does not). This is the
 * one new "how do these two word lists combine" decision this grain makes
 * (recorded in the design spec); every other rendered word still comes
 * straight from the existing getMoodTags()/getVibeKeywords() outputs,
 * unchanged.
 *
 * grain-3 (custom Color Study base color): clicking a Palette chip (see
 * PaletteSwatch's `onSelectBase`) sets `baseColorIndex` to that slot. It is
 * passed down to `ColorStudy`, which uses `palette[baseColorIndex]` (falling
 * back to the brand slot) as the base color for both the harmony explorer
 * and the new Shades ramp - see ColorStudy.tsx.
 *
 * grain-1 (theme toggle placement): a ThemeToggle is now rendered inside
 * `panel-preview` itself - in a dedicated top row, right-aligned, above
 * everything else in that panel (Regenerate/palette chips when a result
 * exists). It renders unconditionally (both before and after Generate),
 * since `panel-preview`'s children below it are the only part gated by
 * `showResult`. `theme`/`onToggleTheme` are owned by App's `useTheme()` and
 * threaded down as props - ColorGenerator holds no theme state of its own.
 *
 * grain-2 (progressive intake form): the pre-generate form no longer renders
 * all 4 additional-color fields up front. Only the brand `ColorInput` and
 * the mood-keyword field are always visible; the 4 additional fields are
 * revealed incrementally, one per click of the "+" add-color button that
 * renders directly beneath the brand field (`revealedExtraColorCount`, see
 * `handleAddExtraColor`). The button itself disappears once all 4 are
 * revealed. This changes only *when* an additional field mounts - its
 * validation (`extraColorErrors`, reusing `parseColorInput`) and the
 * `extraColors` state shape (still a fixed 4-slot array) are unchanged from
 * grain-1.
 *
 * grain-3 (Recent Palettes removal - assumption — needs confirmation): the
 * left panel's RecentPalettes list (grain-2, spec C "최근 생성 팔레트 로컬
 * 저장 관리") has been removed entirely per the card's "Recent Palettes
 * 목록을 완전히 제거" instruction, and along with its markup this component no
 * longer calls recentPalettes.ts's loadRecentPalettes()/saveRecentPalette()
 * at all - there is no remaining UI to view or restore a saved entry, so
 * writing to that store on every Regenerate/manual edit would be a
 * write-only side effect nothing in this app can ever read back. This is a
 * genuine feature removal (not just hiding the list's markup), so - like the
 * harmony mode selector above - it is explicitly flagged as an assumption
 * needing human confirmation. src/lib/recentPalettes.ts itself is untouched
 * (out of this grain's boundary) and keeps its own unit test coverage.
 */
export function ColorGenerator({ theme = 'light', onToggleTheme = NOOP_TOGGLE_THEME }: ColorGeneratorProps) {
  const [inputValue, setInputValue] = useState('#E84C40')
  const [extraColors, setExtraColors] = useState<string[]>(() =>
    Array.from({ length: ADDITIONAL_COLOR_COUNT }, () => ''),
  )
  const [moodKeyword, setMoodKeyword] = useState('')
  // grain-2: how many of the 4 additional-color fields are currently revealed
  // (progressive disclosure - see the class doc comment above).
  const [revealedExtraColorCount, setRevealedExtraColorCount] = useState(0)
  const [locks, setLocks] = useState<Locks>(() => createInitialLocks())
  // grain-3: no remaining UI lets the user change the generation mode (the
  // ModeSelector that used to drive this is removed - see the class doc
  // comment's "(assumption — needs confirmation)" note above), so `mode` is
  // now a fixed constant rather than state.
  const mode: GenerationMode = DEFAULT_MODE
  const [regenerated, setRegenerated] = useState<PaletteColor[] | null>(null)
  // grain-1: the palette/result section only renders once Generate has been
  // clicked with a valid brand color - see the class doc comment above.
  const [hasGenerated, setHasGenerated] = useState(false)
  // grain-3: which palette slot Color Study currently uses as its base color.
  const [baseColorIndex, setBaseColorIndex] = useState(BRAND_SLOT_INDEX)

  const trimmed = inputValue.trim()
  const basePalette = useMemo(
    () => (trimmed === '' ? null : generatePalette(trimmed, mode)),
    [trimmed, mode],
  )
  const isInvalid = trimmed !== '' && basePalette === null
  const palette = regenerated ?? basePalette
  const showResult = hasGenerated && palette !== null
  const moodTags = useMemo(() => (palette ? getMoodTags(averageHsl(palette)) : []), [palette])
  const aestheticMatch = useMemo(
    () => (palette ? matchAesthetic(averageHsl(palette)) : null),
    [palette],
  )
  const vibeKeywords = useMemo(
    () => (palette ? getVibeKeywords(averageHsl(palette)) : []),
    [palette],
  )
  // grain-1 (2026-08-26): the left PaletteDescription panel's keyword list -
  // `vibeKeywords` followed by whichever `moodTags` words are not already
  // present in it. Comparison (and the appended words themselves) is
  // lowercased since `getMoodTags` capitalizes its words (e.g. "Warm") while
  // `getVibeKeywords` does not - without lowercasing, a word appearing in
  // both (e.g. "Warm"/"warm") would render twice instead of deduping. See
  // the class doc comment's "keyword relocation" note.
  const paletteKeywords = useMemo(() => {
    const seen = new Set(vibeKeywords.map((word) => word.toLowerCase()))
    const extraMoodWords: string[] = []
    for (const tag of moodTags) {
      const lower = tag.toLowerCase()
      if (seen.has(lower)) continue
      seen.add(lower)
      extraMoodWords.push(lower)
    }
    return [...vibeKeywords, ...extraMoodWords]
  }, [vibeKeywords, moodTags])
  // grain-3: Palette Description panel's name/description - derived the same
  // "null when no palette" way as moodTags/aestheticMatch/vibeKeywords above,
  // via grain-2's getPaletteName/getPaletteDescription (see the class doc
  // comment).
  const paletteName = useMemo(
    () => (palette ? getPaletteName(averageHsl(palette)) : null),
    [palette],
  )
  const paletteDescriptionLines = useMemo(
    () => (palette ? getPaletteDescription(averageHsl(palette)) : []),
    [palette],
  )
  const extraColorErrors = useMemo(
    () =>
      extraColors.map((value) =>
        value.trim() !== '' && parseColorInput(value) === null ? INVALID_COLOR_MESSAGE : null,
      ),
    [extraColors],
  )

  const handleInputChange = (value: string) => {
    setInputValue(value)
    setRegenerated(null)
  }

  const handleExtraColorChange = (index: number, value: string) => {
    setExtraColors((prev) => prev.map((current, slot) => (slot === index ? value : current)))
  }

  const handleAddExtraColor = () => {
    setRevealedExtraColorCount((prev) => Math.min(prev + 1, ADDITIONAL_COLOR_COUNT))
  }

  const handleGenerate = () => {
    if (!basePalette) return // invalid/empty brand color: keep the result section hidden (M-4)
    setHasGenerated(true)
  }

  const handleToggleLock = (index: number) => {
    setLocks((prev) => prev.map((locked, slot) => (slot === index ? !locked : locked)))
  }

  const handleRegenerate = () => {
    if (!palette) return
    const next = regeneratePalette(palette, trimmed, locks, undefined, mode)
    if (!next) return
    setRegenerated(next)
  }

  const handleSlotColorChange = (index: number, hex: string) => {
    if (!palette) return
    const next = updateSlotColor(palette, index, hex)
    if (next === palette) return // invalid hex from updateSlotColor's contract; no-op
    const nextLocks = locks.map((locked, slot) => (slot === index ? true : locked))
    setRegenerated(next)
    setLocks(nextLocks)
  }

  const previewClassName = showResult
    ? 'panel-preview color-generator__preview color-generator__preview--result'
    : 'panel-preview color-generator__preview'

  return (
    <>
      <section className="panel-generator color-generator__controls">
        {showResult && palette && paletteName ? (
          <>
            <PaletteDescription
              name={paletteName}
              description={paletteDescriptionLines}
              keywords={paletteKeywords}
            />
            <PaletteExportActions
              palette={palette}
              mode={mode}
              moodTags={moodTags}
              aestheticMatch={aestheticMatch}
            />
          </>
        ) : (
          <>
            <ColorInput
              id="brand-color-input"
              label="Brand main color"
              placeholder="#3366ff or 51, 102, 255"
              value={inputValue}
              onChange={handleInputChange}
              error={isInvalid ? INVALID_COLOR_MESSAGE : null}
            />
            {revealedExtraColorCount > 0 && (
              <div className="color-generator__extra-colors">
                {extraColors.slice(0, revealedExtraColorCount).map((value, index) => (
                  <ColorInput
                    key={index}
                    id={`additional-color-input-${index + 1}`}
                    label={`Additional color ${index + 1}`}
                    placeholder={ADDITIONAL_COLOR_PLACEHOLDER}
                    value={value}
                    onChange={(next) => handleExtraColorChange(index, next)}
                    error={extraColorErrors[index]}
                  />
                ))}
              </div>
            )}
            {revealedExtraColorCount < ADDITIONAL_COLOR_COUNT && (
              <button
                type="button"
                className="color-generator__add-color"
                aria-label="Add another color"
                onClick={handleAddExtraColor}
              >
                +
              </button>
            )}
            <ColorInput
              id="mood-keyword-input"
              label="Mood keyword"
              placeholder="e.g. calm, bold, playful"
              value={moodKeyword}
              onChange={setMoodKeyword}
            />
            <button type="button" className="color-generator__generate" onClick={handleGenerate}>
              Generate
            </button>
          </>
        )}
      </section>
      <section className={previewClassName}>
        <div className="color-generator__theme-toggle-row">
          <ThemeToggle theme={theme} onToggle={onToggleTheme} />
        </div>
        {showResult && palette && (
          <>
            <button
              type="button"
              className="color-generator__regenerate"
              onClick={handleRegenerate}
            >
              Regenerate
            </button>
            <Palette
              colors={palette}
              locks={locks}
              onToggleLock={handleToggleLock}
              onColorChange={handleSlotColorChange}
              onSelectBase={setBaseColorIndex}
            />
            <AestheticMatch match={aestheticMatch} />
            <ColorStudy colors={palette} baseColorIndex={baseColorIndex} />
          </>
        )}
      </section>
    </>
  )
}
