# grain-1 (2026-08-27): result panel reorder — toggle above chips, Regenerate below chips (M-11/M-12)

## 결정
`ColorGenerator.tsx`의 `panel-preview--result` 자식 순서를 `ThemeToggle 행 → Regenerate → Palette(컬러칩) → AestheticMatch`에서
`ThemeToggle 행 → Palette(컬러칩) → Regenerate → AestheticMatch`로 변경했다. JSX 순서만 바꿨고 새 CSS 규칙은 추가하지 않았다 —
우측 정렬(`justify-content: flex-end`, `.color-generator__theme-toggle-row`)과 가로 중앙 정렬
(`align-items: center` on `.color-generator__preview--result` + 그 안의 `.color-generator__regenerate { align-self: center }`)이 이미 존재해
그대로 재사용된다.

## 이유
스펙 A "결과 화면 레이아웃" 델타(M-11/M-12): 테마 토글은 컬러칩 바로 위·우측 정렬, Regenerate는 컬러칩 아래·가로 중앙 정렬이어야 한다.
기존 구현은 토글과 칩 사이에 Regenerate가 끼어 있어 "바로 위"(사이에 다른 요소 없음) 조건을 만족하지 못했다.

## 영향받은 사전 존재 테스트 (수정함)
- `ColorGenerator.test.tsx`의 "Regenerate renders inside the preview panel, immediately before the color chips" — 새 배치에서는
  구조적으로 참일 수 없는 옛 순서를 검증하고 있었으므로(테스트가 검증하는 동작 자체가 이번 스펙 델타로 의도적으로 바뀜),
  `policy`가 규정한 "사전 존재 테스트가 구식 동작을 검증하는 경우" 예외에 해당한다고 판단해 어서션 방향을 뒤집고
  ("immediately after"), describe 블록 제목의 "Regenerate above chips"도 정정했다. 어서션이 검증하는 대상(순서 관계 자체)의
  의도는 유지했다 — 어떤 순서인지만 스펙에 맞게 바뀌었다.
- 같은 파일의 "Regenerate still works after moving above the color chips" — 이름만 "below"로 정정 (동작 자체는 위치 무관).

## 새로 추가한 테스트
- `grain-1: result panel reorder - toggle above chips, Regenerate below chips (M-11/M-12)` describe 블록 —
  토글 행과 컬러칩 사이에 아무것도 없음(M-11), Regenerate가 컬러칩 바로 다음에 옴(M-12), 우측/중앙 정렬 클래스 확인.

## 기각한 대안
- Regenerate를 AestheticMatch 뒤(패널 맨 아래)로 옮기는 안: 스펙 문구("컬러칩 아래")를 "바로 아래"로 해석해 채택하지 않음 —
  AestheticMatch와의 상대 위치는 이번 카드/스펙 델타에 명시되지 않았으므로, 가장 보수적으로 칩 바로 다음 위치를 선택했다.
