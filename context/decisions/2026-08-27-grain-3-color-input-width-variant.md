# grain-3: ColorInput width control via a new `width` prop/class, not a parent selector override

## Decision

1. Added an optional `width?: 'full' | 'narrow'` prop to `ColorInput`
   (default `'full'`), which applies a `color-input--narrow` modifier class
   to the component's own root element rather than the parent
   (`.color-generator__intake-form`) reaching in and sizing `ColorInput`'s
   DOM via a descendant/`:nth-child` selector.
2. `.color-input--narrow { width: 60%; }` overrides the parent flex
   container's default `align-items: stretch` cross-axis sizing for exactly
   the two fields the spec calls out.
3. Only `ColorGenerator.tsx`'s brand-color-input and mood-keyword-input pass
   `width="narrow"`; the 4 additional Hex fields keep the prop's `'full'`
   default (unchanged 100% width) — out of this grain's scope per its
   `Boundary`/`Out of scope` fields.
4. Registered a new `sizing` Design Spec Token Group (`input-width-full`:
   100%, `input-width-narrow`: 60%) and a new `color-input` Component
   (`base` + `narrow-width` Variant), since this is the first grain to
   modify `ColorInput` itself.

## Why

- The grain's `Boundary` explicitly named the mechanism: "ColorInput width
  control (new prop/class)" — width control belongs on `ColorInput` via a new
  prop/class, not as a `ColorGenerator.css` rule targeting `ColorInput`'s
  internals from outside (which would leak knowledge of `ColorInput`'s DOM
  structure into the parent and make the width non-reusable/non-obvious from
  `ColorInput`'s own public API).
- A prop (not just a bare class name on the wrapper) keeps the two valid
  states self-documenting at every call site (`width="narrow"` vs. omitted)
  and keeps `ColorInput`'s own `.tsx` the single place that knows which
  class name backs which state.
- `60%`/`100%` don't fit any existing Token Group's declared scope
  (`spacing` is margin/padding/gap; `border`/`color`/`typography` don't
  apply) — per `policy/recording.md`'s "when in doubt, create a new one" rule, a new
  `sizing` Token Group was created rather than forcing the value into an
  unrelated group.

## Rejected alternatives

- A `ColorGenerator.css` rule like `.color-generator__intake-form
  #brand-color-input, ... { width: 60%; }` targeting the input elements
  directly — rejected: violates the grain's explicit boundary (control must
  live on `ColorInput`, not be reverse-engineered from outside), and would
  size the `<input>` itself rather than its `.color-input` label+field+error
  wrapper, leaving the label/error text at the old full width while only the
  input shrank.
- A generic `className` passthrough prop on `ColorInput` instead of a typed
  `width` variant — rejected: an open string prop lets any caller apply
  arbitrary styling, which doesn't match this Design Spec's Component/Variant
  model (`components/color-input/narrow-width.md`) where the two valid
  states are enumerable and spec'd, not free-form.
