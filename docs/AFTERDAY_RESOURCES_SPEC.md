# AFTERDAY — RESOURCE BIBLE & ASSET PRODUCTION MANIFEST (최종 리소스 통합본)

> 버전 v3.0 / Codex E2E 전달용 / 2026-10-31  
> **핵심 구분:** 이 패키지에는 과거 제작한 **2D 생성 시안 PNG, 참조 스크린샷, v0.3 파생 텍스처 JPG, 실제 코드 자산**이 있다. **완성된 고품질 GLB·리깅 캐릭터·시네마틱 VFX의 존재는 검증되지 않았다.** 이 파일을 3D 상용 에셋 패키지라고 소개하면 안 된다.

## 0. 이 문서가 필요한 이유

AFTERDAY의 그래픽 완성도가 낮았던 이유는 디자인 시안의 품질이 아니라, 그 시안의 오브젝트가 실제 3D 엔진에서 사용할 **모델·머티리얼·리깅·애니메이션·VFX**로 제작되지 않았기 때문이다. 단색 큐브에 2D 이미지를 입히는 것으로는 해결되지 않는다. Codex의 책임은 이 문서의 목록을 참조하여 **실제 작동하는 3D 제작 파이프라인과 모델**을 구현하고, 제작 불가능한 자산은 미완성으로 분리·기록하는 것이다.

### 참고 그림 vs 최종 게임 자산

| 파일 유형 | 현재 포함 | 실제 역할 | 게임 완료 가능 여부 |
|---|---|---|---|
| PNG 콘셉트/시트 | 있음 | 아트 방향·형태·상태 참조 | **단독으로 3D 게임 완료 불가** |
| 사용자 제공 APOChill 화면 | 있음 | 화면 구도/디자인 참고만 | 제품에 그대로 배포 금지 |
| v0.3 질감 JPG/아틀라스 | 있음 | 낮은 수준의 임시 재질 | 품질 고도화 필요 |
| v0.3 WebGL 메시 | 코드 안에 있음 | 기존 프로토타입 기능 회귀 | 새 엔진에서는 참고만 |
| `.blend` 소스 | 미확보 | 실제 모델링·UV 제작 | **신규 제작 필요** |
| `.glb` 환경 모델 | 미확보 | 실제 3D 월드 | **신규 제작 필요** |
| `.glb` rigged 캐릭터 | 미확보 | 3D 자율행동 애니메이션 | **신규 제작 필요** |
| KTX2 PBR 패키지 | 미확보 | 고품질 모바일 재질 | **신규 제작 필요** |
| 오디오 VFX·사운드 | 미확보 | 날씨/캐릭터/도시 입체 음향 | **신규 제작 또는 CC0 확보** |

## 1. 폴더 구성과 배포 정책

```text
assets/
├── concept/              # 옥상/도시/아트보드/기획 참고 2D 시안
├── characters/           # 생존자·동물 시트 (2D concept)
├── facilities/           # 천막/보관함/물탱크/배수/울타리 시트
├── weather/              # 날씨별 레퍼런스 및 재난 VFX 시트
├── ui/                   # UI 시안 (디자인 레퍼런스, 완성 UI 아님)
├── materials/            # 기존 프로토타입 재질·원경 JPG
└── third_party_reference/# 사용자 제공 사이트 스크린샷: 배포용이 아닌 참고
legacy/v030/             # 기존 사용자 실행용 WebGL2 코드 (마이그레이션 회귀 기준)
legacy/engineering_v2/   # 과거 시간/재난 참고 코드와 테스트
manifests/               # 각 포함 파일의 해시·용량·크기·범주와 제작 현황
```

**새 PlayCanvas 프로젝트의 `public/assets`로 위 레퍼런스 폴더를 통째로 복사하지 않는다.** 프로덕션 런타임에는 QA 통과한 GLB·압축 PBR·VFX·오디오만 넣는다. 개발팀 자료의 PNG 시안을 정적 웹 번들에 그대로 넣으면 용량만 증가한다.

## 2. 비주얼 아트 앵커와 승인 장면

### 2.1 최상위 기준 프레임

