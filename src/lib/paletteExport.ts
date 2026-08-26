/**
 * Pure text formatters for copying a generated palette out of the app
 * (spec C "HEX 코드 일괄 복사" / "CSS 변수 형식 복사", M-1).
 *
 * No UI, no Clipboard API calls, no file I/O - every function here only
 * turns a `PaletteColor[]` into a plain string (or validates one). The
 * actual `navigator.clipboard.writeText(...)` call is the caller's job.
 */

import { BRAND_SLOT_INDEX, type PaletteColor } from './palette'

/**
 * The selector `paletteToCssVariablesText` wraps declarations in by default.
 * `:root` is the standard place to declare global CSS custom properties so
 * the pasted block works in any project without extra wiring.
 */
export const CSS_ROOT_SELECTOR = ':root'

/**
 * CSS custom-property name for one palette slot.
 *
 * Naming decision (recorded in the design spec's `color` Token Group):
 * - The brand main color always lives at `BRAND_SLOT_INDEX` regardless of
 *   generation mode, so it gets the fixed semantic name `--color-brand-main`.
 * - The other 4 slots' color-wheel role changes with the generation mode
 *   (e.g. slot 1 is a complement under `complementary` but an adjacent hue
 *   under `analogous`), so a mode-specific semantic name would drift. They
 *   get the stable, order-based name `--color-palette-{1-based slot}`
 *   instead, which never changes meaning as the mode changes.
 */
export function cssVariableNameForSlot(slotIndex: number): string {
  return slotIndex === BRAND_SLOT_INDEX ? '--color-brand-main' : `--color-palette-${slotIndex + 1}`
}

/**
 * Formats a palette as a plain list of HEX codes, one per line, in slot
 * order - the "HEX 코드 일괄 복사" feature. Ready to paste as-is (e.g. into
 * a text file or chat), no extra punctuation.
 */
export function paletteToHexList(palette: PaletteColor[]): string {
  return palette.map((color) => color.hex).join('\n')
}

/**
 * Formats a palette as a CSS custom-properties block - the "CSS 변수 형식
 * 복사" feature. The result is ready to paste directly into any project's
 * CSS/stylesheet: a `selector { --name: value; ... }` block using
 * `cssVariableNameForSlot` for each slot's name and the slot's own HEX code
 * as the value. `validateCssVariablesText` confirms the output always
 * satisfies that "paste-ready" contract.
 */
export function paletteToCssVariablesText(
  palette: PaletteColor[],
  selector: string = CSS_ROOT_SELECTOR,
): string {
  const declarations = palette
    .map((color, index) => `  ${cssVariableNameForSlot(index)}: ${color.hex};`)
    .join('\n')
  return `${selector} {\n${declarations}\n}`
}

/** Result of validating a CSS custom-properties text block. */
export interface CssValidationResult {
  valid: boolean
  errors: string[]
}

// A valid CSS custom-property declaration: `--identifier: value` (the
// trailing `;` is stripped before this is tested, see below). The
// identifier must start with `--` followed by a letter or underscore, then
// any run of letters/digits/hyphens/underscores. The value half is captured
// even when empty (`.*`) so an empty-value declaration still matches here
// and gets its own dedicated "값이 비어 있습니다" error below, rather than
// falling through to the generic "올바르지 않은 선언" message.
const DECLARATION_RE = /^(--[a-zA-Z_][a-zA-Z0-9_-]*)\s*:\s*(.*)$/

// A single `selector { body }` block spanning the whole (trimmed) input.
// The selector half allows zero length (`*`, not `+`) so an empty selector
// (e.g. `{ --a: #fff; }`) still matches the block shape and gets its own
// dedicated "선택자가 비어 있습니다" error below.
const BLOCK_RE = /^([^{}]*)\{([\s\S]*)\}$/

/**
 * Validates that `text` is a syntactically correct, paste-ready CSS
 * custom-properties block (M-1: "실제 웹 프로젝트에 바로 적용 가능한
 * 문법"). Checks, in order:
 *
 * - Non-empty input.
 * - Exactly one matched pair of `{`/`}` (one `selector { ... }` block).
 * - A non-empty selector before the `{`.
 * - A non-empty declaration body, ending in `;` (so the last declaration is
 *   terminated, not just the ones before it).
 * - Every `;`-separated declaration matches `--name: value;` with a valid
 *   custom-property identifier and a non-empty value.
 * - No duplicate variable names within the block.
 *
 * Returns every problem found (not just the first) so a caller can surface
 * a complete diagnosis, plus `valid: true` only when the list is empty.
 */
export function validateCssVariablesText(text: string): CssValidationResult {
  const trimmed = text.trim()

  if (!trimmed) {
    return { valid: false, errors: ['입력이 비어 있습니다.'] }
  }

  const openCount = (trimmed.match(/\{/g) ?? []).length
  const closeCount = (trimmed.match(/\}/g) ?? []).length
  if (openCount !== 1 || closeCount !== 1) {
    return {
      valid: false,
      errors: [
        `중괄호 짝이 맞지 않습니다 (여는 중괄호 ${openCount}개, 닫는 중괄호 ${closeCount}개, 각각 1개여야 합니다).`,
      ],
    }
  }

  const blockMatch = BLOCK_RE.exec(trimmed)
  if (!blockMatch) {
    return { valid: false, errors: ['`selector { ... }` 형태의 블록을 찾을 수 없습니다.'] }
  }

  const errors: string[] = []
  const [, rawSelector, rawBody] = blockMatch

  if (!rawSelector.trim()) {
    errors.push('선택자가 비어 있습니다.')
  }

  const body = rawBody.trim()
  if (!body) {
    errors.push('선언 블록이 비어 있습니다 (변수가 하나도 없습니다).')
    return { valid: false, errors }
  }

  if (!rawBody.trimEnd().endsWith(';')) {
    errors.push('마지막 선언이 세미콜론(;)으로 끝나지 않습니다.')
  }

  const declarations = body
    .split(';')
    .map((part) => part.trim())
    .filter((part) => part.length > 0)

  const seenNames = new Set<string>()
  for (const declaration of declarations) {
    const declMatch = DECLARATION_RE.exec(declaration)
    if (!declMatch) {
      errors.push(`올바르지 않은 선언입니다: "${declaration}" (형식: --name: value;)`)
      continue
    }

    const [, name, value] = declMatch
    if (!value.trim()) {
      errors.push(`값이 비어 있습니다: "${name}"`)
    }
    if (seenNames.has(name)) {
      errors.push(`중복된 변수명입니다: "${name}"`)
    }
    seenNames.add(name)
  }

  return { valid: errors.length === 0, errors }
}
