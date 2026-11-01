# AFTERDAY v1.9 — 실제 검증 기록

작성일: 2026-10-31

## 확인된 결과

| 검증 | 결과 | 근거 |
|---|---|---|
| 원본 캐릭터 GLB 2.0 | PASS | `public/assets/models/afterday/afterday_bearded_survivor_v190.glb` |
| 얼굴·의상 실재 3D 기하 | PASS | glTF 메쉬·재질 검사, `CHARACTER_3D_MULTIVIEW_QA.jpg` |
| 애니메이션 피벗 9종 | PASS | 실제 GLB JSON node 이름 검사 |
| 기존 어린 VRM의 런타임 생성 제거 | PASS | `src/world.js`, 신규 캐릭터 테스트 |
| 기존 얼굴·몸체 중복 표시 차단 | PASS (코드) | `BeardedSurvivorV190`의 기존 레이어 숨김 |
| 골반-좌석 높이 일치 | PASS (기하) | `character_seated_geometry_v190.json` |
| 앉을 때 발 바닥관통/허공 뜸 | PASS (정적 기하) | 동일 GLB 관절 변환 계산 |
| 캐릭터 4방향 GLB 렌더 | PASS | `CHARACTER_3D_MULTIVIEW_QA.jpg` |
| 동작 5상태 GLB 관절 정적 렌더 | PASS | `CHARACTER_MOTION_GEOMETRY_QA.jpg` |
| 게임 JavaScript 문법 | PASS | `node --check` |
| 자동 회귀 테스트 | PASS | `npm test`: **140/140** |
| 실제 Three.js 브라우저 캡처 | **NOT RUN** | npm `three`/`vite` 설치 불가능 (DNS EAI_AGAIN) |
| 브라우저 실제 모션 자연스러움 | **NOT VERIFIED** | 실브라우저 검사 필요 |
| iPhone/Android 성능 | **NOT VERIFIED** | 실기기 없음 |
| 상용 캐릭터 디자인 최종 합격 | **NOT APPROVED** | 원본 참조와 상세 재질·모델 차이 존재 |

**주의:** `docs/qa/CHARACTER_3D_MULTIVIEW_QA.jpg`, `CHARACTER_MOTION_GEOMETRY_QA.jpg`, `REFERENCE_VS_3D_v190.jpg`는 `trimesh`로 GLB를 불러온 뒤 정점과 면을 투영해 만든 **오프라인 3D 소프트웨어 렌더**이다. 실제 Three.js GPU 출력 캡처가 아니다. 사용자에게 이 둘을 혼동시키지 않는다.

## 발견·수정한 기존 문제

1. 어린 VRoid/VRM: 런타임 제거. 얼굴과 의상 대신 완전히 새 GLB 사용.
2. 눈·머리카락·얼굴 디테일 중복: 예전 부착 메시/연출 활성화 중단.
3. 공중 착석: 의자 높이와 모델 골반 원점을 공통 값으로 정리.
4. 소품 부유: 기타는 몸통 피벗, 무전기는 오른팔, 식기는 왼팔 피벗에 연결.
5. 초기 모습의 눈·수염 하단이 어색함: 정면·45° 검수 후 눈·코 크기와 메시 겹침을 재조정.

## 남은 비자동화 실화면 QA

`npm install`, `npm run dev` 후 `character.html`과 실제 게임에서 8개 행동을 직접 관찰한다. `npm install -D playwright`와 `npx playwright install chromium` 후 `npm run qa:bearded-browser`를 돌려 `docs/qa/browser_v190/qa_results.json`이 `passed=true`인지 확인한다. 3D 카메라 회전, 앉기, 일어서기, 팔의 의자 관통, 기타 접촉, 식기 위치, 우산/비 중 대피, 모바일 프레임 확인을 수동으로 보완한다. 통과하지 못한 상태에서 출시 승인하지 않는다.

## 지원 범위와 한계

현재 모델은 실제 3D GLB와 개별 관절 애니메이션이지만 **완전한 고급 스켈레탈 애니메이션, 얼굴 Morph Target, 손가락 IK, 실제 기타 현 터치 동작**은 포함되지 않는다. 이미지 원본과 똑같은 질감도 아니다. 정교한 캐릭터 출시는 실제 DCC 모델러의 고품질 UV/재질 제작과 WebGL 실화면 QA를 거쳐야 한다.