선호 아트는 후기 `애프터데이_서울_옥상_생존_캠프.png`, `애프터데이_서울_옥상_생존_아트보드.png`, `애프터데이_다섯_하늘의_옥상.png` 등 **시네마틱 Stylized Realism** 계열이다. 이전 초창기 ‘복셀 스프라이트 시트’는 구조·수량·오브젝트 목록 참고용으로만 사용하고, 최종 그래픽 품질을 초창기 픽셀 시트에 맞춰 낮추지 않는다.

### 2.2 기준 품질의 3요소

1. 프레임 내 중경·전경이 분리되는 진짜 깊이감. 옥상으로부터 주변 폐허까지 시야·그림자·원근 유지.
2. 콘크리트·금속·천막·식생이 각기 다른 물성으로 빛에 반응. 마모·녹·젖음·조명이 자연스럽다.
3. 같은 카메라 포즈에서 맑음/폭염/폭우/낙뢰/토네이도/밤으로 점진 전환; 날씨는 상태 수치와 시설의 실제 반응에 연결.

## 3. 3D 리소스 제작 목표 — 최소 생산 목록

### 3.1 Scene/Environment

| ID | Target GLB / Source | 최소 모델 범위 | 물성 | 사용상태 |
|---|---|---|---|---|
| ENV-001 | `env_rooftop_base.glb` | 옥상 데크/측벽/높이/출입구 | crack, wetness, moss | **필수 제작** |
| ENV-002 | `env_parapet_set.glb` | 직선/코너/파손 난간 + 파손 변형 | concrete/metal | **필수 제작** |
| ENV-003 | `env_rooftop_tiles.glb` | normal/cracked/wet/moss/drain | PBR atlas | **필수 제작** |
| ENV-004 | `env_city_near.glb` | 근중경 폐허 건물의 다양한 실루엣 | brick/glass/concrete | **필수 제작** |
| ENV-005 | `env_city_mid.glb` | 중경 빌딩 모듈 + 덩굴 | LOD | **필수 제작** |
| ENV-006 | `env_city_distant.glb` | 먼 폐허 타워/산/원경 분리 | fog compatible | **권장** |
| ENV-007 | `env_access_stairwell.glb` | 옥상 계단/출입문 | rust/wetness | **필수 제작** |

### 3.2 Facilities/Props

| ID | Target GLB | 구성 | 상태·애니메이션 |
|---|---|---|---|
| STR-001 | `prop_shelter.glb` | 천막, 내부, 로프, 침구, 지주 | normal/wet/damaged/repair, cloth sway |
| STR-002 | `prop_water_tank.glb` | 수조, 고정 프레임, 밸브, 배관 | water level, leak, damaged |
| STR-003 | `prop_storage_food.glb` | 밀봉 상자, 내용물, 자물쇠 | lid open/closed, wet/damaged |
| STR-004 | `prop_awning.glb` | 그늘막, 장력 로프, 연결부 | wind, torn, repaired |
| STR-005 | `prop_drainage.glb` | 배수 홈, 그레이트, 배출구 | water flow, clogged |
| STR-006 | `prop_barrier_set.glb` | 1m~2m 울타리, 모서리, 문 | bent/broken, defense |
| STR-007 | `prop_fireplace.glb` | 불씨, 장작, 돌 테두리 | on/off, rain suppression |
| STR-008 | `prop_workbench.glb` | 작업대, 수리 도구, 작은 서랍 | repair action sockets |
| STR-009 | `prop_solar_panel.glb` | 판넬, 배터리, 케이블 | sunny output, damage |
| STR-010 | `prop_planter_set.glb` | 작은 재배통·텃밭 | alive/dry/wet/damaged |
| STR-011 | `prop_barrels_boxes.glb` | 들고 옮기는 상자·드럼 | pick/carry/throw-safe |
| STR-012 | `prop_lamp_string.glb` | 전구줄/행잉 랜턴 | night emissive, wind sway |

### 3.3 Character/Animals

