# AFTERDAY — PLAYCANVAS ENGINEERING MASTER SPEC (최종 엔드투엔드 개발 명세)

> Version: v3.0, 2026-10-31  
> Owner: Codex implementation agent / human acceptance owner  
> Status: **implementation requirements; NOT implemented or validated by this handoff**  
> Free-first stack: **PlayCanvas Engine (MIT) + TypeScript + Vite + Blender (GPL, 상용 사용 가능) + Git + 무료 정적 호스팅**.  
> Priority: 실시간·상태 정합성 > 3D 실제 자산·조작 > 영화적 날씨/주야간 > 자율 생존자 > 모바일 최적화.

## 0. 프로젝트의 출발선과 마이그레이션 범위

기존 `legacy/v030/`은 이미 작동하도록 제작된 **직접 작성 WebGL2 프로토타입**으로, 날씨 선택/카메라/자원/UI/단일 HTML이 있다. `legacy/engineering_v2/`에는 상세 시간·재난 설계, 결정론적 스케줄과 시계 참고 코드, 테스트가 들어 있다. 그러나 기존 v0.3은 절차적 박스 모델과 일부 PNG 원경이 중심이고 실제 고품질 GLB·리깅 캐릭터·정교한 VFX가 없으므로 **최종 엔진으로 재사용하지 않는다.** 기존 게임 코드를 복사하여 그대로 납품하면 실패.

- **유지할 것:** 제품 정의, 입력 의미, 자원·생존 상태의 이름과 의미, 재난 종류, 기본 현실 4시간=게임 1일(6×), 저장 개념, 선택 UI, 회전 카메라.
- **교체할 것:** 자체 WebGL 셰이더·절차적 박스 월드·PNG 원경 의존 로직·게임 상태와 렌더링 결합 구조.
- **새로 만들 것:** PlayCanvas 엔진 씬·GLB 자산 파이프라인·PBR 재질·일광/IBL·기상 연속 보간·3D 날씨 VFX·생존자 rig+animations·UI와 저장 분리·자동 QA.
- **금지:** 이미지 생성 시트를 3D 자산이라고 명명, 2D 전체 배경 회전으로 3D를 흉내, 낮/밤 프레임 단위 강제 점프, 이전 버전의 오류 있는 시간 계산 재도입, 테스트하지 않은 기능을 완료로 기록.

## 1. 공식 엔진 생성 및 환경 (작성 시점 문서 기준)

PlayCanvas 엔진 단독 프로젝트는 **무료 MIT** 오픈소스이며 별도 유료 PlayCanvas Editor가 필요 없다. 공식 create-playcanvas는 TypeScript+Vite+실행 가능한 초기 씬을 생성하며 Codex에 필요한 PlayCanvas Skills를 포함한다(작성 시점 기준). `Node.js >=22.23.2`를 권장/필수 요구로 취급한다.

```bash
node --version
npm --version
# 빈 작업 디렉터리에서 실행. 절대 이 패키지 폴더를 덮어쓰지 말 것.
npm create playcanvas@latest afterday-game -- -f engine
cd afterday-game
npm install
npm run dev
# 구현 후
npm run build
```

공식: https://developer.playcanvas.com/user-manual/getting-started/start-with-create-playcanvas/  
Standalone: https://developer.playcanvas.com/user-manual/engine/standalone/  
Skills: https://developer.playcanvas.com/user-manual/getting-started/use-playcanvas-skills/  
Asset formats: https://developer.playcanvas.com/user-manual/assets/supported-formats/

`create-playcanvas`가 만들어주는 `.agents/skills/`를 Codex 실행 전에 읽고, 프로젝트 설치 버전의 실제 API에 맞춰 개발할 것. 공식 문서·실제 패키지 버전이 이 명세의 의사코드보다 우선한다. **PlayCanvas 예제는 쉽게 변하므로 구현 전에 `package.json`과 공식 API 확인**. 엔진 코드는 서버 환경에 의존하지 않으며 `npm run build`로 정적 호스팅 가능한 SPA를 만든다.

## 2. 최종 코드 아키텍처

