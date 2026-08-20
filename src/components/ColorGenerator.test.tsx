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

  it('브랜드 슬롯의 잠금 토글 버튼 자체를 클릭해 잠금을 해제/재잠금할 수 있다', () => {
    render(<ColorGenerator />)
    fireEvent.change(getInput(), { target: { value: '#3366ff' } })

    const brandLock = screen.getByRole('button', { name: '#3366ff 색상 잠금 토글' })
    expect(brandLock).toHaveAttribute('aria-pressed', 'true')

    fireEvent.click(brandLock)
    expect(brandLock).toHaveAttribute('aria-pressed', 'false')

    fireEvent.click(brandLock)
    expect(brandLock).toHaveAttribute('aria-pressed', 'true')
  })

  it('브랜드 슬롯의 잠금을 해제하고 재생성해도 브랜드 컬러 값 자체는 입력값을 그대로 반영한다', () => {
    mockDeterministicRandom()
    render(<ColorGenerator />)
    fireEvent.change(getInput(), { target: { value: '#3366ff' } })

    fireEvent.click(screen.getByRole('button', { name: '#3366ff 색상 잠금 토글' }))
    fireEvent.click(screen.getByRole('button', { name: '재생성' }))

    // The brand slot always reflects the current brand input regardless of
    // its own lock state (regeneratePalette's contract) - unlocking it does
    // not make it drift to some other derived color.
    expect(screen.getByText('#3366ff')).toBeInTheDocument()
  })

  it('여러 파생 슬롯을 동시에 잠그고 반복 재생성해도 잠근 슬롯들만 불변이고 나머지는 계속 변한다', () => {
    mockDeterministicRandom()
    render(<ColorGenerator />)
    fireEvent.change(getInput(), { target: { value: '#3366ff' } })

    const list = screen.getByRole('list', { name: '생성된 5색 팔레트' })
    const lockButtons = within(list).getAllByRole('button', { name: /색상 잠금 토글/ })
    const unlockedButtons = lockButtons.filter(
      (button) => button.getAttribute('aria-pressed') === 'false',
    )
    // Lock 2 of the 4 derived slots simultaneously (brand slot is already locked).
    const [firstToLock, secondToLock] = unlockedButtons
    const lockedHexes = [firstToLock, secondToLock].map(
      (button) => button.getAttribute('aria-label')!.split(' ')[0],
    )

    fireEvent.click(firstToLock)
    fireEvent.click(secondToLock)
    expect(firstToLock).toHaveAttribute('aria-pressed', 'true')
    expect(secondToLock).toHaveAttribute('aria-pressed', 'true')

    const regenerateButton = screen.getByRole('button', { name: '재생성' })
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

  it('무채색(#000000) 브랜드 입력과 잠금 조합에서도 NaN 없이 잠근 색은 불변, 나머지는 재생성된다', () => {
    mockDeterministicRandom()
    render(<ColorGenerator />)
    fireEvent.change(getInput(), { target: { value: '#000000' } })

    const list = screen.getByRole('list', { name: '생성된 5색 팔레트' })
    const lockButtons = within(list).getAllByRole('button', { name: /색상 잠금 토글/ })
    const derivedLock = lockButtons.find((button) => button.getAttribute('aria-pressed') === 'false')!
    const lockedHex = derivedLock.getAttribute('aria-label')!.split(' ')[0]
    fireEvent.click(derivedLock)

    const regenerateButton = screen.getByRole('button', { name: '재생성' })
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

  it('무채색(#ffffff) 브랜드 입력과 잠금 조합에서도 NaN 없이 잠근 색은 불변, 나머지는 재생성된다', () => {
    mockDeterministicRandom()
    render(<ColorGenerator />)
    fireEvent.change(getInput(), { target: { value: '#ffffff' } })

    const list = screen.getByRole('list', { name: '생성된 5색 팔레트' })
    const lockButtons = within(list).getAllByRole('button', { name: /색상 잠금 토글/ })
    const derivedLock = lockButtons.find((button) => button.getAttribute('aria-pressed') === 'false')!
    const lockedHex = derivedLock.getAttribute('aria-label')!.split(' ')[0]
    fireEvent.click(derivedLock)

    const regenerateButton = screen.getByRole('button', { name: '재생성' })
    fireEvent.click(regenerateButton)
    fireEvent.click(regenerateButton)

    expect(screen.getByText(lockedHex)).toBeInTheDocument()
    within(list)
      .getAllByRole('listitem')
      .forEach((item) => {
        expect(within(item).getByText(/^#[0-9a-f]{6}$/)).toBeInTheDocument()
      })
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

// grain-1 (컬러 피커 연동 즉시 반영): PaletteSwatch의 input[type=color] ->
// Palette.onColorChange -> ColorGenerator.handleSlotColorChange ->
// updateSlotColor -> setRegenerated 경로 전체를 컴포넌트 레벨에서 검증한다.
//
// Note: updateSlotColor는 잘못된 hex 입력 시 원본 palette 참조를 그대로
// 반환해 조용히 no-op한다(code-analysis/risks.md "잘못된 슬롯 색상 수정에
// 대한 무음 실패"). 네이티브 `input[type=color]`는 브라우저가 항상 유효한
// 6자리 hex 값만 change 이벤트로 내보내므로 이 경로는 native picker로는
// 재현 불가능하다 — 여기서는 이 사실만 주석으로 남기고 동작 변경이나 새
// 에러 UI는 추가하지 않는다(Out of scope).
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

  it('컬러 피커로 브랜드 슬롯 색상을 변경해도 잠금 상태(aria-pressed)는 그대로 유지된다', () => {
    render(<ColorGenerator />)
    fireEvent.change(getInput(), { target: { value: '#3366ff' } })

    fireEvent.change(getColorPicker('#3366ff'), { target: { value: '#123456' } })

    const brandLock = screen.getByRole('button', { name: '#123456 색상 잠금 토글' })
    expect(brandLock).toHaveAttribute('aria-pressed', 'true')
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
  const MODE_LABELS = ['보색', '유사색', '트라이애딕', '스플릿보색', '모노크로매틱']

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

  it('기본 생성 모드(보색)가 처음부터 선택 표시된다', () => {
    render(<ColorGenerator />)
    fireEvent.change(getInput(), { target: { value: '#3366ff' } })

    expect(screen.getByRole('button', { name: '보색' })).toHaveAttribute('aria-pressed', 'true')
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

    for (const label of ['유사색', '트라이애딕', '스플릿보색', '모노크로매틱', '보색']) {
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

    fireEvent.click(screen.getByRole('button', { name: '유사색' }))
    expect(screen.getByText(derivedLock)).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '트라이애딕' }))
    expect(screen.getByText(derivedLock)).toBeInTheDocument()
  })
})
