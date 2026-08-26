import '@testing-library/jest-dom/vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { generatePalette } from '../lib/palette'
import { paletteToCssVariablesText, paletteToHexList, validateCssVariablesText } from '../lib/paletteExport'
import { PaletteExportActions } from './PaletteExportActions'

const samplePalette = generatePalette('#3366ff')!

/** Installs a mock `navigator.clipboard.writeText` and returns the spy. */
function mockClipboard(writeText: (text: string) => Promise<void>) {
  const spy = vi.fn(writeText)
  Object.defineProperty(navigator, 'clipboard', {
    value: { writeText: spy },
    configurable: true,
  })
  return spy
}

describe('PaletteExportActions', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    // @ts-expect-error - undo the per-test navigator.clipboard mock
    delete navigator.clipboard
  })

  it('renders a "Copy HEX" and a "Copy CSS Variables" button', () => {
    mockClipboard(() => Promise.resolve())
    render(<PaletteExportActions palette={samplePalette} />)

    expect(screen.getByRole('button', { name: 'Copy HEX' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Copy CSS Variables' })).toBeInTheDocument()
  })

  it('copies the exact HEX list text and shows success feedback on "Copy HEX" click', async () => {
    const writeText = mockClipboard(() => Promise.resolve())
    render(<PaletteExportActions palette={samplePalette} />)

    fireEvent.click(screen.getByRole('button', { name: 'Copy HEX' }))

    expect(writeText).toHaveBeenCalledTimes(1)
    expect(writeText).toHaveBeenCalledWith(paletteToHexList(samplePalette))

    const status = await screen.findByRole('status')
    expect(status).toHaveTextContent('HEX codes copied!')
  })

  it('copies the exact CSS variables block text and shows success feedback on "Copy CSS Variables" click', async () => {
    const writeText = mockClipboard(() => Promise.resolve())
    render(<PaletteExportActions palette={samplePalette} />)

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
    render(<PaletteExportActions palette={samplePalette} />)

    fireEvent.click(screen.getByRole('button', { name: 'Copy CSS Variables' }))
    await screen.findByRole('status')

    const copiedText = writeText.mock.calls[0][0]
    expect(validateCssVariablesText(copiedText)).toEqual({ valid: true, errors: [] })
  })

  it('shows a failure message and does not throw when the clipboard write rejects', async () => {
    mockClipboard(() => Promise.reject(new Error('denied')))
    render(<PaletteExportActions palette={samplePalette} />)

    fireEvent.click(screen.getByRole('button', { name: 'Copy HEX' }))

    const status = await screen.findByRole('status')
    expect(status).toHaveTextContent('Copy failed. Please try again.')
  })

  it('shows a failure message when the Clipboard API itself is unavailable', async () => {
    // @ts-expect-error - simulate an environment with no Clipboard API at all
    delete navigator.clipboard
    render(<PaletteExportActions palette={samplePalette} />)

    fireEvent.click(screen.getByRole('button', { name: 'Copy CSS Variables' }))

    const status = await screen.findByRole('status')
    expect(status).toHaveTextContent('Copy failed. Please try again.')
  })

  it('replaces a prior "Copy HEX" success message when "Copy CSS Variables" is clicked next', async () => {
    mockClipboard(() => Promise.resolve())
    render(<PaletteExportActions palette={samplePalette} />)

    fireEvent.click(screen.getByRole('button', { name: 'Copy HEX' }))
    expect(await screen.findByRole('status')).toHaveTextContent('HEX codes copied!')

    fireEvent.click(screen.getByRole('button', { name: 'Copy CSS Variables' }))
    expect(await screen.findByRole('status')).toHaveTextContent('CSS variables copied!')
    expect(screen.getAllByRole('status')).toHaveLength(1)
  })
})
