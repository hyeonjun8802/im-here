

## 날씨가 생존 자원을 바꿉니다 (2026-11-04)

- 폭우·뇌우에서 정수 탱크가 **식수를 자동으로 모음**: 일일 최대 +4, 탱크 정수 기준 40% 이상, 식수 저장 한도 16개.
- 폭염은 **저장된 물의 자동 증발 + 캐릭터의 빠른 탈수**. 손상된 탱크는 누수 위험도 증가.
- 한파는 보관 식량을 지키지만 파손 탱크는 동파 위험이 있으며, 폭우는 식수 획득과 천막 침수 부담을 동시에 줌.
- 상단 날씨 효과 표시로 자원 변화 확인. 기존 날씨 시연 버튼은 생존 자원에 영향 없음.
- 설계 및 초기 밸런스: [docs/AFTERDAY_WEATHER_RESOURCE_ECONOMY.md](docs/AFTERDAY_WEATHER_RESOURCE_ECONOMY.md).

---
# AFTERDAY — 현실 4시간에 게임 하루 (2026-11-04)

- 기본 **1×: 현실 4시간 = 게임 1일** (게임 가상 시계 6배속)
- 활성 플레이 **2×: 2시간/일**, **4×: 1시간/일**. 게임이 닫혀 있으면 기본 1×로 계속 진행
- 낮/밤·생존자 생활·식량 소모·재난 시간 모두 가상 시계 기준. 기존 DAY/도시 영구 파괴 저장 데이터는 보존·이관
- 오프라인 생존 비용은 최대 8게임시간만 정산하는 보호 규칙 유지
- 자세한 규약: [GAME DESIGN](docs/AFTERDAY_GAME_DESIGN.md)

---

# AFTERDAY v3.9.2 — Pixal3D 표면·보행·착석 교정

GLB의 검은 점과 투명한 구멍처럼 보이던 현상은 입력 이미지의 누락이 아니라, 분리된 UV/법선 정점을 직접 감면하면서 표면 연결이 찢어진 것이 주원인이었습니다. v3.9.2는 정확히 겹친 정점을 먼저 용접하고 감면하지 않은 517,805 삼각형 메시를 게임에 적용했습니다. 4096 텍스처는 완전 불투명으로 유지하면서 UV 바깥 48px 패딩, 작은 베이크 결함 보간, 36,275개 고립 색상 이상치만 정리했습니다.

Walk/Run 상완은 부모 공간 X축에서만 서로 반대 방향으로 앞뒤 스윙하도록 재구성하여 팔꿈치의 Z축 벌어짐과 위아래 들림을 제거했습니다. 착석은 Pixal3D 본의 실제 축에 맞춰 허벅지·무릎 회전 부호를 고치고 발목 역회전을 추가했습니다.

- 활성 GLB: `public/assets/models/afterday/afterday_bearded_survivor_v190.glb`
- 최종 후보: `artifacts/pixal3d-v390/afterday_pixal3d_rigged_v392_despeckled.glb`
- 실제 WebGL 검수: `docs/qa/v392`
- 기술 기록: `docs/PIXAL3D_TOPOLOGY_MOTION_FIX_V392.md`
- 롤백: `public/assets/models/afterday/archive/afterday_survivor_pixal3d_v391_pre_topology_fix.glb`

---

# AFTERDAY v3.9.1 — Pixal3D UV 패딩·진행 방향·보행 팔 교정

4K 아틀라스의 미사용 검정 영역이 브라우저 밉맵으로 번져 보이던 점·균열을 실제 GLB UV 삼각형 마스크 기반 48px 패딩으로 제거했습니다. 검정 수염·머리·장갑은 유효 UV 내부라 보존됩니다. 게임 이동/행동 방향에는 Pixal3D 전용 180° 진행축 보정을 적용하고, Walk/Run에는 대칭 상완 보정을 추가해 팔을 몸통 가까이 유지하면서 앞뒤 스윙은 남겼습니다. 수면 리그와 GLB 자체 좌표는 변경하지 않았습니다.

