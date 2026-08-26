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
import { loadRecentPalettes, saveRecentPalette, type RecentPaletteEntry } from '../lib/recentPalettes'
import { AestheticMatch } from './AestheticMatch'
import { ColorInput } from './ColorInput'
import { ColorWheel } from './ColorWheel'
import { ModeSelector } from './ModeSelector'
import { MoodTag } from './MoodTag'
import { Palette } from './Palette'
import { PaletteExportActions } from './PaletteExportActions'
import { RecentPalettes } from './RecentPalettes'
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
 *
 * Every Regenerate click, mode change, and manual per-slot color edit also
 * calls recentPalettes.ts's saveRecentPalette() with the resulting colors/
 * mode/locks (spec C "최근 생성 팔레트 로컬 저장 관리", M-3) -
 * (assumption — needs confirmation) on *those* actions specifically, not on
 * every input keystroke, since an in-progress edit that hasn't been acted on
 * yet isn't a "saved" palette worth keeping in the recent list.
 *
 * A RecentPalettes list (grain-2) renders alongside the controls, sourced
 * from loadRecentPalettes() on mount and refreshed from every
 * saveRecentPalette() call's return value thereafter, so it always reflects
 * what is actually persisted. Selecting an entry (handleSelectRecent) writes
 * that entry's inputValue/mode/locks verbatim into state and its saved
 * `colors` straight into `regenerated` - the same short-circuit Regenerate/
 * mode-change/manual-edit use to bypass `basePalette` - so the exact
 * original palette reappears on screen instead of being recomputed from the
 * restored brand input (spec C M-3's "다시 불러올 수 있음").
 */
export function ColorGenerator() {
  const [inputValue, setInputValue] = useState('#E84C40')
  const [locks, setLocks] = useState<Locks>(() => createInitialLocks())
  const [mode, setMode] = useState<GenerationMode>(DEFAULT_MODE)
  const [regenerated, setRegenerated] = useState<PaletteColor[] | null>(null)
  const [recentPalettes, setRecentPalettes] = useState<RecentPaletteEntry[]>(() => loadRecentPalettes())

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
    const merged = fresh.map((color, index) => (locks[index] && palette[index] ? palette[index] : color))
    setRegenerated(merged)
    setRecentPalettes(saveRecentPalette({ brandInput: trimmed, mode: nextMode, colors: merged, locks }))
  }

  const handleRegenerate = () => {
    if (!palette) return
    const next = regeneratePalette(palette, trimmed, locks, undefined, mode)
    if (!next) return
    setRegenerated(next)
    setRecentPalettes(saveRecentPalette({ brandInput: trimmed, mode, colors: next, locks }))
  }

  const handleSlotColorChange = (index: number, hex: string) => {
    if (!palette) return
    const next = updateSlotColor(palette, index, hex)
    if (next === palette) return // invalid hex from updateSlotColor's contract; no-op
    const nextLocks = locks.map((locked, slot) => (slot === index ? true : locked))
    setRegenerated(next)
    setLocks(nextLocks)
    setRecentPalettes(saveRecentPalette({ brandInput: trimmed, mode, colors: next, locks: nextLocks }))
  }

  /**
   * Restores a saved recent-palette entry exactly as it was captured:
   * brand input text, generation mode, per-slot locks, and the saved colors
   * themselves - written into `regenerated` so it bypasses `basePalette`'s
   * regeneration entirely rather than re-deriving from the restored input.
   */
  const handleSelectRecent = (entry: RecentPaletteEntry) => {
    setInputValue(entry.brandInput)
    setMode(entry.mode)
    setLocks(entry.locks)
    setRegenerated(entry.colors)
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
        <RecentPalettes entries={recentPalettes} onSelect={handleSelectRecent} />
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
