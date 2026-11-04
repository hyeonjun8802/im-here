# AFTERDAY v6.0 · 프리미엄 명암·채도·재질 개선 및 Frostpunk 시각 비교

> 기준일: 2026-11-04. 목표 판매가 **₩56,000 유료 설치 게임**. 본 문서는 출시에 필요한 **아트 방향과 1차 엔진 수정**이며, 《프로스트펑크》와 동일한 시각 품질의 실측 인증은 아니다.
> 상위 규약: [CONCEPT_LOCK.md](CONCEPT_LOCK.md), [AFTERDAY_PREMIUM_VISUAL_56000KRW.md](AFTERDAY_PREMIUM_VISUAL_56000KRW.md).

## 1. 실제로 확인 가능한 레퍼런스

- 《Frostpunk》 공식 게임/화면: https://store.steampowered.com/app/323190/Frostpunk/
- 《Frostpunk》 아트팀의 설명: https://blog.playstation.com/2021/07/07/how-frostpunk-reimagined-its-world-in-upcoming-prequel-expansion-the-last-autumn/
- 11 bit studios 2026 공개 리마스터 아트 방향: https://ir.11bitstudios.com/en/news/11-bit-studios-showcase-delivers-new-trailers-dlc-and-game-launches-roadmaps-and-a-new-peek-at-frostpunk-1886/

이들 공식 자료의 공통점은 차가운 장면을 어둡게만 만드는 것이 아니라, **낮의 미세한 재질 정보, 부서지는 빛의 방향, 따뜻한 광원의 시각적 중심, 화면 전체의 일관된 색 위계**를 만드는 것이다. Frostpunk 1886 팀이 공개한 중점은 개선된 캐릭터 애니메이션, 조명, 건물 텍스처다.

**비교 기준과 한계:** 이 문서의 'AFTERDAY 기존'은 저장소 **v5.2 코드 설정**을 근거로 하며 실제 픽셀 캡처 결과가 아니다. 현재 이 작업 환경에서는 운영 URL의 WebGL 화면을 직접 캡처할 수 없다. 따라서 '무조건 Frostpunk과 동등하게 개선됨', '숫자로 완벽 일치'를 주장하지 않는다. 실제 게임 이미지 비교는 아래 QA 스크립트와 이미지 아티팩트로 수행해야 한다.

## 2. 원인-수정 비교표 (코드 근거)

| 구분 | Frostpunk의 레퍼런스 방향 | AFTERDAY v5.2 확인된 설정 | AFTERDAY v6.0 구현 |
|---|---|---|---|
| 전체 밝기 | 어두운 세계 속 건물 형태와 주인공이 읽힘 | 환경광 낮음, 야간/폭우 명부 압축 | 야간 그림자 아래 **shadow lift** + 중간톤 **midtone gain**, 과도한 암부 뭉개짐 감소 |
| 채도 | 냉청·콘크리트의 색은 유지, 등불/불꽃은 따뜻하게 강조 | 화면 전체 포스트채도 **0.91**, 폭풍 시 약 **0.8**까지 하락 | 맑은 낮 **1.065**, 폭우/밤 **0.915 부근**으로 맥락별 분리 |
| 대비 | 희망을 뜻하는 점광과 무너진 도시의 공간감 | 공통 중간톤 대비 **1.055**, 0.41 피벗 | linear-light 피벗 0.22에서 대비 **1.095~1.14** + 하이라이트 부드러운 롤오프 |
| 해상도 | 인물·창틀·천막 실루엣이 픽셀 수준에서 부드러움 | desktop Composer 초기 픽셀 비율 **1**, native renderer는 최대 **1.8** | Composer 초기부터 실제 DPR을 사용, **FXAA**를 추가해 포스트 패스가 앨리어싱을 키우지 않도록 |
| 3D 재질 | 금속·천·콘크리트가 서로 다른 표면 물성으로 반응 | 고급 GLB에도 공통 PBR 텍스처 필터 4, normal scale 과장 가능 | **desktop anisotropy 12 / mobile 4**, mipmap linear, 필요한 경우만 mesh normals 생성, 직물/유리/금속별 roughness 정리 |
| 빛·그림자 | 차가운 하늘색 반사, 따뜻한 난방 빛과 바닥 입체감 | 주간 environmentIntensity .50, 데스크톱 shadow 2048 | environmentIntensity .64, 환경광·보조광 보정, desktop shadow **3072**(모바일 1024 유지) |
| 렌더링 노이즈 | 물성 디테일이 뭉개지지 않음 | filmGrain .004~.006 | .002~.0026으로 감소해 가장자리의 잡음/얼굴 디테일 손실 완화 |

명시된 수치는 **코드상의 컬러 그레이딩 파라미터**이지 공식 Frostpunk 이미지의 실측 휘도/채도값이 아니다.

## 3. 수정 파일과 안전 규칙