- 텍스처 복구: `scripts/repair_pixal3d_texture_v391.py`
- 네 방향 검수: `docs/qa/v391/uv-padded`
- 롤백: `public/assets/models/afterday/archive/afterday_survivor_pixal3d_v390_pre_uv_fix.glb`

---

# AFTERDAY v3.9 — Pixal3D 4K 휴머노이드 캐릭터

`GLB_Minimal_Assets/01_GLB_Input/01_A_Pose_Front.png`를 TencentARC Pixal3D의 Apple Silicon MLX 포트로 로컬 재구성했습니다. 얼굴과 코의 저해상도 삼각형 왜곡을 제거하고, 모자·수염·의상·장갑·부츠·배낭을 4096 PBR 텍스처로 보존했습니다. 52만 면의 원본 GLB는 `artifacts/pixal3d-v390`에 유지하고, 게임에는 약 21.6만 면 복제본과 20개 휴머노이드 본, `Idle`, `Walk`, `Run`, `Wave`, `Point`, `Radio` 6개 클립을 적용했습니다.

- 실행: `RUN_STANDALONE_MAC.command` → `http://localhost:5173`
- 캐릭터 360°/동작: `http://localhost:5173/character.html`
- Pixal3D 구조 검증: `npm run qa:pixal3d`
- 생성·리깅·검수 기록: `docs/PIXAL3D_HUMANOID_PIPELINE_V390.md`
- 이전 SF3D v3.8 GLB: `public/assets/models/afterday/archive/afterday_survivor_sf3d_v380_pre_pixal3d.glb`

---

# AFTERDAY v3.8 — Stable Fast 3D 휴머노이드 캐릭터

`GLB_Minimal_Assets` A-Pose를 Stable Fast 3D 2048 텍스처로 재구성하고, 20개 휴머노이드 본과 `Idle`, `Walk`, `Run`, `Wave`, `Point`, `Radio` 6개 클립을 하나의 GLB에 포함했습니다. 후면 참조를 기반으로 배낭을 별도 메시로 복원했고 Chest에 안정적으로 결합했습니다.

- 실행: `RUN_STANDALONE_MAC.command` → `http://localhost:5173`
- 캐릭터 360°/동작: `http://localhost:5173/character.html`
- SF3D 구조 검증: `npm run qa:sf3d`
- 생성·선정·리깅 기록: `docs/SF3D_HUMANOID_PIPELINE_V380.md`
- 이전 TripoSR v3.7 GLB는 `public/assets/models/afterday/archive/afterday_survivor_triposr_v370.glb`로 보존했습니다.

---

# AFTERDAY v3.7 — 도구 손 위치 교정

모션 소품이 손에서 벗어나던 문제를 실제 GLB 팔 본의 바인드 좌표계를 기준으로 수정했습니다. 자세한 검증: `docs/HAND_PROP_ALIGNMENT_V370.md`.

독립 실행형 Mac: `RUN_STANDALONE_MAC.command` → http://localhost:5173. 캐릭터 동작 확인: http://localhost:5173/character.html (`식사`, `물 마시기`, `무전`, `기타 연주`).

---

# AFTERDAY v3.5 — GLB 에셋 디테일 개선 (2026-11-01)

- **실제 원본 GLB에 직접 반영**: 안쪽 침대의 곡면 베개·밝은 침구·발치에 접힌 이불·매트리스 봉제선, 물탱크의 오래된 표식/녹 흔적, 보급 상자 식별 라벨.
- 기존 v3.4의 원본 침대 좌표·수면/기상 애니메이션·생존/날씨/도시 로직 변경 없음.
- `docs/qa/v350/AFTERDAY_V350_GLBS_BEFORE_AFTER.png`는 **실제 포함된 GLB 메시를 VTK에서 오프스크린 렌더한 전후 비교**이며 게임 브라우저 캡처는 아닙니다.
- `docs/ASSET_REVIEW_V350.md`에 검수 항목, 수행 결과와 미검증 부분을 구분했습니다.
- 실행: macOS에서 `RUN_STANDALONE_MAC.command` (Node.js 필요). 브라우저 주소 `http://localhost:5173`.

