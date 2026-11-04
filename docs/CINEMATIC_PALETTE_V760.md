# v7.6 — cold-city / warm-camp color direction

2026-11-05. Base bde3cd1.

Desktop high-quality postprocessing now uses a luminance power curve centered at linear 0.22 instead of subtractive contrast and blanket shadow lifting. True black remains black, with reduced shadow/midtone support. Neutral/cool surfaces receive restrained chroma; existing warm fire/lamps retain stronger color. Cool grading is masked out of amber lights; white highlights are not globally warmed. Existing highlight rolloff, bloom, SSAO and FXAA remain in place.

Scope: desktop high-quality path. Mobile and low-quality bypass remain as before. This is an art-direction improvement inspired by the requested cold industrial survival atmosphere, not a claim of matching Frostpunk's production quality.

Validation: 398/398 tests and Vite build pass; git diff --check passes. Tests cover monotonic luminance, black/neutral preservation and intensity-independent warm-color selection. Actual GPU shader appearance, screenshots and device FPS are not verified: the previously available browser failed WebGL context creation. Visual acceptance remains outstanding.
