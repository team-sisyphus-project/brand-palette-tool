# grain-1: 브라우저 탭 타이틀 영어화 — Story 초안 (draft)

## 상태

`planning_doc.save`(autosquad dev MCP, doc_type "story")로 저장을 시도했으나
이 세션에서는 해당 MCP 도구가 노출되어 있지 않아(ToolSearch로
`planning_doc`, `autosquad`, `story doc save board` 등 질의했으나 매칭 없음)
API 호출을 수행할 수 없었다. 카드 지시에 따라 Story 초안 내용을 여기 기록해
두고, MCP 도구가 연결된 세션/오케스트레이터가 이 내용을 그대로
`planning_doc.save`에 반영할 수 있도록 준비해 둔다. 사람 확정 전까지는
draft 상태.

## Story

- **WHO**: 이 앱(Brand Color Palette Generator)을 사용하는 영어권 사용자 및
  다국적 팀 사용자
- **WHEN**: 브라우저에서 앱을 열거나 여러 탭을 오가며 탭 목록에서 이 앱을
  식별할 때
- **WANTS**: 브라우저 탭 제목이 영어("Brand Color Palette Generator")로
  표시되기를 원한다
- **SO THAT**: 한국어를 모르는 사용자도 탭만 보고 이 앱이 무엇인지 즉시
  이해하고, 앱 전반의 영어 사용자 경험과 일관성을 유지할 수 있다

## Wiki Spec 변경 제안

- `index.html`의 `<title>` 값을 `컬러 팔레트 제너레이터` →
  `Brand Color Palette Generator`로 변경 제안. (`<html lang="ko">`는 이번
  카드 범위 밖이므로 변경하지 않음 — 다국어 지원 체계 도입은 out of scope.)

## Measure (검증 목표)

- `index.html:18`의 `<title>` 텍스트 값이 정확히
  `Brand Color Palette Generator`와 일치하는가 → true/false
- 로컬에서 앱을 열었을 때 브라우저 탭 제목에 "Brand Color Palette
  Generator"가 표시되는가 → true/false

## Validation (scenario)

명시적인 사용자 경로 검증(보안/권한 등 리스크)이 필요한 변경이 아니므로
Given→When→Then 시나리오 문서는 별도로 첨부하지 않음.
