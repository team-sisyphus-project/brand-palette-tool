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
}

/**
 * Single labeled text field, generically reused for the brand main color,
 * the up-to-4 additional Hex color fields, and the mood-keyword field
 * (Design Spec `components/text-input`). Parsing/validation is delegated to
 * the caller (see src/lib/palette.ts's `parseColorInput` for the Hex
 * fields) — this component only renders the field and surfaces a
 * validation message when the caller passes one.
 */
export function ColorInput({ id, label, placeholder, value, onChange, error }: ColorInputProps) {
  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    onChange(event.target.value)
  }
  const errorId = `${id}-error`

  return (
    <div className="color-input">
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
