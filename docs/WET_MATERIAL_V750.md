# AFTERDAY v7.5 — procedural material wet/dry response

Date: 2026-11-05 (Asia/Seoul)
Base: 1459f27 (v7.4), hyeonjun8802/im-here, main.

## Changes

The existing procedural concrete, asphalt and metal micro-surface materials now respond to visual wetness. Concrete remains relatively rough; asphalt and metal produce a smoother damp response. Micro-normal strength softens slightly with water coverage. Wetting transitions are quicker than drying; no instantaneous material changes on weather-preview switches.

Only materials owned by the procedural micro-surface pass are discovered. Authored normal/roughness maps, color and metalness remain untouched. A single initial scene scan discovers existing materials; future collapse materials register through the existing micro-surface owner. Material disposal unregisters its record. No extra textures, meshes, lights, passes or per-frame shader recompilation are introduced.

## Validation

- npm run build: 395/395 regression tests passed; Vite production build passed.
- New behavioral tests: frame-rate-independent transitions, wet/dry baseline restoration, no map/color/metalness mutation, authored/transparent/fabric exclusions, new collapse registration, disposal and material-specific response.
- node --check src/world.js and src/premiumWetMaterialV750.js: passed.
- git diff --check: passed.
- Actual GPU rendering, visual appearance and device FPS remain unverified. The browser in the previous v7.4 check failed to create a WebGL context. This pass does not claim visual acceptance based on code tests.

No character assets, rooftop layout, saved destruction, survival rules, game clock or audio changes.
