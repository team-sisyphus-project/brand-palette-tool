import type { RecentPaletteEntry } from '../lib/recentPalettes'
import './RecentPalettes.css'

export interface RecentPalettesProps {
  /** Saved palette snapshots, newest first (recentPalettes.ts's load/save order). */
  entries: RecentPaletteEntry[]
  /** Called with the full entry when the user clicks it to restore that exact palette. */
  onSelect: (entry: RecentPaletteEntry) => void
}

/** Formats a saved-at timestamp for display, e.g. "8/26/2026, 3:04:00 PM". */
function formatSavedAt(savedAt: number): string {
  return new Date(savedAt).toLocaleString()
}

/**
 * Spec C "최근 생성 팔레트 로컬 저장 관리" (M-3): lists the palettes
 * recentPalettes.ts has saved, newest first, each as a thumbnail strip of
 * its 5 colors plus a saved-at timestamp. Purely presentational - it owns no
 * state and computes nothing itself; ColorGenerator supplies `entries` (from
 * recentPalettes.ts's load/save return value) and reacts to `onSelect` by
 * restoring that exact entry's inputValue/mode/locks/colors verbatim,
 * bypassing regeneration entirely (see ColorGenerator's handleSelectRecent -
 * it writes the entry's saved `colors` straight into `regenerated` state,
 * the same slot Regenerate/mode-change/manual-edit use to short-circuit the
 * derived `basePalette`, so the exact original palette reappears on screen
 * instead of being recomputed from the restored brand input).
 *
 * Renders nothing when there are no saved entries yet, so an empty recent
 * list never shows an empty section before anything has been saved.
 */
export function RecentPalettes({ entries, onSelect }: RecentPalettesProps) {
  if (entries.length === 0) return null

  return (
    <section className="recent-palettes" aria-label="Recent palettes">
      <h2 className="recent-palettes__heading">Recent Palettes</h2>
      <ul className="recent-palettes__list" aria-label="Recent palettes list">
        {entries.map((entry) => (
          <li className="recent-palettes__item" key={entry.id}>
            <button
              type="button"
              className="recent-palettes__entry"
              onClick={() => onSelect(entry)}
              aria-label={`Restore palette saved ${formatSavedAt(entry.savedAt)}`}
            >
              <span className="recent-palettes__swatches" aria-hidden="true">
                {entry.colors.map((color, index) => (
                  <span
                    key={`${entry.id}-${index}`}
                    className="recent-palettes__swatch"
                    style={{ backgroundColor: color.hex }}
                  />
                ))}
              </span>
              <span className="recent-palettes__timestamp">{formatSavedAt(entry.savedAt)}</span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}
