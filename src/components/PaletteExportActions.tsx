import { useEffect, useRef, useState } from 'react'
import type { PaletteColor } from '../lib/palette'
import {
  paletteToCssVariablesText,
  paletteToHexList,
  validateCssVariablesText,
} from '../lib/paletteExport'
import './PaletteExportActions.css'

export interface PaletteExportActionsProps {
  /** The currently generated/edited palette to copy from. */
  palette: PaletteColor[]
}

/** How long a copy result stays on screen before clearing itself. */
const FEEDBACK_TIMEOUT_MS = 2000

interface CopyFeedback {
  kind: 'success' | 'error'
  message: string
}

/**
 * Spec C "HEX 코드 일괄 복사" / "CSS 변수 형식 복사" (M-1): two buttons that
 * copy the current palette to the clipboard via `navigator.clipboard.writeText`,
 * using grain-1's pure formatters (`paletteToHexList` /
 * `paletteToCssVariablesText`) for the copied text itself. This component
 * owns no color/text logic of its own - it only wires those formatters to
 * the Clipboard API and surfaces a transient success/failure message.
 *
 * Button styling reuses the existing secondary bordered button pattern (see
 * ThemeToggle.css's `.theme-toggle`) rather than introducing a new visual
 * pattern, since these are secondary palette actions like the theme toggle,
 * not the primary Regenerate action. The only genuinely new design decision
 * here is the success feedback color pair (`--color-state-success` /
 * `--color-state-success-bg` in src/index.css), recorded in the design
 * spec's color Token Group since no "success" counterpart to the existing
 * `--color-state-error` existed yet.
 *
 * The CSS variables copy is defense-in-depth checked with
 * `validateCssVariablesText` before it ever reaches the clipboard: if that
 * ever fails it is a bug in `paletteToCssVariablesText` itself (grain-1's
 * own tests already guarantee it never does), so this never surfaces a
 * user-facing message for it - it only avoids ever copying malformed text.
 */
export function PaletteExportActions({ palette }: PaletteExportActionsProps) {
  const [feedback, setFeedback] = useState<CopyFeedback | null>(null)
  const clearTimeoutRef = useRef<number | null>(null)

  useEffect(() => {
    return () => {
      if (clearTimeoutRef.current !== null) window.clearTimeout(clearTimeoutRef.current)
    }
  }, [])

  const copyText = async (text: string, successMessage: string) => {
    try {
      if (!navigator.clipboard) {
        throw new Error('Clipboard API unavailable')
      }
      await navigator.clipboard.writeText(text)
      setFeedback({ kind: 'success', message: successMessage })
    } catch {
      setFeedback({ kind: 'error', message: 'Copy failed. Please try again.' })
    } finally {
      if (clearTimeoutRef.current !== null) window.clearTimeout(clearTimeoutRef.current)
      clearTimeoutRef.current = window.setTimeout(() => setFeedback(null), FEEDBACK_TIMEOUT_MS)
    }
  }

  const handleCopyHex = () => {
    copyText(paletteToHexList(palette), 'HEX codes copied!')
  }

  const handleCopyCssVariables = () => {
    const text = paletteToCssVariablesText(palette)
    if (!validateCssVariablesText(text).valid) return
    copyText(text, 'CSS variables copied!')
  }

  return (
    <div className="palette-export">
      <div className="palette-export__actions">
        <button type="button" className="palette-export__button" onClick={handleCopyHex}>
          Copy HEX
        </button>
        <button type="button" className="palette-export__button" onClick={handleCopyCssVariables}>
          Copy CSS Variables
        </button>
      </div>
      {feedback && (
        <p
          className={`palette-export__feedback palette-export__feedback--${feedback.kind}`}
          role="status"
          aria-live="polite"
        >
          {feedback.message}
        </p>
      )}
    </div>
  )
}
