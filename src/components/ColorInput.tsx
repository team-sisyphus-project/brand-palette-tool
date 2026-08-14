import type { ChangeEvent } from 'react'
import './ColorInput.css'

export interface ColorInputProps {
  /** Current raw text in the field (HEX or RGB string, possibly incomplete/invalid). */
  value: string
  /** Called with the new raw text on every keystroke. */
  onChange: (value: string) => void
  /** Validation message to display, or null/undefined when the value is valid or empty. */
  error?: string | null
}

/**
 * Single text field that accepts a brand main color as either HEX
 * (`#3366ff`) or RGB (`51, 102, 255`). Parsing/validation is delegated to
 * the caller (see src/lib/palette.ts) — this component only renders the
 * field and surfaces a validation message.
 */
export function ColorInput({ value, onChange, error }: ColorInputProps) {
  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    onChange(event.target.value)
  }

  return (
    <div className="color-input">
      <label className="color-input__label" htmlFor="brand-color-input">
        브랜드 메인 컬러
      </label>
      <input
        id="brand-color-input"
        name="brand-color"
        className="color-input__field"
        type="text"
        autoComplete="off"
        spellCheck={false}
        placeholder="#3366ff 또는 51, 102, 255"
        value={value}
        onChange={handleChange}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? 'brand-color-error' : undefined}
      />
      {error && (
        <p id="brand-color-error" className="color-input__error" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}