```text
afterday-game/
├── package.json / vite.config.ts / tsconfig.json
├── public/
│   └── assets/
│       ├── models/          # 실제 3D glb만
│       ├── textures/        # PBR KTX2/WebP 등
│       ├── hdr/             # IBL/hdr, 라이선스 확인
│       ├── vfx/             # sprite atlas, shader support
│       ├── audio/           # 환경·반응 사운드
│       └── ui/              # 실제 게임 UI 에셋
├── art/source/              # .blend/.svg 원본, 런타임과 분리
├── src/
│   ├── main.ts
│   ├── app/AppBootstrap.ts
│   ├── core/TimeAuthority.ts
│   ├── core/WorldClock.ts
│   ├── core/EventBus.ts
│   ├── core/SeededRng.ts
│   ├── core/SimulationRunner.ts
│   ├── core/WorldState.ts
│   ├── core/StateSchema.ts
│   ├── game/SurvivorDirector.ts
│   ├── game/SurvivalEconomy.ts
│   ├── game/HazardScheduler.ts
│   ├── game/HazardResolver.ts
│   ├── game/FacilitySystem.ts
│   ├── game/ExpeditionSystem.ts
│   ├── scene/RooftopScene.ts
│   ├── scene/CityBuilder.ts
│   ├── scene/ModelRegistry.ts
│   ├── render/DayNightDirector.ts
│   ├── render/WeatherDirector.ts
│   ├── render/WeatherVfx.ts
│   ├── render/MaterialWetness.ts
│   ├── render/TornadoVfx.ts
│   ├── render/LightingProfile.ts
│   ├── input/OrbitCameraController.ts
│   ├── input/RaycastInteraction.ts
│   ├── character/SurvivorAnimator.ts
│   ├── character/NavigationController.ts
│   ├── audio/AmbienceMixer.ts
│   ├── ui/HudController.ts
│   ├── ui/Sheets.ts
│   ├── ui/WarningController.ts
│   ├── persistence/SaveRepository.ts
│   ├── persistence/SaveMigration.ts
│   ├── debug/DeveloperPanel.ts
│   └── config/balance.ts
├── tests/
│   ├── unit/              # clock / sim / rng / save
│   ├── integration/       # event → game+visual state
│   ├── e2e/               # Playwright browser
│   └── visual/            # screenshots and references
└── docs/                  # 이 handoff 4종 복사/링크
```

모듈 인터페이스 원칙: `Simulation`은 DOM, PlayCanvas, WebGL 함수에 의존하지 않는다. `render/scene`은 **저장된 world snapshot과 뷰 전용 interpolation**을 받는다. UI는 view model을 렌더하고 사용자의 명시적 명령을 simulation command로 전달한다. 절대 UI가 임의로 `health -= 10` 또는 `worldTime += 1`를 직접 실행하지 않는다.

## 3. 절대 불변식과 데이터 흐름

1. `serverNowUtcMs`가 있으면 서버 권위, 없으면 local MVP `Date.now()` 및 되감김 완화 후 보안 제한을 명시.
2. **시뮬레이션 시간 ≠ 프레임 시간 ≠ 날씨 시연 시간.**
3. 동일한 세계 시드·행동·시간 구간에는 동일한 상태/피해.
4. 자원 감소/시설 파손/재난 보상은 idempotent 이벤트 또는 versioned command로 **최대 한 번** 반영.
5. 저장 포맷 변경은 schemaVersion 명시와 migration 함수 필요.
6. 사용자 접속이 없어도 세계의 시간은 흐르되 피해 보호(오프라인 정산 상한)는 명시적으로 제한.
7. 실제 게임 월드 렌더는 `requestAnimationFrame`, 생존 규칙은 fixed-step/deterministic catch-up.
8. 재난/피해/복구의 시각 상태와 세계 상태는 하나의 source of truth에 연결.
9. 시각효과 VFX가 카메라 FPS에 따라 생존자 체력·재난 확률을 변경하지 않음.
10. 모바일에서 GPU 컨텍스트 유실 시 진행 저장·복귀 가능하고 오류를 사용자에게 명시.

## 4. WorldClock — 날짜 정확성 상세

### 4.1 개념

