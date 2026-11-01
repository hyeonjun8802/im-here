# AFTERDAY v1.2.0 검증 기록

검증 대상: `AFTERDAY_THREEJS_ART_REFINEMENT_v120`.

## 이 환경에서 실제 수행한 검사

| 항목 | 결과 | 증거 |
| --- | --- | --- |
| Node.js 파일 문법 | 통과 | `node --check src/*.js tests/*.test.mjs` 개별 실행 |
| 게임 전체 자동 테스트 | 93/93 통과 | `npm test` 및 `afterday_v120_final_tests.log` |
| 신규 PBR 에셋 | 9세트 × 3장, 총 27장 존재 | `public/assets/materials/character/premium/` |
| 신규 재질 크기 | 27장 전부 768×768 | Pillow 파일 검증 |
| 기존 v1.1 일상·자율행동·재난 테스트 | 통과 | 동일 `npm test` |
| HTML 카메라 버튼 경로 | 정적 테스트 통과 | `tests/premium-art-v120.test.mjs` |
| 원본 GLB 3종 | 기존 패키지 파일 보존 | `public/assets/models/afterday/*.glb` |

## 실행하지 못한 항목

- `npm install`: `registry.npmjs.org` DNS 연결 불가. `node_modules`가 이 환경에 존재하지 않음.
- `npm run build`: 설치된 Three.js/Vite 의존성 부재로 빌드 미수행.
- Chromium GPU 실 렌더링: SwiftShader 기반 headless 초기화가 시간 초과되어 **프레임 캡처 실패**.
- 아이폰 Safari / Android Chrome의 실기기 FPS, 표정·의상·가구 충돌 시각 품질.
- 따라서 '디자인 시안과 동일' 또는 '상용 최종 품질'이라고 판정하지 않음.

## Mac 검증 절차

```bash
npm install
npm run download:assets
npm test
npm run dev
```

`http://localhost:5173/?showcase=1`에서 **일상 행동 → 인물 디테일 확대**를 열고 4방향을 돌려보세요. 기타/무전/의자 동작과 폭우·한파를 비교한 뒤 콘솔 오류와 FPS를 기록합니다.

리소스 원본은 수정하지 않았습니다. 기존 GitHub 도시 GLB는 별도 다운로드해야 하며 다운로드 경로가 없으면 원경 대체 3D 메시를 사용합니다.
