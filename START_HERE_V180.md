# AFTERDAY v1.8 — 캐릭터 동작 정렬 핫픽스

이 프로젝트는 `v1.7`의 VRM 모델을 재사용하면서 골반·의자·동작 간 위치 오류를 보정합니다.

## 1. Mac에서 실행
```bash
npm install
npm run download:assets
npm test
npm run dev
```
브라우저: `http://localhost:5173/?showcase=1&characterqa=1`

## 2. 모션 실브라우저 검수 (필수)
```bash
npm install -D playwright
npx playwright install chromium
npm run qa:motion
```
검수 이미지: `docs/qa/release_v180_actual_browser/`.
자동 QA는 VRM이 설치되지 않거나 캐릭터가 떠 있으면 **실패하도록** 작성했습니다.

## 3. 확인 순서
의자 앞까지 이동 → 착석 → 식사 → 기타 → 무전 → 휴식 → 장비 수리 → 스트레칭 → 전망 → 일어서기. 이 단계의 실제 화면을 확인하기 전까지 출시 승인 금지.

## 4. 자산 고지
- 기본 캐릭터: VRoid sample `.vrm` (사용자 측 다운로드, 이 ZIP 미포함)
- 신규 머리·얼굴·몸 자체를 만들어 붙이지 않음. 기존 VRM 얼굴 유지.
- GitHub SimCity 원본 도시 `.glb`는 별도 다운로드.
- 캡처 스크립트와 단위 테스트 통과만으로 그래픽 품질을 보장하지 않음.

상세: [`docs/V180_RELEASE_CANDIDATE_MOTION.md`](docs/V180_RELEASE_CANDIDATE_MOTION.md).
