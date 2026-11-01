# Pixal3D 표면·모션 교정 v3.9.2

## 결론

화면의 투명한 구멍처럼 보이는 결함은 원본 A-pose 이미지의 채색 누락이나 PNG 알파 문제가 아니었다. 원본 Pixal3D 메시가 동일 위치를 UV/법선 경계마다 여러 정점으로 내보내는데, 이를 연결하기 전에 collapse decimation을 적용하면서 삼각형 경계가 찢어진 것이 핵심 원인이었다.

## GLB 및 텍스처 수정

- 정확히 겹친 위치 정점을 `1e-5` 허용오차로 먼저 용접한다.
- 품질 경로에서는 메시 감면을 하지 않는다(`--target-faces 0`, 기본값).
- 활성 GLB는 517,805 삼각형, 스킨 1개, 휴머노이드 본 20개, 애니메이션 6개다.
- 4096×4096 base colour의 알파는 모든 픽셀이 255다.
- 실제 UV 삼각형을 마스크로 만들고 미사용 영역에 최근접 색상을 48px 확장한다.
- 작은 검정 베이크 결함을 보간하고 5×5 중앙값과 72 이상 차이 나는 고립 색상 이상치 36,275개만 교체한다.
- 실패한 정면 이미지 재투영 방식은 조명과 관측 방향이 이미 베이크된 2D 색을 3D UV에 다시 투영해 녹색/밝기 왜곡을 만들었으므로 채택하지 않았다.

## Walk / Run

애니메이션 믹서가 계산한 상완 quaternion에서 rest quaternion을 빼 로컬 delta의 X 회전량만 구한다. 그 회전을 부모 공간 X축 quaternion으로 만든 뒤 rest 앞에 곱한다. 따라서 팔꿈치는 몸 가까이 유지되고, 두 팔은 어깨에서 서로 반대 위상으로 앞뒤만 흔들린다. Z축 벌어짐 보정값은 더 이상 추가하지 않는다.

## Sit

Pixal3D 캐릭터의 정면이 로컬 -Z인 점을 기준으로 허벅지와 무릎 회전 부호를 교정했다. 발목에는 반대 회전을 주어 정강이가 아래로 내려오면서 부츠가 바닥 방향을 유지한다.

## 산출물 및 롤백

- 활성: `public/assets/models/afterday/afterday_bearded_survivor_v190.glb`
- 동일 최종 후보: `artifacts/pixal3d-v390/afterday_pixal3d_rigged_v392_despeckled.glb`
- 이전 버전: `public/assets/models/afterday/archive/afterday_survivor_pixal3d_v391_pre_topology_fix.glb`
- 실제 WebGL 캡처: `docs/qa/v392`
