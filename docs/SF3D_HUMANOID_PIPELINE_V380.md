# AFTERDAY v3.8 — Stable Fast 3D 휴머노이드 파이프라인

## 결과

- 활성 자산: `public/assets/models/afterday/afterday_bearded_survivor_v190.glb`
- 생성 모델: `stabilityai/stable-fast-3d`
- 선정 입력: `01_GLB_Input/01_A_Pose_Front.png`
- 텍스처: 2048, UV/PBR 재질 포함
- 구조: 15,023 vertices / 19,766 triangles / 20 humanoid bones
- 클립: `Idle`, `Walk`, `Run`, `Wave`, `Point`, `Radio`
- 배낭: `03_Back.png` 참조로 별도 메시를 제작해 Chest에 고정

## 후보 선정

SF3D는 단일 이미지 방식이므로 A-Pose와 3/4 시점을 서로 다른 후보로 생성했다. 두 원본은 `archive/sf3d_a_pose_candidate_v380.glb`, `archive/sf3d_three_quarter_candidate_v380.glb`에 보존했다.

A-Pose 후보는 양팔·몸통·양다리 분리가 좋아 팔꿈치와 어깨 변형이 안정적이었다. 3/4 후보는 배낭 깊이는 더 잘 보존했지만, 팔을 올릴 때 팔과 몸통 사이에 삼각형 늘어짐이 발생해 탈락시켰다. 사용자 지시대로 품질 미달 후보를 활성 에셋에 덮어쓰지 않았다.

## 리깅과 모션

Pelvis/Spine/Chest/Neck/Head, 양쪽 Shoulder/UpperArm/ForeArm/Hand, 양쪽 UpperLeg/LowerLeg/Foot를 포함한 20본을 사용했다. 못·팔꿈치·무릎 구분이 없던 이전 9관절 TripoSR 리그는 롤백 자산으로만 보존한다.

게임의 기존 수면·식사·음수·기타 로직은 관절 오프셋 방식으로 유지하고, 새 6개 GLB 클립은 `character.html`의 동작 버튼에서 `AnimationMixer`로 직접 재생한다. 도구는 `Hand_L`/`Hand_R` 본의 실제 손바닥 소켓에 부착한다.

## macOS에서 원본 후보 재생성

SF3D 공식 저장소를 설치하고 Hugging Face gated model 이용 조건에 동의한 뒤:

```bash
python3 scripts/run_sf3d_macos.py \
  public/assets/character/ref/sf3d_v380/01_A_Pose_Front.png \
  --sf3d-home /absolute/path/to/stable-fast-3d \
  --output-dir /absolute/path/to/output \
  --texture-resolution 2048 \
  --remesh-option triangle
```

공식 MPS 지원은 실험적이며 통합 메모리 32GB 미만에서는 CPU 사용이 권장된다. 러너는 `PYTORCH_ENABLE_MPS_FALLBACK=1`을 자동으로 설정한다.

## 검증

```bash
npm run qa:sf3d
npm test
npm run build
```

`docs/qa/v380` 폴더의 4방향 렌더와 6개 클립 렌더는 Blender의 실제 GLB 메시·스킨 변형 검수본이다. `WEBGL_CHARACTER_RADIO.png`, `WEBGL_CHARACTER_WAVE.png`, `WEBGL_IN_GAME.png`은 로컬 Vite/Three.js에서 직접 촬영한 실제 WebGL 화면이다. 캐릭터 프리뷰와 전체 게임은 콘솔 오류 없이 로드되었다. FPS는 측정하지 않았다.

## 라이선스

Stable Fast 3D는 Stability AI Community License를 사용한다. 연 매출 US$1M 이하의 개인/조직에게 상업 이용이 무료이며, 초과하는 경우 Enterprise License가 필요하다. 배포 전 `THIRD_PARTY_LICENSES.md`를 함께 확인한다.
