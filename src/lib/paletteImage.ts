/**
 * Renders the current palette onto a canvas as a downloadable PNG snapshot -
 * spec C "file export (PNG...)". Draws one row per palette slot: a filled
 * color swatch, its HEX code, and its mapped role label
 * (`roleForSlot` from paletteExport.ts, so the PNG and JSON exports never
 * disagree on role names).
 *
 * Pure Canvas API usage only: creates an off-screen `<canvas>` via
 * `document.createElement('canvas')` but never appends it to the document
 * (Boundary: "no DOM insertion"). No file I/O either - `paletteToPngBlob`
 * only returns the encoded `Blob`; the caller decides what to do with it
 * (e.g. trigger a download), same division of labor as `paletteExport.ts`.
 */

import { BRAND_SLOT_INDEX, type PaletteColor } from './palette'
import { roleForSlot } from './paletteExport'

/**
 * Layout & color decisions for the PNG snapshot. No visual/typography Token
 * Group existed in the design spec yet (checked `$GENOSIS_SPEC_PATH` before
 * choosing these - only `content-copy` was registered), so per
 * `policy/coding.md` "when no definition exists" these values are new - but not
 * invented from scratch: they mirror this project's existing, already-used
 * design tokens (`src/index.css`, `src/components/PaletteSwatch.css`) so
 * the PNG matches the on-screen palette's look. The PNG is a static file
 * with no dark-mode concept, so it always uses the *light* theme's literal
 * values (canvas cannot read CSS custom properties without inserting an
 * element into the DOM, which the Boundary forbids). Recorded in the design
 * spec's `color`/`typography` Token Groups (grain-2).
 */
export const PNG_CANVAS_WIDTH = 480
export const PNG_PADDING = 24 // --space-5
const SWATCH_SIZE = 64 // --space-9
const SWATCH_RADIUS = 12 // --radius-card
const ROW_GAP = 16 // --space-4 / --element-gap-md
const TEXT_GAP = 16 // --space-4, swatch -> text column

const CANVAS_BACKGROUND = '#ffffff' // --color-system-bg-primary (light)
const SWATCH_BORDER_COLOR = 'rgba(60, 60, 67, 0.29)' // --border-subtle (light)
const HEX_TEXT_COLOR = 'rgba(60, 60, 67, 0.75)' // --color-text-secondary (light)
const ROLE_TEXT_COLOR = 'rgba(0, 0, 0, 0.85)' // --color-text-primary (light)

const HEX_FONT = '13px ui-monospace, "SF Mono", Menlo, monospace' // --font-mono / --text-mono-md / --weight-mono-regular
const ROLE_FONT =
  '500 13px -apple-system, "SF Pro Text", "Segoe UI", Roboto, sans-serif' // --font-text / --text-body-sm / --weight-text-medium

/** Row height for one palette slot: the swatch's own height drives it (text is shorter). */
function rowHeight(): number {
  return SWATCH_SIZE
}

/** Total canvas height for a palette of `slotCount` colors, given the layout constants above. */
export function paletteImageHeight(slotCount: number): number {
  if (slotCount <= 0) return PNG_PADDING * 2
  return PNG_PADDING * 2 + slotCount * rowHeight() + (slotCount - 1) * ROW_GAP
}

/** Draws a rounded-rectangle path (no fill/stroke) via basic path primitives, portable across canvas 2D context implementations. */
function traceRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
): void {
  ctx.beginPath()
  ctx.moveTo(x + radius, y)
  ctx.lineTo(x + width - radius, y)
  ctx.arcTo(x + width, y, x + width, y + radius, radius)
  ctx.lineTo(x + width, y + height - radius)
  ctx.arcTo(x + width, y + height, x + width - radius, y + height, radius)
  ctx.lineTo(x + radius, y + height)
  ctx.arcTo(x, y + height, x, y + height - radius, radius)
  ctx.lineTo(x, y + radius)
  ctx.arcTo(x, y, x + radius, y, radius)
  ctx.closePath()
}

