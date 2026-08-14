import '@testing-library/jest-dom/vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ColorGenerator } from './ColorGenerator'

function getInput(): HTMLInputElement {
  return screen.getByLabelText('브랜드 메인 컬러') as HTMLInputElement
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
})
