# AFTERDAY v0.6.1 검증 결과

## 수행
- Node.js 테스트: `npm test` — **37/37 PASS**
- `node --check` — `src/assets.js`, `src/world.js`, `src/artDirection.js`, `src/modelSizing.js` 구문 검사 PASS
- 실제 보고 이미지: `docs/visual-reference/roof_occlusion_before_v061.png`
- 모델 크기 제한 테스트 포함: 높이에 비해 넓은 지붕 GLB가 6.5월드 이상 퍼지지 않음
- 기존 천막·기본 옥상·생존 시간 유지 여부 정적 검증

## 완료하지 못한 검증
- `npm run build`: 로컬 의존성 미설치(`vite: not found`). 이 샌드박스에서 npm 네트워크 접근 불가.
- 원본 GitHub GLB 바이너리 미설치.
- 수정된 페이지의 WebGL 렌더링 및 실제 가림 현상 소멸 확인은 미실시.

## 개발자 PC 재검증
1. `npm install`
2. `npm run download:assets`
3. `npm test && npm run build`
4. `npm run dev` → `http://localhost:5173/?showcase=1`
5. `docs/visual-reference/roof_occlusion_before_v061.png`와 비교: 천막 방수포는 남고, 중복된 큰 검은 패널/흰 바닥이 없어야 함.
