# AFTERDAY v7.4 — wet-surface detail

Date: 2026-11-05 (Asia/Seoul)
Base: 0d333c1 (v7.3), hyeonjun8802/im-here, main.

## Changes

- Existing instanced wet patches now use a feathered irregular alpha mask instead of hard circular silhouettes.
- Deterministic looping normal maps animate rain impact rings on both the base water surface and its clearcoat. Rain and surface wetness jointly control strength. Dry weather removes ripple response.
- Desktop: 12 precomputed 128px frames. Mobile: 8 precomputed 64px frames. Existing mesh/instance counts are preserved; frames reuse textures without per-frame shader recompilation or CPU texture generation.
- Corrected reversed smoothstep edges in the existing splash fragment shader.
- Build now runs the complete regression suite instead of only selected recent files. Four pre-existing failing assertions were reconciled with the documented v6.2 neutral daylight grade and current 16x desktop anisotropy. Runtime grade/anisotropy values were not changed.

## Validation

- npm run build: 389/389 tests passed; Vite production build passed.
- npm run qa:sf3d: passed; existing character retained (20 humanoid bones, six clips).
- node scripts/validate-assets.mjs: 83/83 models bundled, 0 missing; atlas present.
- git diff --check: passed.
- Behavioral tests cover mask falloff, spatial tiling, loop continuity, normal normalization, deterministic texture data, mobile budgets, weather transitions, scene cleanup and restoration of material maps.
- Existing production game and character QA pages were opened in the cloud browser. The game reported Error creating WebGL context; the character QA canvas did not render. Actual GPU appearance, animation smoothness, device FPS and visual equivalence are NOT VERIFIED. This update does not claim character art approval or a completed premium visual acceptance.

## Scope

No character model, animation rig, rooftop layout, survival rules, clock, disaster persistence, save schema or audio changes.
