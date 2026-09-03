import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { VibeKeywords } from './VibeKeywords'

describe('VibeKeywords', () => {
  const keywords = ['warm', 'cozy', 'vibrant', 'bold', 'bright', 'cheerful']

  it('renders the "keyword:" label followed by every keyword, comma-joined, on one line', () => {
    render(<VibeKeywords keywords={keywords} />)

    const line = screen.getByRole('status', { name: 'Palette vibe keywords' })
    expect(line).toHaveTextContent('keyword: warm, cozy, vibrant, bold, bright, cheerful')
  })

  it('shows at least 5 comma-separated keywords for a 5+ keyword input', () => {
    render(<VibeKeywords keywords={keywords} />)

    const line = screen.getByRole('status', { name: 'Palette vibe keywords' })
    const afterLabel = line.textContent!.replace(/^keyword:\s*/, '')
    const rendered = afterLabel.split(', ')

    expect(rendered.length).toBeGreaterThanOrEqual(5)
    expect(rendered).toEqual(keywords)
  })

  it('renders nothing but plain text - no Korean text', () => {
    render(<VibeKeywords keywords={keywords} />)
    expect(document.body.textContent ?? '').not.toMatch(/[\u3131-\uD79D]/)
  })
})
