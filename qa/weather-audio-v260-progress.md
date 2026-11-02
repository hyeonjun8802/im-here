# AFTERDAY Weather Audio QA v2.60

Durable resume checkpoint.

## User-supplied source mapping
- [x] `비_중간 내림.mp3` -> low/medium rain transition layer.
- [x] `비_강하게 내림.mp3` -> strong rain layer.
- [x] `폭우_2_번개는 없음.mp3` -> full 폭우 loop, no thunder.
- [x] `폭풍_1_비_강하게내림.mp3` -> 낙뢰/토네이도 continuous storm-rain bed.
- [x] `폭풍_1_번개_강하게.mp3` -> lightning-synchronized thunder one-shot.

## Implementation
- [x] Five web-optimized MP3 assets created from the supplied recordings.
- [x] Loop seam hardening: rain/storm MP3s are decoded to PCM, then the last/first **0.65s** are equal-power crossfaded into a reconstructed loop buffer. This removes MP3 boundary clicks/gaps without a recurring fade-to-silence dip.
- [x] Thunder one-shot gets a 0.08s attack and 0.72s tail fade so its cut never snaps.
- [x] Rain/storm beds loop continuously after user audio opt-in.
- [x] Exact weather title is passed from World to WeatherAudio.
- [x] 폭우 crossfades medium -> heavy -> no-thunder downpour as visual rain intensity ramps.
- [x] 낙뢰 loops storm rain and replays recorded thunder on visual lightning with 0.35–1.25s distance delay and 7.2s cooldown.
- [x] 토네이도 layers strong rain + storm rain + procedural high wind because no dedicated tornado recording was supplied.
- [x] Clear/heat/cloud/cold do not leak rain recordings.
- [x] Existing procedural wind/thunder retained only as ambience/fallback.
- [x] Audio stays browser-safe user opt-in through the existing environment-sound button.

## Validation
- [x] Run full npm test gate + Vite production build in Vercel preview: **228/228 PASS, fail 0**.
- [x] Fix any regression: no product regression found; existing synthetic-thunder-only test was updated to preserve opt-in + fallback semantics.
- [x] Restore normal build command after gate.
- [x] Confirm normal preview READY — deployment `dpl_9xKEqTJ5GrPDoy3LnLi5Q1xLqJaH`.
- [ ] Merge to main and confirm production READY.

## Validated gated preview
- Deployment: `dpl_U3F6wZZtiYiMd58QBGSvRfmfznV8` — READY.
- Tests: 228 passed / 0 failed.
- Vite production build: PASS.

- Static asset check: `downpour_no_thunder.mp3` returned HTTP 200, `audio/mpeg`, 30,572 bytes from the normal preview.


## User loop-boundary feedback
- [x] Adopted the low-energy/fade principle: the runtime no longer depends on a hard MP3 `loop=true` boundary.
- [x] PCM crossfade is used instead of fading both ends fully to zero, avoiding a noticeable volume pulse every loop.
- [ ] Re-run full test gate + production build after seam-engine change.
- [ ] Confirm normal preview READY, then merge/production.
