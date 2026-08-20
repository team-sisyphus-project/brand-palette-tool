import { useMemo, useState } from 'react'
import {
  GENERATION_MODES,
  createInitialLocks,
  generatePalette,
  regeneratePalette,
  updateSlotColor,
  type GenerationMode,
  type Locks,
  type PaletteColor,
} from '../lib/palette'
import { ColorInput } from './ColorInput'
import { ModeSelector } from './ModeSelector'
import { Palette } from './Palette'
import './ColorGenerator.css'

const INVALID_COLOR_MESSAGE =
  '유효한 HEX(#3366ff) 또는 RGB(51, 102, 255) 값을 입력하세요.'

/** Default generation mode selected before the user picks one explicitly. */
const DEFAULT_MODE: GenerationMode = GENERATION_MODES[0]

/**
 * Feature-level container for spec A's color generator: a single HEX/RGB
 * input feeds src/lib/palette.ts's generatePalette() and the 5-color
 * palette re-renders immediately on every keystroke (M-1). Invalid input
 * shows a validation message instead of a stale/partial palette.
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
 * modes (보색/유사색/트라이애딕/스플릿보색/모노크로매틱, see GenerationMode).
 * Selecting a mode immediately recomputes the palette for that mode while
 * keeping locked slots unchanged (M-3; see context/decisions/ for why this
 * reuses generatePalette() instead of the jittered regenerate path).
 */
export function ColorGenerator() {
  const [inputValue, setInputValue] = useState('')
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
    <section className="color-generator">
      <ColorInput
        value={inputValue}
        onChange={handleInputChange}
        error={isInvalid ? INVALID_COLOR_MESSAGE : null}
      />
      {palette && (
        <>
          <ModeSelector mode={mode} onChange={handleModeChange} />
          <Palette
            colors={palette}
            locks={locks}
            onToggleLock={handleToggleLock}
            onColorChange={handleSlotColorChange}
          />
          <button
            type="button"
            className="color-generator__regenerate"
            onClick={handleRegenerate}
          >
            재생성
          </button>
        </>
      )}
    </section>
  )
}