---

# AFTERDAY v3.4 — GLB 침대 수면 모션 좌표 보정

이번 버전은 **안쪽 천막 원본 GLB 침대 하나만 사용**합니다. 천막 GLB 안에 있는 기존 매트리스(`narrow sleeping pallet_41`)와 베개(`pillow_43`)에 캐릭터를 맞췄으며, 이전에 생성되던 바깥 cot를 제거했습니다.

- 수면은 23:00에 침대 접근 → 앉기(1초 이상 유지) → 몸 뒤로 눕히기 → 베개에 머리 정렬 → 이불 덮기, 기상은 역방향입니다.
- `character.html?pose=sleep-enter&at=1.3` / `&at=2.5` / `&at=3.45` / `&at=5.6`: 시간별 프레임을 정지시켜 확인할 수 있습니다.
- `docs/qa/v340/GLB_SLEEP_6FRAME_OFFLINE_QA.png`는 원본 캐릭터·침대 GLB를 별도 오프스크린 렌더러로 표현한 6단계 검수 이미지입니다. **게임 WebGL 캡처가 아닙니다.** 자동 Chromium 촬영은 sandbox의 `ERR_BLOCKED_BY_ADMINISTRATOR` 제약으로 불가능했습니다.
- 게임 실행: Mac에서 `RUN_STANDALONE_MAC.command` 실행. Node.js 필요.
- 기술적 수치와 검증 범위는 `docs/SLEEP_MESH_ALIGNMENT_V340.md` 참고.

---

# AFTERDAY v3.2 — 기존 침대 통합 · 앉았다 눕기 · 베개 방향 교정 · 이불

**이번 릴리스가 최신입니다.** 스크린샷으로 보고된 수면 오류에 대한 코드 수정본이며, 게임 플레이 중 수면 공간은 단 하나입니다.

- **중복 침대 제거:** `world.createRoofProps()` 및 `CinematicStage.detailShelter()`에서 별도로 추가되던 침대형 물체를 제거. 원래 옥상 침대 `(-12.4, -2)`만 유지합니다.
- **원본 침대 리소스 통합:** `src/sleepBedding.js`가 매트리스, 푹신한 베개, 발치에 접혀 있는 이불 및 접힌 이불이 펼쳐지는 메시를 함께 소유합니다. 잠이 든 뒤에 별도 침대를 만들지 않습니다.
- **방향 교정:** 캐릭터의 머리는 베개가 있는 **-X** 방향, 얼굴은 하늘(+Y) 방향을 향합니다. 침대 실제 치수 및 GLB 머리 관절 좌표 기준으로 일치시켰습니다.
- **연속 수면 모션:** 23:00 침대 접근 → 침대에 앉아 1.2초 이상 머무름 → 등을 대며 눕기 → 이불 덮고 취침 → 07:00 이불 접고 앉았다 일어나기. 눕기 5.6초 / 기상 5.2초.
- **게임에서 보기:** `http://localhost:5173/` → 일상 행동 → 23시 취침 시연. `http://localhost:5173/character.html` → `침대에 앉은 자세`, `앉았다가 눕기`, `누워 자기`, `침대에서 일어나기`.
- **Mac 실행:** 압축 해제 후 `RUN_STANDALONE_MAC.command` 실행. Node.js 필요; 별도 패키지 설치 없이 포함된 모듈 사용.
- **개발 검증:** Node 자동 회귀 테스트 **191/191 통과**, Three.js 실제 메시 생성·이불 지오메트리·베개/머리 방향 테스트 통과. 독립 실행 서버 정상 응답.
- **시각 검증 한계:** 실행 환경의 EGL/WebGL 초기화가 실패해 실제 3D 화면 촬영과 FPS 측정은 완료하지 못했습니다. 실화면과 베개·손·몸의 접촉을 픽셀 단위로 최종 승인한 것은 아닙니다.