| ID | Target | 기능 | 규격 |
|---|---|---|---|
| CH-001 | `char_survivor_base.glb` | 생존자 1명 full rig | 앞/측/뒤 같은 모델, PBR |
| CH-002 | `char_survivor_animation.glb` 또는 내장 클립 | idle/walk/run/eat/drink/sleep/repair/crouch/carry | 실제 스켈레탈 애니메이션 |
| CH-003 | `creature_stray_dog.glb` | 야생동물 침입 | 단순 3D 움직임, 루프 공격 금지 |
| CH-004 | `creature_crow.glb` | 식량과 위험 감지 | fly/land/idle |
| CH-005 | `creature_rat.glb` | 보관함 피해 | scurry/idle |

### 3.4 3D 날씨·이펙트(개별 에셋+엔진 연출)

| ID | 산출물 | 구현 형태 | 후처리/효과 |
|---|---|---|---|
| FX-001 | `fx_cloud_layer` | Shader+geometry/noise | cloud cover/motion |
| FX-002 | `fx_rain` | 공간 파티클 + splash atlas | depth+wind collision |
| FX-003 | `fx_wet_surface` | wetness mask + PBR parameter | 누적/건조 보간 |
| FX-004 | `fx_puddle` | 물웅덩이 mesh/ripple | 배수와 연결 |
| FX-005 | `fx_lightning` | 위치 기반 bolt + global flash | thunder delay, accessibility |
| FX-006 | `fx_tornado` | 월드 공간 funnel + swirl + debris | 실제 위치, 이동, 입체 시차 |
| FX-007 | `fx_heat_haze` | 부분 distortion | UI 제외 |
| FX-008 | `fx_snow_ice` | snowflakes + frost material | 쌓임/해빙 |
| FX-009 | `fx_wind` | vegetation/tarp deformation | 동일 windVector |
| FX-010 | `fx_fire` | flame/smoke/sparks | light + weather link |

**FX는 참고 sprite atlas가 있다고 완성되는 것이 아니다.** Scene 좌표, material, particle behavior, renderer event 연결 및 프로파일링까지 필요.

## 4. DCC → 런타임 제작 표준

- 무료 DCC: Blender (Python 자동화 가능), 필요한 경우 무료 CC0 모델과 텍스처를 편집.
- 파일 명명: `env_`, `prop_`, `char_`, `creature_`, `fx_`, `ui_`. BaseColor/Normal/Roughness/Metallic/AO 채널 별 명시.
- 좌표/스케일: Blender 씬 1unit=1m 지향, import 후 실제 사람 키/문 높이 비교. 최종 PlayCanvas 좌표 변환 검증.
- Pivot: 시설은 바닥 접촉 중앙, 문·밸브는 회전 축, 캐릭터는 발바닥 기준.
- 모델링: High/low 구분, UV unwrap, baking, PBR 텍스처, LOD, collision/proxy, .blend source 저장.
- 필수 제작 증거: front/back/side render, wireframe, texture maps, GLB in-engine orbit screenshot.
- 텍스처 압축: KTX2/Basis 등 엔진 지원 기준 검증. 색공간: sRGB color / linear data maps 등 설정.
- 모델 수·삼각형 수·텍스처 용량 목표는 실측 기반 프로파일링으로 정함. 임의 예산을 확정 사양인 척 기록하지 않는다.

## 5. 모델 완성 검수 (Asset Acceptance)

```text
[ ] 3D GLB이고 파일이 실제 존재
[ ] PlayCanvas에서 로드 성공, 로드 실패 재시도 처리
[ ] 0/90/180/270°에서 모델 형태가 정상
[ ] UV가 일그러지지 않고 텍스처 로드 오류 없음
[ ] PBR의 거칠기·메탈릭·노멀에 실제 차이 있음
[ ] 실제 카메라 거리에서 실루엣이 참조와 부합
[ ] 손상/젖음/수리 상태가 눈으로 구분됨
[ ] 재난 VFX와 같은 이벤트/상태 연결
[ ] 모바일 품질 단계에서 작동
[ ] 출처·라이선스·작성자/제작 방식 기록
[ ] 테스트 장면의 실제 GPU 캡처 저장
```

1개라도 빠지면 `PROTOTYPE` 또는 `PARTIAL`로 기록하고 `APPROVED`로 표시하지 않는다.