- `src/presentationPlanV140.js` — 날씨별 영화적 명암, 자연 채도, 암부/중간톤 보정.
- `src/cinematicPostV130.js` — 실제 DPR 후처리 해상도, FXAA, shadow/midtone/filmic rolloff.
- `src/premiumMaterialFinishV600.js` — GLB의 원본 UV/PBR 맵과 리그를 그대로 두고 정상/비등방성 필터·재질 특성을 보완.
- `src/world.js` — 주광/환경광/그림자·노출 조정, 실제 로드된 3D GLB에 새 마감 적용.
- `src/beardedSurvivorV190.js` — 20개 관절과 애니메이션을 변경하지 않고 기존 인물 PBR 재질만 개선.

어떤 코드도 식량/식수/건강/날짜/탐색 확률/영구 건물 파괴/구조 헬기 보상/새 SAVE_KEY를 수정하지 않는다.

## 4. 실제 이미지 비교 8개 필수 샷

| 장면 | AFTERDAY에서 검수할 내용 | 참고 화면 기준 |
|---|---|---|
| 01 맑은 낮 · PC | 콘크리트 균열과 장비 윤곽, 캐릭터 질감 읽힘 | 화면 전체가 균일한 파랑/회색이 아니라 재질별 대비 |
| 02 추운 새벽 · PC | 하늘과 지평선 사이 회청 색온도, 안개 계층 | 얼어붙은 아침 빛의 희망/위험 공존 |
| 03 해질녘 · PC | 따뜻한 붉은빛이 강조되되 장면 전체 오렌지화 금지 | 차가운 배경과 작은 따뜻한 광원 대비 |
| 04 화롯불 밤 · PC | 흑색 바닥 디테일 보존, 불빛 방향, 캐릭터 얼굴 | 작은 난방 빛 중심으로 시각 위계 유지 |
| 05 폭우 · PC | 젖은 텐트/철·콘크리트 표면의 서로 다른 반사 | 전체를 단순 어둡게 하지 않기 |
| 06 토네이도 · PC | 실제 3D 소용돌이 규모와 원경/근경 심도 | 재난의 규모감과 세밀한 파편 |
| 07 맑은 낮 · 모바일 | 장비/인물 윤곽 및 부드러운 텍스처, UI 가독성 | 데스크톱의 색감과 공간 계약 유지 |
| 08 밤 · 모바일 | 암부에 실루엣이 완전히 사라지지 않기 | 화롯불 중심으로 동작 구분 가능 |

**실제 이미지 산출:** `node scripts/qa_visual_v600.mjs` 는 Playwright + 실행 중인 로컬 Vite 서버 + 실제 WebGL이 필요하다. 8장 PNG와 WebGL/DPR/드로콜 데이터를 `docs/qa/live-v600`에 기록한다. 작업 브랜치 push에 연결된 GitHub Actions `.github/workflows/visual-premium-v600.yml`은 **Vercel Preview를 만들지 않고 로컬 Vite로 촬영한 이미지 아티팩트**를 제공한다.

**Before/After/Frostpunk 나란히 비교:** 원본 게임 전후 캡처와 이용 권한이 있는 레퍼런스 이미지를 인자로 제공하면 `python3 scripts/compare_premium_frames_v600.py --before before.png --after after.png --reference frostpunk.jpg`가 한 장의 비교 이미지와 밝기/채도/경계선/클리핑 통계를 만든다. 두 게임의 구도/장르/날씨/시간이 다르면 통계가 같은 값이 되는 것을 목표로 해서는 안 되며, **사람이 구도/물성/감정/가독성을 평가해야 한다**.

## 5. 출시 기준과 미달 항목

- **비주얼 일관성:** 8샷에서 탱크·천막·파이프·생존자 등 핵심 에셋이 같은 물성/노출 기준을 충족하는지 미술 검수.
- **실제 성능:** 데스크톱 60fps, 모바일 30fps는 현재 목표일 뿐 실측 성과 아님. bloom/DPR/shadow 증가에 따른 GPU 프레임타임 꼭 측정.
- **새 자산 필요:** 오브젝트의 진짜 형태, 폴리곤 실루엣, 개별 PBR 텍스처/UV, 캐릭터 표정과 모션 완성도는 코드 후처리만으로 해결 불가. 필요 시 에셋을 재제작해야 함.
- **운영 게임 스크린샷:** 현재 직접 브라우저의 현재 게임 페이지를 캡처하지 못했으므로 **시각적 동등성, 개선 폭, 레퍼런스와의 점수 차이는 미확인**이다.
- **상업 출시:** ₩56,000 가치 증명, 모바일·데스크톱 설치 패키징/최적화/사용권 및 스토어 심사는 별도 QA 필요.

**수정할 때마다 '동일 게임 시각/시간대/품질'에서 스크린샷을 비교해야 한다. 새 참조 자료가 없으면 그림을 임의 생성해서 근거로 쓰지 않는다.**
