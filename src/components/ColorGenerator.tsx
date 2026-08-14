import { useMemo, useState } from 'react'
import { generatePalette } from '../lib/palette'
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
 */
export function ColorGenerator() {
  const [inputValue, setInputValue] = useState('')

  const trimmed = inputValue.trim()
  const palette = useMemo(
    () => (trimmed === '' ? null : generatePalette(trimmed)),
    [trimmed],
  )
  const isInvalid = trimmed !== '' && palette === null

  return (
    <section className="color-generator">
      <ColorInput
        value={inputValue}
        onChange={setInputValue}
        error={isInvalid ? INVALID_COLOR_MESSAGE : null}
      />
      {palette && <Palette colors={palette} />}
    </section>
  )
}
