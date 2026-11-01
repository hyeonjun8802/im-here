# AFTERDAY v2.1 — TripoSR macOS 캐릭터 파이프라인

## 적용 결과

- 활성 게임 GLB: `public/assets/models/afterday/afterday_bearded_survivor_v190.glb`
- 모델 출처: Hugging Face `stabilityai/TripoSR` (MIT)
- 실행 장치: Apple Silicon MPS 신경망 추론 + CPU marching cubes
- 게임 메시: 54,428 vertices / 69,904 triangles / 4.1 MB
- 재질: 1024px baked PBR albedo 1장, GLB 내부 포함
- 리그: `RigRoot`, `Torso`, `Head`, 좌우 팔·허벅지·무릎 등 기존 9개 노드
- 롤백: `public/assets/models/afterday/archive/afterday_survivor_procedural_v200.glb`

TripoSR는 단일 이미지 재구성 모델이라 정면 얼굴과 의상은 입력과 유사하지만, 보이지 않은 후면은 모델의 추정입니다. 이번 결과는 첨부된 정면 이미지를 주 입력으로 사용하고 45도 이미지를 시각 검수에 사용했습니다. `setting.png`는 착석 자세라 기본 스탠딩 게임 리그 생성에는 사용하지 않았습니다.

## 왜 Stable Fast 3D 대신 TripoSR인가

Stable Fast 3D 공식 저장소는 Apple Silicon MPS 지원을 실험적으로 제공하지만, 32GB 미만 통합 메모리에서는 CPU 사용을 권장하고 Hugging Face 모델 접근 승인도 필요합니다. 현재 Mac은 M5 / 24GB입니다. TripoSR는 비게이트 MIT 모델이며 이 환경에서 MPS 추론 약 1초, CPU 메시 추출 약 13초로 실제 생성까지 확인했습니다.

## 재생성

Python 3.9 또는 3.11 가상환경에서 공식 TripoSR와 의존성을 설치합니다. macOS에서는 `xatlas==0.0.11`을 사용해야 현재 CMake와 호환되는 arm64 wheel을 받을 수 있습니다.

```bash
git clone https://github.com/VAST-AI-Research/TripoSR.git /path/to/TripoSR
python3 -m venv --system-site-packages /path/to/triposr-venv
/path/to/triposr-venv/bin/pip install \
  numpy==1.26.4 omegaconf==2.3.0 einops==0.7.0 transformers==4.35.0 \
  trimesh==4.0.5 rembg huggingface-hub imageio scikit-image onnxruntime \
  xatlas==0.0.11 moderngl==5.10.0
MACOSX_DEPLOYMENT_TARGET=14.0 /path/to/triposr-venv/bin/pip install \
  --no-build-isolation \
  'git+https://github.com/tatsy/torchmcubes.git@3aef8afa5f21b113afc4f4ea148baee850cbd472'
```

정면 원본에서 하단 라벨 124px을 잘라 MPS로 재구성하고, Blender에서 게임용 Y-up GLB와 9관절 스킨으로 변환합니다.

```bash
PYTORCH_ENABLE_MPS_FALLBACK=1 /path/to/triposr-venv/bin/python \
  scripts/run_triposr_macos.py ../front.png \
  --triposr-home /path/to/TripoSR \
  --crop-bottom 124 \
  --output-dir /tmp/afterday-triposr

blender --background --python scripts/build_triposr_survivor_v210.py -- \
  --obj /tmp/afterday-triposr/mesh.obj \
  --texture /tmp/afterday-triposr/texture.png
```

## 검수 자료

- `docs/qa/v210/TRIPOSR_V210_TURNAROUND.png`: Blender에서 실제 최종 GLB 정면·45도·측면·후면 렌더
- `docs/qa/v210/TRIPOSR_V210_RIG_POSES.png`: 최종 GLB 스킨 관절 변형 렌더
- `docs/qa/v210/TRIPOSR_V210_IN_GAME.png`: Three.js 실제 게임 `?characterqa` 근접 카메라 캡처
- `character.html`: Three.js에서 360도와 게임 행동을 확인하는 페이지

앞의 턴어라운드·리그 포즈는 Blender 오프라인 렌더이며, `TRIPOSR_V210_IN_GAME.png`만 실제 Three.js 브라우저 캡처입니다. `character.html`에서 idle·walk·sit 동작과 실제 게임 `?characterqa` 근접 카메라를 확인했습니다.

## 라이선스

- TripoSR 코드와 모델: MIT, Stability AI / Tripo AI
- 캐릭터 입력 이미지: 프로젝트 제공 원본
- 모델 카드: <https://huggingface.co/stabilityai/TripoSR>
- 공식 소스: <https://github.com/VAST-AI-Research/TripoSR>
