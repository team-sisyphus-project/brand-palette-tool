import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ThemeToggle } from './ThemeToggle'

describe('ThemeToggle', () => {
  it('renders as an off switch when theme is light', () => {
    render(<ThemeToggle theme="light" onToggle={() => {}} />)
    const button = screen.getByRole('switch', { name: 'Switch to dark theme' })
    expect(button).toHaveAttribute('aria-checked', 'false')
    expect(button).toHaveTextContent('Light')
  })

  it('renders as an on switch when theme is dark', () => {
    render(<ThemeToggle theme="dark" onToggle={() => {}} />)
    const button = screen.getByRole('switch', { name: 'Switch to light theme' })
    expect(button).toHaveAttribute('aria-checked', 'true')
    expect(button).toHaveTextContent('Dark')
  })

  it('calls onToggle when clicked', () => {
    const onToggle = vi.fn()
    render(<ThemeToggle theme="light" onToggle={onToggle} />)
    fireEvent.click(screen.getByRole('switch'))
    expect(onToggle).toHaveBeenCalledTimes(1)
  })
})
