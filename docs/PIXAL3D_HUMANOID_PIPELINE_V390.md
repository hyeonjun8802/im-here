# AFTERDAY v3.9 Pixal3D 휴머노이드 파이프라인

## 생성

- 입력: `GLB_Minimal_Assets/01_GLB_Input/01_A_Pose_Front.png`
- 모델: TencentARC Pixal3D, Apple Silicon용 `pixal3d-mlx`
- 로컬 설정: 512 reconstruction, FOV 0.2, 4096 texture bake, 500,000 target faces
- 원본: `artifacts/pixal3d-v390/afterday_pixal3d_front_source_v390.glb`
- 원본 통계: 519,807 faces, 4096 PBR bake, 약 53 MB

512 해상도는 24 GB Apple Silicon 환경에서 동작하는 고품질 설정입니다. 1024 reconstruction은 약 33 GB 이상의 메모리를 요구하므로 이 Mac에서는 사용하지 않았습니다. 대신 텍스처 베이크를 4096으로 유지했습니다.

## 얼굴·외형 검수

정면·3/4·측면·후면 렌더를 `docs/qa/v390`에 저장했습니다. 기존 SF3D에서 보이던 코와 광대의 큰 삼각형 함몰이 사라졌고, 코가 얼굴에서 독립된 둥근 볼륨으로 유지되는 것을 확인했습니다. 모자, 수염, 올리브색 재킷, 장갑, 부츠, 배낭도 실루엣과 색상을 유지합니다.

## 게임용 리깅

`scripts/rig_pixal3d_humanoid_v390.py`가 다음 순서로 게임 GLB를 생성합니다.

1. 원본 Pixal3D 메시를 3 m 게임 스케일로 정규화합니다.
2. 519,807 faces 원본을 약 215,689 faces로 복제 최적화합니다.
3. v3.8의 검증된 A-pose 표면에서 20본 웨이트를 보간 전송합니다.
4. 연결된 메시 내부에서 웨이트를 평활화하고 정점당 영향을 4본으로 제한합니다.
5. `Idle`, `Walk`, `Run`, `Wave`, `Point`, `Radio`를 포함해 GLB로 내보냅니다.

고해상도 원본은 수정하지 않습니다. 이전 SF3D 게임 GLB도 `public/assets/models/afterday/archive/afterday_survivor_sf3d_v380_pre_pixal3d.glb`로 보존합니다.

## 알려진 범위

단일 이미지 재구성이라 겨드랑이처럼 입력에서 가려진 안쪽 표면은 정면보다 거칠 수 있습니다. 외부 실루엣, 얼굴, 코, 배낭과 일반 게임 카메라에서 보이는 면을 우선 검수했습니다. 정적 이미지만으로 손가락별 리그를 복원하지 않았으며, 게임이 사용하는 손 전체 본을 유지합니다.
