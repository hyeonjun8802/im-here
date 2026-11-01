# AFTERDAY v3.8 외부 리소스·라이선스

## 새 주인공 캐릭터
`afterday_bearded_survivor_v190.glb` — 사용자 제공 A-Pose 캐릭터 이미지를 `stabilityai/stable-fast-3d`로 재구성하고 Blender에서 배낭, 20본 휴머노이드 스킨과 6개 애니메이션을 적용한 GLB.

- Stable Fast 3D — Stability AI Community License — https://huggingface.co/stabilityai/stable-fast-3d
- 공식 소스 — https://github.com/Stability-AI/stable-fast-3d
- 연 매출 US$1,000,000 이하의 개인/조직은 연구·비상업·상업 이용이 무료이며, 초과 시 상업적 이용에 Stability AI Enterprise License가 필요하다.

### 이전 롤백 자산
`archive/afterday_survivor_triposr_v370.glb`는 이전 TripoSR 버전으로 실행 경로에서 사용하지 않는다.

- TripoSR — MIT License — Stability AI / Tripo AI — https://huggingface.co/stabilityai/TripoSR
- TripoSR source — MIT License — https://github.com/VAST-AI-Research/TripoSR
- torchmcubes — BSD-3-Clause — https://github.com/tatsy/torchmcubes
- xatlas Python bindings — MIT License — https://github.com/mworchel/xatlas-python
- Blender — GNU GPL — 제작 도구로만 사용, 내보낸 GLB는 Blender 코드 파생물이 아님

## 런타임
- Three.js — MIT License — https://github.com/mrdoob/three.js
- Vite — MIT License — https://github.com/vitejs/vite

## 기존 도시·배경 GLB
- `dgreenheck/simcity-threejs-clone` — 원본 공개 저장소 출처: https://github.com/dgreenheck/simcity-threejs-clone
- 원본 리소스 사용 시 개별 출처 및 라이선스를 재확인한다. GitHub의 MIT 저장소 라이선스가 외부 제작 리소스의 재배포 범위를 항상 자동으로 보장하는 것은 아니다.
- 원본 도시 GLB는 `npm run download:assets`로 개발자 환경에서 받아서 사용하며 **이번 ZIP에는 포함되지 않는다**.

## 참고 이미지
`docs/qa/target_reference_crop.png`와 `public/assets/reference/target_bearded_survivor.png`는 AFTERDAY 캐릭터 제작용으로 기존 대화에서 생성한 참조 디자인 이미지의 일부다. **게임 속 캐릭터는 2D 이미지가 아닌 GLB**를 렌더링한다.
