# Frontend cleanup — 2026-11-08

The authoritative runtime UI is loaded by `index.html` from `src/style.css`, `src/eventBoard.css`, `src/premiumHudV1000.css`, `src/premiumHudV1004.css`, `src/commonUiAssetsV3.css`, `src/commonUiLayoutV31.css`, and `src/hudAlignmentV1300.css`.

Do not load or recreate the former `commonUiV1200/1201/1202.css` styles or obsolete `apocalypse-common-v3` images. The source-of-truth metal sprite set is `public/assets/ui/apocalypse-v3` (48 frames); retained premium/v1006 art and active runtime modules must continue working.

`node_modules/` and `dist/` are build outputs, restored by `npm ci` and `npm run build`, and must never be committed again. The removed experimental Pixal3D rigged GLB variants were generated outputs; original `artifacts/pixal3d-v390/afterday_pixal3d_front_source_v390.glb`, image/checkpoint inputs, and the active character asset remain available.

The audit script `node scripts/audit_frontend_20261108.mjs` is read-only, and the cleanup CI runs tests, Vite build, humanoid validation, and Chromium/WebKit at mobile and desktop sizes.
