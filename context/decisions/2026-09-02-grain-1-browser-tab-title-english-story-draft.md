# grain-1: browser tab title in English — Story draft

## Status

We attempted to save via `planning_doc.save` (autosquad dev MCP, doc_type
"story"), but that MCP tool is not exposed in this session (queried
ToolSearch with `planning_doc`, `autosquad`, `story doc save board`, etc.,
with no match), so the API call could not be performed. Per the card's
instruction, the Story draft content is recorded here so that a
session/orchestrator with the MCP tool connected can carry it into
`planning_doc.save` verbatim. It remains in draft status until a human
confirms it.

## Story

- **WHO**: English-speaking users and multinational-team users of this app
  (Brand Color Palette Generator)
- **WHEN**: when opening the app in a browser, or identifying this app in
  the tab list while switching between multiple tabs
- **WANTS**: the browser tab title to be displayed in English
  ("Brand Color Palette Generator")
- **SO THAT**: users who do not know Korean can immediately understand what
  this app is just by looking at the tab, and the app stays consistent with
  its overall English-language user experience

## Wiki Spec change proposal

- Propose changing the `<title>` value in `index.html` from the Korean
  "Color Palette Generator" title to `Brand Color Palette Generator`.
  (`<html lang="ko">` is outside this card's scope and is not changed —
  introducing a multilingual support system is out of scope.)

## Measure (verification goals)

- Does the `<title>` text value at `index.html:18` exactly match
  `Brand Color Palette Generator` → true/false
- When the app is opened locally, does the browser tab title show
  "Brand Color Palette Generator" → true/false

## Validation (scenario)

This change does not require explicit user-path validation (no
security/permission or similar risk), so no separate Given→When→Then
scenario document is attached.
