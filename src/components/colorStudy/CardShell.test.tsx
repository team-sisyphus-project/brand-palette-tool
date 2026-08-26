import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { CardShell } from './CardShell'

describe('CardShell', () => {
  it('renders a labeled region with the given title as its h3 heading', () => {
    render(
      <CardShell title="Test Card" headingId="test-card-heading">
        <p>content</p>
      </CardShell>,
    )

    const region = screen.getByRole('region', { name: 'Test Card' })
    expect(region).toBeInTheDocument()
    expect(region.tagName).toBe('SECTION')
    expect(screen.getByRole('heading', { name: 'Test Card', level: 3 })).toBeInTheDocument()
  })

  it('renders its children inside the section', () => {
    render(
      <CardShell title="Test Card" headingId="test-card-heading">
        <p>child content</p>
      </CardShell>,
    )

    expect(screen.getByText('child content')).toBeInTheDocument()
  })

  it('applies the shared rounded card tile shell class', () => {
    const { container } = render(
      <CardShell title="Test Card" headingId="test-card-heading">
        <p>content</p>
      </CardShell>,
    )

    expect(container.querySelector('.color-study-card')).not.toBeNull()
  })
})
