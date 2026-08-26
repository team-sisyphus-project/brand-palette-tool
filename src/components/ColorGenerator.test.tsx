import '@testing-library/jest-dom/vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { generatePalette, generateShades, getHarmonyColors, hexToRgb, rgbToHsl } from '../lib/palette'
import { ColorGenerator } from './ColorGenerator'

// grain-3: RecentPalettes (grain-2) and its localStorage persistence were
// removed entirely from ColorGenerator (see its class doc comment,
// "(assumption — needs confirmation)"), but other suites (e.g.
// recentPalettes.test.ts) still exercise src/lib/recentPalettes.ts directly
// against the same jsdom localStorage - clearing between tests here keeps
// this file isolated regardless.
beforeEach(() => {
  window.localStorage.clear()
})

/** Pulls the `#rrggbb` hex code out of an aria-label like "Toggle lock for #3366ff color". */
function extractHex(label: string): string {
  return label.match(/#[0-9a-f]{6}/i)![0]
}

function getInput(): HTMLInputElement {
  return screen.getByLabelText('Brand main color') as HTMLInputElement
}

function getAdditionalColorInput(n: 1 | 2 | 3 | 4): HTMLInputElement {
  return screen.getByLabelText(`Additional color ${n}`) as HTMLInputElement
}

function getMoodKeywordInput(): HTMLInputElement {
  return screen.getByLabelText('Mood keyword') as HTMLInputElement
}

function getGenerateButton(): HTMLElement {
  return screen.getByRole('button', { name: 'Generate' })
}

/**
 * grain-2: the 4 additional-color fields are progressively disclosed - each
 * click of the "+" add-color button reveals exactly one more. Tests that
 * need N of them visible call this first instead of assuming they're all
 * mounted from the start (grain-1's original, now-superseded behavior).
 */
function getAddColorButton(): HTMLElement {
  return screen.getByRole('button', { name: 'Add another color' })
}

function revealExtraColors(count: 1 | 2 | 3 | 4) {
  for (let i = 0; i < count; i += 1) {
    fireEvent.click(getAddColorButton())
  }
}

/**
 * grain-1: the palette/result section only renders after Generate is
 * clicked with a valid brand color (supersedes the old auto-render-on-mount
 * / auto-render-on-keystroke behavior). This helper optionally types a new
 * brand value, then clicks Generate - the single gate every "does a palette
 * show up" assertion below now has to go through.
 */
function generate(value?: string) {
  if (value !== undefined) {
    fireEvent.change(getInput(), { target: { value } })
  }
  fireEvent.click(getGenerateButton())
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

// grain-1 (theme toggle placement): App no longer renders ThemeToggle in its
// header — ColorGenerator now owns rendering it, anchored inside the
// color/preview panel (`panel-preview` / `.color-generator__preview`),
// top-right, above whatever else that panel renders. It must be present in
// both the pre-generate (empty preview) and post-generate (result) states,
// and `theme`/`onToggleTheme` must be threaded straight through to the
// underlying ThemeToggle.
describe('grain-1: theme toggle placement (color panel top-right)', () => {
  function getPreviewSection(): HTMLElement {
    // panel-preview is always present; grab it by its stable class rather
    // than via the (sometimes absent, pre-generate) palette list.
    return document.querySelector('.color-generator__preview') as HTMLElement
  }

  it('renders the toggle inside the color/preview panel before Generate, not the controls panel', () => {
    render(<ColorGenerator theme="light" onToggleTheme={() => {}} />)

    const toggle = screen.getByRole('switch')
    expect(getPreviewSection()).toContainElement(toggle)

    const controlsPanel = getInput().closest('section')!
    expect(within(controlsPanel).queryByRole('switch')).not.toBeInTheDocument()
  })

  it('keeps the toggle inside the color/preview panel after Generate, positioned above the color chips', () => {
    render(<ColorGenerator theme="light" onToggleTheme={() => {}} />)
    generate('#3366ff')

    const preview = getPreviewSection()
    const toggle = screen.getByRole('switch')
    expect(preview).toContainElement(toggle)

    const list = screen.getByRole('list', { name: 'Generated 5-color palette' })
    // DOCUMENT_POSITION_FOLLOWING (4) means `list` comes after `toggle`.
    expect(toggle.compareDocumentPosition(list) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('right-aligns the toggle row so the toggle anchors to the top-right corner of the color panel', () => {
    render(<ColorGenerator theme="light" onToggleTheme={() => {}} />)

    const toggle = screen.getByRole('switch')
    const row = toggle.closest('.color-generator__theme-toggle-row')
    expect(row).toBeInTheDocument()
    // The row is the first child of the preview panel in both pre/post-generate states.
    expect(getPreviewSection().firstElementChild).toBe(row)
  })

  it('reflects the theme prop and calls onToggleTheme when clicked', () => {
    const onToggleTheme = vi.fn()
    render(<ColorGenerator theme="dark" onToggleTheme={onToggleTheme} />)

    const toggle = screen.getByRole('switch', { name: 'Switch to light theme' })
    expect(toggle).toHaveAttribute('aria-checked', 'true')

    fireEvent.click(toggle)
    expect(onToggleTheme).toHaveBeenCalledTimes(1)
  })
})

describe('grain-1: intake form fields (pre-generate)', () => {
  it('renders only the brand field, the mood-keyword field, and the add-color button - no additional Hex fields yet', () => {
    render(<ColorGenerator />)

    expect(getInput()).toBeInTheDocument()
    expect(getMoodKeywordInput()).toBeInTheDocument()
    expect(getAddColorButton()).toBeInTheDocument()
    ;([1, 2, 3, 4] as const).forEach((n) =>
      expect(screen.queryByLabelText(`Additional color ${n}`)).not.toBeInTheDocument(),
    )

    expect(screen.queryByRole('list', { name: 'Generated 5-color palette' })).not.toBeInTheDocument()
    expect(screen.queryByRole('list', { name: 'Palette mood tags' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Regenerate' })).not.toBeInTheDocument()
  })

  it('each click of the add-color button reveals exactly one more additional Hex field, up to 4, then the button disappears', () => {
    render(<ColorGenerator />)

    ;([1, 2, 3, 4] as const).forEach((n) => {
      fireEvent.click(getAddColorButton())
      ;([1, 2, 3, 4] as const).forEach((slot) => {
        if (slot <= n) {
          expect(screen.getByLabelText(`Additional color ${slot}`)).toBeInTheDocument()
        } else {
          expect(screen.queryByLabelText(`Additional color ${slot}`)).not.toBeInTheDocument()
        }
      })
    })

    expect(screen.queryByRole('button', { name: 'Add another color' })).not.toBeInTheDocument()
  })

  it('all revealed additional Hex fields start empty with no error', () => {
    render(<ColorGenerator />)
    revealExtraColors(4)
    ;([1, 2, 3, 4] as const).forEach((n) => expect(getAdditionalColorInput(n).value).toBe(''))
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('an invalid value in one additional Hex field shows an error scoped to that field only', () => {
    render(<ColorGenerator />)
    revealExtraColors(4)

    fireEvent.change(getAdditionalColorInput(2), { target: { value: 'not-a-color' } })

    const alerts = screen.getAllByRole('alert')
    expect(alerts).toHaveLength(1)
    expect(getAdditionalColorInput(2)).toHaveAttribute('aria-invalid', 'true')
    ;([1, 3, 4] as const).forEach((n) => expect(getAdditionalColorInput(n)).toHaveAttribute('aria-invalid', 'false'))
  })

  it('each additional Hex field is validated independently of the others', () => {
    render(<ColorGenerator />)
    revealExtraColors(4)

    fireEvent.change(getAdditionalColorInput(1), { target: { value: 'nope' } })
    fireEvent.change(getAdditionalColorInput(3), { target: { value: 'also-nope' } })

    expect(screen.getAllByRole('alert')).toHaveLength(2)
    expect(getAdditionalColorInput(1)).toHaveAttribute('aria-invalid', 'true')
    expect(getAdditionalColorInput(2)).toHaveAttribute('aria-invalid', 'false')
    expect(getAdditionalColorInput(3)).toHaveAttribute('aria-invalid', 'true')
    expect(getAdditionalColorInput(4)).toHaveAttribute('aria-invalid', 'false')
  })

  it('a valid value in an additional Hex field shows no error', () => {
    render(<ColorGenerator />)
    revealExtraColors(1)
    fireEvent.change(getAdditionalColorInput(1), { target: { value: '#123abc' } })
    expect(getAdditionalColorInput(1)).toHaveAttribute('aria-invalid', 'false')
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('clearing an invalid additional Hex field back to empty clears its error (empty is valid/optional)', () => {
    render(<ColorGenerator />)
    revealExtraColors(4)
    const field = getAdditionalColorInput(4)

    fireEvent.change(field, { target: { value: 'zzz' } })
    expect(screen.getByRole('alert')).toBeInTheDocument()

    fireEvent.change(field, { target: { value: '' } })
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(field).toHaveAttribute('aria-invalid', 'false')
  })

  it('the mood-keyword field accepts free text with no validation', () => {
    render(<ColorGenerator />)
    fireEvent.change(getMoodKeywordInput(), { target: { value: 'bold & playful!' } })
    expect(getMoodKeywordInput().value).toBe('bold & playful!')
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
})

// grain-2: the add-color button sits directly beneath the brand field so it
// (and whatever it has revealed so far) is the first thing after the brand
// input - before the mood-keyword field and Generate button.
describe('grain-2: add-color button placement and progressive reveal order', () => {
  function getControlsPanel(): HTMLElement {
    return getInput().closest('section')!
  }

  it('positions the add-color button immediately after the brand field, before any revealed additional fields', () => {
    render(<ColorGenerator />)

    const children = Array.from(getControlsPanel().children)
    const brandFieldIndex = children.findIndex((child) => child.contains(getInput()))
    const addButtonIndex = children.findIndex((child) => child.contains(getAddColorButton()))

    expect(addButtonIndex).toBeGreaterThan(brandFieldIndex)
  })

  it('keeps the add-color button before the mood-keyword field and Generate button once fields are revealed', () => {
    render(<ColorGenerator />)
    revealExtraColors(2)

    const children = Array.from(getControlsPanel().children)
    const addButtonIndex = children.findIndex((child) => child.contains(getAddColorButton()))
    const keywordIndex = children.findIndex((child) => child.contains(getMoodKeywordInput()))

    expect(keywordIndex).toBeGreaterThan(addButtonIndex)
  })

  it('reveals fields in order 1, 2, 3, 4 and never skips or duplicates a slot', () => {
    render(<ColorGenerator />)

    fireEvent.click(getAddColorButton())
    expect(getAdditionalColorInput(1)).toBeInTheDocument()

    fireEvent.click(getAddColorButton())
    expect(getAdditionalColorInput(2)).toBeInTheDocument()
    expect(screen.getAllByLabelText(/^Additional color /)).toHaveLength(2)
  })
})

describe('grain-1: Generate gate', () => {
  it('editing the brand field, additional fields, or the keyword field never reveals the result section before Generate is clicked', () => {
    render(<ColorGenerator />)

    fireEvent.change(getInput(), { target: { value: '#3366ff' } })
    revealExtraColors(1)
    fireEvent.change(getAdditionalColorInput(1), { target: { value: '#00ff00' } })
    fireEvent.change(getMoodKeywordInput(), { target: { value: 'calm' } })

    expect(screen.queryByRole('list', { name: 'Generated 5-color palette' })).not.toBeInTheDocument()
  })

  it('clicking Generate with an empty brand color keeps the result section hidden (M-4)', () => {
    render(<ColorGenerator />)
    fireEvent.change(getInput(), { target: { value: '' } })
    fireEvent.click(getGenerateButton())

    expect(screen.queryByRole('list', { name: 'Generated 5-color palette' })).not.toBeInTheDocument()
  })

  it('clicking Generate with an invalid brand color keeps the result section hidden and the error visible (M-4)', () => {
    render(<ColorGenerator />)
    fireEvent.change(getInput(), { target: { value: 'not-a-color' } })
    fireEvent.click(getGenerateButton())

    expect(screen.queryByRole('list', { name: 'Generated 5-color palette' })).not.toBeInTheDocument()
    expect(screen.getByRole('alert')).toBeInTheDocument()
  })

  it('clicking Generate with a valid brand color immediately reveals the 5-color palette (M-5)', () => {
    render(<ColorGenerator />)
    generate('#3366ff')

    const list = screen.getByRole('list', { name: 'Generated 5-color palette' })
    expect(within(list).getAllByRole('listitem')).toHaveLength(5)
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
})

describe('ColorGenerator', () => {
  it('renders no palette and no error once the input is cleared (M-1 baseline)', () => {
    render(<ColorGenerator />)
    fireEvent.change(getInput(), { target: { value: '' } })
    expect(screen.queryByRole('list', { name: 'Generated 5-color palette' })).not.toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('defaults the brand input to #E84C40, and generates a 5-color palette once Generate is clicked', () => {
    render(<ColorGenerator />)

    expect(getInput().value).toBe('#E84C40')
    expect(screen.queryByRole('list', { name: 'Generated 5-color palette' })).not.toBeInTheDocument()

    fireEvent.click(getGenerateButton())

    const list = screen.getByRole('list', { name: 'Generated 5-color palette' })
    expect(within(list).getAllByRole('listitem')).toHaveLength(5)
    expect(screen.getByText('#e84c40')).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('renders a 5-color palette after Generate is clicked with a valid HEX value (M-1)', () => {
    render(<ColorGenerator />)
    generate('#3366ff')

    const list = screen.getByRole('list', { name: 'Generated 5-color palette' })
    expect(within(list).getAllByRole('listitem')).toHaveLength(5)
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('includes the exact brand HEX among the 5 rendered swatches', () => {
    render(<ColorGenerator />)
    generate('#3366ff')
    expect(screen.getByText('#3366ff')).toBeInTheDocument()
  })

  it('renders a 5-color palette after Generate is clicked with a valid RGB string', () => {
    render(<ColorGenerator />)
    generate('51, 102, 255')

    expect(screen.getByRole('list', { name: 'Generated 5-color palette' })).toBeInTheDocument()
    expect(screen.getByText('#3366ff')).toBeInTheDocument()
  })

  it('shows a validation error and no palette for an invalid value', () => {
    render(<ColorGenerator />)
    fireEvent.change(getInput(), { target: { value: 'not-a-color' } })

    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(screen.queryByRole('list', { name: 'Generated 5-color palette' })).not.toBeInTheDocument()
  })

  // grain-2 note: two pre-existing tests previously lived here -
  // "clears the palette and error once the field is emptied again" and
  // "after Generate, the palette keeps updating live as the brand input
  // changes to a new valid color" - both drove the scenario by editing the
  // brand field *after* clicking Generate. grain-2 unmounts the brand field
  // (along with the rest of the intake form) once a palette exists, so that
  // scenario is no longer reachable through the UI; removed rather than kept
  // red, per context/decisions/. The still-valid half of each test's intent
  // survives elsewhere: "renders no palette and no error once the input is
  // cleared (M-1 baseline)" above covers pre-generate clearing, and the
  // "grain-2: generated result view" describe block below covers the new
  // hidden-intake-form behavior.

  it('renders the brand main color slot locked by default (aria-pressed)', () => {
    render(<ColorGenerator />)
    generate('#3366ff')

    const brandLock = screen.getByRole('button', { name: 'Toggle lock for #3366ff color' })
    expect(brandLock).toHaveAttribute('aria-pressed', 'true')
  })

  it('renders derived color slots unlocked by default', () => {
    render(<ColorGenerator />)
    generate('#3366ff')

    const list = screen.getByRole('list', { name: 'Generated 5-color palette' })
    const lockButtons = within(list).getAllByRole('button', { name: /Toggle lock for/ })
    expect(lockButtons).toHaveLength(5)
    expect(lockButtons.filter((button) => button.getAttribute('aria-pressed') === 'true')).toHaveLength(1)
  })

  it('toggles a derived slot lock state on click', () => {
    render(<ColorGenerator />)
    generate('#3366ff')

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
    generate('#3366ff')

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
  it('renders a palette for whitespace-padded, uppercase hex input after Generate', () => {
    render(<ColorGenerator />)
    generate('  #3366FF  ')

    expect(screen.getByRole('list', { name: 'Generated 5-color palette' })).toBeInTheDocument()
    expect(screen.getByText('#3366ff')).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('renders a palette for 3-digit shorthand hex input after Generate', () => {
    render(<ColorGenerator />)
    generate('#36f')

    expect(screen.getByRole('list', { name: 'Generated 5-color palette' })).toBeInTheDocument()
    expect(screen.getByText('#3366ff')).toBeInTheDocument()
  })

  it('renders a palette for whitespace-padded rgb input after Generate', () => {
    render(<ColorGenerator />)
    generate('  51 , 102 , 255  ')

    expect(screen.getByRole('list', { name: 'Generated 5-color palette' })).toBeInTheDocument()
    expect(screen.getByText('#3366ff')).toBeInTheDocument()
  })

  it('renders the brand slot locked by default even for uppercase/whitespace/shorthand input variants', () => {
    render(<ColorGenerator />)
    generate('  #36F  ')

    const brandLock = screen.getByRole('button', { name: 'Toggle lock for #3366ff color' })
    expect(brandLock).toHaveAttribute('aria-pressed', 'true')
  })

  // grain-2 note: "re-entering the exact same brand input (after typing
  // something else) renders the identical 5-color palette" previously lived
  // here, re-editing the brand field after Generate to prove determinism.
  // That field is unmounted post-Generate under grain-2 (see the class doc
  // comment and context/decisions/), so the same determinism guarantee (M-1)
  // is now verified the only way still reachable through the UI - a fresh
  // mount with the same input, below.
  it('renders the same 5-color palette for a fresh mount given the same brand input (no hidden randomness in the base path)', () => {
    const { unmount } = render(<ColorGenerator />)
    generate('#3366ff')
    const firstPass = getHexes(screen.getByRole('list', { name: 'Generated 5-color palette' }))
    unmount()

    render(<ColorGenerator />)
    generate('#3366ff')
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
    generate('#3366ff')

    const brandLock = screen.getByRole('button', { name: 'Toggle lock for #3366ff color' })
    expect(brandLock).toHaveAttribute('aria-pressed', 'true')
  })

  it('locking an arbitrary slot keeps it unchanged across repeated regenerations while the rest keep changing', () => {
    mockDeterministicRandom()
    render(<ColorGenerator />)
    generate('#3366ff')

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
    generate('#3366ff')

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
    generate('#3366ff')

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
    generate('#3366ff')

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
    generate('#000000')

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
    generate('#ffffff')

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
    generate('#3366ff')

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
    generate('#3366ff')

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
    generate('#3366ff')

    const list = screen.getByRole('list', { name: 'Generated 5-color palette' })
    const originalHex = findLockButtonHex(list, false)

    fireEvent.change(getColorPicker(originalHex), { target: { value: '#00ff00' } })

    const updatedLock = screen.getByRole('button', { name: 'Toggle lock for #00ff00 color' })
    expect(updatedLock).toHaveAttribute('aria-pressed', 'true')
  })

  it('changing the brand slot color via the color picker is reflected immediately', () => {
    render(<ColorGenerator />)
    generate('#3366ff')

    fireEvent.change(getColorPicker('#3366ff'), { target: { value: '#123456' } })

    expect(screen.queryByText('#3366ff')).not.toBeInTheDocument()
    expect(screen.getByText('#123456')).toBeInTheDocument()
  })

  it('changing the brand slot color via the color picker keeps its lock state (aria-pressed) unchanged', () => {
    render(<ColorGenerator />)
    generate('#3366ff')

    fireEvent.change(getColorPicker('#3366ff'), { target: { value: '#123456' } })

    const brandLock = screen.getByRole('button', { name: 'Toggle lock for #123456 color' })
    expect(brandLock).toHaveAttribute('aria-pressed', 'true')
  })

  it('a color edited via the color picker survives regeneration (auto-lock protects it from regenerate)', () => {
    mockDeterministicRandom()
    render(<ColorGenerator />)
    generate('#3366ff')

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
// grain-1 note: this originally drove "a palette exists" by typing into the
// brand field without clicking Generate (pre-Generate-gate auto-render). The
// Generate gate (see the class doc comment) supersedes that - a palette (and
// so PaletteExportActions) only ever appears after Generate is clicked, and
// the brand field is unmounted afterward (grain-2), so "hides them without
// one" is now only reachable pre-Generate rather than by clearing the field
// again post-Generate. Split into two tests that verify the same intent
// (no buttons without a palette; buttons appear once one exists) through the
// reachable flow.
describe('grain-2: palette export actions wiring', () => {
  it('does not show Copy HEX / Copy CSS Variables buttons before Generate is clicked', () => {
    render(<ColorGenerator />)
    fireEvent.change(getInput(), { target: { value: '#3366ff' } })

    expect(screen.queryByRole('button', { name: 'Copy HEX' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Copy CSS Variables' })).not.toBeInTheDocument()
  })

  it('shows Copy HEX / Copy CSS Variables buttons once Generate reveals a palette', () => {
    render(<ColorGenerator />)
    generate('#3366ff')

    expect(screen.getByRole('button', { name: 'Copy HEX' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Copy CSS Variables' })).toBeInTheDocument()
  })
})

// grain-3: the "grain-2: generation mode selection (M-3)" describe block that
// used to live here (5 generation-mode buttons via ModeSelector, selecting
// each renders a distinct palette, switching modes keeps the brand slot/
// locked slots unchanged) has been removed. ModeSelector itself is deleted
// (see ColorGenerator.tsx's class doc comment, "(assumption — needs
// confirmation)") - there is no remaining UI to switch generation modes, so
// that whole scenario is unreachable. Coverage for `mode`-parameterized
// palette generation itself (5 distinct modes producing 5 distinct palettes)
// still lives in palette.test.ts's own generatePalette/deriveHslByMode unit
// tests; this file only ever exercised that logic through UI wiring.

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

  it('mood tags are not rendered before Generate is clicked, even with a valid brand color', () => {
    render(<ColorGenerator />)
    fireEvent.change(getInput(), { target: { value: '#3366ff' } })
    expect(screen.queryByRole('list', { name: 'Palette mood tags' })).not.toBeInTheDocument()
  })

  it('clicking Generate with a valid color immediately shows 1-2 mood tags along with the palette', () => {
    render(<ColorGenerator />)
    generate('#3366ff')

    const tags = within(getMoodTagList()).getAllByRole('listitem')
    expect(tags.length).toBeGreaterThanOrEqual(1)
    expect(tags.length).toBeLessThanOrEqual(2)
    tags.forEach((tag) => expect(tag.textContent).not.toBe(''))
  })

  // grain-2 note: previously re-typed the brand field after Generate to
  // prove determinism (re-entering the same value -> same tags). That field
  // is unmounted post-Generate now (see context/decisions/), so - like the
  // palette's own determinism test below it - this now proves the same
  // guarantee via two independent fresh mounts instead of a post-Generate
  // re-edit. Editing the (now-unmounted) field silently no-ops rather than
  // failing, which would have made the old version a test that can't fail.
  it('shows the same mood tags for a fresh mount given the same brand input (determinism)', () => {
    const { unmount } = render(<ColorGenerator />)
    generate('#3366ff')
    const firstTags = within(getMoodTagList())
      .getAllByRole('listitem')
      .map((tag) => tag.textContent)
    unmount()

    render(<ColorGenerator />)
    generate('#3366ff')
    const secondTags = within(getMoodTagList())
      .getAllByRole('listitem')
      .map((tag) => tag.textContent)

    expect(secondTags).toEqual(firstTags)
  })

  // grain-3 note: this test used to switch through all 5 generation modes via
  // ModeSelector (now removed - see ColorGenerator.tsx's class doc comment).
  // Repeated Regenerate clicks are the only still-reachable way to recompute
  // `palette` multiple times, so the "always stays in the 1-2 range across
  // repeated recomputes" intent is verified that way instead.
  it('recomputing the palette via repeated Regenerate clicks always shows 1-2 mood tags', () => {
    render(<ColorGenerator />)
    generate('#3366ff')

    const regenerateButton = screen.getByRole('button', { name: 'Regenerate' })
    for (let round = 0; round < 3; round += 1) {
      fireEvent.click(regenerateButton)
      const tags = within(getMoodTagList()).getAllByRole('listitem')
      expect(tags.length).toBeGreaterThanOrEqual(1)
      expect(tags.length).toBeLessThanOrEqual(2)
    }
  })

  it('mood tags keep showing in the 1-2 range after regeneration', () => {
    render(<ColorGenerator />)
    generate('#3366ff')

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
    generate('#26d9ac')

    const match = screen.getByRole('status', { name: 'Palette aesthetic match' })
    expect(match).toHaveTextContent('Tropical')
  })

  it('shows nothing when the average HSL is outside the threshold from every archetype', () => {
    render(<ColorGenerator />)
    generate('#1a3300')

    expect(screen.queryByRole('status', { name: 'Palette aesthetic match' })).not.toBeInTheDocument()
  })

  // grain-3 note: this suite used to also verify "recomputes the match every
  // time the palette is recalculated by switching generation modes" by
  // toggling ModeSelector between Triadic/Complementary (deterministic HSL
  // arithmetic, no jitter, so the match flips predictably). ModeSelector is
  // now removed (see ColorGenerator.tsx's class doc comment), and no
  // remaining UI action moves averageHsl by a precise, reproducible amount
  // (Regenerate jitters; a manual per-slot edit only moves one of 5 slots).
  // The recompute-on-`palette`-change guarantee itself (matchAesthetic runs
  // inside a useMemo keyed on `palette`, same as moodTags/vibeKeywords) is
  // exercised the same way for those siblings via repeated Regenerate above/
  // below, so no coverage gap - just this one specific deterministic
  // transition is no longer reproducible through the UI.
})

// grain-2: rich vibe-keyword "keyword:" line (5+ comma-joined adjectives,
// spec A "provide intuitive vibe keywords"). VibeKeywords only renders
// whatever getVibeKeywords(averageHsl(palette)) returns, so here we verify at
// the ColorGenerator wiring level whether "5+ keywords are always shown
// whenever a palette exists" and "the same input yields the same keywords
// (determinism)". The detailed H/S/L band -> word mapping is covered by
// palette.test.ts's getVibeKeywords unit tests.
describe('grain-2: vibe keyword line', () => {
  function getVibeKeywordsLine(): HTMLElement {
    return screen.getByRole('status', { name: 'Palette vibe keywords' })
  }

  it('the vibe keyword line is not rendered when there is no palette', () => {
    render(<ColorGenerator />)
    fireEvent.change(getInput(), { target: { value: '' } })
    expect(screen.queryByRole('status', { name: 'Palette vibe keywords' })).not.toBeInTheDocument()
  })

  it('the vibe keyword line is not rendered before Generate is clicked, even with a valid brand color', () => {
    render(<ColorGenerator />)
    fireEvent.change(getInput(), { target: { value: '#3366ff' } })
    expect(screen.queryByRole('status', { name: 'Palette vibe keywords' })).not.toBeInTheDocument()
  })

  it('clicking Generate with a valid color immediately shows a "keyword:" line with 5+ comma-separated keywords', () => {
    render(<ColorGenerator />)
    generate('#3366ff')

    const line = getVibeKeywordsLine()
    expect(line).toHaveTextContent(/^keyword:/)
    const keywords = line.textContent!.replace(/^keyword:\s*/, '').split(', ')
    expect(keywords.length).toBeGreaterThanOrEqual(5)
    expect(new Set(keywords).size).toBe(keywords.length) // all unique
  })

  it('shows the same vibe keywords for a fresh mount given the same brand input (determinism)', () => {
    const { unmount } = render(<ColorGenerator />)
    generate('#3366ff')
    const firstLine = getVibeKeywordsLine().textContent
    unmount()

    render(<ColorGenerator />)
    generate('#3366ff')
    const secondLine = getVibeKeywordsLine().textContent

    expect(secondLine).toEqual(firstLine)
  })

  // grain-3 note: previously switched through all 5 generation modes via
  // ModeSelector (now removed - see ColorGenerator.tsx's class doc comment).
  // Repeated Regenerate clicks are the only still-reachable way to recompute
  // `palette` multiple times, mirroring the equivalent mood-tags update above.
  it('recomputing the palette via repeated Regenerate clicks always shows 5+ vibe keywords', () => {
    render(<ColorGenerator />)
    generate('#3366ff')

    const regenerateButton = screen.getByRole('button', { name: 'Regenerate' })
    for (let round = 0; round < 3; round += 1) {
      fireEvent.click(regenerateButton)
      const keywords = getVibeKeywordsLine()
        .textContent!.replace(/^keyword:\s*/, '')
        .split(', ')
      expect(keywords.length).toBeGreaterThanOrEqual(5)
    }
  })

  it('the vibe keyword line keeps showing 5+ keywords after regeneration', () => {
    render(<ColorGenerator />)
    generate('#3366ff')

    fireEvent.click(screen.getByRole('button', { name: 'Regenerate' }))

    const keywords = getVibeKeywordsLine()
      .textContent!.replace(/^keyword:\s*/, '')
      .split(', ')
    expect(keywords.length).toBeGreaterThanOrEqual(5)
  })
})

// grain-2: once a palette exists, the whole intake form (brand field, 4
// additional Hex fields, mood-keyword field, Generate button) is unmounted
// from the DOM, the preview panel gains a center-aligned modifier class, and
// Regenerate is rendered inside that preview panel directly above the color
// chips (previously it lived in the controls panel next to the now-removed
// ModeSelector - see ColorGenerator.tsx's class doc comment).
describe('grain-2: generated result view (center + hide form + Regenerate above chips)', () => {
  function getPreviewPanel(): HTMLElement {
    return screen.getByRole('list', { name: 'Generated 5-color palette' }).closest('section')!
  }

  function getControlsPanel(): HTMLElement {
    return document.querySelector('.panel-generator') as HTMLElement
  }

  it('before Generate, the intake form is visible and the preview panel has no center-aligned modifier', () => {
    render(<ColorGenerator />)

    expect(getInput()).toBeInTheDocument()
    revealExtraColors(4)
    ;([1, 2, 3, 4] as const).forEach((n) => expect(getAdditionalColorInput(n)).toBeInTheDocument())
    expect(getMoodKeywordInput()).toBeInTheDocument()
    expect(getGenerateButton()).toBeInTheDocument()
  })

  it('after Generate, the brand field, all revealed additional Hex fields, the add-color button, the mood-keyword field, and the Generate button are entirely unmounted', () => {
    render(<ColorGenerator />)
    revealExtraColors(4)
    generate('#3366ff')

    expect(screen.queryByLabelText('Brand main color')).not.toBeInTheDocument()
    ;([1, 2, 3, 4] as const).forEach((n) =>
      expect(screen.queryByLabelText(`Additional color ${n}`)).not.toBeInTheDocument(),
    )
    expect(screen.queryByLabelText('Mood keyword')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Generate' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Add another color' })).not.toBeInTheDocument()
  })

  it('after Generate, the left panel renders the Palette Description panel instead of a mode selector', () => {
    render(<ColorGenerator />)
    generate('#3366ff')

    expect(screen.getByRole('region', { name: 'Palette description' })).toBeInTheDocument()
    expect(screen.queryByRole('group', { name: 'Select generation mode' })).not.toBeInTheDocument()
  })

  it('after Generate, the preview panel carries the center-aligned result modifier class', () => {
    render(<ColorGenerator />)
    generate('#3366ff')

    expect(getPreviewPanel()).toHaveClass('color-generator__preview--result')
  })

  it('before Generate, the (empty) preview panel does not carry the center-aligned result modifier class', () => {
    const { container } = render(<ColorGenerator />)

    const preview = container.querySelector('.color-generator__preview')!
    expect(preview).not.toHaveClass('color-generator__preview--result')
  })

  it('Regenerate renders inside the preview panel, immediately before the color chips', () => {
    render(<ColorGenerator />)
    generate('#3366ff')

    const preview = getPreviewPanel()
    const children = Array.from(preview.children)
    const regenerateIndex = children.findIndex(
      (child) => child.tagName === 'BUTTON' && child.textContent === 'Regenerate',
    )
    const paletteIndex = children.findIndex((child) =>
      child.matches('[role="list"][aria-label="Generated 5-color palette"]'),
    )

    expect(regenerateIndex).toBeGreaterThanOrEqual(0)
    expect(paletteIndex).toBeGreaterThan(regenerateIndex)
  })

  it('Regenerate no longer renders in the controls panel', () => {
    render(<ColorGenerator />)
    generate('#3366ff')

    expect(within(getControlsPanel()).queryByRole('button', { name: 'Regenerate' })).not.toBeInTheDocument()
  })

  it('Regenerate still works after moving above the color chips (locked slot survives)', () => {
    render(<ColorGenerator />)
    generate('#3366ff')

    const list = screen.getByRole('list', { name: 'Generated 5-color palette' })
    const brandLock = screen.getByRole('button', { name: 'Toggle lock for #3366ff color' })
    expect(brandLock).toHaveAttribute('aria-pressed', 'true')

    fireEvent.click(screen.getByRole('button', { name: 'Regenerate' }))

    expect(screen.getByText('#3366ff')).toBeInTheDocument()
    expect(within(list).getAllByRole('listitem')).toHaveLength(5)
  })
})

// grain-3 (left-panel Palette Description panel): replaces the removed
// ModeSelector/RecentPalettes markup in `panel-generator` (see
// ColorGenerator.tsx's class doc comment for why both were removed
// wholesale, not just relocated). PaletteDescription itself only renders
// whatever name/description/keywords it is given - the wiring-level
// guarantee this suite verifies is "a palette exists -> the left panel always
// shows a name, at least one description line, and the keyword list, and
// never shows the old ModeSelector/RecentPalettes elements".
describe('grain-3: Palette Description panel (left panel)', () => {
  function getControlsPanel(): HTMLElement {
    return document.querySelector('.panel-generator') as HTMLElement
  }

  it('is not rendered when there is no palette', () => {
    render(<ColorGenerator />)
    fireEvent.change(getInput(), { target: { value: '' } })
    expect(screen.queryByRole('region', { name: 'Palette description' })).not.toBeInTheDocument()
  })

  it('is not rendered before Generate is clicked, even with a valid brand color', () => {
    render(<ColorGenerator />)
    fireEvent.change(getInput(), { target: { value: '#3366ff' } })
    expect(screen.queryByRole('region', { name: 'Palette description' })).not.toBeInTheDocument()
  })

  it('shows a non-empty name, at least one description line, and the keyword list once Generate reveals a palette', () => {
    render(<ColorGenerator />)
    generate('#3366ff')

    const panel = screen.getByRole('region', { name: 'Palette description' })
    const name = within(panel).getByRole('heading', { level: 2 })
    expect(name.textContent).not.toBe('')

    const lines = within(within(panel).getByRole('list', { name: 'Palette description text' })).getAllByRole(
      'listitem',
    )
    expect(lines.length).toBeGreaterThanOrEqual(1)
    lines.forEach((line) => expect(line.textContent).not.toBe(''))

    const keywords = within(within(panel).getByRole('list', { name: 'Palette keywords' })).getAllByRole(
      'listitem',
    )
    expect(keywords.length).toBeGreaterThanOrEqual(1)
  })

  it('shows the exact same keywords as the right panel\'s vibe keyword line (single source of truth)', () => {
    render(<ColorGenerator />)
    generate('#3366ff')

    const panel = screen.getByRole('region', { name: 'Palette description' })
    const leftKeywords = within(within(panel).getByRole('list', { name: 'Palette keywords' }))
      .getAllByRole('listitem')
      .map((item) => item.textContent)

    const rightLine = screen.getByRole('status', { name: 'Palette vibe keywords' }).textContent!
    const rightKeywords = rightLine.replace(/^keyword:\s*/, '').split(', ')

    expect(leftKeywords).toEqual(rightKeywords)
  })

  it('the left panel never renders the removed ModeSelector or RecentPalettes elements, before or after Generate', () => {
    render(<ColorGenerator />)
    expect(within(getControlsPanel()).queryByRole('group', { name: 'Select generation mode' })).not.toBeInTheDocument()
    expect(within(getControlsPanel()).queryByRole('region', { name: 'Recent palettes' })).not.toBeInTheDocument()
    expect(within(getControlsPanel()).queryByRole('list', { name: 'Recent palettes list' })).not.toBeInTheDocument()

    generate('#3366ff')

    expect(within(getControlsPanel()).queryByRole('group', { name: 'Select generation mode' })).not.toBeInTheDocument()
    expect(within(getControlsPanel()).queryByRole('region', { name: 'Recent palettes' })).not.toBeInTheDocument()
    expect(within(getControlsPanel()).queryByRole('list', { name: 'Recent palettes list' })).not.toBeInTheDocument()
  })
})

// grain-3 (custom Color Study base color + Shades): clicking a Palette chip
// (PaletteSwatch's onSelectBase) sets Color Study's base color, which drives
// both the HarmonyExplorer accent(s) and the new Shades ramp.
describe('grain-3: custom Color Study base color via Palette chip click', () => {
  function hslOfHex(hex: string) {
    return rgbToHsl(hexToRgb(hex)!)
  }

  function getColorStudySection(): HTMLElement {
    return screen.getByRole('region', { name: 'Color Study' })
  }

  it('defaults Color Study base color to the brand main color', () => {
    render(<ColorGenerator />)
    generate('#3366ff')

    const expectedAccent = getHarmonyColors(hslOfHex('#3366ff'), 'complementary')[0]
    expect(within(getColorStudySection()).getByText(expectedAccent.hex)).toBeInTheDocument()
  })

  it('clicking a non-brand Palette chip switches Color Study base color and recomputes the harmony accent', () => {
    render(<ColorGenerator />)
    generate('#3366ff')

    // Read the derived slot's exact (unrounded) HSL straight from generatePalette
    // rather than round-tripping through its rendered HEX text - HEX rounding
    // would otherwise make the "expected" H/S drift slightly from what the
    // component actually holds in state for a derived slot.
    const derived = generatePalette('#3366ff', 'complementary')![1]

    fireEvent.click(screen.getByRole('button', { name: `Set ${derived.hex} as Color Study base color` }))

    const expectedAccent = getHarmonyColors(derived.hsl, 'complementary')[0]
    expect(within(getColorStudySection()).getByText(expectedAccent.hex)).toBeInTheDocument()
  })

  it('clicking a Palette chip also updates the Shades "Base" ramp', () => {
    render(<ColorGenerator />)
    generate('#3366ff')

    const derived = generatePalette('#3366ff', 'complementary')![1]

    fireEvent.click(screen.getByRole('button', { name: `Set ${derived.hex} as Color Study base color` }))

    const expectedShade = generateShades(derived.hsl)[2] // middle (50%) step
    const shadesGroup = within(getColorStudySection()).getByRole('list', { name: 'Base shades' })
    expect(
      within(shadesGroup).getByText(`${Math.round(expectedShade.hsl.l)}% ${expectedShade.hex}`),
    ).toBeInTheDocument()
  })

  it('clicking a chip to select it as the base does not also toggle its lock state', () => {
    render(<ColorGenerator />)
    generate('#3366ff')

    const list = screen.getByRole('list', { name: 'Generated 5-color palette' })
    const derivedHex = getHexes(list).find((hex) => hex !== '#3366ff')!
    const lockButton = screen.getByRole('button', { name: `Toggle lock for ${derivedHex} color` })
    expect(lockButton).toHaveAttribute('aria-pressed', 'false')

    fireEvent.click(screen.getByRole('button', { name: `Set ${derivedHex} as Color Study base color` }))

    expect(lockButton).toHaveAttribute('aria-pressed', 'false')
  })

  it('clicking a chip lock toggle does not also change the Color Study base color', () => {
    render(<ColorGenerator />)
    generate('#3366ff')

    const list = screen.getByRole('list', { name: 'Generated 5-color palette' })
    const derivedHex = getHexes(list).find((hex) => hex !== '#3366ff')!

    fireEvent.click(screen.getByRole('button', { name: `Toggle lock for ${derivedHex} color` }))

    const expectedAccent = getHarmonyColors(hslOfHex('#3366ff'), 'complementary')[0]
    expect(within(getColorStudySection()).getByText(expectedAccent.hex)).toBeInTheDocument()
  })
})

// grain-3: the "grain-2: recent palettes list + restore" and "grain-3: recent
// palettes survive a simulated refresh (M-3)" describe blocks that used to
// live here (RecentPalettes list rendering, selecting/restoring an entry,
// localStorage persistence across a simulated refresh) have been removed.
// RecentPalettes and ColorGenerator's use of recentPalettes.ts's
// loadRecentPalettes()/saveRecentPalette() are both deleted (see
// ColorGenerator.tsx's class doc comment, "(assumption — needs
// confirmation)") - there is no remaining UI to view, select, or restore a
// saved entry, so that whole scenario is unreachable. src/lib/recentPalettes.ts
// itself is untouched and keeps its own unit test coverage in
// recentPalettes.test.ts.
