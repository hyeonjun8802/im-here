# AFTERDAY v1.4.0 — 검증 현황

## 통과

- `npm test`: **112개 통과, 0개 실패** (v1.3 기준 101개 + v1.4 11개)
- `node --check`: 모든 `src/`, `scripts/`, `tests/` JS/MJS 문법 검사 통과
- `node scripts/validate-assets.mjs`: 에셋 인벤토리 및 로컬 디렉터리 검증 통과. GitHub 원본 GLB의 누락은 아래 별도 기록
- 핵심 생존 날짜/날씨/원경 건물 배치 소스는 v1.3과 동일한 체크섬 유지
- 신규 감정 상태 테스트: 생존 위기·허기·휴식·기타·한파
- 신규 프레젠테이션 테스트: 인물 카메라, 후처리 상한, 단독 옥상 유지, 3D 캠프 조명

## 미검증 및 차단

- npm registry DNS 접근 차단으로 본 환경의 `npm install`/`npm run build`를 완료하지 못함
- Chromium Headless 실행을 시도했으나 캡처 완료 전에 타임아웃됨
- **따라서 실제 Three.js/WebGL GPU 화면·셰이더 런타임·프레임 속도·목표 시안과의 유사도는 검증되지 않음.**
- GitHub SimCity 원본 83개 GLB 바이너리는 ZIP에 들어 있지 않음 (`npm run download:assets` 필요)
- AFTERDAY 전용 GLB 3종은 기존 버전과 같이 포함되어 있음

## 실제 렌더링 재검수

```bash
npm install
npm run download:assets
npm test
npm run dev
# 별도 터미널
npm i -D playwright
npx playwright install chromium
npm run qa:premium
```

`docs/qa/premium-v140/`에 저장된 사진을 콘셉트 9:16 이미지와 직접 비교해야 함.
- 유일한 생존 옥상과 근/중/원경 건물이 보여야 함
- 천막/물탱크/보관함이 모두 3D 형상을 유지해야 함
- 캐릭터 동작 중 얼굴이 표시되고 모닥불의 따뜻한 조명이 적용되어야 함
- 폭우·낙뢰 날씨가 기존 시스템에서 재생되어야 함
- GitHub GLB를 다운로드한 장면에서 오클루전 오류가 없어야 함

위 조건을 실브라우저에서 확인하기 전에는 상용화 그래픽 품질 인증 불가.
