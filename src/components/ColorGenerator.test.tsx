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
})
