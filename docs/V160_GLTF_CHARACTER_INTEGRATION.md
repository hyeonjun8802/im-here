# AFTERDAY v1.6 — 실제 GLB 캐릭터 교체 및 원본 이미지 대조

## 결론 및 범위

사용자 제안대로 Three.js `GLTFLoader`로 **독립적인 3D 헤드 GLB와 유기적 의상 GLB**를 로드한다. `GLTFLoader`는 기존 Three.js 정식 Addons에 포함되는 로더이며 실제 메시/텍스처/스킨/클립이 있는 GLB를 로드한다. **2D 이미지를 자동으로 인체 메시에 변환하지는 않는다.**

기존 모델은 코딩으로 만든 눈·눈썹·입술·수십 가닥의 머리카락을 같은 얼굴 위에 여러 번 겹쳐, 좁은 화면에서 얼굴이 일그러졌다. 이번 버전은 이 부품을 숨기고, 사용자 승인 캐릭터 이미지에서 채색을 재구성한 **하나의 곡면 두상(실제 UV/텍스처 포함)**을 3D GLB로 제공한다. 45도·옆모습도 실제 입체이며, 얼굴 텍스처는 정면 투영 기반이므로 45도/옆모습은 목표 이미지와 동일하지 않다.

## 실 파일 및 코드

| 파일 | 역할 | 상태 |
| --- | --- | --- |
| `public/assets/models/character/afterday_survivor_head_reference_v160.glb` | 머리 형태/귀/눈·입 베이크 텍스처/입체 머리카락 | 실 GLB |
| `public/assets/models/character/afterday_survivor_suit_reference_v160.glb` | 코트·양팔 소매·허벅지·종아리 유기형 의류 파츠 | 실 GLB |
| `public/assets/character/ref/face_projection_v160.jpg` | 얼굴 UV 텍스처 산출물 | 생성됨 |
| `public/assets/character/ref/field_suit_normal_v160.png` | 직물용 노멀맵 | 생성됨, 의상 GLB에 내장 |
| `public/assets/character/ref/character_target.png` | 원본 목표 캐릭터 디자인 | 대조 기준 |
| `src/referenceSurvivorV160.js` | `GLTFLoader`로 메시 로드/검증 및 애니메이션 관절에 장착 | 적용됨 |
| `scripts/offline_character_qa_v160.py` | 실제 헤드 GLB 3방향 렌더링 | 로컬 오프라인 검증 |
| `scripts/qa_reference_character_v160.mjs` | 실제 게임 WebGL 브라우저 4화면 캡처 | 별도 개발 PC 실행 필요 |

## 실제 애니메이션 연동

- 기존 `survivorHead` 관절에 새 헤드 GLB를 추가하고, 이미 중첩된 기존 머리 파츠 전부 `visible=false`로 숨긴다.
- 두 번째 의류 GLB는 **실험 모드**에서 기존 몸통/팔/다리/무릎 관절에 7개로 장착한다. 다만 실제 GLB와 레퍼런스의 오프라인 대조에서 실루엣·주머니·버클 재현이 부족해 기본 게임에서는 **활성화하지 않는다**. `?experimentalSuit=1`로만 확인한다. 기본 게임은 기존 관절·장비를 그대로 유지한다.
- 로딩 실패 시 기존 캐릭터를 유지하여 게임을 실행 가능하게 한다. 단, 게임이 원본 참조와 동일하게 렌더링되는 것으로 오인하지 않도록 QA에서 GLB 실패를 오류로 판정한다.
- 이 GLB 자체에는 `skins`, `joints`, `animations`, `morphTargets`가 없다. 즉 **전문 스켈레탈 캐릭터·립싱크 애니메이션 완성본은 아니다.** 얼굴의 실제 입모양 애니메이션/립싱크를 구현하려면 블렌더에서 리깅 및 표정 블렌드셰이프를 제작·GLB로 내보내야 한다.

## 외형 QA와 검증 범위

1. 목표: `public/assets/character/ref/character_target.png`
2. 정면·45도·측면 오프라인 GLB 결과: `docs/qa/character/reference_vs_real_3d_v160.jpg` (실제 GLB 메시를 별도 VTK 렌더러로 렌더링, **Three.js 게임 캡처 아님**)
3. 의류 시험 리소스 비교: `docs/qa/character/reference_vs_head_suit_glbs_v160.jpg` — 기본 적용하지 않는 이유가 보이는 대조 시트 (게임 스크린샷 아님)
4. `npm test`: 시간·날씨·단독 옥상·생활 애니메이션·GLB 형식 및 리소스 연결 테스트
5. 실제 게임 브라우저 캡처(필수 별도): `npm run dev` 실행 후 `npm run qa:browser-character`; 성공 시 `docs/qa/character/actual_browser/` 생성.
6. `npm run qa:compare-character`: 실제 게임 캡처와 목표 이미지를 한 시트로 비교 (캡처 없으면 실패 처리).

### 목표 이미지 대비 아직 다른 부분

- 원본에 있는 정교한 피부 지형/눈꺼풀/눈동자 반사, 헤어스트랜드의 세밀한 굴곡은 미재현.
- 몸통 및 팔·다리 하부는 기존 절차적 관절 메시를 유지하며, 새 의상 GLB가 덮는 하이브리드 모델.
- `PBR normalTexture`는 의상에 포함되지만, 얼굴은 실제 스컬프트 하이폴리의 베이크 노멀이 아니다.
- 실제 WebGL 게임 브라우저 화면 캡처는 이 실행 환경의 Three.js/Vite 의존성 설치 차단으로 미수행.

## 실행

```bash
npm install
npm run download:assets
npm test
npm run dev
```

실기기 WebGL QA:

```bash
npm install -D playwright
npx playwright install chromium
npm run qa:browser-character
npm run qa:compare-character
```

단일 옥상, 기존 도시 3D, 날씨·시간·생존 규칙은 변경하지 않았다.
