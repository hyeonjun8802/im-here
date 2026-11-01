# AFTERDAY v3.8 현재 캐릭터 규칙 (2026-11-01)

활성 GLB는 `public/assets/models/afterday/afterday_bearded_survivor_v190.glb`의 Stable Fast 3D A-Pose 기반 20본 휴머노이드다. `Idle/Walk/Run/Wave/Point/Radio` 6개 클립과 배낭 메시를 보존한다. 이전 9관절 TripoSR 자산은 `archive/afterday_survivor_triposr_v370.glb`에만 보존하며 활성 자산에 덮어쓰지 않는다. 변경 후 `npm test`, `npm run qa:sf3d`, `character.html`의 실제 WebGL 확인을 수행한다. 기존 도구 손 정렬·수면·날씨·도시 로직은 유지한다.

---

# AFTERDAY v2.0 캐릭터 설계 우선 규칙 (2026-10-31)

**먼저 `START_HERE_V200.md`와 `docs/V200_CHARACTER_REBUILD.md` 읽기.** 캐릭터는 v1.9.3의 복잡한 모델이 아니며, `scripts/build_simple_survivor_v200.py`로 재생성되는 **곡면+텍스처 하이브리드 GLB**가 정본이다. 예전의 돌출 눈/광대/귀/수염 입체 부품을 복원하지 말 것. 실제 브라우저 캡처 전에는 출시 승인 불가. 기존 AFTERDAY 옥상·기상·생존·날짜 시스템은 유지.

---

# Codex Art Acceptance: v1.9.3

승인된 전신 턴어라운드 이미지는 `docs/qa/APPROVED_CHARACTER_TURNAROUND.png`. 사용자 요구는 실제 3D 게임 GLB를 그 이미지와 맞추는 것. 렌더링 비교에서 미달한 외형을 무조건 완료라 보고하지 말 것. 3D 리소스 `public/assets/models/afterday/afterday_bearded_survivor_v190.glb`와 `scripts/build_bearded_survivor_v190.py`가 주요 수정 대상. 실브라우저 정면/45도/측면/착석 이미지와 동작 검증 전 출시는 막을 것. 모델은 여전히 참고 이미지와 완전히 같지 않음.

# Codex 중요: 현재 활성 캐릭터는 AFTERDAY v1.9.2

`docs/qa/APPROVED_REFERENCE_CAP_SHOULDER.png`가 최신 승인 기준입니다. 기존 v1.9.1의 둥근 모자와 솟은 어깨를 복구하지 마세요.

- 활성 GLB 경로: `public/assets/models/afterday/afterday_bearded_survivor_v190.glb` (파일명은 코드 호환성 유지 목적).
- 소스 재생성: `python3 scripts/build_bearded_survivor_v190.py`
- 검수: `npm test` 및 `python3 scripts/render_3d_qa_v190.py`, `python3 scripts/render_motion_qa_v190.py`, `python3 scripts/verify_seat_geometry_v190.py`
- 콘셉트: 검은 수염의 모자 쓴 아저씨, 각진 캡 크라운, 아래로 자연스럽게 떨어지는 어깨, 큰 머리·몸통과 짧은 팔다리.
- 실제 WebGL 브라우저 캡처가 불가능한 현재 환경에서는 완료했다고 속이지 말고, 사용자의 Mac에서 `character.html`을 실행해 4방향 및 동작별 스크린샷을 얻어 시각 검수를 이어가세요.

---

# v1.9.1 캐릭터 리소스 고정 지침

현재 활성 모델은 `public/assets/models/afterday/afterday_bearded_survivor_v190.glb`이며, 파일명은 이전 버전과 같지만 메시 디자인은 v1.9.1입니다. **수정된 얼굴에 다시 광대 구체·큰 귀 장식·눈썹 중복 메시를 추가하지 마세요.** 원본 비교본 `docs/qa/CHARACTER_FACE_BEFORE_AFTER_V191.jpg`와 측정 기록을 먼저 확인하세요. 캐릭터 관절 이름을 바꾸지 말고 기존 모션/생존/날씨를 보존하세요. 출시 전 실제 브라우저 동작별 캡처와 얼굴·어깨 화면을 확인하세요.

# AFTERDAY Character v1.9 · Codex 작업 규약

1. `README.md`, `docs/V190_CHARACTER_DEVELOPMENT.md`, `docs/VALIDATION_V190.md`를 순서대로 읽는다.
2. **인물 고정:** 모자·검은 머리·검은 수염의 중년 남성. 커다란 머리와 둥근 몸통, 짧은 팔다리. 기존 젊은 VRM을 재활성화하지 않는다.
3. 새 캐릭터는 `public/assets/models/afterday/afterday_bearded_survivor_v190.glb`와 `src/beardedSurvivorV190.js` 및 `src/characterMotionPlanV190.js`가 소유한다. 기존 겹친 얼굴 레이어 사용 금지.
4. 게임 월드는 플레이어 옥상 하나, 멀리 퍼지는 폐허 서울, 거리 안개, 자연스러운 기상, 현실 날짜 유지. 이 작업에서는 배경을 불필요하게 수정하지 않는다.
5. 실제 3D 자산 품질 변경 시 먼저 `npm run dev`, `character.html`에서 정면·측면·45°를 검사하고 `npm run qa:bearded-browser`로 실제 WebGL 화면을 촬영한다.
6. `npm test`와 `scripts/verify_seat_geometry_v190.py`를 통과해야 한다. 단순 소스 문자열 체크는 실제 렌더 품질 인증이 아니다.
7. 자동 QA에서 실패하거나 얼굴/몸이 중복될 경우 수정하고 다시 캡처한다. 예쁜 이미지 생성 결과를 실제 게임 캡처로 주장하지 않는다.
8. v1.9는 **관절 노드 기반 리그**이며 SkinnedMesh/모션캡처 완료가 아니다. 이후 전문 리깅 모델로 교체할 경우 이름·액션 호환성을 유지한다.
9. 자원/날짜/날씨 기존 함수와 파일명은 필요한 수정 외에 유지한다(최소 수정).
10. 모델 수정 시 `scripts/build_bearded_survivor_v190.py`를 원본으로 사용하고 GLB 재생성 후 모든 테스트, QA 비교, SHA를 갱신한다.

## 기존 월드 콘셉트 필수 참조
`docs/CONCEPT_LOCK.md`를 반드시 함께 유지한다. 이 문서는 단독 옥상과 서울 폐허 도시 배치를 변경하지 않기 위한 CONCEPT_LOCK 원칙이다.