## 6. 우선 리소스 묶음과 구현 순서

| 우선순위 | 제작 묶음 | 엔진 반영 완료 조건 |
|---|---|---|
| Asset Gate A | 옥상바닥·난간·도시 근중경 | 실제 3D 360° + 그림자 + 근중경 시차 |
| Asset Gate B | 천막·물탱크·보관함·모닥불·식생 | PBR 5종 이상, 기능적 위치/고정 |
| Asset Gate C | 생존자 리깅 + 7개 기본 행동 | 움직임이 게임 상태와 일치 |
| Asset Gate D | 24h 조명·구름·폭우 VFX | 1개 완성 재난 Golden Path |
| Asset Gate E | 토네이도·낙뢰·한파·동물 | 실제 3D VFX·피해·복구 |
| Asset Gate F | UI/오디오/최적화 | 모바일 실제 단말 검증 |

상용 비주얼을 목표로 하되 먼저 1개 옥상/1명 생존자/폭우 1종을 Vertical Slice로 완성하고, 기준 미달 시 전체 기능 추가보다 아트 품질 개선을 우선한다.

## 7. 기존 v0.3 및 연구 코드 보존 전략

- `legacy/v030/`: 동작 로직·날짜/날씨/자원 비교 및 구조 확인 **전용**. 최종 엔진에 핵심 WebGL 렌더 코드를 그대로 복제할 필요 없다.
- `legacy/engineering_v2/`: 시간/재난 스케줄 검증용 `.mjs`, 단위 테스트 `.mjs`, 과거 개발 명세. 새로운 TS 구현에서 테스트 아이디어 재사용.
- `assets/materials/`: v0.3의 낮은 단계 질감/도시 배경 이미지는 변경 전후 비교 또는 임시 재질로만 사용. 품질 Gate에서는 보수적으로 평가.
- `qa/`: 과거 v0.2/v0.3 화면은 ‘BEFORE’, 새 PlayCanvas 실제 앱 실행 캡처는 ‘AFTER’. 혼동 불가.

## 8. 라이선스·출처 관리

- 사용자 제공 타 사이트(APOChill) 스크린샷은 아트 감성/구도 파악을 위한 내부 참고로만 제공. 사이트 화면, 로고, 원본 UI 패널 등을 제품에 재사용하지 않는다.
- 이미지 생성으로 만든 시트는 3D 모델의 지오메트리, 파생 게임용 파일로 바로 간주하지 않는다. 제작·수정·모델링 과정을 기록한다.
- 외부 3D 모델/텍스처/오디오는 무료라고 상용 이용이 자동 허용되는 것이 아님. 출처 URL, 라이선스, attribution 의무, 저작권 제한, 파일 버전을 기록한다.
- Poly Haven CC0 등 명시적으로 재배포·상업 사용이 가능한 항목 우선.
- 저작권이 있는 음악이나 외부 게임/사이트의 소품 모델을 무단 복제하지 않는다.

## 9. 리소스 추적 테이블 작성 규칙

개별 리소스는 `manifests/ALL_FILES.json`에 `path,sha256,size,width,height,category,role,productionReady` 등을 기록한다. **참고 자료**의 `productionReady`는 `false`다.

실제로 Codex가 새로 만든 GLB에는 다음 메타를 추가한다.

```json
{
  "id": "STR-001",
  "name": "shelter",
  "source": "art/source/shelter.blend",
  "runtime": "public/assets/models/prop_shelter.glb",
  "license": "original-work",
  "status": "needs-art-review",
  "lod": ["LOD0", "LOD1"],
  "states": ["normal", "wet", "damaged", "repaired"],
  "screenshots": ["qa/asset_shelter_orbit_0.png", "qa/asset_shelter_orbit_180.png"],
  "verifiedOn": ["desktop-webgl2"]
}
```

여기서 `license` 및 `verifiedOn`은 **미래 출력 포맷 예시**이며 현재 제작 완료를 의미하지 않는다.

## 10. 파일별 실제 보유 리소스 목록

