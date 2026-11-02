# AFTERDAY Weather Audio v2.61 — Gapless Loop QA

Durable resume checkpoint.

## User feedback addressed
- [x] Do not hard-cut/repeat MP3 at an arbitrary boundary.
- [x] Prefer low-energy boundaries when preparing source clips.
- [x] Runtime hardening: decode rain/storm MP3 to PCM and rebuild every loop with a 0.65s equal-power tail→head crossfade.
- [x] This avoids a recurring fade-to-silence dip while removing clicks/gaps from MP3 encoder boundaries.
- [x] Recorded thunder uses 0.08s attack and 0.72s tail fade.

## Weather mapping retained from v2.60
- [x] 폭우: medium → strong → no-thunder downpour layers.
- [x] 낙뢰: continuous storm rain + recorded thunder synchronized to visual lightning.
- [x] 토네이도: strongest supplied rain/storm layers + procedural high wind.
- [x] clear/cloud/heat/cold do not leak rain recordings.
- [x] Audio remains user opt-in.

## Validation
- [x] Runtime equivalence validation: current-main-based v2.61 runtime files and all five weather MP3 blobs are SHA-identical to previously gated deployment `dpl_9qXdqQ8BwKaRAKu3cBo9jG4EDPip`, which passed **230/230 tests** and Vite production build.
- [x] Restore normal build command.
- [x] New preview creation unavailable because Vercel daily deployment quota was exhausted; no code ambiguity remains because runtime source/audio blob SHAs exactly match the existing READY validated deployment.
- [ ] Merge to main.
- [ ] Production READY.
