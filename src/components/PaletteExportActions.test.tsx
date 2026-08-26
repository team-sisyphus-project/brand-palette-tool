import '@testing-library/jest-dom/vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { averageHsl, generatePalette, getMoodTags, matchAesthetic } from '../lib/palette'
import {
  paletteJsonFilename,
  paletteToCssVariablesText,
  validateCssVariablesText,
  validatePaletteJson,
} from '../lib/paletteExport'
import { palettePngFilename } from '../lib/paletteImage'
import { paletteMarkdownFilename, validateMarkdownExportText } from '../lib/paletteMarkdownExport'
import { PaletteExportActions, type PaletteExportActionsProps } from './PaletteExportActions'

const samplePalette = generatePalette('#3366ff')!
const sampleMode = 'complementary' as const
const sampleMoodTags = getMoodTags(averageHsl(samplePalette))
const sampleAestheticMatch = matchAesthetic(averageHsl(samplePalette))

/** Default props shared by every render in this suite - only overridden where a test cares. */
const defaultProps: PaletteExportActionsProps = {
  palette: samplePalette,
  mode: sampleMode,
  moodTags: sampleMoodTags,
  aestheticMatch: sampleAestheticMatch,
}

/** Installs a mock `navigator.clipboard.writeText` and returns the spy. */
function mockClipboard(writeText: (text: string) => Promise<void>) {
  const spy = vi.fn(writeText)
  Object.defineProperty(navigator, 'clipboard', {
    value: { writeText: spy },
    configurable: true,
  })
  return spy
}

/**
 * Installs mock `URL.createObjectURL`/`revokeObjectURL` (jsdom does not
 * implement either) and returns the `Blob`s handed to `createObjectURL`, in
 * call order - so a test can inspect exactly what `triggerBlobDownload`
 * tried to download without a real object URL / anchor click doing anything.
 */
function mockObjectUrl() {
  const blobs: Blob[] = []
  const createObjectURL = vi.fn((blob: Blob) => {
    blobs.push(blob)
    return `blob:mock-url-${blobs.length}`
  })
  const revokeObjectURL = vi.fn()
  vi.stubGlobal('URL', { ...URL, createObjectURL, revokeObjectURL })
  // jsdom does not implement the `download` attribute - a real `.click()` on
  // an anchor with an `href` tries to navigate the test document instead of
  // downloading, logging a noisy (harmless) "not implemented" warning. The
  // click itself is not what these tests assert on, so stub it out.
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
  return { blobs, createObjectURL, revokeObjectURL }
}

/** Reads a jsdom `Blob`'s text content (used to assert downloaded file contents). */
async function readBlobText(blob: Blob): Promise<string> {
  return blob.text()
}

/** Mocks `HTMLCanvasElement.getContext`/`toBlob` so `paletteToPngBlob` resolves a fake `image/png` Blob without real Canvas rendering. */
function mockCanvasPngEncoding() {
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(
    {
      fillRect: vi.fn(),
      fillText: vi.fn(),
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      arcTo: vi.fn(),
      closePath: vi.fn(),
      fill: vi.fn(),
      stroke: vi.fn(),
    } as unknown as RenderingContext,
  )
  const fakePngBlob = new Blob(['fake-png-bytes'], { type: 'image/png' })
  vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation(function (
    this: HTMLCanvasElement,
    callback: BlobCallback,
  ) {
    callback(fakePngBlob)
  })
  return fakePngBlob
}