아래 표는 ZIP 제작 시 실제 파일을 조사하여 채운다. `참고`는 2D 콘셉트, `레거시`는 기존 v0.3 구현 자료이며, **게임에 바로 적용할 수 있는 3D 에셋은 별도로 생성해야 한다.**

| 분류 | 실제 패키지 경로 | 크기(px) | 상태 |
|---|---|---:|---|
| characters | `assets/characters/복셀_생존자_액션_스프라이트_시트.png` | 1254×1254 | 2D 시안·3D 제작 필요 |
| characters | `assets/characters/애프터데이_서울_생존자_캐릭터_시트.png` | 1672×941 | 2D 시안·3D 제작 필요 |
| characters | `assets/characters/애프터데이_옥상_생존자_도감.png` | 1448×1086 | 2D 시안·3D 제작 필요 |
| concept | `assets/concept/afterday_옥상_생존_캠프_가이드.png` | 1672×941 | 2D 시안·3D 제작 필요 |
| concept | `assets/concept/애프터데이_서울_옥상_생존_아트보드.png` | 1672×941 | 2D 시안·3D 제작 필요 |
| concept | `assets/concept/애프터데이_서울_옥상_생존_캠프.png` | 1672×941 | 2D 시안·3D 제작 필요 |
| concept | `assets/concept/애프터데이_옥상_생존_캠프_에셋_시트.png` | 1448×1086 | 2D 시안·3D 제작 필요 |
| concept | `assets/concept/포스트_아포칼립스_서울_옥상_캠프_자산_시트.png` | 1672×941 | 2D 시안·3D 제작 필요 |
| facilities | `assets/facilities/폐허_속_생존_식량_보관함_세트.png` | 1254×1254 | 2D 시안·3D 제작 필요 |
| facilities | `assets/facilities/포스트_아포칼립스_빗물_저장_탱크_세트.png` | 1254×1254 | 2D 시안·3D 제작 필요 |
| facilities | `assets/facilities/포스트_아포칼립스_옥상_쉼터_스프라이트_세트.png` | 1254×1254 | 2D 시안·3D 제작 필요 |
| facilities | `assets/facilities/포스트아포칼립스_배수_시설_타일셋.png` | 1254×1254 | 2D 시안·3D 제작 필요 |
| facilities | `assets/facilities/포스트아포칼립스_옥상_방벽_타일셋.png` | 1254×1254 | 2D 시안·3D 제작 필요 |
| facilities | `assets/facilities/포스트아포칼립스_옥상_캠프_스프라이트_시트.png` | 1254×1254 | 2D 시안·3D 제작 필요 |
| materials | `assets/materials/concrete.jpg` | 512×512 | v0.3 임시 텍스처/원경 |
| materials | `assets/materials/leaves.jpg` | 512×512 | v0.3 임시 텍스처/원경 |
| materials | `assets/materials/material_atlas.jpg` | 512×4096 | v0.3 임시 텍스처/원경 |
| materials | `assets/materials/rust.jpg` | 512×512 | v0.3 임시 텍스처/원경 |
| materials | `assets/materials/skyline_dawn.jpg` | 941×655 | v0.3 임시 텍스처/원경 |
| materials | `assets/materials/skyline_heat.jpg` | 941×655 | v0.3 임시 텍스처/원경 |
| materials | `assets/materials/skyline_rain.jpg` | 941×655 | v0.3 임시 텍스처/원경 |
| materials | `assets/materials/skyline_storm.jpg` | 941×655 | v0.3 임시 텍스처/원경 |
| materials | `assets/materials/skyline_tornado.jpg` | 941×655 | v0.3 임시 텍스처/원경 |
| materials | `assets/materials/tarp.jpg` | 512×512 | v0.3 임시 텍스처/원경 |
| materials | `assets/materials/wet.jpg` | 512×512 | v0.3 임시 텍스처/원경 |
| materials | `assets/materials/wood.jpg` | 512×512 | v0.3 임시 텍스처/원경 |
| third_party_reference | `assets/third_party_reference/05F6BFE2-5B1C-49E4-B68D-EE523D82F374.jpeg` | 710×1536 | 외부 사이트 참고용·배포 금지 |
| third_party_reference | `assets/third_party_reference/5DDBD54F-E09E-47E0-8EC9-ABBDF52CEED1.jpeg` | 710×1536 | 외부 사이트 참고용·배포 금지 |
| third_party_reference | `assets/third_party_reference/C5DDE811-345C-4923-981C-06108431E7D9.jpeg` | 710×1536 | 외부 사이트 참고용·배포 금지 |
| third_party_reference | `assets/third_party_reference/IMG_1242.png` | 1170×2532 | 외부 사이트 참고용·배포 금지 |
| third_party_reference | `assets/third_party_reference/IMG_1243.png` | 1170×2532 | 외부 사이트 참고용·배포 금지 |
| ui | `assets/ui/a_wide_high_detail_promotional_concept_art_ui_d.png` | 1536×1024 | 2D 시안·3D 제작 필요 |
| ui | `assets/ui/애프터데이_생존_게임_ui_키트.png` | 1254×1254 | 2D 시안·3D 제작 필요 |
| ui | `assets/ui/애프터데이_서울_생존_ui_콘셉트.png` | 1672×941 | 2D 시안·3D 제작 필요 |
| ui | `assets/ui/애프터데이_옥상_생존_ui_디자인_시스템.png` | 1448×1086 | 2D 시안·3D 제작 필요 |
| weather | `assets/weather/복셀_날씨_재난_효과_스프라이트_시트.png` | 1254×1254 | 2D 시안·3D 제작 필요 |
| weather | `assets/weather/애프터데이_다섯_하늘의_옥상.png` | 1672×941 | 2D 시안·3D 제작 필요 |
| weather | `assets/weather/애프터데이_변화하는_하늘_살아있는_세계.png` | 1448×1086 | 2D 시안·3D 제작 필요 |
| weather | `assets/weather/폐허_위의_생존_캠프_dawn.png` | 941×1672 | 2D 시안·3D 제작 필요 |
| weather | `assets/weather/폭염_속_폐허_도시의_생존_캠프.png` | 941×1672 | 2D 시안·3D 제작 필요 |
| weather | `assets/weather/폭우_속_옥상_생존_캠프.png` | 941×1672 | 2D 시안·3D 제작 필요 |
| weather | `assets/weather/폭풍_속_옥상_생존_캠프.png` | 941×1672 | 2D 시안·3D 제작 필요 |
| weather | `assets/weather/폭풍_속_폐허_도시의_옥상_캠프.png` | 941×1672 | 2D 시안·3D 제작 필요 |

