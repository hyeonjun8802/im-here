# AFTERDAY 배경 도시 최종 배치 개발 내역 — 2026-11-01

## 사용자 명령 기준

최신 이미지의 픽셀을 3D로 복사하거나 2D 배경을 덧씌우지 않고, 이전에 지시한 **배경 건물 위치/배치, 뭉툭한 모양, 자연 침식, 안개 위치, 주인공 옥상 아래의 건물 최고점**을 3D 월드에 구현.

## 실제 월드 좌표

- 주인공 생존 옥상: `y = 16` (원본 시스템 유지)
- 배경 도시 공통 지면: `y = -23.5`
- 배경 건물 본체/평평한 파손 지붕 최고점: `y <= 4`
- 옥상 식생 / 쓰러진 철골 관리 상한: `y < 12` (옥상 `y=16` 미만)
- 가장 가까운 배경 도시 원형 구간: `r >= 166` (유일한 주인공 옥상 안전 공간 140 보존)
- 도시 전체 외곽: `r < 560` (전 버전 약 700~735)
- 기존 시드/날씨에 관계없는 고정적 360도 3D 배치

## 구현 구역

| 구성 | 수정 내용 |
|---|---|
| 주요 건물 | `src/cityContraction.js`에서 원본 deterministic planner를 수정하지 않고 거리/높이/폭을 적용. 기존 고층 GLB 스파이어와 비동기 교체를 제거하고 3D 파손 콘크리트 외벽 사용 |
| 보조 건물 | `src/cityInfillPlanV150.js` inner `r=158~244`, middle `250~365`, outer `369~555`; 3D InstancedMesh 유지 |
| 지붕 형상 | `src/ruinedBuildingGeometry.js` 네 모서리 높이를 0.94~1.0 사이로 제한해 삼각 스파이어처럼 솟는 꼭짓점 제거 |
| 안개 | `src/groundMist.js` 최대 `y=-3.4` 이하의 다층 지면 안개. 원거리 cloud bank도 `src/cityAtmosphere.js`에서 도시 구간으로 재배치하고 높은 공중 구름 높이를 제한 |
| 자연 침식 | `src/cityReclamation.js` 이끼, 외벽 균열, 덩굴, 옥상 수목 유지. 지나치게 솟은 철골은 낮은 붕괴형 철골로 대체 |
| 게임 시스템 | `src/spatialLayout.js` 및 날짜/생존/날씨 플래너 원본 SHA 유지, 주인공/생존 자원/카메라 제어 변경 없음 |

## 자동 테스트 및 검증 한계

- `npm test` 151개 통과 (최종 빌드 후 재확인)
- `tests/city-composition-v230.test.mjs`에서 PC/모바일의 배치, 물리적인 상한, 360도 고정 좌표, 건물 형태, 안개 높이 검증
- `dist`를 standalone ES Modules로 재빌드. Node.js 로컬 서버에서 HTTP 콘텐츠 제공 검사
- **실제 Chromium WebGL 스크린샷은 이 샌드박스에서 `net::ERR_BLOCKED_BY_ADMINISTRATOR`로 파일/로컬 URL 모두 거부됨.** 따라서 브라우저 실화면과 기기 FPS 검증을 통과했다고 주장하지 않음.
- 이 문서의 값은 월드 단위이며 실제 미터나 현실 지형 높이를 의미하지 않음.

## Mac 실행

`RUN_STANDALONE_MAC.command`를 실행하고 `http://localhost:5173/` 접속. npm 설치/외부 GitHub 다운로드 불필요. Node.js는 필요.
