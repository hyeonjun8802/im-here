# 다음 단계 — 상용 프리미엄 3D 생존자 캐릭터로 교체할 때

현재 `src/survivorArt.js`는 카메라 회전 가능한 절차형 3D 캐릭터와 독립 팔꿈치·무릎 피벗을 제공한다. 하지만 캐릭터 콘셉트 시트의 디테일을 1:1 완성한 스캔 모델은 아니다.

## Codex / 3D 아티스트 업무

1. `docs/visual-reference/SURVIVOR_CHARACTER_ART_DIRECTION.png`를 디자인 기준으로 삼아 Blender에서 정면/측면/후면 정합성이 있는 성인 생존자 GLB 모델 제작. 리깅/애니메이션 접근을 위해 25~50k 삼각형(가정 목표, 실기기 측정으로 결정), 1~2K 텍스처를 출발점으로 삼는다.
2. `char_survivor_base.glb`를 루트 본/팔/다리/손/발/목/가방·의상까지 실제 리깅하여 `SkinnedMesh`로 변환. 카메라에서 보이는 얼굴은 피부/모발/눈/홍채/잡티 등을 PBR로 분리해 모델링.
3. `idle_breathe`, `walk_cycle`, `sit_enter`, `sit_loop`, `stand_up`, `eat`, `drink`, `guitar_strum`, `guitar_fret`, `humming_face`, `radio`, `repair`, `rest`, `stretch`, `storm_shelter` 애니메이션 클립 별도 생성.
4. Three.js `AnimationMixer`, `crossFadeTo`와 additive gesture 레이어를 사용하여 움직임 전환. 의자·식탁·라디오·기타 핸드 IK 앵커 사용. 각 clip 30fps/각 8~20개 주요 포즈 QA.
5. `SurvivorLife`의 장소/순서/경로 선택과 날씨 대피 규칙은 유지하면서 `animate()`만 mixer/animation state driver로 단계적으로 대체.
6. 모바일 30fps 성능 예산을 실기기에서 프로파일링: 스킨 메시 본 수, GPU 스키닝, 텍스처 아틀라스, LOD, vertex count, draw calls 및 KTX2 압축을 점검.
7. 음악은 현재 합성 신호의 독창적인 짧은 선율을 유지하거나, 별도 권리가 확보된 오리지널 녹음으로 교체. 기존 상용 음원을 허락 없이 사용하지 않는다.

**완료 판정:** 로컬 Mac/아이폰에서 실제 동작 스크린샷·영상, 360도 조작/클리핑 검증, 8종 주요 동작의 발 미끄러짐·의자 착석 높이·물건 쥠·카메라 가림이 모두 확인되기 전에는 상용 퀄리티 완성이라고 보고하지 않는다.
