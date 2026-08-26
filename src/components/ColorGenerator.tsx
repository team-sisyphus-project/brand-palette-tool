import { useMemo, useState } from 'react'
import {
  GENERATION_MODES,
  averageHsl,
  createInitialLocks,
  generatePalette,
  getMoodTags,
  matchAesthetic,
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
import { PaletteExportActions } from './PaletteExportActions'
import './ColorGenerator.css'

const INVALID_COLOR_MESSAGE =
  'Enter a valid HEX (#3366ff) or RGB (51, 102, 255) value.'

/** Default generation mode selected before the user picks one explicitly. */
const DEFAULT_MODE: GenerationMode = GENERATION_MODES[0]

/**
 * Feature-level container for spec A's color generator: a single HEX/RGB
 * input feeds src/lib/palette.ts's generatePalette() and the 5-color
 * palette re-renders immediately on every keystroke (M-1). Invalid input
 * shows a validation message instead of a stale/partial palette.
 *
 * The input defaults to the brand red `#E84C40` (see context/decisions/) so
 * a 5-color palette is already on screen at first mount, with zero user
 * interaction required.
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
 * exists: "Copy HEX" / "Copy CSS Variables" buttons that copy grain-1's
 * paletteToHexList()/paletteToCssVariablesText() output to the clipboard
 * (spec C M-1), with a transient success/failure message.
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
 */
export function ColorGenerator() {
  const [inputValue, setInputValue] = useState('#E84C40')
  const [locks, setLocks] = useState<Locks>(() => createInitialLocks())
  const [mode, setMode] = useState<GenerationMode>(DEFAULT_MODE)
  const [regenerated, setRegenerated] = useState<PaletteColor[] | null>(null)

  const trimmed = inputValue.trim()
  const basePalette = useMemo(
    () => (trimmed === '' ? null : generatePalette(trimmed, mode)),
    [trimmed, mode],
  )
  const isInvalid = trimmed !== '' && basePalette === null
  const palette = regenerated ?? basePalette
  const moodTags = useMemo(() => (palette ? getMoodTags(averageHsl(palette)) : []), [palette])
  const aestheticMatch = useMemo(
    () => (palette ? matchAesthetic(averageHsl(palette)) : null),
    [palette],
  )

  const handleInputChange = (value: string) => {
    setInputValue(value)
    setRegenerated(null)
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

  return (
    <>
      <section className="panel-generator color-generator__controls">
        <ColorInput
          value={inputValue}
          onChange={handleInputChange}
          error={isInvalid ? INVALID_COLOR_MESSAGE : null}
        />
        {palette && (
          <>
            <ModeSelector mode={mode} onChange={handleModeChange} />
            <button
              type="button"
              className="color-generator__regenerate"
              onClick={handleRegenerate}
            >
              Regenerate
            </button>
          </>
        )}
      </section>
      <section className="panel-preview color-generator__preview">
        {palette && (
          <>
            <Palette
              colors={palette}
              locks={locks}
              onToggleLock={handleToggleLock}
              onColorChange={handleSlotColorChange}
            />
            <PaletteExportActions
              palette={palette}
              mode={mode}
              moodTags={moodTags}
              aestheticMatch={aestheticMatch}
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