describe('PaletteExportActions', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
    // @ts-expect-error - undo the per-test navigator.clipboard mock
    delete navigator.clipboard
  })

  it('renders "Copy CSS Variables", "Download PNG", "Download JSON", and "Download MD" buttons, with no "Copy HEX" button', () => {
    mockClipboard(() => Promise.resolve())
    render(<PaletteExportActions {...defaultProps} />)

    expect(screen.queryByRole('button', { name: 'Copy HEX' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Copy CSS Variables' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Download PNG' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Download JSON' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Download MD' })).toBeInTheDocument()
  })

  it('copies the exact CSS variables block text and shows success feedback on "Copy CSS Variables" click', async () => {
    const writeText = mockClipboard(() => Promise.resolve())
    render(<PaletteExportActions {...defaultProps} />)

    fireEvent.click(screen.getByRole('button', { name: 'Copy CSS Variables' }))

    expect(writeText).toHaveBeenCalledTimes(1)
    expect(writeText).toHaveBeenCalledWith(paletteToCssVariablesText(samplePalette))

    const status = await screen.findByRole('status')
    expect(status).toHaveTextContent('CSS variables copied!')
  })

  // M-1: the exact text handed to the clipboard for "Copy CSS Variables" must
  // itself be valid, paste-ready CSS - not just "some string was copied".
  it('the CSS variables text copied to the clipboard always passes validateCssVariablesText (M-1)', async () => {
    const writeText = mockClipboard(() => Promise.resolve())
    render(<PaletteExportActions {...defaultProps} />)

    fireEvent.click(screen.getByRole('button', { name: 'Copy CSS Variables' }))
    await screen.findByRole('status')

    const copiedText = writeText.mock.calls[0][0]
    expect(validateCssVariablesText(copiedText)).toEqual({ valid: true, errors: [] })
  })

  it('shows a failure message and does not throw when the clipboard write rejects', async () => {
    mockClipboard(() => Promise.reject(new Error('denied')))
    render(<PaletteExportActions {...defaultProps} />)

    fireEvent.click(screen.getByRole('button', { name: 'Copy CSS Variables' }))

    const status = await screen.findByRole('status')
    expect(status).toHaveTextContent('Copy failed. Please try again.')
  })

  it('shows a failure message when the Clipboard API itself is unavailable', async () => {
    // @ts-expect-error - simulate an environment with no Clipboard API at all
    delete navigator.clipboard
    render(<PaletteExportActions {...defaultProps} />)

    fireEvent.click(screen.getByRole('button', { name: 'Copy CSS Variables' }))

    const status = await screen.findByRole('status')
    expect(status).toHaveTextContent('Copy failed. Please try again.')
  })

  it('replaces a prior "Copy CSS Variables" success message when "Download JSON" is clicked next', async () => {
    mockClipboard(() => Promise.resolve())
    mockObjectUrl()
    render(<PaletteExportActions {...defaultProps} />)

    fireEvent.click(screen.getByRole('button', { name: 'Copy CSS Variables' }))
    expect(await screen.findByRole('status')).toHaveTextContent('CSS variables copied!')

    fireEvent.click(screen.getByRole('button', { name: 'Download JSON' }))
    expect(await screen.findByRole('status')).toHaveTextContent('JSON downloaded!')
    expect(screen.getAllByRole('status')).toHaveLength(1)
  })

  // M-2: the JSON handed to the download must itself be a complete,
  // nothing-missing palette export - not just "some JSON was downloaded".
  it('downloads a JSON Blob whose content passes validatePaletteJson with zero missing colors/roles (M-2)', async () => {
    const { blobs } = mockObjectUrl()
    render(<PaletteExportActions {...defaultProps} />)

    fireEvent.click(screen.getByRole('button', { name: 'Download JSON' }))
    await screen.findByRole('status')

    expect(blobs).toHaveLength(1)
    expect(blobs[0].type).toBe('application/json')

    const text = await readBlobText(blobs[0])
    const result = validatePaletteJson(text)
    expect(result).toEqual({ valid: true, errors: [] })

    const parsed = JSON.parse(text) as { colors: unknown[] }
    expect(parsed.colors).toHaveLength(samplePalette.length)
  })

  it('names the downloaded JSON file via paletteJsonFilename and shows success feedback', async () => {
    mockObjectUrl()
    const createElementSpy = vi.spyOn(document, 'createElement')
    render(<PaletteExportActions {...defaultProps} />)

    fireEvent.click(screen.getByRole('button', { name: 'Download JSON' }))

    const status = await screen.findByRole('status')
    expect(status).toHaveTextContent('JSON downloaded!')

    const anchor = createElementSpy.mock.results.find(
      (result) => result.value instanceof HTMLAnchorElement,
    )?.value as HTMLAnchorElement
    expect(anchor.download).toBe(paletteJsonFilename(samplePalette))
  })

  it('downloads an image/png Blob when "Download PNG" is clicked and names it via palettePngFilename', async () => {
    const fakePngBlob = mockCanvasPngEncoding()
    const { blobs } = mockObjectUrl()
    const createElementSpy = vi.spyOn(document, 'createElement')
    render(<PaletteExportActions {...defaultProps} />)

    fireEvent.click(screen.getByRole('button', { name: 'Download PNG' }))

    const status = await screen.findByRole('status')
    expect(status).toHaveTextContent('PNG downloaded!')

    expect(blobs).toHaveLength(1)
    expect(blobs[0]).toBe(fakePngBlob)
    expect(blobs[0].type).toBe('image/png')

    const anchor = createElementSpy.mock.results.find(
      (result) => result.value instanceof HTMLAnchorElement,
    )?.value as HTMLAnchorElement
    expect(anchor.download).toBe(palettePngFilename(samplePalette))
  })

  it('shows a failure message and does not throw when PNG encoding fails', async () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(
      {
        fillRect: vi.fn(),
        fillText: vi.fn(),
        beginPath: vi.fn(),
        moveTo: vi.fn(),
        lineTo: vi.fn(),
        arcTo: vi.fn(),
        closePath: vi.fn(),
        fill: vi.fn(),
        stroke: vi.fn(),
      } as unknown as RenderingContext,
    )
    vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation(function (
      this: HTMLCanvasElement,
      callback: BlobCallback,
    ) {
      callback(null)
    })
    mockObjectUrl()
    render(<PaletteExportActions {...defaultProps} />)

    fireEvent.click(screen.getByRole('button', { name: 'Download PNG' }))

    const status = await screen.findByRole('status')
    expect(status).toHaveTextContent('Download failed. Please try again.')
  })

  // M-4: the .md handed to the download must itself completely and
  // correctly represent all 5 required items for the exact
  // palette/mode/moodTags/aestheticMatch this render was given - not just
  // "some Markdown was downloaded".
  it('downloads a text/markdown Blob whose content passes validateMarkdownExportText with zero missing items (M-4)', async () => {
    const { blobs } = mockObjectUrl()
    render(<PaletteExportActions {...defaultProps} />)

    fireEvent.click(screen.getByRole('button', { name: 'Download MD' }))
    await screen.findByRole('status')

    expect(blobs).toHaveLength(1)
    expect(blobs[0].type).toBe('text/markdown')

    const text = await readBlobText(blobs[0])
    const result = validateMarkdownExportText(
      text,
      samplePalette,
      sampleMode,
      sampleMoodTags,
      sampleAestheticMatch,
    )
    expect(result).toEqual({ valid: true, errors: [] })
  })

  it('omits the aesthetic match line from the downloaded .md when aestheticMatch is null', async () => {
    const { blobs } = mockObjectUrl()
    render(<PaletteExportActions {...defaultProps} aestheticMatch={null} />)

    fireEvent.click(screen.getByRole('button', { name: 'Download MD' }))
    await screen.findByRole('status')

    const text = await readBlobText(blobs[0])
    expect(text).not.toContain('Aesthetic match')
    const result = validateMarkdownExportText(text, samplePalette, sampleMode, sampleMoodTags, null)
    expect(result).toEqual({ valid: true, errors: [] })
  })

  it('names the downloaded MD file via paletteMarkdownFilename and shows "MD downloaded!" success feedback', async () => {
    mockObjectUrl()
    const createElementSpy = vi.spyOn(document, 'createElement')
    render(<PaletteExportActions {...defaultProps} />)

    fireEvent.click(screen.getByRole('button', { name: 'Download MD' }))

    const status = await screen.findByRole('status')
    expect(status).toHaveTextContent('MD downloaded!')

    const anchor = createElementSpy.mock.results.find(
      (result) => result.value instanceof HTMLAnchorElement,
    )?.value as HTMLAnchorElement
    expect(anchor.download).toBe(paletteMarkdownFilename(samplePalette))
  })

  it('shows a failure message and does not throw when the MD download fails', async () => {
    vi.stubGlobal('URL', {
      ...URL,
      createObjectURL: vi.fn(() => {
        throw new Error('object URL creation failed')
      }),
      revokeObjectURL: vi.fn(),
    })
    render(<PaletteExportActions {...defaultProps} />)

    fireEvent.click(screen.getByRole('button', { name: 'Download MD' }))

    const status = await screen.findByRole('status')
    expect(status).toHaveTextContent('Download failed. Please try again.')
  })
})
