import { useMemo, useState } from 'react'
import {
  GENERATION_MODES,
  averageHsl,
  createInitialLocks,
  generatePalette,
  getMoodTags,
  matchAesthetic,
  parseColorInput,
  regeneratePalette,
  updateSlotColor,
  type GenerationMode,
  type Locks,
  type PaletteColor,
} from '../lib/palette'
import { AestheticMatch } from './AestheticMatch'
import { ColorInput } from './ColorInput'
import { ColorWheel } from './ColorWheel'
import { ModeSelector } from './ModeSelector'
import { MoodTag } from './MoodTag'
import { Palette } from './Palette'
import './ColorGenerator.css'

const INVALID_COLOR_MESSAGE =
  'Enter a valid HEX (#3366ff) or RGB (51, 102, 255) value.'

/** Default generation mode selected before the user picks one explicitly. */
const DEFAULT_MODE: GenerationMode = GENERATION_MODES[0]

/** Number of optional additional brand-color Hex fields the intake form offers (grain-1). */
const ADDITIONAL_COLOR_COUNT = 4

/** Placeholder shared by the optional additional Hex fields (grain-1). */
const ADDITIONAL_COLOR_PLACEHOLDER = '#3366ff or 51, 102, 255 (optional)'

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
 * A ModeSelector lets the user pick one of 5 standard color-wheel harmony
 * modes (Complementary/Analogous/Triadic/Split Complementary/Monochromatic,
 * see GenerationMode).
 * Selecting a mode immediately recomputes the palette for that mode while
 * keeping locked slots unchanged (M-3; see context/decisions/ for why this
 * reuses generatePalette() instead of the jittered regenerate path).
 *
 * Next to the palette, a MoodTag always shows the 1-2 deterministic mood
 * adjectives that getMoodTags(averageHsl(palette)) derives from the current
 * palette's averaged H/S/L via a fixed lookup table - no AI judgment (M-4).
 * It recomputes on every palette change (regenerate, mode switch, lock, or
 * manual color edit) since all of those replace `palette`.
 *
 * An AestheticMatch is always computed alongside MoodTag via
 * matchAesthetic(averageHsl(palette)) - the closest of 10 predefined
 * aesthetic archetypes by HSL distance, or null when even the closest one is
 * too far (M-5). AestheticMatch itself renders nothing when the match is
 * null, so no aesthetic name is ever forced onto the screen without a close
 * enough candidate.
 *
 * Below AestheticMatch, a ColorWheel renders whenever `palette` exists: a
 * read-only SVG dial mapping each of the 5 palette colors' hue onto a 360°
 * circle (M-6), so the geometric harmony the current GenerationMode encodes
 * (complementary/triadic/etc.) is visible at a glance.
 *
 * grain-2 (generated result view): once `showResult` is true, the intake
 * form (brand field, 4 additional Hex fields, mood-keyword field, Generate
 * button) is unmounted entirely from `panel-generator` - only ModeSelector
 * remains there (its placement is unchanged, out of scope for this grain).
 * This **supersedes** grain-1's "brand input stays visible/editable and the
 * palette keeps live-updating from it after Generate" behavior: since the
 * brand field is gone, the only ways to change the palette after Generate
 * are ModeSelector, Regenerate, lock/unlock, and per-swatch color-picker
 * edits (see context/decisions/ for which pre-existing tests this
 * superseded and why). Regenerate moves into `panel-preview`, rendered
 * directly above the color chips, and the whole preview panel is
 * center-aligned via the `color-generator__preview--result` modifier class.
 */
export function ColorGenerator() {
  const [inputValue, setInputValue] = useState('#E84C40')
  const [extraColors, setExtraColors] = useState<string[]>(() =>
    Array.from({ length: ADDITIONAL_COLOR_COUNT }, () => ''),
  )
  const [moodKeyword, setMoodKeyword] = useState('')
  const [locks, setLocks] = useState<Locks>(() => createInitialLocks())
  const [mode, setMode] = useState<GenerationMode>(DEFAULT_MODE)
  const [regenerated, setRegenerated] = useState<PaletteColor[] | null>(null)
  // grain-1: the palette/result section only renders once Generate has been
  // clicked with a valid brand color - see the class doc comment above.
  const [hasGenerated, setHasGenerated] = useState(false)

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

  const handleGenerate = () => {
    if (!basePalette) return // invalid/empty brand color: keep the result section hidden (M-4)
    setHasGenerated(true)
  }

  const handleToggleLock = (index: number) => {
    setLocks((prev) => prev.map((locked, slot) => (slot === index ? !locked : locked)))
  }

  const handleModeChange = (nextMode: GenerationMode) => {
    setMode(nextMode)
    if (!palette) return
    const fresh = generatePalette(trimmed, nextMode)
    if (!fresh) return
    // Keep locked slots as-is; only unlocked slots adopt the new mode's colors.
    setRegenerated(fresh.map((color, index) => (locks[index] && palette[index] ? palette[index] : color)))
  }

  const handleRegenerate = () => {
    if (!palette) return
    const next = regeneratePalette(palette, trimmed, locks, undefined, mode)
    if (next) setRegenerated(next)
  }

  const handleSlotColorChange = (index: number, hex: string) => {
    if (!palette) return
    const next = updateSlotColor(palette, index, hex)
    if (next === palette) return // invalid hex from updateSlotColor's contract; no-op
    setRegenerated(next)
    setLocks((prev) => prev.map((locked, slot) => (slot === index ? true : locked)))
  }

  const previewClassName = showResult
    ? 'panel-preview color-generator__preview color-generator__preview--result'
    : 'panel-preview color-generator__preview'

  return (
    <>
      <section className="panel-generator color-generator__controls">
        {showResult ? (
          <ModeSelector mode={mode} onChange={handleModeChange} />
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
            <div className="color-generator__extra-colors">
              {extraColors.map((value, index) => (
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
            />
            <MoodTag tags={moodTags} />
            <AestheticMatch match={aestheticMatch} />
            <ColorWheel colors={palette} />
          </>
        )}
      </section>
    </>
  )
}
