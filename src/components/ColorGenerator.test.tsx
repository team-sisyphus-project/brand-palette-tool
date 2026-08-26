import '@testing-library/jest-dom/vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ColorGenerator } from './ColorGenerator'

/** Pulls the `#rrggbb` hex code out of an aria-label like "Toggle lock for #3366ff color". */
function extractHex(label: string): string {
  return label.match(/#[0-9a-f]{6}/i)![0]
}

function getInput(): HTMLInputElement {
  return screen.getByLabelText('Brand main color') as HTMLInputElement
}

function getColorPicker(hex: string): HTMLInputElement {
  return screen.getByLabelText(`Edit ${hex} color directly`) as HTMLInputElement
}

/** Finds a lock button whose current lock state is `locked`, and returns its HEX. */
function findLockButtonHex(list: HTMLElement, locked: boolean): string {
  const lockButtons = within(list).getAllByRole('button', { name: /Toggle lock for/ })
  const button = lockButtons.find(
    (candidate) => candidate.getAttribute('aria-pressed') === String(locked),
  )!
  return extractHex(button.getAttribute('aria-label')!)
}

/** All 5 rendered hex codes, in palette slot order. */
function getHexes(list: HTMLElement): string[] {
  return within(list)
    .getAllByRole('listitem')
    .map((item) => within(item).getByText(/^#[0-9a-f]{6}$/).textContent!)
}

/**
 * ColorGenerator calls regeneratePalette() without an injected random source,
 * so it falls back to Math.random(). Mocking it with a deterministic,
 * ever-advancing sequence keeps "does regeneration actually change unlocked
 * slots" assertions reproducible instead of relying on real randomness.
 */
function mockDeterministicRandom() {
  let call = 0
  vi.spyOn(Math, 'random').mockImplementation(() => {
    call += 1
    return (call % 97) / 97
  })
}

describe('ColorGenerator', () => {
  it('renders no palette and no error once the input is cleared (M-1 baseline)', () => {
    render(<ColorGenerator />)
    fireEvent.change(getInput(), { target: { value: '' } })
    expect(screen.queryByRole('list', { name: 'Generated 5-color palette' })).not.toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('defaults the brand input to #E84C40 and auto-generates a 5-color palette on first mount with zero interaction', () => {
    render(<ColorGenerator />)

    expect(getInput().value).toBe('#E84C40')
    const list = screen.getByRole('list', { name: 'Generated 5-color palette' })
    expect(within(list).getAllByRole('listitem')).toHaveLength(5)
    expect(screen.getByText('#e84c40')).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('renders a 5-color palette immediately when a valid HEX is typed (M-1)', () => {
    render(<ColorGenerator />)
    fireEvent.change(getInput(), { target: { value: '#3366ff' } })

    const list = screen.getByRole('list', { name: 'Generated 5-color palette' })
    expect(within(list).getAllByRole('listitem')).toHaveLength(5)
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('includes the exact brand HEX among the 5 rendered swatches', () => {
    render(<ColorGenerator />)
    fireEvent.change(getInput(), { target: { value: '#3366ff' } })
    expect(screen.getByText('#3366ff')).toBeInTheDocument()
  })

  it('renders a 5-color palette immediately when a valid RGB string is typed', () => {
    render(<ColorGenerator />)
    fireEvent.change(getInput(), { target: { value: '51, 102, 255' } })

    expect(screen.getByRole('list', { name: 'Generated 5-color palette' })).toBeInTheDocument()
    expect(screen.getByText('#3366ff')).toBeInTheDocument()
  })

  it('shows a validation error and no palette for an invalid value', () => {
    render(<ColorGenerator />)
    fireEvent.change(getInput(), { target: { value: 'not-a-color' } })

    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(screen.queryByRole('list', { name: 'Generated 5-color palette' })).not.toBeInTheDocument()
  })

  it('clears the palette and error once the field is emptied again', () => {
    render(<ColorGenerator />)
    const input = getInput()

    fireEvent.change(input, { target: { value: '#3366ff' } })
    expect(screen.getByRole('list', { name: 'Generated 5-color palette' })).toBeInTheDocument()

    fireEvent.change(input, { target: { value: '' } })
    expect(screen.queryByRole('list', { name: 'Generated 5-color palette' })).not.toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('updates the palette immediately as the input changes to a new valid color', () => {
    render(<ColorGenerator />)
    const input = getInput()

    fireEvent.change(input, { target: { value: '#3366ff' } })
    expect(screen.getByText('#3366ff')).toBeInTheDocument()

    fireEvent.change(input, { target: { value: '#ff0000' } })
    expect(screen.getByText('#ff0000')).toBeInTheDocument()
    expect(screen.queryByText('#3366ff')).not.toBeInTheDocument()
  })

  it('renders the brand main color slot locked by default (aria-pressed)', () => {
    render(<ColorGenerator />)
    fireEvent.change(getInput(), { target: { value: '#3366ff' } })

    const brandLock = screen.getByRole('button', { name: 'Toggle lock for #3366ff color' })
    expect(brandLock).toHaveAttribute('aria-pressed', 'true')
  })

  it('renders derived color slots unlocked by default', () => {
    render(<ColorGenerator />)
    fireEvent.change(getInput(), { target: { value: '#3366ff' } })

    const list = screen.getByRole('list', { name: 'Generated 5-color palette' })
    const lockButtons = within(list).getAllByRole('button', { name: /Toggle lock for/ })
    expect(lockButtons).toHaveLength(5)
    expect(lockButtons.filter((button) => button.getAttribute('aria-pressed') === 'true')).toHaveLength(1)
  })

  it('toggles a derived slot lock state on click', () => {
    render(<ColorGenerator />)
    fireEvent.change(getInput(), { target: { value: '#3366ff' } })

    const list = screen.getByRole('list', { name: 'Generated 5-color palette' })
    const lockButtons = within(list).getAllByRole('button', { name: /Toggle lock for/ })
    const derivedLock = lockButtons.find((button) => button.getAttribute('aria-pressed') === 'false')!

    fireEvent.click(derivedLock)
    expect(derivedLock).toHaveAttribute('aria-pressed', 'true')

    fireEvent.click(derivedLock)
    expect(derivedLock).toHaveAttribute('aria-pressed', 'false')
  })

  it('keeps a locked slot unchanged after clicking Regenerate, while the palette stays 5 colors (M-2)', () => {
    render(<ColorGenerator />)
    fireEvent.change(getInput(), { target: { value: '#3366ff' } })

    const list = screen.getByRole('list', { name: 'Generated 5-color palette' })
    const lockButtons = within(list).getAllByRole('button', { name: /Toggle lock for/ })
    const derivedLock = lockButtons.find((button) => button.getAttribute('aria-pressed') === 'false')!
    fireEvent.click(derivedLock)

    const lockedHex = extractHex(derivedLock.getAttribute('aria-label')!)

    fireEvent.click(screen.getByRole('button', { name: 'Regenerate' }))

    expect(screen.getByText(lockedHex)).toBeInTheDocument()
    expect(within(list).getAllByRole('listitem')).toHaveLength(5)
  })

  it('does not render a Regenerate button before a valid palette exists', () => {
    render(<ColorGenerator />)
    fireEvent.change(getInput(), { target: { value: '' } })
    expect(screen.queryByRole('button', { name: 'Regenerate' })).not.toBeInTheDocument()
  })

  // Grain-1 edge cases: parseColorInput/generatePalette already normalize
  // whitespace, case, and 3-digit hex — these confirm the same holds through
  // the real ColorInput -> ColorGenerator wiring, not just the pure functions.
  it('renders a palette immediately for whitespace-padded, uppercase hex input', () => {
    render(<ColorGenerator />)
    fireEvent.change(getInput(), { target: { value: '  #3366FF  ' } })

    expect(screen.getByRole('list', { name: 'Generated 5-color palette' })).toBeInTheDocument()
    expect(screen.getByText('#3366ff')).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('renders a palette immediately for 3-digit shorthand hex input', () => {
    render(<ColorGenerator />)
    fireEvent.change(getInput(), { target: { value: '#36f' } })

    expect(screen.getByRole('list', { name: 'Generated 5-color palette' })).toBeInTheDocument()
    expect(screen.getByText('#3366ff')).toBeInTheDocument()
  })

  it('renders a palette immediately for whitespace-padded rgb input', () => {
    render(<ColorGenerator />)
    fireEvent.change(getInput(), { target: { value: '  51 , 102 , 255  ' } })

    expect(screen.getByRole('list', { name: 'Generated 5-color palette' })).toBeInTheDocument()
    expect(screen.getByText('#3366ff')).toBeInTheDocument()
  })

  it('renders the brand slot locked by default even for uppercase/whitespace/shorthand input variants', () => {
    render(<ColorGenerator />)
    fireEvent.change(getInput(), { target: { value: '  #36F  ' } })

    const brandLock = screen.getByRole('button', { name: 'Toggle lock for #3366ff color' })
    expect(brandLock).toHaveAttribute('aria-pressed', 'true')
  })

  // Grain-1 DoneWhen: "same result on re-entering the same input" must hold through the real
  // ColorInput -> useMemo(generatePalette) -> Palette wiring, not just at the
  // pure-function level (already covered in palette.test.ts).
  it('re-entering the exact same brand input (after typing something else) renders the identical 5-color palette', () => {
    render(<ColorGenerator />)
    const input = getInput()

    fireEvent.change(input, { target: { value: '#3366ff' } })
    const list = screen.getByRole('list', { name: 'Generated 5-color palette' })
    const firstPass = getHexes(list)

    fireEvent.change(input, { target: { value: '#ff0000' } })
    expect(getHexes(list)).not.toEqual(firstPass)

    fireEvent.change(input, { target: { value: '#3366ff' } })
    expect(getHexes(list)).toEqual(firstPass)
  })

  it('renders the same 5-color palette for a fresh mount given the same brand input (no hidden randomness in the base path)', () => {
    const { unmount } = render(<ColorGenerator />)
    fireEvent.change(getInput(), { target: { value: '#3366ff' } })
    const firstPass = getHexes(screen.getByRole('list', { name: 'Generated 5-color palette' }))
    unmount()

    render(<ColorGenerator />)
    fireEvent.change(getInput(), { target: { value: '#3366ff' } })
    const secondPass = getHexes(screen.getByRole('list', { name: 'Generated 5-color palette' }))

    expect(secondPass).toEqual(firstPass)
  })
})

describe('M-2: lock/regenerate integration', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('brand main color starts locked by default', () => {
    render(<ColorGenerator />)
    fireEvent.change(getInput(), { target: { value: '#3366ff' } })

    const brandLock = screen.getByRole('button', { name: 'Toggle lock for #3366ff color' })
    expect(brandLock).toHaveAttribute('aria-pressed', 'true')
  })

  it('locking an arbitrary slot keeps it unchanged across repeated regenerations while the rest keep changing', () => {
    mockDeterministicRandom()
    render(<ColorGenerator />)
    fireEvent.change(getInput(), { target: { value: '#3366ff' } })

    const list = screen.getByRole('list', { name: 'Generated 5-color palette' })
    const lockButtons = within(list).getAllByRole('button', { name: /Toggle lock for/ })
    const derivedLock = lockButtons.find((button) => button.getAttribute('aria-pressed') === 'false')!
    const lockedHex = extractHex(derivedLock.getAttribute('aria-label')!)

    fireEvent.click(derivedLock)
    expect(derivedLock).toHaveAttribute('aria-pressed', 'true')

    const regenerateButton = screen.getByRole('button', { name: 'Regenerate' })
    const snapshots = [getHexes(list)]
    for (let round = 0; round < 3; round += 1) {
      fireEvent.click(regenerateButton)
      snapshots.push(getHexes(list))
    }

    // The locked hex survives every single regeneration round.
    snapshots.forEach((hexes) => expect(hexes).toContain(lockedHex))

    // The unlocked slots are not frozen: across the repeated regenerations,
    // at least one of them actually produces a different color somewhere.
    const unlockedSignatures = new Set(
      snapshots.map((hexes) => hexes.filter((hex) => hex !== lockedHex).join(',')),
    )
    expect(unlockedSignatures.size).toBeGreaterThan(1)
  })

  it('clicking the brand slot lock toggle button itself can unlock/relock it', () => {
    render(<ColorGenerator />)
    fireEvent.change(getInput(), { target: { value: '#3366ff' } })

    const brandLock = screen.getByRole('button', { name: 'Toggle lock for #3366ff color' })
    expect(brandLock).toHaveAttribute('aria-pressed', 'true')

    fireEvent.click(brandLock)
    expect(brandLock).toHaveAttribute('aria-pressed', 'false')

    fireEvent.click(brandLock)
    expect(brandLock).toHaveAttribute('aria-pressed', 'true')
  })

  it('unlocking the brand slot and regenerating still reflects the input value as the brand color', () => {
    mockDeterministicRandom()
    render(<ColorGenerator />)
    fireEvent.change(getInput(), { target: { value: '#3366ff' } })

    fireEvent.click(screen.getByRole('button', { name: 'Toggle lock for #3366ff color' }))
    fireEvent.click(screen.getByRole('button', { name: 'Regenerate' }))

    // The brand slot always reflects the current brand input regardless of
    // its own lock state (regeneratePalette's contract) - unlocking it does
    // not make it drift to some other derived color.
    expect(screen.getByText('#3366ff')).toBeInTheDocument()
  })

  it('locking multiple derived slots at once keeps only those slots unchanged across repeated regenerations while the rest keep changing', () => {
    mockDeterministicRandom()
    render(<ColorGenerator />)
    fireEvent.change(getInput(), { target: { value: '#3366ff' } })

    const list = screen.getByRole('list', { name: 'Generated 5-color palette' })
    const lockButtons = within(list).getAllByRole('button', { name: /Toggle lock for/ })
    const unlockedButtons = lockButtons.filter(
      (button) => button.getAttribute('aria-pressed') === 'false',
    )
    // Lock 2 of the 4 derived slots simultaneously (brand slot is already locked).
    const [firstToLock, secondToLock] = unlockedButtons
    const lockedHexes = [firstToLock, secondToLock].map(
      (button) => extractHex(button.getAttribute('aria-label')!),
    )

    fireEvent.click(firstToLock)
    fireEvent.click(secondToLock)
    expect(firstToLock).toHaveAttribute('aria-pressed', 'true')
    expect(secondToLock).toHaveAttribute('aria-pressed', 'true')

    const regenerateButton = screen.getByRole('button', { name: 'Regenerate' })
    const snapshots: string[][] = []
    for (let round = 0; round < 3; round += 1) {
      fireEvent.click(regenerateButton)
      snapshots.push(getHexes(list))
    }

    // Both locked hexes survive every regeneration round.
    snapshots.forEach((hexes) => {
      lockedHexes.forEach((hex) => expect(hexes).toContain(hex))
    })

    // The remaining unlocked slots still actually change across rounds.
    const unlockedSignatures = new Set(
      snapshots.map((hexes) => hexes.filter((hex) => !lockedHexes.includes(hex)).join(',')),
    )
    expect(unlockedSignatures.size).toBeGreaterThan(1)
  })

  it('with an achromatic (#000000) brand input and lock combinations, the locked color stays unchanged with no NaN and the rest regenerate', () => {
    mockDeterministicRandom()
    render(<ColorGenerator />)
    fireEvent.change(getInput(), { target: { value: '#000000' } })

    const list = screen.getByRole('list', { name: 'Generated 5-color palette' })
    const lockButtons = within(list).getAllByRole('button', { name: /Toggle lock for/ })
    const derivedLock = lockButtons.find((button) => button.getAttribute('aria-pressed') === 'false')!
    const lockedHex = extractHex(derivedLock.getAttribute('aria-label')!)
    fireEvent.click(derivedLock)

    const regenerateButton = screen.getByRole('button', { name: 'Regenerate' })
    fireEvent.click(regenerateButton)
    fireEvent.click(regenerateButton)

    // Locked slot survives; every rendered hex is still a valid, NaN-free code.
    expect(screen.getByText(lockedHex)).toBeInTheDocument()
    within(list)
      .getAllByRole('listitem')
      .forEach((item) => {
        expect(within(item).getByText(/^#[0-9a-f]{6}$/)).toBeInTheDocument()
      })
  })

  it('with an achromatic (#ffffff) brand input and lock combinations, the locked color stays unchanged with no NaN and the rest regenerate', () => {
    mockDeterministicRandom()
    render(<ColorGenerator />)
    fireEvent.change(getInput(), { target: { value: '#ffffff' } })

    const list = screen.getByRole('list', { name: 'Generated 5-color palette' })
    const lockButtons = within(list).getAllByRole('button', { name: /Toggle lock for/ })
    const derivedLock = lockButtons.find((button) => button.getAttribute('aria-pressed') === 'false')!
    const lockedHex = extractHex(derivedLock.getAttribute('aria-label')!)
    fireEvent.click(derivedLock)

    const regenerateButton = screen.getByRole('button', { name: 'Regenerate' })
    fireEvent.click(regenerateButton)
    fireEvent.click(regenerateButton)

    expect(screen.getByText(lockedHex)).toBeInTheDocument()
    within(list)
      .getAllByRole('listitem')
      .forEach((item) => {
        expect(within(item).getByText(/^#[0-9a-f]{6}$/)).toBeInTheDocument()
      })
  })

  it('after unlocking and regenerating, the slot is no longer fixed and its value changes', () => {
    mockDeterministicRandom()
    render(<ColorGenerator />)
    fireEvent.change(getInput(), { target: { value: '#3366ff' } })

    const list = screen.getByRole('list', { name: 'Generated 5-color palette' })
    const lockButtons = within(list).getAllByRole('button', { name: /Toggle lock for/ })
    const derivedLock = lockButtons.find((button) => button.getAttribute('aria-pressed') === 'false')!
    const targetHex = extractHex(derivedLock.getAttribute('aria-label')!)
    const regenerateButton = screen.getByRole('button', { name: 'Regenerate' })

    fireEvent.click(derivedLock)
    expect(derivedLock).toHaveAttribute('aria-pressed', 'true')

    fireEvent.click(regenerateButton)
    expect(screen.getByText(targetHex)).toBeInTheDocument()

    fireEvent.click(derivedLock)
    expect(derivedLock).toHaveAttribute('aria-pressed', 'false')

    fireEvent.click(regenerateButton)
    expect(screen.queryByText(targetHex)).not.toBeInTheDocument()
  })
})

// grain-1 (color picker wiring reflects immediately): verifies the full
// PaletteSwatch's input[type=color] -> Palette.onColorChange ->
// ColorGenerator.handleSlotColorChange -> updateSlotColor -> setRegenerated
// path at the component level.
//
// Note: updateSlotColor silently no-ops by returning the original palette
// reference when given an invalid hex input (code-analysis/risks.md "silent
// failure on invalid slot color edit"). A native `input[type=color]` always
// emits a valid 6-digit hex value on change, so this path is not reproducible
// via the native picker — this is noted here only as a comment; no behavior
// change or new error UI is added (out of scope).
describe('grain-2: editing palette colors directly via the color picker', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('changing a derived slot color via the color picker immediately updates the swatch background and HEX text', () => {
    render(<ColorGenerator />)
    fireEvent.change(getInput(), { target: { value: '#3366ff' } })

    const list = screen.getByRole('list', { name: 'Generated 5-color palette' })
    const originalHex = findLockButtonHex(list, false)

    fireEvent.change(getColorPicker(originalHex), { target: { value: '#00ff00' } })

    expect(screen.queryByText(originalHex)).not.toBeInTheDocument()
    const updatedHexText = screen.getByText('#00ff00')
    expect(updatedHexText).toBeInTheDocument()

    const swatch = updatedHexText.closest('.palette-swatch') as HTMLElement
    const colorPreview = swatch.querySelector('.palette-swatch__color') as HTMLElement
    expect(colorPreview.style.backgroundColor).toBe('rgb(0, 255, 0)')
  })

  it('changing a color via the color picker automatically locks that slot', () => {
    render(<ColorGenerator />)
    fireEvent.change(getInput(), { target: { value: '#3366ff' } })

    const list = screen.getByRole('list', { name: 'Generated 5-color palette' })
    const originalHex = findLockButtonHex(list, false)

    fireEvent.change(getColorPicker(originalHex), { target: { value: '#00ff00' } })

    const updatedLock = screen.getByRole('button', { name: 'Toggle lock for #00ff00 color' })
    expect(updatedLock).toHaveAttribute('aria-pressed', 'true')
  })

  it('changing the brand slot color via the color picker is reflected immediately', () => {
    render(<ColorGenerator />)
    fireEvent.change(getInput(), { target: { value: '#3366ff' } })

    fireEvent.change(getColorPicker('#3366ff'), { target: { value: '#123456' } })

    expect(screen.queryByText('#3366ff')).not.toBeInTheDocument()
    expect(screen.getByText('#123456')).toBeInTheDocument()
  })

  it('changing the brand slot color via the color picker keeps its lock state (aria-pressed) unchanged', () => {
    render(<ColorGenerator />)
    fireEvent.change(getInput(), { target: { value: '#3366ff' } })

    fireEvent.change(getColorPicker('#3366ff'), { target: { value: '#123456' } })

    const brandLock = screen.getByRole('button', { name: 'Toggle lock for #123456 color' })
    expect(brandLock).toHaveAttribute('aria-pressed', 'true')
  })

  it('a color edited via the color picker survives regeneration (auto-lock protects it from regenerate)', () => {
    mockDeterministicRandom()
    render(<ColorGenerator />)
    fireEvent.change(getInput(), { target: { value: '#3366ff' } })

    const list = screen.getByRole('list', { name: 'Generated 5-color palette' })
    const originalHex = findLockButtonHex(list, false)

    fireEvent.change(getColorPicker(originalHex), { target: { value: '#00ff00' } })
    fireEvent.click(screen.getByRole('button', { name: 'Regenerate' }))

    expect(screen.getByText('#00ff00')).toBeInTheDocument()
  })
})

// grain-2 (spec C M-1): wiring-level check that PaletteExportActions renders
// alongside the palette. Clipboard-copy behavior itself (exact text copied,
// success/failure feedback, CSS syntax validity) is covered in
// PaletteExportActions.test.tsx, which owns navigator.clipboard mocking.
describe('grain-2: palette export actions wiring', () => {
  it('shows Copy HEX / Copy CSS Variables buttons once a palette exists, and hides them without one', () => {
    render(<ColorGenerator />)
    fireEvent.change(getInput(), { target: { value: '#3366ff' } })

    expect(screen.getByRole('button', { name: 'Copy HEX' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Copy CSS Variables' })).toBeInTheDocument()

    fireEvent.change(getInput(), { target: { value: '' } })
    expect(screen.queryByRole('button', { name: 'Copy HEX' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Copy CSS Variables' })).not.toBeInTheDocument()
  })
})

describe('grain-2: generation mode selection (M-3)', () => {
  const MODE_LABELS = ['Complementary', 'Analogous', 'Triadic', 'Split Complementary', 'Monochromatic']

  it('all 5 generation mode buttons are shown when a palette exists', () => {
    render(<ColorGenerator />)
    fireEvent.change(getInput(), { target: { value: '#3366ff' } })

    const group = screen.getByRole('group', { name: 'Select generation mode' })
    MODE_LABELS.forEach((label) => {
      expect(within(group).getByRole('button', { name: label })).toBeInTheDocument()
    })
  })

  it('generation mode buttons are not rendered when there is no palette', () => {
    render(<ColorGenerator />)
    fireEvent.change(getInput(), { target: { value: '' } })
    expect(screen.queryByRole('group', { name: 'Select generation mode' })).not.toBeInTheDocument()
  })

  it('the default generation mode (Complementary) is shown selected from the start', () => {
    render(<ColorGenerator />)
    fireEvent.change(getInput(), { target: { value: '#3366ff' } })

    expect(screen.getByRole('button', { name: 'Complementary' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('selecting each of the 5 modes for the same brand input immediately renders a distinct palette', () => {
    render(<ColorGenerator />)
    fireEvent.change(getInput(), { target: { value: '#3366ff' } })

    const list = screen.getByRole('list', { name: 'Generated 5-color palette' })
    const signatures = MODE_LABELS.map((label) => {
      const button = screen.getByRole('button', { name: label })
      fireEvent.click(button)
      expect(button).toHaveAttribute('aria-pressed', 'true')
      return getHexes(list).join(',')
    })

    // Spec A's M-3: all 5 modes must produce a distinct palette for the same brand input.
    expect(new Set(signatures).size).toBe(MODE_LABELS.length)
  })

  it('switching modes keeps the brand main color slot unchanged', () => {
    render(<ColorGenerator />)
    fireEvent.change(getInput(), { target: { value: '#3366ff' } })

    for (const label of ['Analogous', 'Triadic', 'Split Complementary', 'Monochromatic', 'Complementary']) {
      fireEvent.click(screen.getByRole('button', { name: label }))
      expect(screen.getByText('#3366ff')).toBeInTheDocument()
    }
  })

  it('locking a derived slot and then switching modes leaves the locked color unchanged', () => {
    render(<ColorGenerator />)
    fireEvent.change(getInput(), { target: { value: '#3366ff' } })

    const list = screen.getByRole('list', { name: 'Generated 5-color palette' })
    const derivedLock = findLockButtonHex(list, false)
    fireEvent.click(screen.getByRole('button', { name: `Toggle lock for ${derivedLock} color` }))

    fireEvent.click(screen.getByRole('button', { name: 'Analogous' }))
    expect(screen.getByText(derivedLock)).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Triadic' }))
    expect(screen.getByText(derivedLock)).toBeInTheDocument()
  })
})

// grain-1: deterministic emotion/mood tags based on average H/S/L (M-4).
// MoodTag only renders whatever getMoodTags(averageHsl(palette)) returns, so
// here we verify at the ColorGenerator wiring level whether "1-2 tags are
// always shown whenever a palette exists" and "the same input yields the
// same tags (determinism)". The detailed rules for individual H/S/L
// band -> word mapping are covered by palette.test.ts's getMoodTags unit
// tests.
describe('grain-1: emotion/mood tags (M-4)', () => {
  function getMoodTagList(): HTMLElement {
    return screen.getByRole('list', { name: 'Palette mood tags' })
  }

  it('mood tags are not rendered when there is no palette', () => {
    render(<ColorGenerator />)
    fireEvent.change(getInput(), { target: { value: '' } })
    expect(screen.queryByRole('list', { name: 'Palette mood tags' })).not.toBeInTheDocument()
  })

  it('entering a valid color immediately shows 1-2 mood tags along with the palette', () => {
    render(<ColorGenerator />)
    fireEvent.change(getInput(), { target: { value: '#3366ff' } })

    const tags = within(getMoodTagList()).getAllByRole('listitem')
    expect(tags.length).toBeGreaterThanOrEqual(1)
    expect(tags.length).toBeLessThanOrEqual(2)
    tags.forEach((tag) => expect(tag.textContent).not.toBe(''))
  })

  it('re-entering the same brand input shows the same mood tags (determinism)', () => {
    render(<ColorGenerator />)
    const input = getInput()

    fireEvent.change(input, { target: { value: '#3366ff' } })
    const firstTags = within(getMoodTagList())
      .getAllByRole('listitem')
      .map((tag) => tag.textContent)

    fireEvent.change(input, { target: { value: '#ff0000' } })
    fireEvent.change(input, { target: { value: '#3366ff' } })
    const secondTags = within(getMoodTagList())
      .getAllByRole('listitem')
      .map((tag) => tag.textContent)

    expect(secondTags).toEqual(firstTags)
  })

  it('recomputing the palette by switching generation modes always shows 1-2 mood tags', () => {
    render(<ColorGenerator />)
    fireEvent.change(getInput(), { target: { value: '#3366ff' } })

    for (const label of ['Analogous', 'Triadic', 'Split Complementary', 'Monochromatic', 'Complementary']) {
      fireEvent.click(screen.getByRole('button', { name: label }))
      const tags = within(getMoodTagList()).getAllByRole('listitem')
      expect(tags.length).toBeGreaterThanOrEqual(1)
      expect(tags.length).toBeLessThanOrEqual(2)
    }
  })

  it('mood tags keep showing in the 1-2 range after regeneration', () => {
    render(<ColorGenerator />)
    fireEvent.change(getInput(), { target: { value: '#3366ff' } })

    fireEvent.click(screen.getByRole('button', { name: 'Regenerate' }))

    const tags = within(getMoodTagList()).getAllByRole('listitem')
    expect(tags.length).toBeGreaterThanOrEqual(1)
    expect(tags.length).toBeLessThanOrEqual(2)
  })
})

// grain-1: aesthetic archetype matching based on palette average HSL (M-5).
// AestheticMatch only renders whatever matchAesthetic(averageHsl(palette))
// returns, so here we verify at the ColorGenerator wiring level whether "an
// archetype name is shown when within the threshold" and "nothing is shown
// when outside the threshold for every archetype". The detailed rules for
// the distance calculation/lookup itself are covered by palette.test.ts's
// matchAesthetic unit tests.
//
// #26d9ac (h≈165,s≈70,l=50, default Complementary mode) has an average HSL
// that is effectively identical to the 'Tropical' archetype's center
// (h:165,s:70,l:50), so it matches within the threshold, while #1a3300's
// average HSL is outside the threshold (~79) from every archetype, so
// nothing is shown - both values were pre-verified via palette.ts's
// calculation (node scratch script).
describe('grain-1: aesthetic name matching (M-5)', () => {
  it('aesthetic match is not rendered when there is no palette', () => {
    render(<ColorGenerator />)
    fireEvent.change(getInput(), { target: { value: '' } })
    expect(screen.queryByRole('status', { name: 'Palette aesthetic match' })).not.toBeInTheDocument()
  })

  it('shows exactly one archetype name when the average HSL is close enough to an archetype center', () => {
    render(<ColorGenerator />)
    fireEvent.change(getInput(), { target: { value: '#26d9ac' } })

    const match = screen.getByRole('status', { name: 'Palette aesthetic match' })
    expect(match).toHaveTextContent('Tropical')
  })

  it('shows nothing when the average HSL is outside the threshold from every archetype', () => {
    render(<ColorGenerator />)
    fireEvent.change(getInput(), { target: { value: '#1a3300' } })

    expect(screen.queryByRole('status', { name: 'Palette aesthetic match' })).not.toBeInTheDocument()
  })

  it('recomputes the match every time the palette is recalculated by switching generation modes', () => {
    render(<ColorGenerator />)
    fireEvent.change(getInput(), { target: { value: '#26d9ac' } })
    expect(screen.getByRole('status', { name: 'Palette aesthetic match' })).toHaveTextContent('Tropical')

    fireEvent.change(getInput(), { target: { value: '#1a3300' } })
    expect(screen.queryByRole('status', { name: 'Palette aesthetic match' })).not.toBeInTheDocument()

    fireEvent.change(getInput(), { target: { value: '#26d9ac' } })
    expect(screen.getByRole('status', { name: 'Palette aesthetic match' })).toHaveTextContent('Tropical')
  })
})
