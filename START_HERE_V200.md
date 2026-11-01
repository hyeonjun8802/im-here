# AFTERDAY v2.0 — 캐릭터 전면 재제작 시작 문서

> **v2.1 현재 활성 자산:** 제공된 정면 이미지를 Hugging Face TripoSR로 재구성한 스킨드 GLB가 같은 활성 경로에 적용되었습니다. 재생성·Mac 설정·롤백은 `docs/TRIPOSR_MACOS_PIPELINE.md`를 먼저 확인하세요. 아래 내용은 이전 v2.0 절차형 모델 기록입니다.

이 버전은 **기존 v1.9.3의 과한 입체 장식 캐릭터를 폐기하고**, 승인한 턴어라운드의 **큰 머리, 각진 캡모자, 검은 털보, 단정한 올리브색 재킷, 짧은 팔다리**로 새 GLB를 제작한 게임 교체본입니다. **완성된 3D 프리미엄 캐릭터와 픽셀 단위로 일치하는 결과는 아닙니다.**

## 실제 게임 실행

```bash
npm install
npm run dev
```

- 캐릭터 360°/행동 보기: `http://localhost:5173/character.html`
- 전체 게임: `http://localhost:5173/`
- 기존 GitHub 도시 모델까지 받기: `npm run download:assets` (인터넷 필요)

## 수정·검수 명령

```bash
npm test
python3 scripts/build_simple_survivor_v200.py
python3 scripts/render_simple_survivor_v200.py
python3 scripts/render_pose_qa_v200.py
python3 scripts/verify_seat_geometry_v190.py
```

## 이번 버전의 제작 방향

- **유지:** 실제 GLB 3D 머리·모자·몸통·관절과 360° 회전, 기존 9개 모션 피벗.
- **2D 텍스처로 전환:** 눈·눈썹·코·수염 표정, 재킷 지퍼·주머니 등 복잡한 미세 디테일. 승인된 이미지를 UV로 **실제 3D 곡면에** 매핑하며 정면 빌보드가 아닙니다.
- **삭제:** 돌출 광대/큰 귀/눈알 구체/수염 구체 수십 개/뚱뚱한 어깨 패딩/큰 등짐/과도한 장식.
- **보존:** 재난 생존, 식수·식사·수리·기타·무전, 실제 시간과 기존 옥상 월드.

## 검증 상태

- Node 테스트: **141개 통과** (v1.9.3 특정 다중 메시 방식만 강요하는 오래된 4개 테스트 파일은 `docs/legacy_tests_v193`로 원문 보관하고 새 v2.0 기준 테스트로 대체).
- GLB: 구조 및 9개 관절 검증, 실물 GLB 정면·45°·측면·후면 **VTK 오프라인 렌더링 성공**.
- 착석 기하 검증: 골반-좌석 높이차 약 0.0066월드, 발 바닥 관통은 거의 0.
- **미완료:** 실제 Three.js 브라우저 WebGL 캡처, 실기기 FPS, 전문가 수준의 리깅·모션 최종 승인. 여기서 만들어진 이미지를 게임 실행 캡처라고 부르지 마세요.

## 필수 비교 이미지

- `docs/qa/v200/APPROVED_VS_NEW_FACE.jpg`
- `docs/qa/v200/BEFORE_AFTER_MULTIVIEW.jpg`
- `docs/qa/v200/ACTUAL_GLB_POSES_OFFLINE.jpg`

### 상용화 판단

승인된 참조 그림의 음영·주름·머리카락·모션과 아직 차이가 있습니다. **출시 품질 합격 아님**. 기존 도형 겹침으로 인한 얼굴 왜곡 문제를 구조적으로 줄이는 게 이번 작업의 목적입니다. 상세한 차이는 `docs/V200_CHARACTER_REBUILD.md`를 참고하세요.
