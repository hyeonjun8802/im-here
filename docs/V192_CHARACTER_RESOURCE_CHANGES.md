# AFTERDAY v1.9.2 캐릭터 수정 및 실모델 비교

## 승인 기준

`docs/qa/APPROVED_REFERENCE_CAP_SHOULDER.png`의 정면/45도/측면/착석 실루엣을 유지한다. 갈색 캡모자의 **각지고 비교적 평평한 윗면**, 낮고 둥근 **어깨선**, 검은 수염, 올리브색 재킷, 짧은 팔·다리가 핵심이다. 이 PNG는 실제 GLB가 아니라 아트 기준이다.

## 변경된 **실제 게임** 리소스

- `public/assets/models/afterday/afterday_bearded_survivor_v190.glb` 2.56MB 실제 GLB 2.0 모델 덮어쓰기. 경로 유지로 GLTFLoader 및 게임 내 행동 시스템은 변경하지 않는다.
- `scripts/build_bearded_survivor_v190.py`: 모자 중앙이 부푼 구체(`ball`) 삭제. 캡 윗면을 평평하게 유지하는 다중 링 3D 크라운 제작, 챙은 얇은 2면 삼각형 메시로 제작.
- 양쪽 팔 피벗 Y는 **1.95→1.79** (-0.16), X는 **±0.64→±0.57**로 변경. 독립 어깨 패딩 중심 Y는 Torso 로컬 **0.46→0.32**. 과장된 둥근 소매를 테이퍼형 소매 메시로 변경.
- `scripts/render_motion_qa_v190.py`: 검수 관절 좌표를 게임 GLB 변경값과 동일하게 갱신.
- GLB 백업을 포함하므로 문제 발생 시 복구 가능.

## QA / 이미지 비교

- `docs/qa/V192_APPROVED_VS_BEFORE_AFTER.jpg`: 동일 비교 시트. 상단은 아트 기준 원본, 중단은 과거 GLB, 하단은 새 GLB의 렌더 이미지. 아트와 실제 모델 사이의 차이는 이 파일에서 드러나며, 숨기지 않는다.
- `docs/qa/V192_CAP_SHOULDER_ZOOM_COMPARE.jpg`: 동일 카메라 정면·45도에서 모자/어깨 클로즈업 비교.
- `docs/qa/CHARACTER_3D_MULTIVIEW_QA.jpg`: 정면, 45도, 측면, 뒤쪽 3D 확인.
- `docs/qa/CHARACTER_MOTION_GEOMETRY_QA.jpg`: 앉기, 기타, 무전, 걷기 포즈의 GLB 정적 기하 렌더.
- `docs/qa/V192_ACTUAL_GLB_GEOMETRY_AUDIT.json`: 실 GLB에서 읽은 Y 관절 좌표, 메쉬 치수.

## 품질 구분

**완료 및 실제 검증:** GLB 재생성, 형상 비교 3D 이미지, 150개 Node 자동 테스트, 정적 착석 발위치·골반 기하 검사.

**미완료:** Three.js 브라우저 자체 GPU 렌더 캡처와 모바일 30FPS 검수. 현재 기계에서 npm 네트워크 접근 실패. 또한 참고 원본 대비 헤어·수염의 세밀한 표면 재질, 전신 의복 주름 및 전문 스켈레탈 애니메이션은 아직 단순화돼 있으므로 원본과 픽셀 단위 동일하다고 볼 수 없다.

## 참고 사항

장면, 날씨, 생존 로직은 건드리지 않았으며 회귀 테스트를 수행했다. 같은 `GLB`를 Three.js가 불러올 때 재질/조명/그림자의 실제 표현은 브라우저에서 추가 검증해야 한다.
