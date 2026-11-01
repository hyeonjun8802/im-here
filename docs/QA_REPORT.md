# AFTERDAY v0.4 — verification & known limitations

## What was actually verified in the authoring environment

| Check | Result |
|---|---|
| GitHub repository source structure and filenames | Inspected using public GitHub API; MIT README/license confirmed |
| JS module syntax (all src/*.js) | `node --check` passed |
| 11 survival/calendar/weather tests | `node --test tests/*.test.mjs` passed |
| Seoul midnight boundary | Passed |
| Leap-day progression | Passed |
| Pause/background catch-up cap | Passed in simulation |
| Action input consume supplies / exploration gate | Passed in simulation |
| Weather deterministic across time-step sizes | Passed |
| ZIP file integrity | Verified after packing |
| Vite dependency install / production build | Not verified: npm registry DNS unavailable in this environment |
| Real Three.js WebGL GPU frame rendering | Not verified: Chromium reports `WebGL2 = false`; local navigation blocked |
| Source `.glb` loading inside browser | Not verified locally: GitHub raw downloads blocked by runtime network policy |
| iOS Safari / Android Chrome | Not tested on devices |

## Device-side acceptance procedure

1. Run `npm install`, then `npm run download:assets`. Confirm 83 GLB models and the two atlas textures are present and no failed downloads.
2. Start `npm run dev`, open `http://localhost:5173` on a modern desktop browser.
3. Confirm at least 20 distinct original GitHub building models load without errors and the texture atlas displays. Check Network panel for 404s and GLB parse errors.
4. Rotate full 360 degrees, zoom and pan using pointer/touch. Ensure interactions do not trigger scrolling.
5. In weather demonstration, select clear → cloud → rain → storm → tornado → clear. Look for continuous changes, 3D rain, lightning and tornado geometry.
6. Preview noon, dusk and midnight. Ensure HUD survival DAY does **not** advance.
7. Use drink, eat, repair. Refresh: inventory and health should persist. Verify limited crisis exploration.
8. Check next Seoul local midnight; DAY increments exactly once. Confirm long absence simulation caps at 8 hours.
9. Record frame timings and device memory on actual mid-range Android and iPhone Safari, optimize city model count and shadows until stable.

**Release gate:** do not market the build as GPU validated or commercial complete until items 1–9 pass on real devices.


## v0.5.2 단독 옥상 최종 검증
- 코드 변경: 근접 건물 및 도로 철수, 원경 GLB 도시 배치, 주인공 건물 외벽 추가, 원거리 토네이도 배치.
- `node --test tests/*.test.mjs`: **25/25 PASS**.
- `node --check src/world.js` 및 `node --check src/spatialLayout.js`: **PASS**.
- **실제 GPU WebGL2 렌더 / iPhone Safari 화질은 아직 미검증**.
- 원본 GitHub GLB 바이너리는 이 파일에 포함되지 않음. 현장 기기에서 `npm run download:assets`가 필요.