상세 내용: [`docs/SINGLE_COT_SLEEP_V320.md`](docs/SINGLE_COT_SLEEP_V320.md).

---

# AFTERDAY v3.0 — 하루 생활 루틴 (23시 취침 / 7시 기상·스트레칭)

- **신규:** 한국 시간 23:00 기존 침대에서 수면, 07:00 기상 후 스트레칭 1회. 기존 생활 AI/생존·날씨는 유지.
- **시연:** 게임의 `일상 행동` 패널에서 `23시 취침`, `7시 기상·스트레칭`, `실제 시간으로 복귀` 버튼 이용. 프리뷰는 실제 생존 시간을 변경하지 않습니다.
- **Mac 실행:** `RUN_STANDALONE_MAC.command` (Node.js 필요) → `http://localhost:5173`.
- **기술 문서:** [`docs/DAILY_LIFE_CYCLE_V300.md`](docs/DAILY_LIFE_CYCLE_V300.md).
- **검증 한계:** 실제 WebGL 화면/기기 FPS 검증은 완료되지 않았습니다.

---

# AFTERDAY v2.9 — 식생·충돌·식사·하늘 통합 개선

**변경 및 미검증 사항은 [`docs/REVIEW_AND_FIX_V290.md`](docs/REVIEW_AND_FIX_V290.md)에 정리했습니다.**

- v2.8 도시와 생존 시스템은 유지했습니다.
- `RUN_STANDALONE_MAC.command`로 실행(Node.js 필요).
- 실제 WebGL 시각 검수와 실기기 FPS는 아직 완료하지 못했습니다. 자동 테스트 결과를 시각 품질 승인으로 간주하지 않습니다.

---

# AFTERDAY v2.7 — 바로 옆까지 밀집된 배경 도시 (2026-11-01)

**실행:** `RUN_STANDALONE_MAC.command` (Node.js 필요). v2.6 대비 배경 건물을 생존 옥상 바로 옆에 배치했습니다.

- 가장 가까운 건물 중심 거리: **65.1 → 35.3** 월드 유닛. 플레이어 옥상 46×46 유닛과 실제 건물 외벽 사이에 최소 5.5유닛 이격.
- PC 건물 **407 → 451개**, 모바일 **353 → 390개**. 건물 4개 층간 모델/창문/난간/덩굴과 지면 안개 유지.
- 60유닛 이내 건물 **0 → 24개** (PC). 건물은 전부 주인공 옥상보다 낮음.
- 3D 카메라 좌표 투영 가시 건물 **155 → 176개** (PC). **실제 WebGL 화면 캡처가 아니며 FPS를 측정하지 못함.**
- 테스트 **162/162 통과**, 건물 간 충돌 0건, 고정된 단일 생존 옥상 안전 이격 검사 완료.
- 상세: `docs/CITY_HERO_ADJACENT_V270.md`

---

# AFTERDAY v2.6 — 배경 건물 근접 배치 개선 (2026-11-01)

**최신 실행:** `RUN_STANDALONE_MAC.command` (Node.js 필요). 실제 3D 배경 건물만 조정했으며, 생존 시스템·날씨·캐릭터·한 개의 플레이어 옥상은 변경하지 않았습니다.

- **가장 가까운 건물 중심:** v2.5 약 **93.7 → v2.6 약 65.1** 월드 유닛.
- **가장 먼 건물 중심:** 약 **349.4 → 278.4** 월드 유닛.
- **PC 건물 개수:** **398 → 407**개. 모바일 기준 **353**개.
- **게임 카메라에서 보이는 건물:** 투영 검사 기준 **130 → 155**개. 190유닛 내에 보이는 건물 **40 → 83**개.
- **검증:** 자동 테스트 **160/160** 통과, 건물 간 겹침 **0**, 단일 옥상 안전 반경 준수.
- **촬영 한계:** 이 환경에서 Chromium의 EGL/WebGL 초기화에 실패해 *실제 게임 렌더 스크린샷*은 확보하지 못했습니다. 이 수치는 3D 좌표와 카메라의 수학적 투영값이지 픽셀 품질 측정이 아닙니다.

