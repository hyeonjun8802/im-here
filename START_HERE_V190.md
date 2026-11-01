# 시작하기 — AFTERDAY v1.9 캐릭터

압축 해제 후 터미널에서 `npm install && npm run dev` 실행.

1. `http://localhost:5173/character.html` — 새 검은 수염 생존자 실제 3D 회전·확대 및 행동 선택
2. `http://localhost:5173/?characterqa=1` — AFTERDAY 기존 게임에 통합된 캐릭터 확대
3. `npm test` — 게임 규칙·자산·애니메이션 계획 회귀 검증
4. `python3 scripts/verify_seat_geometry_v190.py` — 착석/발 위치 GLB 검증 (trimesh 필요)
5. 실제 WebGL 자동 캡처는 `npm install -D playwright`, `npx playwright install chromium` 후 `npm run qa:bearded-browser`

캐릭터 GLB는 ZIP 포함, `npm run download:assets`는 원본 도시 배경 모델이 필요할 때만 실행.

**QA 정직성:** 제공된 `docs/qa/*.jpg`는 실제 GLB 정점으로 생성된 오프라인 3D 검수 이미지다. Chromium Three.js 실행 캡처는 이 제작 환경에서 검증하지 못했다. `docs/qa/browser_v190/`는 로컬 검수 실행 시 생성된다.
