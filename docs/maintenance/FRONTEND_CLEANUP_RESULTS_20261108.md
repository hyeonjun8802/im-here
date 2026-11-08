# AFTERDAY Frontend Repository Cleanup

Date: 2026-11-08  
Repository: hyeonjun8802/im-here  
Production site: https://im-here-one.vercel.app/

## Verified deletion results

- **1,584 tracked files removed**, totaling **626,591,185 bytes (~597.56 MiB)**.
- Removed tracked package cache/dependencies under \`node_modules/\` (recreated by \`npm ci\`).
- Removed old \`dist/\` output (recreated by Vite; now ignored by Git).
- Removed the three unreferenced legacy \`src/commonUiV1200/1201/1202.css\` files and their unused \`public/assets/ui/apocalypse-common-v3/\` skin.
- Removed six regenerable intermediate Pixal3D rigged GLB variants from \`artifacts/pixal3d-v390/\`, retaining the original source mesh and checkpoints.
- Removed **173 exact duplicate CSS declarations** from six loaded stylesheets. Other differing values/conditional rules were preserved rather than guessed to be unused.
- Fixed six test files that imported a tracked \`dist/vendor/three/build/three.module.js\`; they now use the canonical \`public/vendor/three/build/three.module.js\` resource.
- Updated legacy tests to validate the effective production cascade rather than historic locations of redundant CSS.
- Added \`.gitignore\` for build artifacts and reproducible source audit scripts.

## What remains by design

The live 48-sprite \`public/assets/ui/apocalypse-v3/\` atlas, v1006 weather-frame references, dynamically loaded world assets, active 3D model, character rebuild inputs/checkpoints, and test baselines have been retained. Files referenced by regeneration scripts or with ambiguous dynamic loading are **not** classified as safe-to-delete; blanket asset deletion would risk breaking functionality or rebuildability.

## Validation

- GitHub Actions cleanup regression run: **42488534786** (success)
- Full \`npm run build\` including tests: passed
- \`npm run qa:sf3d\` humanoid validation: passed
- Chromium UI geometry in 7 viewport conditions: passed
- Safari WebKit UI geometry in 7 viewport conditions: passed
- Additional HUD CI checks on PR #53: passed
- Production deploy for merge commit \`d30a619954c3652d093f8d6a68e93ddf5d5c301d\`: READY

## Remote branches

A one-time authenticated cleanup removed **74 of 77** remote branches with zero deletion errors, keeping exactly:

1. \`main\`
2. \`fix/mobile-hud-visual-polish-20261108\`
3. \`fix/hud-source-coordinate-audit-20261108\`

Recoverable SHA list is preserved as the GitHub Actions artifact **deleted-branch-sha-record**, run **42488871441**, and as a downloadable ZIP in the task conversation. Branch cleanup changed refs only and did not rewrite the \`main\` commit history.

## Frontend maintenance rule

Do not reintroduce a new versioned common-UI stylesheet for a small alignment fix. The final active alignment layer is \`src/hudAlignmentV1300.css\`; it loads last and is the single place to change approved mobile/PC geometry. Check the underlying \`commonUiAssetsV3.css\` and \`commonUiLayoutV31.css\` only when changing the shared source-art rules, and run the real Chromium/WebKit HUD QA after doing so.
