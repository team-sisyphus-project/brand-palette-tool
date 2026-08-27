import type { ChangeEvent } from 'react'
import './ColorInput.css'

export interface ColorInputProps {
  /** Unique DOM id for the field; also used to derive the error message id. */
  id: string
  /** Visible label text (also used as the field's accessible name). */
  label: string
  /** Placeholder text shown when the field is empty. */
  placeholder: string
  /** Current raw text in the field (HEX or RGB string, possibly incomplete/invalid). */
  value: string
  /** Called with the new raw text on every keystroke. */
  onChange: (value: string) => void
  /** Validation message to display, or null/undefined when the value is valid or empty. */
  error?: string | null
  /**
   * Width variant (grain-3, M-8): `'full'` (default) keeps the field at the
   * intake form's full width; `'narrow'` renders it at 60% of the form's
   * width (Design Spec `components/color-input/narrow-width`). Only the
   * Brand main color and Mood keyword fields use `'narrow'` — the additional
   * Hex fields are out of this grain's scope and stay `'full'`.
   */
  width?: 'full' | 'narrow'
}

/**
 * Single labeled text field, generically reused for the brand main color,
 * the up-to-4 additional Hex color fields, and the mood-keyword field
 * (Design Spec `components/color-input`). Parsing/validation is delegated to
 * the caller (see src/lib/palette.ts's `parseColorInput` for the Hex
 * fields) — this component only renders the field and surfaces a
 * validation message when the caller passes one.
 *
 * grain-3 (M-8, field width): `width` controls the root element's own width
 * via a modifier class (`color-input--narrow`) rather than the parent
 * container reaching in and sizing this component's DOM directly — see
 * ColorInput.css and the class doc comment above.
 */
export function ColorInput({
  id,
  label,
  placeholder,
  value,
  onChange,
  error,
  width = 'full',
}: ColorInputProps) {
  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    onChange(event.target.value)
  }
  const errorId = `${id}-error`
  const rootClassName = width === 'narrow' ? 'color-input color-input--narrow' : 'color-input'

  return (
    <div className={rootClassName}>
      <label className="color-input__label" htmlFor={id}>
        {label}
      </label>
      <input
        id={id}
        name={id}
        className="color-input__field"
        type="text"
        autoComplete="off"
        spellCheck={false}
        placeholder={placeholder}
        value={value}
        onChange={handleChange}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? errorId : undefined}
      />
      {error && (
        <p id={errorId} className="color-input__error" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}
