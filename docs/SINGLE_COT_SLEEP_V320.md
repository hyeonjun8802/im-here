# v3.2 수면 에셋 및 애니메이션 수정 기록

## 원인
1. `world.createRoofProps`에서 침대처럼 보이는 구조물을 제작하고, `CinematicStage.detailShelter`에서도 별도 매트리스와 베개를 추가한 상태에서 `sceneDetails.decorateHeroRooftop`에 세 번째 침대형 메시가 존재했습니다.
2. `SurvivorLife.sleepBed`의 종착점과 베개가 반대쪽이었습니다. `BeardedSurvivorV190`는 루트를 -90° 기울여 머리가 베개 반대편을 향했고, 얼굴은 옆으로 보였습니다.
3. 처음 수면 동작은 앉기와 눕기가 짧게 이어져 실제 관찰 시 앉아 있는 시간이 부족했습니다. 이불 애니메이션도 없었습니다.

## 구조 정리
- `src/sleepBedPlan.js`: 원래 침대 위치, 베개, 접근·앉기·눕기 발 위치 등 공유 불변 좌표를 한곳에 관리.
- `src/sleepBedding.js`: **원래 침대 하나**의 프레임, 매트리스, 부드러운 베개와 접힌 상태부터 확대되는 입체 천 메시. 기존 tarp_canvas PBR 알베도 재사용. 햇빛에 따라 실제 그림자를 생성하는 3D 메시이며 오버레이 이미지는 아님.
- `src/sceneDetails.js`: 기존 침대 생성 코드를 단일 에셋 설치로 대체.
- `src/cinematicStage.js`, `src/world.js`: 겹치던 침대성 구조물 제거 (천막·옥상 자체는 유지).
- `src/survivorLife.js`: 실제 침대에 도착한 위치에서 연속 경로 이동, 앉기 중 회전, 후면으로 눕기, 기상 역동작, 이불 단계 동기화. 기타 수동 명령은 수면에서 일어난 뒤 실행.
- `src/dailyCycle.js`: 5.6초 취침 5.2초 기상 및 앉아 있는 정지 구간, 누운 뒤 이불 덮기.
- `src/beardedSurvivorV190.js`: GLB 머리 방향을 -X, 얼굴 방향을 +Y로 만드는 합성 쿼터니언 적용.
- `src/characterPreviewV190.js`: 게임과 동일한 `sleepBedding` 에셋을 검수 씬에서 다시 사용하고 별도 독자 QA 침대 삭제.
- `tests/single-cot-sleep-v320.test.mjs`, `scripts/qa_cot_runtime_v320.mjs`: 배치 좌표, 물체 수, 모션 연속성, 실제 Three.js 메시 및 이불 확장 검증.

## 검증 결과
- JS 구문 검사: 통과.
- Node 자동 회귀: 191/191 통과.
- 실제 Three.js를 생성하는 런타임 메시 검사: 통과 (브라우저 대신 Node에서 모듈 로드).
- Standalone 웹 모듈 배포 생성 및 서버 응답: 정상.
- Chromium WebGL 스크린샷: 실패. EGL 초기화 불가. 최종 실기기 화면 품질과 FPS는 **미검증**.

## 게임에서 검사할 화면
- `일상 행동` → `23시 취침` 시연에서 옥상 원래 침대가 이미 존재하고 다른 침대가 생기지 않는지 확인.
- 시작 위치 → 침대 옆에서 1.2초 이상 앉기 → 베개 방향으로 얼굴을 위로 한 채 눕기 → 접힌 이불 펴기.
- 07시 미리보기에서 이불부터 접히고 상체를 세워 앉은 뒤 침대에서 나오며 스트레칭으로 이동.
- `character.html` 별도 관절 검수와 실제 게임 카메라에서 둘 다 확인. 게임 저장 상태는 미리보기로 변경되지 않음.