- `worldCreatedAtUtcMs`: 월드 생성 절대 시각, immutable.
- `simulatedUntilUtcMs`: 게임 규칙을 반영한 마지막 시각.
- `serverNowUtcMs`: 서버 권위 현재 시각(서버 도입 시).
- `worldTimeZone`: `Asia/Seoul` 기본, 월드 생성 후 고정.
- `calendarLocal`: local year, month, day, hours, minutes, seconds.
- `survivalDay`: `floor(max(0,nowUtcMs-createdUtcMs)/86400000) + 1`.
- `displayClock`: HUD 출력 전용.
- `previewTime`: 시간의 흐름을 시연하는 개발 옵션. 정식 저장/자원/피해 변화 금지.

### 4.2 시간 샘플

- 2026-10-31 23:55 KST에 월드 생성: 2026-11-01 00:05 KST는 달력상 다음날, `survivalDay=1`.
- 생성 24h 1초 후에는 `survivalDay=2`.
- 2028-02-29, 2026-12-31 → 2027-01-01, leap day, 장기 미접속 테스트 필수.
- 브라우저가 10초 멈췄다면 다음 렌더에서 시간이 10초 앞서야지 `setInterval` 10회를 기대하면 안 됨.
- 시스템 시간이 30분 뒤로 가면 `simulatedUntilUtcMs`보다 작은 시간이 게임 진행을 되감아서는 안 됨. **단일 로컬 PC에서 조작 완전 차단 불가능**, 서버 권위 도입을 향후 게이트로 명확히 기록.

### 4.3 온라인/오프라인 모델

- renderer는 부드러운 표시를 위해 직전 권위 시각과 보간용 clock drift offset 사용 가능.
- `document.visibilitychange`, `pagehide`, `pageshow`에서 background resume 처리. 오디오·파티클 중복 생성 금지.
- 오프라인 복귀 시 `targetNowUtcMs`와 마지막 정산 구간을 한 번 계산하고, 단일 트랜잭션/인메모리 버전으로 커밋.
- 생존 정산은 장기간을 그대로 반복문으로 시간별 순회하지 말고 이벤트 경계별 집계·시뮬레이션 캡 적용.
- 8게임시간 캡 이후 캐릭터 보호/비상 휴식 플래그를 남기되 월드 날짜와 광원은 가상 시간(기본 6×)으로 계속 반영.
- 멀티탭은 BroadcastChannel 등으로 충돌 완화 가능. 오프라인 로컬 저장만으로 strict exactly-once 보증은 어렵고, 상용 멀티기기에는 서버 DB 트랜잭션 필요.

## 5. 결정론적 생존 시뮬레이션

### 5.1 상태 타입 스키마(권고)

```ts
interface WorldState {
  schemaVersion: 1;
  worldId: string;
  seed: number;
  worldCreatedAtUtcMs: number;
  simulatedUntilUtcMs: number;
  worldTimeZone: 'Asia/Seoul';
  survivor: {
    health: number;
    satiety: number;
    hydration: number;
    coreTempC: number;
    fatigue: number;
    conditions: string[];
    action: string;
    sheltered: boolean;
  };
  inventory: Record<string, number>;
  facilities: Record<string, { integrity: number; flags: Record<string, unknown> }>;
  weather: WeatherState;
  hazard?: HazardEvent;
  appliedCommandIds: string[];
  eventLog: GameEvent[];
}
```

`WeatherState`, `HazardEvent`, `GameEvent`의 런타임 스키마(예: Zod 또는 수동 validator)를 제공하며 역직렬화 데이터 신뢰 금지. `appliedCommandIds`는 저장 효율을 위해 제한·압축하고 과거 ID는 서버에서 관리하는 방식으로 점진 이동 가능.

### 5.2 시뮬레이션 순서

```
loadSave → validate/migrate → resolveAuthoritativeNow
→ collectCommands → integrateUntil(now):
   (1) weather/hazard schedule boundary
   (2) consume supplies
   (3) choose survivor action
   (4) resolve exposure and health
   (5) facility damage and resource deltas
   (6) emit game events
→ commit snapshot/event log → render interpolated state
```

