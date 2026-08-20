import '@testing-library/jest-dom/vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ColorGenerator } from './ColorGenerator'

function getInput(): HTMLInputElement {
  return screen.getByLabelText('브랜드 메인 컬러') as HTMLInputElement
}

function getColorPicker(hex: string): HTMLInputElement {
  return screen.getByLabelText(`${hex} 색상 직접 수정`) as HTMLInputElement
}

/** Finds a lock button whose current lock state is `locked`, and returns its HEX. */
function findLockButtonHex(list: HTMLElement, locked: boolean): string {
  const lockButtons = within(list).getAllByRole('button', { name: /색상 잠금 토글/ })
  const button = lockButtons.find(
    (candidate) => candidate.getAttribute('aria-pressed') === String(locked),
  )!
  return button.getAttribute('aria-label')!.split(' ')[0]
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
  it('renders no palette and no error before any input (M-1 baseline)', () => {
    render(<ColorGenerator />)
    expect(screen.queryByRole('list', { name: '생성된 5색 팔레트' })).not.toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('renders a 5-color palette immediately when a valid HEX is typed (M-1)', () => {
    render(<ColorGenerator />)
    fireEvent.change(getInput(), { target: { value: '#3366ff' } })

    const list = screen.getByRole('list', { name: '생성된 5색 팔레트' })
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

    expect(screen.getByRole('list', { name: '생성된 5색 팔레트' })).toBeInTheDocument()
    expect(screen.getByText('#3366ff')).toBeInTheDocument()
  })

  it('shows a validation error and no palette for an invalid value', () => {
    render(<ColorGenerator />)
    fireEvent.change(getInput(), { target: { value: 'not-a-color' } })

    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(screen.queryByRole('list', { name: '생성된 5색 팔레트' })).not.toBeInTheDocument()
  })

  it('clears the palette and error once the field is emptied again', () => {
    render(<ColorGenerator />)
    const input = getInput()

    fireEvent.change(input, { target: { value: '#3366ff' } })
    expect(screen.getByRole('list', { name: '생성된 5색 팔레트' })).toBeInTheDocument()

    fireEvent.change(input, { target: { value: '' } })
    expect(screen.queryByRole('list', { name: '생성된 5색 팔레트' })).not.toBeInTheDocument()
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

    const brandLock = screen.getByRole('button', { name: '#3366ff 색상 잠금 토글' })
    expect(brandLock).toHaveAttribute('aria-pressed', 'true')
  })

  it('renders derived color slots unlocked by default', () => {
    render(<ColorGenerator />)
    fireEvent.change(getInput(), { target: { value: '#3366ff' } })

    const list = screen.getByRole('list', { name: '생성된 5색 팔레트' })
    const lockButtons = within(list).getAllByRole('button', { name: /색상 잠금 토글/ })
    expect(lockButtons).toHaveLength(5)
    expect(lockButtons.filter((button) => button.getAttribute('aria-pressed') === 'true')).toHaveLength(1)
  })

  it('toggles a derived slot lock state on click', () => {
    render(<ColorGenerator />)
    fireEvent.change(getInput(), { target: { value: '#3366ff' } })

    const list = screen.getByRole('list', { name: '생성된 5색 팔레트' })
    const lockButtons = within(list).getAllByRole('button', { name: /색상 잠금 토글/ })
    const derivedLock = lockButtons.find((button) => button.getAttribute('aria-pressed') === 'false')!

    fireEvent.click(derivedLock)
    expect(derivedLock).toHaveAttribute('aria-pressed', 'true')

    fireEvent.click(derivedLock)
    expect(derivedLock).toHaveAttribute('aria-pressed', 'false')
  })

  it('keeps a locked slot unchanged after clicking Regenerate, while the palette stays 5 colors (M-2)', () => {
    render(<ColorGenerator />)
    fireEvent.change(getInput(), { target: { value: '#3366ff' } })

    const list = screen.getByRole('list', { name: '생성된 5색 팔레트' })
    const lockButtons = within(list).getAllByRole('button', { name: /색상 잠금 토글/ })
    const derivedLock = lockButtons.find((button) => button.getAttribute('aria-pressed') === 'false')!
    fireEvent.click(derivedLock)

    const lockedHex = derivedLock.getAttribute('aria-label')!.split(' ')[0]

    fireEvent.click(screen.getByRole('button', { name: '재생성' }))

    expect(screen.getByText(lockedHex)).toBeInTheDocument()
    expect(within(list).getAllByRole('listitem')).toHaveLength(5)
  })

  it('does not render a Regenerate button before a valid palette exists', () => {
    render(<ColorGenerator />)
    expect(screen.queryByRole('button', { name: '재생성' })).not.toBeInTheDocument()
  })

  // Grain-1 edge cases: parseColorInput/generatePalette already normalize
  // whitespace, case, and 3-digit hex — these confirm the same holds through
  // the real ColorInput -> ColorGenerator wiring, not just the pure functions.
  it('renders a palette immediately for whitespace-padded, uppercase hex input', () => {
    render(<ColorGenerator />)
    fireEvent.change(getInput(), { target: { value: '  #3366FF  ' } })

    expect(screen.getByRole('list', { name: '생성된 5색 팔레트' })).toBeInTheDocument()
    expect(screen.getByText('#3366ff')).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('renders a palette immediately for 3-digit shorthand hex input', () => {
    render(<ColorGenerator />)
    fireEvent.change(getInput(), { target: { value: '#36f' } })

    expect(screen.getByRole('list', { name: '생성된 5색 팔레트' })).toBeInTheDocument()
    expect(screen.getByText('#3366ff')).toBeInTheDocument()
  })

  it('renders a palette immediately for whitespace-padded rgb input', () => {
    render(<ColorGenerator />)
    fireEvent.change(getInput(), { target: { value: '  51 , 102 , 255  ' } })

    expect(screen.getByRole('list', { name: '생성된 5색 팔레트' })).toBeInTheDocument()
    expect(screen.getByText('#3366ff')).toBeInTheDocument()
  })

  it('renders the brand slot locked by default even for uppercase/whitespace/shorthand input variants', () => {
    render(<ColorGenerator />)
    fireEvent.change(getInput(), { target: { value: '  #36F  ' } })

    const brandLock = screen.getByRole('button', { name: '#3366ff 색상 잠금 토글' })
    expect(brandLock).toHaveAttribute('aria-pressed', 'true')
  })

  // Grain-1 DoneWhen: "동일 입력 재입력 시 동일 결과" must hold through the real
  // ColorInput -> useMemo(generatePalette) -> Palette wiring, not just at the
  // pure-function level (already covered in palette.test.ts).
  it('re-entering the exact same brand input (after typing something else) renders the identical 5-color palette', () => {
    render(<ColorGenerator />)
    const input = getInput()

    fireEvent.change(input, { target: { value: '#3366ff' } })
    const list = screen.getByRole('list', { name: '생성된 5색 팔레트' })
    const firstPass = getHexes(list)

    fireEvent.change(input, { target: { value: '#ff0000' } })
    expect(getHexes(list)).not.toEqual(firstPass)

    fireEvent.change(input, { target: { value: '#3366ff' } })
    expect(getHexes(list)).toEqual(firstPass)
  })

  it('renders the same 5-color palette for a fresh mount given the same brand input (no hidden randomness in the base path)', () => {
    const { unmount } = render(<ColorGenerator />)
    fireEvent.change(getInput(), { target: { value: '#3366ff' } })
    const firstPass = getHexes(screen.getByRole('list', { name: '생성된 5색 팔레트' }))
    unmount()

    render(<ColorGenerator />)
    fireEvent.change(getInput(), { target: { value: '#3366ff' } })
    const secondPass = getHexes(screen.getByRole('list', { name: '생성된 5색 팔레트' }))

    expect(secondPass).toEqual(firstPass)
  })
})

describe('M-2: 잠금/재생성 통합', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('브랜드 메인 컬러는 초기 기본 잠금 상태로 시작한다', () => {
    render(<ColorGenerator />)
    fireEvent.change(getInput(), { target: { value: '#3366ff' } })

    const brandLock = screen.getByRole('button', { name: '#3366ff 색상 잠금 토글' })
    expect(brandLock).toHaveAttribute('aria-pressed', 'true')
  })

  it('임의 슬롯을 잠그고 반복 재생성해도 잠근 색은 불변이고 나머지 색은 계속 변한다', () => {
    mockDeterministicRandom()
    render(<ColorGenerator />)
    fireEvent.change(getInput(), { target: { value: '#3366ff' } })

    const list = screen.getByRole('list', { name: '생성된 5색 팔레트' })
    const lockButtons = within(list).getAllByRole('button', { name: /색상 잠금 토글/ })
    const derivedLock = lockButtons.find((button) => button.getAttribute('aria-pressed') === 'false')!
    const lockedHex = derivedLock.getAttribute('aria-label')!.split(' ')[0]

    fireEvent.click(derivedLock)
    expect(derivedLock).toHaveAttribute('aria-pressed', 'true')

    const regenerateButton = screen.getByRole('button', { name: '재생성' })
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

  it('잠금을 해제한 뒤 재생성하면 더 이상 고정되지 않고 값이 바뀐다', () => {
    mockDeterministicRandom()
    render(<ColorGenerator />)
    fireEvent.change(getInput(), { target: { value: '#3366ff' } })

    const list = screen.getByRole('list', { name: '생성된 5색 팔레트' })
    const lockButtons = within(list).getAllByRole('button', { name: /색상 잠금 토글/ })
    const derivedLock = lockButtons.find((button) => button.getAttribute('aria-pressed') === 'false')!
    const targetHex = derivedLock.getAttribute('aria-label')!.split(' ')[0]
    const regenerateButton = screen.getByRole('button', { name: '재생성' })

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

describe('grain-2: 컬러 피커로 팔레트 색상 직접 수정', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('컬러 피커로 파생 슬롯 색상을 변경하면 스와치 배경과 HEX 텍스트가 즉시 갱신된다', () => {
    render(<ColorGenerator />)
    fireEvent.change(getInput(), { target: { value: '#3366ff' } })

    const list = screen.getByRole('list', { name: '생성된 5색 팔레트' })
    const originalHex = findLockButtonHex(list, false)

    fireEvent.change(getColorPicker(originalHex), { target: { value: '#00ff00' } })

    expect(screen.queryByText(originalHex)).not.toBeInTheDocument()
    const updatedHexText = screen.getByText('#00ff00')
    expect(updatedHexText).toBeInTheDocument()

    const swatch = updatedHexText.closest('.palette-swatch') as HTMLElement
    const colorPreview = swatch.querySelector('.palette-swatch__color') as HTMLElement
    expect(colorPreview.style.backgroundColor).toBe('rgb(0, 255, 0)')
  })

  it('컬러 피커로 색상을 변경하면 해당 슬롯이 자동으로 잠금 처리된다', () => {
    render(<ColorGenerator />)
    fireEvent.change(getInput(), { target: { value: '#3366ff' } })

    const list = screen.getByRole('list', { name: '생성된 5색 팔레트' })
    const originalHex = findLockButtonHex(list, false)

    fireEvent.change(getColorPicker(originalHex), { target: { value: '#00ff00' } })

    const updatedLock = screen.getByRole('button', { name: '#00ff00 색상 잠금 토글' })
    expect(updatedLock).toHaveAttribute('aria-pressed', 'true')
  })

  it('컬러 피커로 브랜드 슬롯 색상을 변경해도 즉시 반영된다', () => {
    render(<ColorGenerator />)
    fireEvent.change(getInput(), { target: { value: '#3366ff' } })

    fireEvent.change(getColorPicker('#3366ff'), { target: { value: '#123456' } })

    expect(screen.queryByText('#3366ff')).not.toBeInTheDocument()
    expect(screen.getByText('#123456')).toBeInTheDocument()
  })

  it('컬러 피커로 수정한 색상은 재생성 이후에도 사라지지 않는다 (자동 잠금이 재생성으로부터 지켜준다)', () => {
    mockDeterministicRandom()
    render(<ColorGenerator />)
    fireEvent.change(getInput(), { target: { value: '#3366ff' } })

    const list = screen.getByRole('list', { name: '생성된 5색 팔레트' })
    const originalHex = findLockButtonHex(list, false)

    fireEvent.change(getColorPicker(originalHex), { target: { value: '#00ff00' } })
    fireEvent.click(screen.getByRole('button', { name: '재생성' }))

    expect(screen.getByText('#00ff00')).toBeInTheDocument()
  })
})

describe('grain-2: 생성 모드 선택 (M-3)', () => {
  const MODE_LABELS = ['차분함', '밝음', '대비', '모노톤', '명도']

  it('팔레트가 있을 때 5개 생성 모드 버튼이 모두 노출된다', () => {
    render(<ColorGenerator />)
    fireEvent.change(getInput(), { target: { value: '#3366ff' } })

    const group = screen.getByRole('group', { name: '생성 모드 선택' })
    MODE_LABELS.forEach((label) => {
      expect(within(group).getByRole('button', { name: label })).toBeInTheDocument()
    })
  })

  it('생성 모드 버튼은 팔레트가 없을 때는 렌더링되지 않는다', () => {
    render(<ColorGenerator />)
    expect(screen.queryByRole('group', { name: '생성 모드 선택' })).not.toBeInTheDocument()
  })

  it('기본 생성 모드(차분함)가 처음부터 선택 표시된다', () => {
    render(<ColorGenerator />)
    fireEvent.change(getInput(), { target: { value: '#3366ff' } })

    expect(screen.getByRole('button', { name: '차분함' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('동일 브랜드 입력에서 5개 모드를 각각 선택하면 서로 다른 팔레트가 즉시 렌더링된다', () => {
    render(<ColorGenerator />)
    fireEvent.change(getInput(), { target: { value: '#3366ff' } })

    const list = screen.getByRole('list', { name: '생성된 5색 팔레트' })
    const signatures = MODE_LABELS.map((label) => {
      const button = screen.getByRole('button', { name: label })
      fireEvent.click(button)
      expect(button).toHaveAttribute('aria-pressed', 'true')
      return getHexes(list).join(',')
    })

    // Spec A's M-3: all 5 modes must produce a distinct palette for the same brand input.
    expect(new Set(signatures).size).toBe(MODE_LABELS.length)
  })

  it('모드를 전환해도 브랜드 메인 컬러 슬롯은 그대로 유지된다', () => {
    render(<ColorGenerator />)
    fireEvent.change(getInput(), { target: { value: '#3366ff' } })

    for (const label of ['밝음', '대비', '모노톤', '명도', '차분함']) {
      fireEvent.click(screen.getByRole('button', { name: label }))
      expect(screen.getByText('#3366ff')).toBeInTheDocument()
    }
  })

  it('파생 슬롯을 잠근 뒤 모드를 전환해도 잠긴 색상은 바뀌지 않는다', () => {
    render(<ColorGenerator />)
    fireEvent.change(getInput(), { target: { value: '#3366ff' } })

    const list = screen.getByRole('list', { name: '생성된 5색 팔레트' })
    const derivedLock = findLockButtonHex(list, false)
    fireEvent.click(screen.getByRole('button', { name: `${derivedLock} 색상 잠금 토글` }))

    fireEvent.click(screen.getByRole('button', { name: '밝음' }))
    expect(screen.getByText(derivedLock)).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '대비' }))
    expect(screen.getByText(derivedLock)).toBeInTheDocument()
  })
})
