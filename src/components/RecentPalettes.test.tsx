import '@testing-library/jest-dom/vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { generatePalette } from '../lib/palette'
import type { RecentPaletteEntry } from '../lib/recentPalettes'
import { RecentPalettes } from './RecentPalettes'

function makeEntry(overrides: Partial<RecentPaletteEntry> = {}): RecentPaletteEntry {
  return {
    id: 'entry-1',
    savedAt: new Date('2026-08-26T12:00:00Z').getTime(),
    brandInput: '#3366ff',
    mode: 'complementary',
    colors: generatePalette('#3366ff', 'complementary')!,
    locks: [true, false, false, false, false],
    ...overrides,
  }
}

describe('RecentPalettes', () => {
  it('renders nothing when there are no entries', () => {
    const { container } = render(<RecentPalettes entries={[]} onSelect={vi.fn()} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('renders one list item per entry, with a thumbnail swatch per color', () => {
    const entries = [makeEntry({ id: 'a' }), makeEntry({ id: 'b', brandInput: '#ff0000' })]
    render(<RecentPalettes entries={entries} onSelect={vi.fn()} />)

    const list = screen.getByRole('list', { name: 'Recent palettes list' })
    const items = within(list).getAllByRole('listitem')
    expect(items).toHaveLength(2)
    items.forEach((item) => {
      expect(item.querySelectorAll('.recent-palettes__swatch')).toHaveLength(5)
    })
  })

  it('shows a saved-at timestamp for each entry', () => {
    render(<RecentPalettes entries={[makeEntry()]} onSelect={vi.fn()} />)
    const expected = new Date('2026-08-26T12:00:00Z').toLocaleString()
    expect(screen.getByText(expected)).toBeInTheDocument()
  })

  it('calls onSelect with the exact clicked entry', () => {
    const entries = [makeEntry({ id: 'a' }), makeEntry({ id: 'b', brandInput: '#ff0000' })]
    const onSelect = vi.fn()
    render(<RecentPalettes entries={entries} onSelect={onSelect} />)

    const list = screen.getByRole('list', { name: 'Recent palettes list' })
    const buttons = within(list).getAllByRole('button')
    fireEvent.click(buttons[1])

    expect(onSelect).toHaveBeenCalledTimes(1)
    expect(onSelect).toHaveBeenCalledWith(entries[1])
  })
})