자세한 기준 및 결과는 `docs/CITY_CAMERA_QA_V260.md`를 참고하세요. Mac 캡처 보조 도구: `CAPTURE_GAME_MAC.command` (실기기 미검증).

---

# AFTERDAY v2.5 — 배경 도시 재설계 (이전 릴리스 기록)

**이번 최신 수정본 실행:** `RUN_STANDALONE_MAC.command` (Node.js 필요). 아래의 v2.4/이전 문서는 과거 변경 기록입니다.

이번 수정은 제공된 게임 스크린샷에서 건물이 멀고 작고 모두 같은 높이의 상자처럼 보인다는 문제를 수정합니다. 배경 도시는 398개의 실재 3D 건물로 다시 배치되고, 가까운 주거 건물의 창문·층·발코니·난간·붕괴 부위·옥상 시설·덩굴이 구분되도록 모델과 4개 텍스처를 개선했습니다. 건물 높이는 가변이며 생존 옥상(16유닛) 아래로 유지됩니다. 게임 저장 데이터와 캐릭터/생존/날씨 로직은 그대로입니다.

- **Mac 실제 게임 캡처 시도:** `CAPTURE_GAME_MAC.command` (Chrome 필요, 작업환경에서는 검증 불가)
- **게임 좌표 기반 시야 검증:** `docs/qa/v250/camera_projection_audit.json` (실제 게임 스크린샷 아님)
- **변경·검증 문서:** `docs/CITY_CAMERA_QA_V250.md`
- **테스트:** `npm test` → 158개 통과 (WebGL 실화면/FPS 검증 불가)

---

# AFTERDAY v2.1 — TripoSR 캐릭터를 적용한 Three.js 게임

**기본 문서:** [TripoSR macOS 파이프라인](docs/TRIPOSR_MACOS_PIPELINE.md) · [START_HERE_V200.md](START_HERE_V200.md) · [v2.0 이전 모델 제작/검수](docs/V200_CHARACTER_REBUILD.md)

이 프로젝트는 원래 AFTERDAY 옥상 생존 게임의 기존 기능·3D 폐허 도시·날씨·자원 관리·생활 행동을 유지하면서, 제공된 정면 캐릭터 이미지를 Hugging Face `stabilityai/TripoSR`로 재구성한 **텍스처 포함 스킨드 GLB**를 적용했습니다. Apple Silicon MPS에서 생성했고 기존 9개 게임 동작 관절을 유지합니다.

```bash
npm install
npm run dev
```

- [게임] `http://localhost:5173/`
- [캐릭터 360° / 행동 검수] `http://localhost:5173/character.html`
- [자동 테스트] `npm test`
- [GitHub 도시 GLB 받기] `npm run download:assets` (게임 도시 모델을 사용하려면 인터넷 필요)

**현재 검증:** 최종 GLB의 임베디드 텍스처·스킨·9개 관절과 Blender 다각도/관절 변형 렌더를 확인했습니다. 실제 브라우저 검수 결과는 작업 시점의 검증 기록을 따르며, 오프라인 화면을 브라우저 스크린샷이라 표현하지 않습니다.

과거 v1.9.3의 메시 100개 이상, 눈알 3D, 귀 3D 등을 강제하던 테스트는 이번 디자인 원칙과 정면 충돌하므로 `docs/legacy_tests_v193`에 원본을 보관했습니다. 새 `tests/simplified-character-v200.test.mjs`가 동일한 게임 기능 및 새 아트 설계를 검증합니다.

## 2026-10-31 · 지면 안개 / 도시 압축 / 자연 침식 통합

옥상 밑 시야를 덮는 입체 지면 안개, 기존 단일 옥상 안전구역을 보존하는 원경 건물 거리 압축, 전체 외벽의 오염·덩굴·이끼와 자연 침식이 적용되었습니다. 기존 날씨·게임 로직·캐릭터는 유지합니다.

