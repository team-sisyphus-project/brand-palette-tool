# grain-5: `.app-shell` top padding / `.color-generator__intake` gap as literal px, not `--space-*`

## Decision

1. `.app-shell`'s top padding is set via a dedicated `padding-top: 140px`
   declaration, layered after the existing `padding: var(--space-6)`
   shorthand so left/right/bottom keep their current 32px token value and
   only the top edge changes.
2. `.color-generator__intake`'s `gap` (between the title column and the
   `.color-generator__intake-form` column) changes from `var(--space-6)`
   (32px) to a literal `gap: 120px`.
3. Both values are written as plain CSS literals (`140px` / `120px`), not
   new `--space-*` custom properties, even though `policy/coding.md` treats
   padding/gap as a design-token axis that should not be hardcoded on a
   component.
4. Registered a new `spacing` Design Spec Token Group
   (`design-spec/token-groups/spacing/base.md`) with `page-padding-top:
   140px` and `layout-column-gap: 120px`, so the values are still tracked as
   design decisions even though the CSS implementation is a literal.

## Why

- Spec A's "페이지 여백/간격" delta text is explicit: "아래 수치들은 그 스펙이 쓰는
  `--space-*` 토큰 체계 대신 지시받은 고정 px 값을 그대로 사용한다" — the spec
  itself instructs a deliberate deviation from the existing 8px-multiple
  `--space-1`(4px)…`--space-9`(64px) scale, not an oversight to be
  normalized into it.
- 140px and 120px don't land on the `--space-*` scale's 8px-multiple steps
  and aren't the next logical step in that scale (`--space-9` is 64px, more
  than half of either target) — folding them into `--space-*` would imply
  they're part of that system's rhythm when the spec says they explicitly
  are not.
- Introducing a parallel `--space-10`/`--space-11` custom property that
  isn't actually part of the 8px scale would be more misleading than a
  literal: a reader scanning `index.css`'s `--space-*` block would
  reasonably assume every entry follows the established multiple.
- Still recorded the two values as Design Spec Tokens (new `spacing` group)
  rather than treating them as pure "구현 설정값" — per `policy/coding.md`'s
  own classification, a value the user visually perceives (spacing) is a
  design token by definition, regardless of whether the token happens to be
  implemented as a CSS custom property or a literal in this one case. The
  Design Spec is the source of truth for "why 140/120", even though the CSS
  itself is a literal.

## Rejected alternatives

- Snapping 140px/120px to the nearest existing `--space-*` step (e.g.
  `--space-9` = 64px, or extending to a `--space-10`) — rejected: would
  silently change the rendered values away from the spec's explicit
  instruction, or require inventing new scale rungs that misrepresent an
  8px-multiple system the spec didn't ask to extend.
- Adding `--space-10: 140px` / `--space-11: 120px` as new custom properties
  in the existing scale block in `src/index.css` — rejected: both numbers
  are one-off instructed values for this specific layout, not new steps in
  a reusable spacing rhythm; adding them to the shared scale would invite
  reuse elsewhere as if they were, which the spec never intended.
- Leaving the values fully unregistered in the Design Spec (treating them as
  pure implementation config, like a breakpoint) — rejected: `policy/
  coding.md` classifies padding/gap as user-perceptible design tokens, so
  skipping Design Spec registration would violate "오염 금지" even though the
  CSS itself is a literal rather than a `var()` reference.
