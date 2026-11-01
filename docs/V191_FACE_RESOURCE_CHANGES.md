# AFTERDAY v1.9.1 — 얼굴·어깨·의상 볼륨 교정판

**이 버전은 게임 리소스인 실제 GLB를 교체했습니다. 2D 콘셉트 이미지를 새로 생성한 작업이 아닙니다.**

기존에 사용 중인 `public/assets/models/afterday/afterday_bearded_survivor_v190.glb` 파일을 동일한 이름으로 다시 생성해 교체했습니다. 따라서 Three.js `GLTFLoader` 경로, 게임 캐릭터 관절 이름 9개, 걷기·착석·식사·기타·무전 코드를 변경할 필요가 없습니다.

- 광대: 겹쳐 붙인 좌우 독립 광대 구체 제거. 기본 두상 곡면만 사용.
- 귀: 외부 돌출과 두께 감소. 어색한 추가 귓속 타원 메시 제거.
- 눈·눈썹: 눈을 약 23% 작게, 눈썹 높이를 약 44% 낮게 조정. 눈썹 융기용 별도 구체 제거.
- 어깨: 별도 어깨 패딩의 좌우 폭 38% 감소, 튀어나온 외곽점 17% 감소. 소매도 가늘게.
- 수염: 턱수염 전방 돌출 약 19% 감소. 검은 수염·모자 콘셉트 유지.
- 의상: 가슴 주머니 폭 23% 감소, 큰 도구 파우치·과한 금속 장식·팔 패치·추가 봉제 장식 제거. 목의 겹친 천 표현 축소.

수치의 측정 대상은 GLB 개별 메시의 실제 기하 범위이며, 전체 캐릭터가 일정 비율로 축소되었다는 뜻이 아닙니다.

**검수 산출물**

- `docs/qa/CHARACTER_FACE_BEFORE_AFTER_V191.jpg`: 동일 카메라 방향에서 렌더한 실제 기존/신규 GLB 비교
- `docs/qa/CHARACTER_3D_MULTIVIEW_QA.jpg`: 새 GLB의 정면·45도·측면·후면
- `docs/V191_ACTUAL_GLB_GEOMETRY_AUDIT.json`: 측정 가능한 기하 비교
- `docs/backup/afterday_bearded_survivor_v190_ORIGINAL.glb`: 문제 발생 시 원본 모델로 롤백 가능
- `scripts/build_bearded_survivor_v190.py`: 편집 가능한 GLB 생성 코드(출력 이름 유지)
- `tests/face-proportions-v191.test.mjs`: 회귀 방지 검사

**실행**: `npm install && npm run dev` 후 `/character.html`에서 정면·측면 회전 및 생활 동작을 확인합니다. 기존 게임은 `/`입니다. 게임 월드·생존 날짜·날씨 코드는 수정하지 않았습니다.

**검증 한계**: 실제 GLB 소프트웨어 렌더와 Node 게임 테스트는 통과했습니다. 현재 환경에서는 npm 다운로드가 DNS 오류로 실패해 실제 Three.js WebGL 렌더링 및 Safari·Chrome 실기기 검증을 완료하지 못했습니다. 따라서 출시 품질을 달성했다고 표시하지 않습니다.

---

