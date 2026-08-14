# 컬러 팔레트 제너레이터

브랜드 메인 컬러(HEX/RGB)를 입력하면 HSL 연산 알고리즘으로 5색 보조 팔레트를
즉시 자동 생성하는 프론트엔드 도구입니다.

## 스택

- Vite + React + TypeScript
- 데이터베이스/캐시 없음 (순수 프론트엔드, 정적 SPA)

## 로컬 실행 절차 (Green-field)

사전 준비물: Node.js 18+ (권장 20+), npm.

```bash
npm install
npm run dev
```

- `npm run dev`는 Vite 개발 서버를 `PORT` 환경변수(미설정 시 5173)에 바인딩해
  구동합니다.
- 마이그레이션/시드 데이터, 더미 계정은 없습니다 — 데이터베이스를 사용하지
  않는 정적 프론트엔드이기 때문입니다.

## 빌드 / 프로덕션 미리보기

```bash
npm run build   # dist/ 에 정적 산출물 생성
npm run start   # dist/ 산출물을 PORT 환경변수 포트로 서빙 (vite preview)
```

`PORT` 환경변수를 지정하지 않으면 `start`는 4173, `dev`는 5173 포트를
기본값으로 사용합니다. 배포 환경에서는 플랫폼이 주입하는 `PORT` 값을
그대로 사용합니다.

## 스크립트

| 스크립트 | 설명 |
|---|---|
| `npm run dev` | 개발 서버 (HMR) |
| `npm run build` | 타입체크 + 프로덕션 빌드 (`dist/`) |
| `npm run start` | 빌드 산출물 프리뷰 서버 (배포/로컬 확인용) |
| `npm run lint` | ESLint 검사 |

## 프로젝트 상태

현재는 스캐폴드 단계입니다. HEX/RGB 입력 필드와 5색 팔레트 자동 생성 로직은
후속 그레인에서 구현됩니다.
