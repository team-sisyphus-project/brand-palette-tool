import '@testing-library/jest-dom/vitest'
import { render, screen, within, fireEvent } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { GENERATION_MODES, type GenerationMode } from '../lib/palette'
import { ModeSelector } from './ModeSelector'

/**
 * grain-2 (verify M-3): dedicated unit coverage for `ModeSelector` itself,
 * isolated from `ColorGenerator`'s larger integration tests. Confirms the
 * selector always exposes exactly the 5 spec A modes, reflects whichever one
 * is currently selected via `aria-pressed`, and reports the exact clicked
 * mode back through `onChange` - the contract `ColorGenerator.handleSelectMode`
 * (M-2/M-3 wiring, covered in ColorGenerator.test.tsx) relies on.
 */
const MODE_LABELS: Record<GenerationMode, string> = {
  complementary: 'Complementary',
  analogous: 'Analogous',
  triadic: 'Triadic',
  splitComplementary: 'Split Complementary',
  monochromatic: 'Monochromatic',
}

function getGroup(): HTMLElement {
  return screen.getByRole('group', { name: 'Select generation mode' })
}

describe('ModeSelector', () => {
  it('renders exactly the 5 GENERATION_MODES, in GENERATION_MODES order, with their display labels', () => {
    render(<ModeSelector mode="complementary" onChange={() => {}} />)

    const buttons = within(getGroup()).getAllByRole('button')
    expect(buttons).toHaveLength(GENERATION_MODES.length)
    expect(buttons.map((button) => button.textContent)).toEqual(
      GENERATION_MODES.map((mode) => MODE_LABELS[mode]),
    )
  })

  it('marks only the mode matching the `mode` prop as pressed', () => {
    render(<ModeSelector mode="triadic" onChange={() => {}} />)

    for (const mode of GENERATION_MODES) {
      const button = within(getGroup()).getByRole('button', { name: MODE_LABELS[mode] })
      expect(button).toHaveAttribute('aria-pressed', String(mode === 'triadic'))
    }
  })

  it('updates which button is pressed when the `mode` prop changes', () => {
    const { rerender } = render(<ModeSelector mode="complementary" onChange={() => {}} />)
    expect(within(getGroup()).getByRole('button', { name: 'Complementary' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )

    rerender(<ModeSelector mode="monochromatic" onChange={() => {}} />)
    expect(within(getGroup()).getByRole('button', { name: 'Complementary' })).toHaveAttribute(
      'aria-pressed',
      'false',
    )
    expect(within(getGroup()).getByRole('button', { name: 'Monochromatic' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
  })

  it('calls onChange with exactly the clicked mode, once per click, for every mode', () => {
    const onChange = vi.fn()
    render(<ModeSelector mode="complementary" onChange={onChange} />)

    for (const mode of GENERATION_MODES) {
      fireEvent.click(within(getGroup()).getByRole('button', { name: MODE_LABELS[mode] }))
    }

    expect(onChange).toHaveBeenCalledTimes(GENERATION_MODES.length)
    GENERATION_MODES.forEach((mode, index) => {
      expect(onChange).toHaveBeenNthCalledWith(index + 1, mode)
    })
  })

  it('clicking the already-selected mode still reports it via onChange (no dedupe/guard)', () => {
    const onChange = vi.fn()
    render(<ModeSelector mode="analogous" onChange={onChange} />)

    fireEvent.click(within(getGroup()).getByRole('button', { name: 'Analogous' }))

    expect(onChange).toHaveBeenCalledTimes(1)
    expect(onChange).toHaveBeenCalledWith('analogous')
  })
})