시간이 8시간 이상 경과할 때는 정산 상한/보호 정책을 사용하되, 이벤트를 이중 적용하지 않는다. 동일 시드+입력으로 세그먼트별 정산과 일괄 정산이 동일한 결과(허용 오차 내)에 도달하는지 property tests.

### 5.3 RNG와 replay

`seed` 및 스케줄 슬롯 ID 등으로 결정론적 RNG 생성, `Math.random()`을 상태 결과 계산에 직접 사용 금지. 프레임 렌더의 파티클 랜덤은 저장 불변식과 무관한 별도 seed를 사용. 피해 이벤트는 eventId를 부여해 VFX 리플레이와 세계 결과를 연동.

## 6. 낮과 밤 — 3D 조명 엔진

### 6.1 파라미터

`worldLocalTime`, `sunElevation`, `sunAzimuth`, `moonDirection`, `cloudCover`, `aerosol`, `ambientIntensity`, `exposure`, `fogDensity`, `shadowQuality`, `fireLightIntensity`.

- 매 프레임 sun position을 움직여도 **영구 게임 상태는 변경하지 않는다**.
- 시간과 계절에 따른 일출·일몰은 지구 근사 알고리즘 또는 프로젝트 정의 테이블로 구현. 태양의 방향, 3D 그림자 방향, sky dome 색상이 일치해야 한다.
- 시간 보간: cubic smoothstep 정도를 조명 입력에 활용하지만 일출·일몰을 그림으로 급교체하지 않음.
- 주간: 태양 방향광, 주변 광, 먼 도시에 대기 산란. 야간: 하늘 배경·낮은 주변광·모닥불 점광/그림자·전구.
- 먼 도시 안개를 밤에만 갑자기 켜지 않음. 기상 변수와 태양의 각도를 연속적으로 결합.
- 실루엣 가독성 안전: 밤에도 시설 클릭 가능하도록 낮은 레벨의 환경광·선택 하이라이트 보장.

### 6.2 구현 객체의 역할

`DayNightDirector.update(worldTime, weather, quality)`는 renderer-facing 연속 광원·하늘·노출 값을 제공. `WeatherDirector`는 날씨 값만 제공하고 실제 생존 규칙이 낮/밤을 임의로 점프하지 못하도록 한다.

## 7. 날씨 엔진 — 단순 switch-case 금지

### 7.1 연속적인 기상 파라미터

```ts
interface WeatherState {
  cloudCover: number;        // 0..1
  precipitation: number;     // 0..1
  windSpeed: number;         // normalized / separate physical display
  windDirectionRad: number;
  humidity: number;          // 0..1
  fogDensity: number;        // configurable units
  ambientTemperatureC: number;
  surfaceWetness: number;    // 0..1
  snowAccumulation: number;  // 0..1
  lightningActivity: number;// 0..1
  hazardPhase: 'CALM'|'OMEN'|'WARNING'|'IMPACT'|'AFTERMATH'|'RECOVERY';
}
```

**상태는 명시된 단위로 유지.** 풍속 UI에서 120km/h가 표시되는 경우 데이터가 실제로 그 값을 의도했을 때만 표기, 단순 `windSpeed=1`을 `120km/h`라고 과장하지 않는다.

### 7.2 날씨 보간/지속성

- 날씨 목표는 시간 슬롯/시드 기반으로 결정하고, `t=clamp((now-phaseStart)/transitionDuration,0,1)`로 구름·햇빛·우량·바람·재질 상태를 자연스럽게 보간.
- 구름과 비는 동시에 돌입하지 않는다: 먼저 구름·기압 느낌 → 빛 감소 → 바람·빗줄기 → 젖음.
- SurfaceWetness는 강우 누적과 증발률로 증가·감소, 해가 나온 직후 바로 0이 되지 않음.
- 강우가 시작되더라도 모닥불이 항상 켜져 있으면 부자연스러움: 방수 상태와 강우 강도에 따라 연소·빛·연기 반응.
- 전용 시연 메뉴는 플레이 데이터를 변화시키지 않는 `preview` 플래그.

### 7.3 이벤트 상태 머신

`CALM → OMEN → WARNING → IMPACT → AFTERMATH → RECOVERY` 이벤트는 `HazardScheduler`가 생성하고, `HazardResolver`가 결과를 확정한다. `WeatherDirector`가 사실로서 같은 이벤트를 표현한다.

