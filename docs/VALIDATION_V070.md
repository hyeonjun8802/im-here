# AFTERDAY v0.7.0 검증 기록

## 실제 실행한 검사
- `npm test` **48/48 PASS** (v0.6.1 37개 + v0.7.0 11개).
- 모든 `src/*.js`에 `node --check` 수행: PASS.
- `npm run check` PASS. 단 이 스크립트에서 원본 GLB 설치 여부는 정보로만 보고, 파일 미설치를 실패로 처리하지 않는 기존 동작 유지.
- 신규 PBR 파생 텍스처 12개: Pillow로 형식/1024×1024 크기 확인.
- 기존 단독 옥상/원경 거리/중복 지붕 모델 격리 테스트 통과.
- 브라우저 GPU 확인: Chromium Playwright 컨텍스트에서 `document.createElement('canvas').getContext('webgl2') === null`.

## 실제 완료하지 못한 검사
- npm 설치 / Vite 빌드: 이 실행 컨테이너에서 registry.npmjs.org DNS 해석 불가.
- GitHub GLB 다운로드: raw.githubusercontent.com DNS 해석 불가.
- 원본 83개 GLB 모델 실제 화면 로딩.
- Three.js 실제 WebGL 렌더링, 화면 비교, 모바일 30FPS 측정, 사운드 청감 평가.

**표현 규칙:** 48개 테스트 통과는 프로그램의 정적·시뮬레이션 규칙 검증이지, 시각 품질 완성이나 GPU 실행 확인이 아니다.

## Codex 실행/시각 검증 지시
1. `npm install && npm run download:assets` 후 `npm run build`와 `npm test` 수행.
2. `npm run dev`로 `http://localhost:5173/?showcase=1` 접속.
3. 메인 옥상이 하나이고 거대한 검은 지붕이 없는지 확인.
4. 날씨 패널: 맑음→폭우→낙뢰→토네이도→한파를 각 12초 이상 관찰. 전환시간 4.7초 평균 추종.
5. 바닥 wetness/clearcoat, 옥상 배수 스트림, 빗방울 충돌 물결, 번개 포인트광, 눈 입자, 토네이도 분진 확인.
6. 시간 시연 슬라이더를 06:00 / 12:00 / 18:00 / 23:00에 맞춘 뒤 낮·저녁·밤 조명 캡처.
7. iPhone Safari/Android Chrome에서 30fps 목표. GPU/메모리/배터리/프레임타임 확인 후 불필요한 파티클과 그림자 디테일을 낮은 화질 설정에서 줄이기.
