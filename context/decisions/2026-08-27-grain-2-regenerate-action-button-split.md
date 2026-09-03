# grain-2 (M-13): split Generate/Regenerate action-button selector; new `--text-action-lg` token for Regenerate's 24px

## Decision

Split the previously-combined `.color-generator__generate, .color-generator__regenerate`
rule in `ColorGenerator.css` into two standalone rules. Generate's rule is
byte-for-byte the same declarations as before. Regenerate's new rule applies
the 4 spec-mandated values via existing/new tokens:

- `padding: var(--content-padding-lg)` (2rem/32px all sides) — reuses the
  existing `--content-padding-lg` token, which was defined in `index.css` but
  had zero real usages anywhere in `src/` until now.
- `font-size: var(--text-action-lg)` — a **new** token (24px), added to the
  Action typography scale in `index.css` next to the existing
  `--text-action-md` (16px).
- `font-family: var(--font-text)` — reuses the existing Pretendard-first
  stack (already used broadly elsewhere), instead of Generate's Inter-based
  `--font-action`.
- `border-radius: var(--radius-card)` (16px) — reuses the existing, widely-used
  `--radius-card` token instead of Generate's `--radius-control` (12px).
- `height: auto` (implementation value, not a design token) replaces the
  shared rule's fixed `--control-height-action` (46px), so the 32px vertical
  padding isn't clipped by a fixed box height.

Registered the previously-unregistered `action-button` Design Spec Component
(Orphan — code comments referenced "design-spec components/action-button"
since grain-1, but it was never actually written) as a Base (Generate) +
Variant (Regenerate), and a new `typography` Token Group holding the Action
family's tokens.

## Why

- Grain boundary explicitly requires "ColorGenerator.css action-button selector split"
  and "Generate button styles unchanged" — a combined selector with per-property
  overrides layered on top risks a future edit to the shared block silently
  touching Generate too. Two independent rules make that structurally
  impossible.
- 24px has no existing match in any typography scale (Action only had 16px;
  `--space-5` is 24px but that's the spacing axis, wrong role) — per
  `policy/coding.md`'s "when no definition exists" rule, extended the existing Action
  scale with a new step rather than hardcoding a literal, following the
  `{role}-{property}-{scale}` naming convention already used by
  `--text-action-md`.
- Padding (32px) and radius (16px) both already had exact-match existing
  tokens (`--content-padding-lg`, `--radius-card`) once checked against
  `src/index.css` — reused as-is rather than introducing new ones, per
  `policy/coding.md`'s "if it already exists, use it" rule.

## Rejected alternatives

- Keeping the combined selector and adding a second, more-specific override
  rule for Regenerate afterward — rejected: leaves Generate and Regenerate
  coupled through the shared block, contradicting the grain's explicit
  selector-separation boundary, and makes "Generate unchanged" harder to verify by
  inspection.
- Hardcoding `font-size: 24px` as a literal directly in the CSS — rejected:
  violates `policy/coding.md`'s "no contamination" (no raw design values outside a
  Token Group) and the grain's Done criteria explicitly calls for
  tokenizing-or-literal-with-recorded-reason; tokenizing was clearly
  preferable here since it fits the existing Action scale's naming pattern.
- Keeping Generate's fixed `height: var(--control-height-action)` on
  Regenerate and only changing padding — rejected: with a fixed 46px height,
  32px of vertical padding would overflow/clip the button's content instead
  of visually growing it, failing the "all 4 style values match the rendered output" Done
  criterion.
