import { useMemo, useState } from 'react'
import {
  createInitialLocks,
  generatePalette,
  regeneratePalette,
  type Locks,
  type PaletteColor,
} from '../lib/palette'
import { ColorInput } from './ColorInput'
import { Palette } from './Palette'
import './ColorGenerator.css'

const INVALID_COLOR_MESSAGE =
  '유효한 HEX(#3366ff) 또는 RGB(51, 102, 255) 값을 입력하세요.'

/**
 * Feature-level container for spec A's color generator: a single HEX/RGB
 * input feeds src/lib/palette.ts's generatePalette() and the 5-color
 * palette re-renders immediately on every keystroke (M-1). Invalid input
 * shows a validation message instead of a stale/partial palette.
 *
 * Each palette slot can be locked/unlocked (brand slot starts locked via
 * createInitialLocks()). Regenerate re-derives only the unlocked slots via
 * regeneratePalette(), leaving locked slots untouched (M-2).
 */
export function ColorGenerator() {
  const [inputValue, setInputValue] = useState('')
  const [locks, setLocks] = useState<Locks>(() => createInitialLocks())
  const [regenerated, setRegenerated] = useState<PaletteColor[] | null>(null)

  const trimmed = inputValue.trim()
  const basePalette = useMemo(
    () => (trimmed === '' ? null : generatePalette(trimmed)),
    [trimmed],
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

  const handleRegenerate = () => {
    if (!palette) return
    const next = regeneratePalette(palette, trimmed, locks)
    if (next) setRegenerated(next)
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
          <Palette colors={palette} locks={locks} onToggleLock={handleToggleLock} />
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
