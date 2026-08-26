import { useEffect, useRef, useState } from 'react'
import type { GenerationMode, PaletteColor } from '../lib/palette'
import {
  paletteJsonFilename,
  paletteToCssVariablesText,
  paletteToHexList,
  paletteToJsonText,
  validateCssVariablesText,
} from '../lib/paletteExport'
import { paletteToPngBlob, palettePngFilename } from '../lib/paletteImage'
import { buildMarkdownExportText, paletteMarkdownFilename } from '../lib/paletteMarkdownExport'
import './PaletteExportActions.css'

export interface PaletteExportActionsProps {
  /** The currently generated/edited palette to copy from. */
  palette: PaletteColor[]
  /** The generation mode the palette was built with (spec C .md export item 3). */
  mode: GenerationMode
  /** The palette's current mood tags, from `getMoodTags` (spec C .md export item 4). */
  moodTags: string[]
  /** The palette's current aesthetic archetype match, or `null` when out of threshold (spec C .md export item 4). */
  aestheticMatch: string | null
}

/** How long a copy result stays on screen before clearing itself. */
const FEEDBACK_TIMEOUT_MS = 2000

interface CopyFeedback {
  kind: 'success' | 'error'
  message: string
}

/**
 * Triggers a browser file download for `blob` named `filename`, via a
 * throwaway `<a download>` element and an object URL - the standard
 * client-side "save this Blob as a file" pattern. The object URL is
 * revoked immediately after the click so it does not leak.
 */
function triggerBlobDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  try {
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  } finally {
    URL.revokeObjectURL(url)
  }
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
 *
 * Spec C "파일 내보내기 (PNG, JSON...)" (M-2): two more buttons ("Download
 * PNG" / "Download JSON") that build a `Blob` via grain-1's
 * `paletteToJsonText` / grain-2's `paletteToPngBlob` and hand it to the
 * browser through a throwaway `<a download>` + `URL.createObjectURL(...)`
 * object URL (`triggerBlobDownload` below) - the standard client-side file
 * download pattern, no server round-trip. Same division of labor as the
 * copy buttons: this component only calls the lib builders and wires the
 * result to the DOM/Blob APIs, it never computes color/role data itself.
 * Reuses the existing `.palette-export__button` pattern (see above) rather
 * than introducing a new button style, since these are the same class of
 * secondary palette action as the copy buttons - no new design decision
 * needed here.
 *
 * Spec C "LLM 입력용 Markdown(.md) 내보내기" (M-4): a "Download MD" button
 * that builds a `Blob` via grain-1's `buildMarkdownExportText` (fed with
 * `mode`/`moodTags`/`aestheticMatch` sourced one level up from
 * `ColorGenerator`'s own state/memo values, since this component computes
 * none of that itself) and downloads it via the same `triggerBlobDownload`
 * path as PNG/JSON. The "Download MD" label and "MD downloaded!" feedback
 * follow the `action-label-download` / `feedback-download-success` semantic
 * tokens (content-copy/base) shared with the PNG/JSON buttons.
 */
export function PaletteExportActions({
  palette,
  mode,
  moodTags,
  aestheticMatch,
}: PaletteExportActionsProps) {
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

  const showFeedback = (feedbackToShow: CopyFeedback) => {
    setFeedback(feedbackToShow)
    if (clearTimeoutRef.current !== null) window.clearTimeout(clearTimeoutRef.current)
    clearTimeoutRef.current = window.setTimeout(() => setFeedback(null), FEEDBACK_TIMEOUT_MS)
  }

  const handleDownloadJson = () => {
    try {
      const blob = new Blob([paletteToJsonText(palette)], { type: 'application/json' })
      triggerBlobDownload(blob, paletteJsonFilename(palette))
      showFeedback({ kind: 'success', message: 'JSON downloaded!' })
    } catch {
      showFeedback({ kind: 'error', message: 'Download failed. Please try again.' })
    }
  }

  const handleDownloadPng = async () => {
    try {
      const blob = await paletteToPngBlob(palette)
      triggerBlobDownload(blob, palettePngFilename(palette))
      showFeedback({ kind: 'success', message: 'PNG downloaded!' })
    } catch {
      showFeedback({ kind: 'error', message: 'Download failed. Please try again.' })
    }
  }

  const handleDownloadMd = () => {
    try {
      const text = buildMarkdownExportText(palette, mode, moodTags, aestheticMatch)
      const blob = new Blob([text], { type: 'text/markdown' })
      triggerBlobDownload(blob, paletteMarkdownFilename(palette))
      showFeedback({ kind: 'success', message: 'MD downloaded!' })
    } catch {
      showFeedback({ kind: 'error', message: 'Download failed. Please try again.' })
    }
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
        <button type="button" className="palette-export__button" onClick={handleDownloadPng}>
          Download PNG
        </button>
        <button type="button" className="palette-export__button" onClick={handleDownloadJson}>
          Download JSON
        </button>
        <button type="button" className="palette-export__button" onClick={handleDownloadMd}>
          Download MD
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
