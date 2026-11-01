# AFTERDAY v1.6 실제 구현 및 검증 결과

| 항목 | 결과 |
| --- | --- |
| 원본 이미지 | `public/assets/character/ref/character_target.png` 포함 |
| 얼굴 GLB | `afterday_survivor_head_reference_v160.glb` 포함, 실 메시 + UV/텍스처 |
| 의상 GLB | `afterday_survivor_suit_reference_v160.glb` 포함, PBR 노멀맵 포함; **기본 비활성화** |
| 게임 연동 | 정식 `GLTFLoader`로 얼굴 GLB 로드, 기존 중복 얼굴 숨김 |
| 기존 모션 | 걷기·앉기·식사·기타·무전 등 기존 관절 시스템 유지 |
| 실패 시 | 이전 캐릭터 폴백; 브라우저 QA에서는 GLB 실패를 오류로 판단 |
| 자동 테스트 | `npm test`: **130개 통과** |
| JavaScript 문법 | `node --check`로 검사 통과 |
| 얼굴 GLB 오프라인 렌더 | 정면·45도·측면 3방향 생성, 목표 이미지 비교 시트 포함 |
| 전신 의상 GLB 비교 | 오프라인 대조에서 목표보다 디테일 부족 → 기본값으로 비활성화 |
| 실제 Three.js WebGL 게임 캡처 | **미검증**: 이 실행 환경에서 `npm` 레지스트리 접속 실패(EAI_AGAIN) 및 Vite 실행 불가 |
| 스켈레탈 GLB 애니메이션 | **미구현**: 현재 GLB에는 `skins`, `joints`, `animations`가 없음 |
| 실시간 립싱크·Morph Target | **미구현** |
| 상용 수준 외형 1:1 | **미달성**: 오프라인 비교에서 머리카락·피부·의상 형태 차이 확인 |

**검수 이미지:** `docs/qa/character/reference_vs_real_3d_v160.jpg`와 `reference_vs_head_suit_glbs_v160.jpg`. 두 이미지 모두 실제 GLB를 **별도 오프라인 3D 렌더러**로 렌더한 결과이며, 실제 게임 스크린샷이 아니다.

## 사용자 Mac에서 필수 3D 캡처 검증

```bash
npm install
npm run download:assets
npm test
npm run dev
# 다른 터미널에서
npm install -D playwright
npx playwright install chromium
npm run qa:browser-character
npm run qa:compare-character
```

QA는 GLB가 로드되지 않거나, 기존 얼굴이 겹쳐 보이거나, 실제 canvas 렌더가 발생하지 않으면 실패한다. 결과물 스크린샷은 `docs/qa/character/actual_browser/`에 저장된다.

## 후속 품질 개선의 핵심

Blender에서 원본 이미지의 **정면·측면·후면을 수작업 3D로 스컬핑하고 하이/로우 폴리, PBR 텍스처, 스킨 리깅, 표정 블렌드셰이프, 애니메이션을 제작**한 GLB로 교체해야 사용자 제공 디자인과의 시각적 차이를 크게 줄일 수 있다. `GLTFLoader`만으로 이미지가 프리미엄 인체 3D 메시로 변환되지는 않는다.