```ts
interface HazardEvent {
  id: string;
  kind: 'heat'|'rain'|'lightning'|'tornado'|'cold'|'animal';
  seed: number;
  severity: number;
  phase: WeatherState['hazardPhase'];
  startedAtUtcMs: number;
  phaseUntilUtcMs: number;
  center: { x: number; z: number };
  directionRad: number;
  affectedFacilityIds: string[];
}
```

### 7.4 재난 VFX 제작 우선순위

**폭우 Vertical Slice**:

1. 구름/태양 감소 → 2. 풍속 증가와 식생 반응 → 3. 3D 강우 파티클 → 4. 젖은 PBR 표면 → 5. 지면 스플래시와 배수 흐름 → 6. 천막 젖음/바람 → 7. 생존자 대피 → 8. 누수/수위/시설 내구도 변화 → 9. 비 이후 건조·복구.

**토네이도**:

원경 3D funnel+debris cloud, 월드 좌표 이동, 3D 회전 시 패럴랙스, 풍속과 천막/식물 애니메이션 공유, 실제 피해는 같은 event ID로 해결. 2D 회오리 사진을 단일 스크린에 붙여 돌리기 금지.

**낙뢰**:

3D hit position와 thunder delay, 순간 lighting pulse, 낙뢰의 진짜 영향은 simulator가 결정. 광과민 사용자를 위한 flash limiter.

## 8. 생존자 3D 모델·행동·애니메이션

### 8.1 모델 계약

- `char_survivor_base.glb`: 실제 mesh + rig + 정상/걷기/달리기 등 클립과 material.
- LOD/mesh size는 프로파일링에 따라 정의, 파일 용량과 VRAM을 릴리즈 예산에 포함.
- 반대 방향에서 장비가 없거나 다른 얼굴로 바뀌는 아트 오류 금지.
- `SurvivorDirector`가 행동 목표(물 마시기, 자원 정리, 대피 등)를 결정, `NavigationController`가 이동, `SurvivorAnimator`가 클립 블렌드/이벤트를 전달.
- 애니메이션 이벤트(컵이 입에 닿는 순간 등)는 **시각적 표현**이며, 실제 자원 차감은 명령/시뮬레이션 결과와 동기화된 단 한 번의 이벤트로 처리.

### 8.2 FSM 예시

`IDLE → MOVE_TO_WATER → DRINK → RETURN_IDLE`, `NOTICE_STORM → MOVE_TO_SHELTER → CROUCH → WAIT → INSPECT_DAMAGE`. 물탱크가 파손됐거나 경로가 막히면 대안 행동/미해결 상태로 전환하고 무한 왕복 금지.

### 8.3 애니메이션 최소 DoD

`idle`, `walk`, `drink`, `eat`, `sleep`, `shelter`, `repair` 7개는 실제 rigged 3D 모델에서 재생되어야 한다. 팔다리를 그저 박스 축으로 돌리는 임시 절차 동작은 상용 최종 판정 불가.

## 9. 3D 모델/재질 통합

### 9.1 에셋 규격

- `GLB/glTF`는 PlayCanvas 런타임에서 공식 권장되는 3D 포맷. 컨테이너 asset을 로드하고 렌더 엔티티 인스턴스 생성하는 방식을 사용. 설치된 버전의 실제 API 확인.
- Blender source `.blend`와 build output `.glb` 분리. 캐릭터 애니메이션/물리 충돌 간섭 확인.
- KTX2/Basis는 자산·타깃 GPU를 확인해 적용, 압축 전후 normal map artifacts 확인.
- 금속, 천막, 콘크리트, 목재, 식생, 물의 최소 6개 고유 머티리얼 계열 제공.
- 멀티 인스턴스 요소(식물/창문/파편)는 instancing/LOD/atlas로 draw call 절감.
- 근중경은 반드시 3D 건물/시설, 매우 먼 지평선에만 2D matte 허용.

### 9.2 자동 모델 생성 활용

