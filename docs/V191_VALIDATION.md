# AFTERDAY v1.9.1 — 캐릭터 실물 리소스 검수

| 검사 | 결과 | 범위 |
|---|---|---|
| `npm test` | PASS: 146/146 | 기존 게임 로직 + 신규 GLB 얼굴·어깨 검사 6개 |
| `node --check src/beardedSurvivorV190.js` | PASS | GLTFLoader·기존 관절 통합 코드 문법 |
| `node --check src/characterPreviewV190.js` | PASS | 캐릭터 뷰어 문법 |
| `python scripts/verify_seat_geometry_v190.py` | PASS | 기존 좌석/골반·발 정적 기하 검수 |
| 새 GLB 정면·45도·측면·후면 렌더 | PASS | `docs/qa/CHARACTER_3D_MULTIVIEW_QA.jpg` |
| 이전 모델과 동일 시점 전후 비교 | 완료 | `docs/qa/CHARACTER_FACE_BEFORE_AFTER_V191.jpg` |
| 실제 WebGL GPU 브라우저 캡처 | 미실행 | npm 레지스트리 DNS 접근 실패로 Three.js 의존성 설치 불가 |
| 실제 인게임 모션 시각 자연스러움 | 미검증 | 실제 브라우저/실기기에서 별도 판정 필요 |
| 출시 품질 승인 | 미승인 | 게임 화면·모션·모바일 FPS 미검증 |

## 소스 변경의 안전성

게임 소스에 있는 캐릭터 GLB URL `./assets/models/afterday/afterday_bearded_survivor_v190.glb`를 유지하고 **바이너리 파일 내용만 교체**했다. `RigRoot`, `Torso`, `Head`, 좌우 팔·다리·무릎 관절 이름도 그대로 유지되어 기존 걷기·앉기·식사·기타·무전 애니메이션 어댑터와 호환된다. 의자와 골반 높이 변경은 없다.

## 실제 개선 사항

얼굴의 별도 둥근 광대 메시 제거, 귀/눈/눈썹 크기 감소, 얼굴 앞면 수염 돌출량 감소, 어깨 패딩과 소매 부피 축소, 의상 주머니 및 하드웨어 단순화. 기하 비교는 `docs/V191_ACTUAL_GLB_GEOMETRY_AUDIT.json` 참조.

## 검수 범위의 구분

포함된 전·후 비교 이미지 및 네 방향 이미지는 **실제 GLB 삼각형을 소프트웨어 래스터라이저로 렌더링한 결과**이며 Three.js 브라우저 스크린샷이 아니다. 미검증 항목을 성공으로 표시하지 않는다.
