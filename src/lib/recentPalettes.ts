/**
 * Recent-palette storage: keeps the last few saved palettes in localStorage
 * so a user can later re-select one and get back to the exact same colors,
 * generation mode, and lock state without regenerating from scratch (spec C
 * "최근 생성 팔레트 로컬 저장 관리", M-3). Mirrors theme.ts's storage
 * pattern: a single module-scope localStorage key, defensive parse/validate
 * on read, plain synchronous read/write on save - no framework state lives
 * in this module itself.
 *
 * (assumption — needs confirmation) *When* to call `saveRecentPalette` is a
 * product decision spec C's text doesn't name explicitly (it only says
 * "최근 생성 팔레트 로컬 저장 관리", not a trigger). This grain assumes: on
 * Regenerate, on generation-mode change, and on a manual per-slot color
 * edit - but never on every input keystroke, since a palette that hasn't
 * been acted on yet isn't a "saved" one worth cluttering the recent list
 * with (see ColorGenerator.tsx wiring).
 */

import {
  GENERATION_MODES,
  PALETTE_SIZE,
  hexToRgb,
  type GenerationMode,
  type Locks,
  type PaletteColor,
} from './palette'

/** localStorage key for the user's saved recent-palette list. */
const STORAGE_KEY = 'color-palette-generator:recent-palettes'

/** Maximum number of recent palettes retained; oldest beyond this are dropped. */
const MAX_ENTRIES = 10

/**
 * One saved palette snapshot: everything needed to restore the generator to
 * the exact same on-screen state - the brand input text, the generation
 * mode, every slot's full color data, and the per-slot lock state.
 */
export interface RecentPaletteEntry {
  id: string
  savedAt: number
  brandInput: string
  mode: GenerationMode
  colors: PaletteColor[]
  locks: Locks
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

function isRgb(value: unknown): value is PaletteColor['rgb'] {
  if (typeof value !== 'object' || value === null) return false
  const rgb = value as Record<string, unknown>
  return ['r', 'g', 'b'].every((key) => isFiniteNumber(rgb[key]))
}

function isHsl(value: unknown): value is PaletteColor['hsl'] {
  if (typeof value !== 'object' || value === null) return false
  const hsl = value as Record<string, unknown>
  return isFiniteNumber(hsl.h) && isFiniteNumber(hsl.s) && isFiniteNumber(hsl.l)
}

function isPaletteColor(value: unknown): value is PaletteColor {
  if (typeof value !== 'object' || value === null) return false
  const color = value as Record<string, unknown>
  return (
    typeof color.hex === 'string' &&
    hexToRgb(color.hex) !== null &&
    isRgb(color.rgb) &&
    isHsl(color.hsl)
  )
}

function isGenerationMode(value: unknown): value is GenerationMode {
  return typeof value === 'string' && (GENERATION_MODES as string[]).includes(value)
}

function isLocks(value: unknown): value is Locks {
  return (
    Array.isArray(value) && value.length === PALETTE_SIZE && value.every((item) => typeof item === 'boolean')
  )
}

/**
 * Validates one parsed entry before it re-enters app state - defends against
 * hand-edited/corrupted localStorage content the same way theme.ts's
 * `isTheme` guards its single stored string.
 */
function isRecentPaletteEntry(value: unknown): value is RecentPaletteEntry {
  if (typeof value !== 'object' || value === null) return false
  const entry = value as Record<string, unknown>
  return (
    typeof entry.id === 'string' &&
    isFiniteNumber(entry.savedAt) &&
    typeof entry.brandInput === 'string' &&
    isGenerationMode(entry.mode) &&
    Array.isArray(entry.colors) &&
    entry.colors.length === PALETTE_SIZE &&
    entry.colors.every(isPaletteColor) &&
    isLocks(entry.locks)
  )
}

/**
 * Reads the saved recent-palette list, newest first (the stored array is
 * already kept in that order by `saveRecentPalette`). Returns `[]` when
 * nothing is stored, or when the stored value is missing/malformed/corrupted
 * (defensive parse, mirroring theme.ts) rather than throwing - a broken
 * localStorage value degrades to "no recent palettes", never a crash.
 */
export function loadRecentPalettes(): RecentPaletteEntry[] {
  let raw: string | null
  try {
    raw = window.localStorage.getItem(STORAGE_KEY)
  } catch {
    return []
  }
  if (!raw) return []

  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return []
  }

  if (!Array.isArray(parsed)) return []
  return parsed.filter(isRecentPaletteEntry)
}

/** Dedupe key for a palette: its exact ordered HEX sequence ("identical color set"). */
function colorSignature(colors: PaletteColor[]): string {
  return colors.map((color) => color.hex).join(',')
}

/** Generates a per-entry id; prefers `crypto.randomUUID` where available. */
function generateId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`
}

/**
 * Saves a new recent-palette snapshot and returns the updated list
 * (newest-first, already persisted to localStorage).
 *
 * - Prepends a fresh entry (own generated `id`/`savedAt`) built from the
 *   given brand input, mode, colors, and locks.
 * - Dedupes by exact color signature (`colorSignature`): a prior entry with
 *   the identical ordered HEX sequence is dropped first, so re-saving the
 *   same visual palette doesn't clutter the recent list with near-duplicates.
 * - Caps the list at `MAX_ENTRIES`, dropping the oldest entries beyond that.
 *
 * localStorage writes are best-effort: if `setItem` throws (quota exceeded,
 * private-mode restrictions), the computed in-memory list is still returned
 * so the caller isn't blocked, even though persistence silently failed.
 */
export function saveRecentPalette(
  entry: Omit<RecentPaletteEntry, 'id' | 'savedAt'>,
): RecentPaletteEntry[] {
  const signature = colorSignature(entry.colors)
  const deduped = loadRecentPalettes().filter((existing) => colorSignature(existing.colors) !== signature)

  const fullEntry: RecentPaletteEntry = {
    id: generateId(),
    savedAt: Date.now(),
    ...entry,
  }

  const next = [fullEntry, ...deduped].slice(0, MAX_ENTRIES)

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  } catch {
    // Best-effort persistence; see doc comment above.
  }

  return next
}