Codex는 Blender Python `--background --python scripts/make_...py`를 통해 **실제 glb**를 생성할 수 있다. 그러나 단순 box 여러 개를 생성했다고 고퀄리티 3D로 인정하지 않는다. 프로토타입 메시와 승인된 모델을 구분하고, 360° 조명 샷·PBR·실루엣·디테일 QA를 거친다.

- 모델링 아트 소스가 부족하면 무료 CC0 라이선스(Poly Haven 등)를 확인하고 가져올 수 있다. 출처·변경·라이선스 기입.
- 인터넷 미연결/외부 리소스 미제공 시 실제로 가능한 제작 범위만 구현하고 잔여를 `GAPS.md`에 명시한다. **시안 이미지를 3D로 변환했다고 거짓 주장 금지.**

## 10. 입출력·모바일 조작

- `OrbitCameraController`: mouse drag/touch one-finger rotate, pinch/wheel zoom; 360° yaw, 제한된 pitch, clamp distance.
- Raycast pick: tap vs drag 이동 threshold, facility entity ID → UI sheet; 캐릭터 pick 별도.
- 모바일 시각 품질 설정 high/medium/low는 shadow resolution/particle count/DPR/texture LOD 등 제한.
- `WebGL2` 필수; WebGPU 지원 시 점진 강화. 미지원 브라우저에서는 가짜 2D 게임으로 대체하지 않고 명확한 미지원 안내/정적 이미지 노출.
- `resize`, `orientationchange`, `visibilitychange`, `webglcontextlost`/restore 대응.
- 첫 화면 boot의 에셋로드 실패는 명확히 사용자에게 알리고 재시도 버튼, 무한 로딩 금지.

## 11. 오디오

- 오디오는 사용자 제스처 뒤 시작(Safari autoplay 정책).
- 공간적/환경 레이어: 옥상 바람, 도시 고요, 천막 펄럭임, 모닥불, 빗방울(금속·콘크리트·천), 뇌우·먼 천둥, 토네이도 저주파, 밤 벌레·조용한 침묵.
- 환경 볼륨은 거리/방향/날씨에 따라 지속적으로 교차 페이드; 위험 상황에서 UI 클릭음 과도하게 튀지 않게 믹싱.
- 기존 APOChill 라디오 원곡이나 임의 저작권 음악을 무단 포함 금지. CC0 또는 직접 제작 음원 사용.

## 12. 저장·서버·무료 운영의 경계

### 12.1 무료 로컬 MVP

- `IndexedDB`를 기본 저장소 후보로, 소규모 설정은 localStorage 사용 가능. 저장 실패·프라이빗 모드·용량 제한을 핸들링.
- `SaveRepository.save(snapshot, expectedVersion)` 형태의 버전 충돌 감지 가능 설계. 미지원 환경은 메모리 세션으로 강등, 사용자 알림.
- 정적 웹 호스팅(무료 한도 내) 가능. 사용자 계정, 멀티기기 동기화, 서버 시계 변조 방지는 아직 없음.

### 12.2 선택적 서버 단계

- `GET /v1/world/:worldId`, `POST /v1/world/:worldId/commands`(idempotencyKey), `GET /v1/time`, `GET /v1/world/:worldId/events`.
- DB(PostgreSQL) 트랜잭션, worldVersion CAS, updatedAt, auth. 멀티탭·중복 요청·중복 이벤트 재생 방지.
- API/서버 비용을 항상 0원이라고 주장하지 않는다. 무료 티어의 한도·휴면·정책 변화를 확인.

## 13. 게임 UI/UX 아키텍처

`HUD`는 구독된 snapshot을 읽고 `dispatchCommand()`로만 행동을 보낸다. 메뉴는 상단 날씨/시간, 하단 생존 상태, 3개 핵심 메뉴 `물자/시설/상황`. 재난 경고는 단계/대응 여유시간/구체적 선택. 캐릭터 커스터마이징·레벨업·반복 퀘스트를 만들지 않는다.

## 14. 성능·자원 예산 (사전 목표, 측정 전)

