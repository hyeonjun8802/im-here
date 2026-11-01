# AFTERDAY v1.0 검증 기록

## 통과

- `node --test tests/*.test.mjs`: 총 76개 통과, 실패 0개.
- `node --check src/*.js` 및 `scripts/*.mjs`: JS 구문 통과.
- `python3 scripts/audit_hero_glb.py`: 원래 전용 GLB 3종, 총 19,988 triangles 검사 통과.
- 옥상 1개 / 근·중·원경 건물 좌표/서울 날짜 분리: 기존 회귀 테스트에서 보존.
- 기상 수학/태양광 거칠기/번개 이중 펄스/인스턴스/원경 깊이: 신규 v1.0 8개 테스트 통과.

## 미검증 / 실행 환경 한계

- `npm install`: npm 레지스트리의 DNS가 차단되어 실패/시간 초과. `vite` 및 `three`가 설치되지 않아 `npm run build` 미실행.
- Chromium 실제 WebGL 화면/셰이더 GPU 컴파일: 제한된 실행 환경에서 페이지 탐색이 차단됨. 실제 캡처 및 FPS 측정 미수행.
- 원본 dgreenheck GitHub GLB 83종: 바이너리 미포함. `npm run download:assets`로 온라인에서 다운받아야 함.
- WebGL 셰이더 품질, 특정 모바일 GPU의 셰이더 처리 성능은 실제 브라우저에서 검증 필요.

## QA 도구 강화

- `scripts/visual_qa.mjs`는 페이지 오류와 WebGL 셰이더 콘솔 오류를 검사하고, 각 기상에서 실제 renderCalls가 있는지 체크합니다.
- 폭우/강설에서 새로운 3D 강우·강설 메시가 켜졌는지 검증합니다.
- 실행 환경에서는 `npm install --save-dev playwright && npx playwright install chromium`, `npm run dev`, `npm run qa:visual` 순서로 검사합니다.
