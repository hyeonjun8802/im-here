# AFTERDAY v0.4 implementation status

## Implemented source

- Three.js scene, custom shader sky dome, 3D city buildings (49 desktop / 32 mobile), interactive orbit and pinch/wheel zoom
- GLTFLoader integration with GitHub SimCity GLB file names, original texture atlas loader, cache and 3D procedural fallback
- 3D roof, cloth canopy, storage props, water tank, campfire, light strings, plants, drain, shelter, hero, 3D rain, cloud meshes, lightning and moving tornado meshes
- Actual Seoul time cycle and environment lighting (no image-swapping weather), procedural puddles and rain particles
- Tamagotchi vitals, supplies, actions, crisis-gated exploration, local save, minute-step simulation and 8-hour offline cap
- Mobile responsive Korean UI and weather/time visualization previews

## Not yet fully commercialized

- Art: original repo files are stylized city assets, **not final cinematic-quality remodeled PBR GLBs**. Survivor remains a procedural rig rather than professional skinned character.
- No authoritative multiplayer/backend clock.
- 3D assets were located via GitHub tree but cannot be included as binary in this package from current restricted environment. Run `npm run download:assets` with internet before usage.
- Actual browser WebGL and asset render was not verified in the authoring environment due to disabled WebGL and network. No factual claim of a complete GPU smoke test is made.
- Physical cloth simulation, advanced volumetric clouds, soundscape, real-world weather forecast, physics-based destruction and production mobile performance profiling are planned further work.

## Recommended after Codex handoff

1. Run source project's bootstrap on network-enabled PC.
2. Confirm original model atlas UV and geometry alignment; produce screenshot from a real GPU browser.
3. Replace procedural survivor with rigged/animated GLB; improve shelters with Blender-authored high-quality GLBs.
4. Integrate robust PBR/texture and device-specific mobile LOD.
5. Validate mobile touch, save, FPS, all seven weather states, lightning/tornado impact and Seoul midnight day rollover.