- **설치 없이 실행 (Node.js 필요):** `./RUN_STANDALONE_MAC.command` → http://localhost:5173/
- **개발용 실행:** `npm install && npm run dev`
- **테스트:** `npm test` (144개 통과)
- **변경 상세 및 검증 범위:** `docs/SCENERY_RECLAMATION_20261031.md`

독립 실행형 `dist/`는 Three.js 모듈 포함 버전으로, 로컬 웹 서버를 통해 구동합니다. 현재 실행 환경에서 Chromium의 로컬 URL 접근 제한으로 신규 환경 효과의 실제 WebGL 육안 검증은 완료되지 않았습니다.

## 2026-11-01 · 안개에 잠긴 자연 침식 도시

실제 지붕이 파손된 3D 고층 건물, 더 촘촘한 도심, 건물 외벽의 침식·덩굴·균열과 옥상 수목을 직접 통합했습니다. 원래의 단일 생존 옥상·게임 규칙과 날짜는 유지했습니다. 콘셉트 그림과 실제 3D 렌더 결과를 혼동하지 마세요.

- **실행:** `./RUN_STANDALONE_MAC.command` (Node.js 설치 필요)
- **검증:** Node.js 자동 테스트 147개 통과, WebGL 실제 화면 캡처 미완료
- **자세한 변경 기록:** `docs/AFTERDAY_DENSE_RUIN_CITY_20261101.md`
- **목표 컨셉 이미지:** `docs/visual-reference/AFTERDAY_OVERGROWN_CITY_GOAL_20261101.png` (실제 게임 캡처 아님)

## 2026-11-01 · 뭉툭하고 낮은 폐허형 도심 배치 v2.3

이미지를 배경에 덧씌우지 않고 실제 도시 3D 건물의 위치/높이/외벽/지붕과 지면 안개를 변경했습니다. **모든 도시 건물은 주인공 옥상(y=16)보다 낮고**, 중앙의 약 560유닛 반경 내로 집약됩니다. 단일 옥상 안전구역은 유지됩니다.

- 상세 규칙/검증: `docs/CITY_COMPOSITION_IMPLEMENTATION_20261101.md`
- 맥 실행: `RUN_STANDALONE_MAC.command` (Node.js 필요)
- 브라우저 실화면 캡처: 보안 제한 때문에 미완료 (실화면 품질/FPS 미확인)

## 2026-11-01 · 도시 밀집/실제 건축물 디테일 v2.4

배경 시야가 비어 보이는 문제를 해결하기 위해 건물 반경을 최대 약 455로 줄이고, 975(PC)/417(모바일)개 건물에 맞춘 층 구조와 실제 3D 발코니·난간·배관·실외기·옥상 난간을 인스턴싱으로 통합했습니다. 창문 텍스처는 건물의 층 비율에 맞게 다시 제작했습니다. **주인공 옥상 아래 높이 제한은 유지**합니다. 상세: `docs/CITY_DENSITY_ARCHITECTURE_V240.md`. 실화면 WebGL 캡처는 실행 환경 정책 때문에 확인하지 못했습니다.

## v2.8 하늘·태양·달 개발 (2026-11-01)
- 서울 실제 날짜/시간에 맞춰 태양과 달의 하늘 위치 계산.
- 달의 초승달·반달·보름달·하현달 등 위상 변화, 달빛/구름/일몰 가림 표현.
- 날씨 시연 패널에서 4종 달 위상 미리보기 가능(저장된 게임 시간 불변).
- 실행: `RUN_STANDALONE_MAC.command` (Node.js 필요).
- 상세: `docs/CELESTIAL_SKY_V280.md`.


## v3.1 — 침대에 눕고 일어나는 모션

23:00 침대에 접근 → 가장자리에 앉기 → 몸을 뒤로 낮추며 눕기(3.8초) → 수면 유지 → 07:00 역순으로 일어나기(4.2초). `character.html`에서 독립적으로 3개 수면 포즈를 확인할 수 있습니다. 자세한 설계와 검증은 `docs/SLEEP_ANIMATION_V310.md` 참조.