| 항목 | 목표/정책 | 검증 방식 |
|---|---|---|
| 모바일 프레임 | 중급 기기에서 지속 30FPS 목표 | 실제 iPhone Safari/Android Chrome 10분 이상 |
| 저사양 | 자동품질 low, 파티클·그림자 감소 | GPU 프레임 타임 비교 |
| 초기 자산 크기 | 품질/기기 기준 예산 수립, 압축 | 네트워크 waterfall·메모리 |
| Draw calls | 카메라 뷰 근거리 우선, LOD/인스턴스 | GPU/엔진 profiler |
| 메모리 | 여러 재난 반복 후 누수·상승 없어야 | heap/texture memory 검증 |
| CPU | 결정론적 sim과 렌더 스텝 분리 | Performance profiler |
| 발열 | 20~30분 테스트 | 실기기 표면/스로틀링 관찰 |

수치와 품질을 확정하기 전에 실제 단말 결과가 필요. 30FPS 목표를 지키려면 렌더 품질 low/medium/high에서 일부 이펙트를 근사할 수 있으나 **게임의 핵심 3D 월드 자체를 이미지로 교체하지 않는다.**

## 15. 테스트 전략 — 실행 전에는 완료 판정 금지

### 15.1 단위 테스트

- WorldClock: KST 자정·연말·윤년·타임존·음수 경과 방어.
- Survivor: 식량 0과 수분 0, 체온 위험, 피난 우선순위, blocked path.
- Hazard: 시드 결정론, 전조→경보→충격 순서, 피해 중복 방지, 재난 쿨다운.
- Save: 스키마 버전 마이그레이션, 깨진 JSON, 저장소 예외, 다중 탭 경쟁.
- Offline: 1h/8h/24h/30d 경과, 분할/일괄 계산 동등성, 재접속 2회 중복 비용 방지.

### 15.2 통합·E2E

- Boot 후 실제 PlayCanvas 씬 로드 완료. GameObject 수·asset import 정상, 3D 카메라 회전 시 화면 픽셀/카메라 pose 변화.
- `clear`→`cloudy`→`rain`: 구름/광원/비/바닥 젖음 단계 관측.
- 피해 후 수리: 저장/재로드 뒤 파손 메시가 남고 수리 후 실제 외형 변함.
- 토네이도: 3D world position / 먼 원경/차량/캐릭터와의 상대 이동 확인.
- Developer preview weather/time: 영구 저장 데이터 변화 없음.
- 시뮬레이션 24시간 경과 후 DAY+1 정확, 실제 달력 경계에서도 안정.
- iOS/Android 사용 시 pagehide/restore 이후 입력·애니메이션·오디오 중첩 없음.

### 15.3 Visual QA

장면 별 0°/90°/180°/270° orbit 캡처, `dawn/noon/sunset/night/rain/lightning/tornado` 동일 카메라 캡처, PBR 재질·그림자·우천 젖음·UI 안전영역 검토. 스크린샷은 반드시 **실제 앱에서 캡처**하고 PNG 콘셉트는 대상 레퍼런스로 구분.

### 15.4 테스트 실패 시 표현 규칙

- 테스트할 수 없는 장치/기능은 `NOT TESTED`, WebGL 컨텍스트 차단은 `BLOCKED ENV`로 표시.
- 모의 WebGL 테스트만 통과한 경우 실제 GPU 렌더 품질 합격 표시 금지.
- 아트 참고 이미지 생성만 된 경우 실제 GLB 모델 또는 게임 구현 완료 표시 금지.
- 멀티 디바이스 네트워크 QA 미실시 시 서버 시계/중복 정산을 상용 보증하지 않는다.

## 16. 단계별 작업 — Codex를 위한 실행 체크포인트

### Phase 0: 안전한 부팅

- 신규 PlayCanvas Engine + Vite TS scaffold, npm dev/build 성공.
- v0.3은 `legacy/`만 보관, 새 프로젝트에 자체 WebGL 코드 복붙 금지.
- 360도 카메라, 실제 씬·GLB loader, 저장 레이어 shell.
- `reports/PHASE0.md`와 브라우저 캡처 제공.

### Phase 1: 아트 Vertical Slice

- 콘크리트/난간/천막/물탱크/작업대/모닥불/식생/원경 도시 실제 3D.
- 실제 GLB, UV, PBR, 장면 라이트, 4방향 카메라 screenshot.
- 더미 큐브 도형의 시각 결과는 Gate 미통과.

