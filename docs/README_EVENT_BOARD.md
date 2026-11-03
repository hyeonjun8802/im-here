# AFTERDAY · 상황 경고판 & 금속 체결음 패치

원본 게임: `afterday-threejs-survival` v3.9.2 (`src/main.js`, `src/simulation.js`)

## 적용

1. **기존 AFTERDAY 프로젝트를 백업**합니다.
2. 이 패키지 ZIP을 프로젝트 최상단에 해제하여 `src/eventBoard.js`, `src/eventBoard.css`, `public/assets/events/*`, `public/assets/audio/metal_board_clang.mp3`, `scripts/install_afterday_events.py`를 추가합니다.
3. 프로젝트 최상단에서 `python3 scripts/install_afterday_events.py`를 실행합니다. 이미 적용된 파일에는 중복 패치되지 않습니다.
4. `npm test`, `node --test tests/event-board.test.mjs`, `npm run dev`로 실행합니다.
5. **날씨 시연** 메뉴 맨 아래 `상황 경고판 시연`에서 8가지 팝업과 MP3를 테스트합니다. 이 시연은 생존자 데이터를 변경하지 않습니다.

## 실제 동작

- 화면 12시 방향, 시계 아래 중앙에 판이 아래로 걸리며 회전·진동하는 모션이 실행됩니다.
- 최초 경고 노출 시 직접 합성한 약 1초짜리 철판 체결음 MP3가 한 번 재생됩니다.
- 일반 경보는 6~8초 후 사라지며, 게임의 상태·자원을 덮지 않습니다.
- 모바일 브라우저는 자동재생을 막을 수 있습니다. 사용자가 게임 화면을 한번 터치하면 오디오가 허용되는 환경에서 정상 재생됩니다.
- 경보음 켜기/끄기를 기억합니다. `prefers-reduced-motion` 설정을 지원합니다.
- `raiderAlert`가 활성화되면 `보관함 잠그기 · 부품 1개`로 방어할 수 있습니다. 선택하지 않으면 최대 식량 1~3개 도난; 전투는 없습니다.
- 다른 사람의 침입은 **현실 시간 기준 밤(한국 22:00–05:00), 생존 DAY 3 이후**에만 발생할 수 있고, 확률과 재발 간격은 밸런스 실험치입니다.
- `infected`와 `stranger`는 아직 스토리/게임 규칙에서 확정하지 않은 **이미지 시연 전용**입니다. 실제 스폰과 재료·건강 손실은 구현하지 않습니다.
- 기존 `SAVE_KEY`, 1:1 현실시계, 날씨 시연/실제 상태 분리는 그대로 유지합니다.

## 리소스

`public/assets/events/` 내에 8개의 아트 **WebP**와 8개의 카드 전체 **WebP**, 별도 미리보기 JPG를 제공합니다. 이벤트 타이틀·설명은 한국어 HTML 텍스트로 렌더링해 이미지에 새겨진 오타나 문구가 게임에 중첩되지 않습니다.

| ID | 이미지 | 실제 트리거 | 용도 |
|---|---|---|---|
| raiders / theft | raiders.webp | 야간 강도 접근·도난 | 위험, 방어 선택 |
| infected | infected.webp | 없음 | 컨셉 시연만 |
| storm / rain / tornado | storm.webp | 실제 날씨 변경 | 기상 재난 |
| cold | cold.webp | 실제 한파 | 기상 재난 |
| supply_cache | supply_cache.webp | 긴급 탐험 성공 로그 | 기회 |
| stranger | stranger.webp | 없음 | 컨셉 시연만 |
| sickness | sickness.webp | 건강/질병 로그 | 위험 |
| shortage | food_shortage.webp | 식량 보유량 3개 미만 진입 | 위험 |

## 미구현·검증 경계

- 3D 공간에 강도 캐릭터의 GLB 생성·도둑 이동 애니메이션은 **포함하지 않습니다**. 이는 HUD·시뮬레이션 이벤트 패치입니다.
- 이미지 및 MP3는 실제 프로젝트에서 브라우저/스마트폰 테스트 후 최종 승인해야 합니다.
- 현재 CI 및 실제 GitHub 리포지토리 배포를 직접 변경한 것은 아닙니다. 소스에 패키지 파일을 복사·설치해야 반영됩니다.
