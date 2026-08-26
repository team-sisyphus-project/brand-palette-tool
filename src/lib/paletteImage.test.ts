import { afterEach, describe, expect, it, vi } from 'vitest'
import { generatePalette } from './palette'
import { roleForSlot } from './paletteExport'
import {
  PNG_CANVAS_WIDTH,
  drawPaletteToContext,
  paletteImageHeight,
  palettePngFilename,
  paletteToPngBlob,
  paletteToPngCanvas,
} from './paletteImage'

const samplePalette = generatePalette('#3366ff')!

/** Minimal recording stub of `CanvasRenderingContext2D`: records every call to the methods this module uses, without touching a real rendering backend. */
function createMockContext() {
  const calls = {
    fillRect: [] as unknown[][],
    fillText: [] as unknown[][],
    fill: 0,
    stroke: 0,
  }

  const ctx = {
    get fillStyle() {
      return this._fillStyle
    },
    set fillStyle(value: string) {
      this._fillStyle = value
    },
    _fillStyle: '',
    strokeStyle: '',
    lineWidth: 0,
    font: '',
    textBaseline: '',
    textAlign: '',
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    arcTo: vi.fn(),
    closePath: vi.fn(),
    fillRect: vi.fn((...args: unknown[]) => calls.fillRect.push(args)),
    fillText: vi.fn((...args: unknown[]) => calls.fillText.push(args)),
    fill: vi.fn(() => {
      calls.fill += 1
    }),
    stroke: vi.fn(() => {
      calls.stroke += 1
    }),
  }

  return { ctx: ctx as unknown as CanvasRenderingContext2D, calls }
}

describe('paletteImageHeight', () => {
  it('grows linearly with slot count and accounts for padding + gaps', () => {
    const oneSlot = paletteImageHeight(1)
    const twoSlots = paletteImageHeight(2)
    expect(twoSlots).toBeGreaterThan(oneSlot)
    expect(paletteImageHeight(5)).toBe(paletteImageHeight(1) + 4 * (twoSlots - oneSlot))
  })

  it('returns just the padding for an empty palette', () => {
    expect(paletteImageHeight(0)).toBeGreaterThan(0)
  })
})

describe('drawPaletteToContext', () => {
  it('fills the canvas background before drawing anything else', () => {
    const { ctx, calls } = createMockContext()
    drawPaletteToContext(ctx, samplePalette)

    expect(calls.fillRect).toHaveLength(1)
    expect(calls.fillRect[0][0]).toBe(0)
    expect(calls.fillRect[0][1]).toBe(0)
    expect(calls.fillRect[0][2]).toBe(PNG_CANVAS_WIDTH)
  })

  it('draws one filled+stroked swatch per palette slot', () => {
    const { ctx, calls } = createMockContext()
    drawPaletteToContext(ctx, samplePalette)

    expect(calls.fill).toBe(samplePalette.length)
    expect(calls.stroke).toBe(samplePalette.length)
  })

  it('draws every color hex and its mapped role label, nothing missing', () => {
    const { ctx, calls } = createMockContext()
    drawPaletteToContext(ctx, samplePalette)

    const drawnTexts = calls.fillText.map((args) => args[0])

    samplePalette.forEach((color, index) => {
      expect(drawnTexts).toContain(color.hex.toUpperCase())
      expect(drawnTexts).toContain(roleForSlot(index))
    })

    // Exactly 2 text draws per slot (hex + role) - nothing extra, nothing missing.
    expect(calls.fillText).toHaveLength(samplePalette.length * 2)
  })

  it('handles an empty palette without drawing any swatch or text', () => {
    const { ctx, calls } = createMockContext()
    drawPaletteToContext(ctx, [])

    expect(calls.fillRect).toHaveLength(1)
    expect(calls.fill).toBe(0)
    expect(calls.fillText).toHaveLength(0)
  })
})

describe('paletteToPngCanvas', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('creates an off-screen canvas (not attached to the document) sized to the palette', () => {
    const { ctx } = createMockContext()
    const getContextSpy = vi
      .spyOn(HTMLCanvasElement.prototype, 'getContext')
      .mockReturnValue(ctx as unknown as RenderingContext)

    const canvas = paletteToPngCanvas(samplePalette)

    expect(canvas.width).toBe(PNG_CANVAS_WIDTH)
    expect(canvas.height).toBe(paletteImageHeight(samplePalette.length))
    expect(canvas.isConnected).toBe(false)
    expect(document.body.contains(canvas)).toBe(false)

    getContextSpy.mockRestore()
  })

  it('throws when a 2D context is unavailable', () => {
    const getContextSpy = vi
      .spyOn(HTMLCanvasElement.prototype, 'getContext')
      .mockReturnValue(null)

    expect(() => paletteToPngCanvas(samplePalette)).toThrow()

    getContextSpy.mockRestore()
  })
})

describe('paletteToPngBlob', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('resolves an image/png Blob produced by canvas.toBlob', async () => {
    const { ctx } = createMockContext()
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(
      ctx as unknown as RenderingContext,
    )

    const fakeBlob = new Blob(['fake-png-bytes'], { type: 'image/png' })
    vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation(function (
      this: HTMLCanvasElement,
      callback: BlobCallback,
    ) {
      callback(fakeBlob)
    })

    const blob = await paletteToPngBlob(samplePalette)

    expect(blob).toBe(fakeBlob)
    expect(blob.type).toBe('image/png')
  })

  it('rejects when canvas.toBlob yields no blob', async () => {
    const { ctx } = createMockContext()
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(
      ctx as unknown as RenderingContext,
    )
    vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation(function (
      this: HTMLCanvasElement,
      callback: BlobCallback,
    ) {
      callback(null)
    })

    await expect(paletteToPngBlob(samplePalette)).rejects.toThrow()
  })
})

describe('palettePngFilename', () => {
  it('builds brand-palette-{HEX}-{YYYYMMDD}.png from the brand slot hex and given date', () => {
    const date = new Date(2026, 7, 26) // 2026-08-26 (local)
    const filename = palettePngFilename(samplePalette, date)
    const brandHex = samplePalette[0].hex.replace('#', '')

    expect(filename).toBe(`brand-palette-${brandHex}-20260826.png`)
  })

  it('falls back to a stable filename for an empty palette', () => {
    const date = new Date(2026, 7, 26)
    expect(palettePngFilename([], date)).toBe('brand-palette-palette-20260826.png')
  })
})
