# AFTERDAY v1.9.3 — 캐릭터 검수 빌드

- **게임 리소스를 수정한 버전입니다.** 새 이미지만 생성한 것이 아닙니다.
- 승인 디자인: `docs/qa/APPROVED_CHARACTER_TURNAROUND.png`
- 실제 수정된 모델: `public/assets/models/afterday/afterday_bearded_survivor_v190.glb`
- 첫 비교: `docs/qa/V193_APPROVED_VS_GLB_FRONT.jpg`
- 전후 4방향: `docs/qa/V193_BEFORE_AFTER_3D_RENDER.jpg`
- 360° GLB: `docs/qa/V193_ACTUAL_GLB_360_TURNTABLE.gif`
- 모션: `docs/qa/CHARACTER_MOTION_GEOMETRY_QA.jpg`
- 검증: `docs/VALIDATION_V193.md`

## 실행

`npm install && npm run dev` 후 `http://localhost:5173/character.html`에서 회전·포즈 검사. 동일 GLB가 본 게임에서도 로드됨. GitHub 도시 GLB는 `npm run download:assets`로 별도 다운로드가 필요한 리소스가 있음.

## 현재 판정

GLB·관절 코드 테스트는 통과했지만 프리미엄 **비주얼 합격 및 실브라우저 동작 검증은 아직 완료되지 않았습니다.** 원본과 100% 같은 결과로 표시하면 안 됩니다.