### Phase 2: 시간·하늘·구름·비

- 기본 가상 시계 6×(현실 4시간/게임 1일) + 저장 시간 이관/재접속 테스트 + 자연광/그림자 연속 전환. 사용자 최신 시간 규칙이 기존 1:1 설계보다 우선한다.
- 비의 전조부터 젖음·물웅덩이·배수·대피, 재난 후 건조까지.
- 기상 시연은 저장/자원과 격리.

### Phase 3: 생존자·자원·자동 루프

- 실제 rigged 3D 생존자 이동·식사·식수·수면·대피.
- 자원, 시설, 경로, 사건 로그, 브라우저 저장, 오프라인 누적.
- 공격/꾸미기/레벨업 UI 추가 금지.

### Phase 4: 다른 재난·탐험·완성

- 토네이도, 낙뢰, 폭염, 한파, 동물(자율 피해와 VFX), 긴급 탐험.
- 모바일 실제 단말 QA, 로딩/네트워크/메모리/발열/오디오 접근성.
- 최종 보고서에 기능별 구현 여부/미완성/증거 명시.

## 17. 최종 인수인계 산출물

1. `npm run dev`, `npm run build`가 성공하는 전체 PlayCanvas 프로젝트.
2. 사용한 3D 에셋 `.blend`/`.glb`/재질 텍스처/라이선스 파일/의존성 정보.
3. 실제 3D 날씨 시연 영상/이미지 + 정확한 게임 시간 테스트 증적.
4. Playwright 단위·통합·E2E 테스트 및 실제 모바일 QA 체크리스트.
5. 진행 상태 `DONE/PARTIAL/NOT STARTED/BLOCKED` 테이블.
6. 디자인 시안 대비 비교표: 어느 리소스를 GLB로 만들었는지와 남은 격차.
7. 실행/배포/저장/성능/문제 해결 README.

## 18. 한 번에 Codex에 전달할 개발 지시 요약

> `../CODEX_ONE_SHOT_PROMPT.md`가 우선이며 이 문서는 기술 세부 계약이다. Codex는 모든 문서를 읽고 신규 PlayCanvas 프로젝트를 만들되, 게임 플레이가 실제로 동작하고 최소 1개 재난이 끝까지 완성되는 Vertical Slice를 첫 완료 기준으로 삼는다. 단계별 구현과 테스트를 자동 반복하고, 환경에서 지원하지 않는 작업은 구체적 blocker를 기록한다. 컨셉 이미지를 렌더링 결과라고 주장하지 않는다.

## 19. 공식 근거 URL (작성 당시 확인)

- PlayCanvas standalone Engine: https://developer.playcanvas.com/user-manual/engine/standalone/
- PlayCanvas create tool (Node requirement/skills): https://developer.playcanvas.com/user-manual/getting-started/start-with-create-playcanvas/
- Skills for coding agents: https://developer.playcanvas.com/user-manual/getting-started/use-playcanvas-skills/
- PlayCanvas supported assets (GLB): https://developer.playcanvas.com/user-manual/assets/supported-formats/
- PlayCanvas license (MIT): https://playcanvas.com/products/engine
- Blender: https://www.blender.org/
- Khronos glTF: https://www.khronos.org/gltf/

> 정확한 API 호출 및 설치 명령은 Codex 작업 시 `create-playcanvas` 버전의 공식 문서와 사용 중인 `playcanvas` 패키지 타입 정의로 확인해야 한다. 본 문서의 TypeScript 타입은 설계 의사코드이며 현재 타입체크 성공을 의미하지 않는다.


## 2026-11-04 시간 기준 변경 (최신 사용자 확정)

기존 1:1 시계는 폐기하고 게임 시계는 **현실 4시간당 게임 24시간**을 진행한다. 활성 2×/4×는 추가 배속, 비활성 상태는 기본 1×(6배 가상 시계)이다. 중단 후 복귀 시 마지막 실제 저장 시각과 가상 시계 오프셋으로 이어서 진행하며 구버전 KST 일수 표시를 한 번만 이관한다. 오프라인 최대 피해 정산은 8게임시간으로 제한한다.