/**
 * Draws every palette slot (swatch + hex + role label) onto an already-sized
 * 2D context, top to bottom in slot order. Pure drawing - no canvas
 * creation/sizing here, so it is reusable and directly testable against a
 * mocked context.
 */
export function drawPaletteToContext(ctx: CanvasRenderingContext2D, palette: PaletteColor[]): void {
  const height = paletteImageHeight(palette.length)

  ctx.fillStyle = CANVAS_BACKGROUND
  ctx.fillRect(0, 0, PNG_CANVAS_WIDTH, height)

  ctx.textBaseline = 'middle'
  ctx.textAlign = 'left'
  ctx.lineWidth = 1

  palette.forEach((color, index) => {
    const x = PNG_PADDING
    const y = PNG_PADDING + index * (rowHeight() + ROW_GAP)

    traceRoundedRect(ctx, x, y, SWATCH_SIZE, SWATCH_SIZE, SWATCH_RADIUS)
    ctx.fillStyle = color.hex
    ctx.fill()
    ctx.strokeStyle = SWATCH_BORDER_COLOR
    ctx.stroke()

    const textX = x + SWATCH_SIZE + TEXT_GAP
    const centerY = y + SWATCH_SIZE / 2

    ctx.font = HEX_FONT
    ctx.fillStyle = HEX_TEXT_COLOR
    ctx.fillText(color.hex.toUpperCase(), textX, centerY - 10)

    ctx.font = ROLE_FONT
    ctx.fillStyle = ROLE_TEXT_COLOR
    ctx.fillText(roleForSlot(index), textX, centerY + 10)
  })
}

/**
 * Builds a fully rendered, off-screen `<canvas>` element for the given
 * palette. Not inserted into the document (Boundary). Throws if a 2D
 * context cannot be obtained (defensive - every real browser supports it).
 */
export function paletteToPngCanvas(palette: PaletteColor[]): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = PNG_CANVAS_WIDTH
  canvas.height = paletteImageHeight(palette.length)

  const ctx = canvas.getContext('2d')
  if (!ctx) {
    throw new Error('paletteToPngCanvas: could not obtain a 2D canvas context')
  }

  drawPaletteToContext(ctx, palette)
  return canvas
}

/**
 * Renders the palette and encodes it as a PNG `Blob` - the "PNG file...
 * download" feature (spec C). Wraps the callback-based `canvas.toBlob` in a
 * Promise; rejects if encoding fails (canvas.toBlob calls back with `null`).
 */
export function paletteToPngBlob(palette: PaletteColor[]): Promise<Blob> {
  const canvas = paletteToPngCanvas(palette)

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob)
      } else {
        reject(new Error('paletteToPngBlob: canvas.toBlob produced no blob'))
      }
    }, 'image/png')
  })
}

/** Zero-padded `YYYYMMDD` for a local `Date` - mirrors `paletteExport.ts`'s own (unexported) date formatter. */
function formatYyyyMmDd(date: Date): string {
  const year = date.getFullYear().toString().padStart(4, '0')
  const month = (date.getMonth() + 1).toString().padStart(2, '0')
  const day = date.getDate().toString().padStart(2, '0')
  return `${year}${month}${day}`
}

/**
 * Builds the PNG export filename: `brand-palette-{HEX}-{YYYYMMDD}.png`,
 * mirroring `paletteJsonFilename`'s convention (same brand-hex + date
 * pattern spec C prescribes for every export format) so re-downloading the
 * same palette on a different day - or downloading the same palette as
 * both JSON and PNG - never collides and always identifies its own format.
 * `date` defaults to `new Date()` but is injectable for deterministic tests.
 */
export function palettePngFilename(palette: PaletteColor[], date: Date = new Date()): string {
  const brandHex = palette[BRAND_SLOT_INDEX]?.hex.replace('#', '') ?? 'palette'
  return `brand-palette-${brandHex}-${formatYyyyMmDd(date)}.png`
}