## 11. 에셋 품질 격차 및 Codex 인수 기준

현재 보유 파일은 **레퍼런스**이며, 모든 `productionReady` 값이 `false`다. 새로 제작된 GLB와 렌더링 결과는 별도의 새 파일로 추가해야 한다. 참조 PNG를 잘라 스프라이트로 만들어도 게임 에셋 목표를 충족했다고 판단해서는 안 된다.

**인수인계 필수 보고:** `created_models`, `created_materials`, `animations`, `actual_runtime_screenshots`, `FPS_by_device`, `license_ledger`, `missing_assets` 각 목록을 만들고, 참조 시안과 실제 GPU 캡처의 차이를 설명한다. 재난의 시각적 효과만 만든 경우 게임 피해 로직까지 구현했다고 보고하지 않는다.

## 12. 출처별 리소스 사용정책

- `third_party_reference`: 사용자 업로드된 타 사이트 스크린샷. 내부 디자인 참고 전용. 게임 에셋/로고 복제 사용 금지.
- `concept`, `ui`, `weather`, `characters`, `facilities`: 이 대화에서 만든 콘셉트 2D 이미지. 기준 실루엣/색/기능 추출에 사용. 실제 회전 가능한 3D GLB는 신규 생성.
- `materials`: v0.3 파생 texture/sky JPG. 기술 회귀 및 임시 참고용. PBR 물성과 실제 3D 월드가 별도로 필요.
- 신규 외부 무료 에셋: 게임 포함 전 CC0/MIT/CC-BY 등 개별 이용허락 확인 및 출처/저작자 기록.
