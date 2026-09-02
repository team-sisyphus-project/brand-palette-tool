import { beforeEach, describe, expect, it, vi } from 'vitest'
import { generatePalette } from './palette'
import { loadRecentPalettes, saveRecentPalette, type RecentPaletteEntry } from './recentPalettes'

const STORAGE_KEY = 'color-palette-generator:recent-palettes'

function makeEntryInput(brandInput: string, overrides: Partial<Omit<RecentPaletteEntry, 'id' | 'savedAt'>> = {}) {
  const colors = generatePalette(brandInput, 'complementary')!
  return {
    brandInput,
    mode: 'complementary' as const,
    colors,
    locks: [true, false, false, false, false],
    ...overrides,
  }
}

describe('recentPalettes', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('loadRecentPalettes returns an empty array when nothing is stored', () => {
    expect(loadRecentPalettes()).toEqual([])
  })

  it('saveRecentPalette persists an entry retrievable via loadRecentPalettes', () => {
    saveRecentPalette(makeEntryInput('#3366ff'))
    const loaded = loadRecentPalettes()
    expect(loaded).toHaveLength(1)
    expect(loaded[0].brandInput).toBe('#3366ff')
  })

  it('round-trips exact colors, mode, and locks unchanged', () => {
    const input = makeEntryInput('#3366ff', { mode: 'triadic', locks: [true, true, false, false, true] })
    saveRecentPalette(input)

    const [loaded] = loadRecentPalettes()
    expect(loaded.mode).toBe('triadic')
    expect(loaded.locks).toEqual([true, true, false, false, true])
    expect(loaded.colors).toEqual(input.colors)
  })

  it('assigns a unique id and a savedAt timestamp to each saved entry', () => {
    saveRecentPalette(makeEntryInput('#3366ff'))
    saveRecentPalette(makeEntryInput('#ff0000'))

    const [newest, older] = loadRecentPalettes()
    expect(typeof newest.id).toBe('string')
    expect(newest.id).not.toBe(older.id)
    expect(typeof newest.savedAt).toBe('number')
  })

  it('keeps saved palettes newest-first', () => {
    saveRecentPalette(makeEntryInput('#3366ff'))
    saveRecentPalette(makeEntryInput('#ff0000'))
    saveRecentPalette(makeEntryInput('#00ff00'))

    const loaded = loadRecentPalettes()
    expect(loaded.map((entry) => entry.brandInput)).toEqual(['#00ff00', '#ff0000', '#3366ff'])
  })

  it('caps the stored list at 10 entries, dropping the oldest', () => {
    for (let i = 0; i < 12; i += 1) {
      // Each brand hex is distinct so no two of these collide via dedupe.
      const hex = `#${(i + 1).toString(16).padStart(6, '0')}`
      saveRecentPalette(makeEntryInput(hex))
    }

    const loaded = loadRecentPalettes()
    expect(loaded).toHaveLength(10)
    // The 2 oldest saves (hex 000001, 000002) were pushed out; the newest
    // save (hex 00000c, from i=11) is at the front.
    expect(loaded[0].brandInput).toBe('#00000c')
    expect(loaded.map((entry) => entry.brandInput)).not.toContain('#000001')
    expect(loaded.map((entry) => entry.brandInput)).not.toContain('#000002')
  })

  it('dedupes an identical color set, keeping only the newest save at the front', () => {
    const colors = generatePalette('#3366ff', 'complementary')!
    saveRecentPalette({ brandInput: '#3366ff', mode: 'complementary', colors, locks: [true, false, false, false, false] })
    saveRecentPalette({ brandInput: '#ff0000', mode: 'complementary', colors, locks: [true, false, false, false, false] })

    const loaded = loadRecentPalettes()
    expect(loaded).toHaveLength(1)
    expect(loaded[0].brandInput).toBe('#ff0000')
  })

  it('does not dedupe palettes with different color sets', () => {
    saveRecentPalette(makeEntryInput('#3366ff'))
    saveRecentPalette(makeEntryInput('#ff0000'))

    expect(loadRecentPalettes()).toHaveLength(2)
  })

  it('survives a "reload" (fresh read of the same localStorage) with colors/mode/locks intact', () => {
    const input = makeEntryInput('#123456', { mode: 'monochromatic', locks: [true, false, true, false, true] })
    saveRecentPalette(input)

    // Simulate a page refresh: nothing but localStorage carries state across.
    const reloaded = loadRecentPalettes()
    expect(reloaded[0].mode).toBe('monochromatic')
    expect(reloaded[0].locks).toEqual([true, false, true, false, true])
    expect(reloaded[0].colors).toEqual(input.colors)
  })

  it('returns [] and does not throw when the stored value is malformed JSON', () => {
    window.localStorage.setItem(STORAGE_KEY, '{not valid json')
    expect(loadRecentPalettes()).toEqual([])
  })

  it('returns [] when the stored value is valid JSON but not an array', () => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ oops: true }))
    expect(loadRecentPalettes()).toEqual([])
  })

  it('filters out individually corrupted entries while keeping valid ones', () => {
    const valid: RecentPaletteEntry = {
      id: 'a',
      savedAt: 1,
      brandInput: '#3366ff',
      mode: 'complementary',
      colors: generatePalette('#3366ff', 'complementary')!,
      locks: [true, false, false, false, false],
    }
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify([valid, { id: 'b', brandInput: '#ff0000' }, null, 'garbage']),
    )

    const loaded = loadRecentPalettes()
    expect(loaded).toHaveLength(1)
    expect(loaded[0].id).toBe('a')
  })

  it('is resilient to localStorage.setItem throwing (e.g. quota exceeded)', () => {
    const spy = vi.spyOn(window.localStorage.__proto__, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError')
    })

    expect(() => saveRecentPalette(makeEntryInput('#3366ff'))).not.toThrow()
    const result = saveRecentPalette(makeEntryInput('#3366ff'))
    expect(result[0].brandInput).toBe('#3366ff')

    spy.mockRestore()
  })
})
