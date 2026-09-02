import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { getColorRoles, ROLE_LABELS, ROLE_ORDER } from '../../lib/colorRoles'
import { generatePalette } from '../../lib/palette'
import { SemanticRolesCard } from './SemanticRolesCard'

const palette = generatePalette('#3366ff')!
const otherPalette = generatePalette('#ff8800')!

describe('SemanticRolesCard', () => {
  it('renders inside a rounded card tile labeled "Color Roles"', () => {
    const { container } = render(<SemanticRolesCard palette={palette} />)

    expect(screen.getByRole('heading', { name: 'Color Roles', level: 3 })).toBeInTheDocument()
    expect(container.querySelector('.color-study-card')).not.toBeNull()
  })

  it('renders all 10 semantic roles, in ROLE_ORDER, each with its label and hex', () => {
    render(<SemanticRolesCard palette={palette} />)

    const list = screen.getByRole('list', { name: 'Semantic role mapping' })
    const items = within(list).getAllByRole('listitem')
    expect(items).toHaveLength(ROLE_ORDER.length)

    const roles = getColorRoles(palette)
    roles.forEach((assignment, index) => {
      expect(within(items[index]).getByText(ROLE_LABELS[assignment.role])).toBeInTheDocument()
      expect(within(items[index]).getByText(assignment.color.hex)).toBeInTheDocument()
    })
  })

  it('recomputes role colors when the palette prop changes', () => {
    const { rerender } = render(<SemanticRolesCard palette={palette} />)
    const before = getColorRoles(palette)
    expect(screen.getByText(before[0].color.hex)).toBeInTheDocument()

    rerender(<SemanticRolesCard palette={otherPalette} />)
    const after = getColorRoles(otherPalette)
    expect(screen.getByText(after[0].color.hex)).toBeInTheDocument()
    if (before[0].color.hex !== after[0].color.hex) {
      expect(screen.queryByText(before[0].color.hex)).not.toBeInTheDocument()
    }
  })

  it('renders nothing for an empty palette instead of throwing', () => {
    const { container } = render(<SemanticRolesCard palette={[]} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('contains no Korean text', () => {
    const { container } = render(<SemanticRolesCard palette={palette} />)
    expect(container.textContent ?? '').not.toMatch(/[ㄱ-힝]/)
  })
})
