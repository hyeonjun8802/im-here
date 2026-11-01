# AFTERDAY v1.3 — QA 검증

## 실행 환경

- Node.js 및 JS 파서 사용 가능.
- npm 레지스트리 DNS 연결 실패(`EAI_AGAIN`), 의존성 미설치 상태.
- Three.js 실렌더링/정상 프레임/WebGL, Vite 번들 빌드 및 iPhone Safari 테스트 **실시하지 못함**.

## 통과 항목

- `npm test` → **101/101** 통과 (기존 93 + 신규 8).
- `node --check src/*.js` → 통과.
- 신규 세 파일은 실제 모듈 import 및 world 업데이트에 연결됨 (정적 분석).
- 기존 `simulation.js`, `solar.js`, `spatialLayout.js`, `weatherDirector.js`, `lifePlan.js` SHA-256 v1.2와 일치.
- 정적 검증: 단일 옥상, 모바일/데스크톱 디테일 예산, 인스턴싱 구조, 날씨 상태 연결, 인체 관절 연결, 저화질 Bloom 비활성화.

## 미검증 및 주의

- PC 실제 WebGL 셰이더 링크/화질, GPU 프레임 속도, 실제 전후 스크린샷.
- `three`의 애드온 Postprocessing이 설치된 목표 환경에서 정상 로드되는지.
- GPU에서 잎의 바람 변형과 움직이는 물줄기가 자연스럽게 보이는지.
- 원본 GitHub `.glb` 83종 로컬 다운로드 완료 여부.

**자동 테스트 통과를 '상용 그래픽 완성'으로 해석하지 말 것.**
