# AFTERDAY Arm Motion QA v2.30

This file is the durable resume checkpoint for the full arm-animation audit.

## Audit contract
- Target motions: wave, guitar, eat, radio, stretch, sleep-enter.
- Every motion must be captured at exactly 10 timeline samples.
- Review all 10 frames before moving to the next motion.
- If a defect is found: patch -> rebuild -> recapture the same 10 frames -> review again.
- Only mark PASS after the recaptured 10-frame sequence is visually acceptable and runtime errors are zero.
- Real game GLB and real game motion adapter must be used via character.html / characterPreviewV190.js.
- Do not rely only on unit tests; browser/WebGL frame review is mandatory.

## Timeline samples
| Motion | QA pose | Duration | View | 10-frame samples |
|---|---|---:|---|---|
| 팔 흔들기 | wave | 1.8 s | front | 0%..100% |
| 기타 연주 | guitar | 2.4 s | front | 0%..100% |
| 식사 | eat | 2.35 s | front | 0%..100% |
| 무전 | radio | 2.4 s | front | 0%..100% |
| 스트레칭 | stretch | 16.0 s | front | 0%..100% |
| 눕기 | sleep-enter | 5.6 s | right | 0%..100% |

## Progress
- [x] Audit harness identified: character.html uses the real BeardedSurvivorV190 GLB/motion adapter.
- [x] Motion source identified: src/characterMotionPlanV190.js.
- [x] Prop alignment source identified: src/beardedSurvivorV190.js.
- [x] Baseline wave capture completed: 10/10 frames; baseline FAIL confirmed visually.
- [x] Wave baseline 10-frame visual review: FAIL — hand remains almost pinned beside head; rigid-arm look.
- [x] Wave first fix applied: separate shoulder/elbow/wrist motion + lateral hand IK path.
- [x] Wave fixed 10-frame recapture: PASS — visible lateral hand travel, stable elbow length, no head/body penetration.
- [x] Guitar baseline/fixed-v1 10-frame review: FAIL — guitar body still reads as an oversized circular shield over the chest; neck is not visually readable.
- [x] Guitar v2 fix applied: scale .82, lowered to lap, shifted laterally, steeper neck angle, IK retargeted to neck/string zones.
- [x] Guitar v2 10-frame recapture/review: PASS — lap placement readable, neck visible, left hand stays on neck zone, right hand stays at strings/body, runtime issues 0.
- [x] Eat baseline 10/10: PASS — right hand completes bowl→mouth→bowl cycle; left hand supports bowl; no visible penetration.
- [x] Radio 10-frame audit: PASS — radio stays at ear/cheek, right arm stable, no prop drift or joint pop, runtime issues 0.
- [x] Stretch baseline 10/10: FAIL — frames 5-7 nearly identical; both hands remain clustered beside/above head instead of reading as lateral/release phases.
- [x] Stretch fix applied: staged neutral→overhead→lateral→forward-release→neutral world-space IK trajectories.
- [x] Stretch fixed 10-frame recapture/review: PASS — clear neutral→overhead→lateral→forward-release→neutral phases, stable limb lengths, runtime issues 0.
- [ ] Sleep-enter baseline 10/10 — NEXT.
- [ ] Apply remaining arm/hand coordinate fixes. Shared forearmZ/handX/handZ support is already added for wave and later actions.
- [ ] Recapture every changed motion, 10/10.
- [ ] Run npm test / npm run check / npm run build.
- [ ] Browser/WebGL runtime validation.
- [ ] Merge only after all motions PASS.

## Known implementation observations before visual review
- wave: right upper arm uses large X/Z offsets and forearm oscillation.
- guitar: arm motion is only a small upper-arm sine plus static armZ; likely too crude.
- eat: right armX is driven by bite while forearmX stays fixed; may miss the mouth depending on bind axes.
- radio: right arm/forearm are hard-coded, not solved against the head/ear.
- stretch: values come from stretchKeyframes() but are copied directly to upper-arm X/Z.
- sleep-enter: both arms are derived only from sleep sit/roll scalars; hand placement is not anchored to mattress contact.

## Resume rule
On any interruption, read this file first and continue at the first unchecked item. Do not restart completed PASS motions unless their shared rig math was changed.


## Interruption log
- 2026-11-03: first QA sandbox stopped by time limit; durable harness/checkpoint added.
- 2026-11-03: second sandbox Playwright screenshot timed out during wave recapture; capture harness switched to CDP and overlays are hidden.


## Latest checkpoint
- Branch: `afterday-arm-motion-v230`
- Last durable commit state: wave arm fix and resilient frame-isolated capture harness are committed.
- Next action: recapture fixed `wave` frames 01..10, inspect all ten, then mark PASS or iterate before starting guitar.

- 2026-11-03: second QA sandbox expired during retry; harness redesigned to load the GLB once and change the frozen QA time in-place for all 10 frames.

- Wave PASS commit lineage includes widened head-relative IK hand path (`.46 ± .145`) and wrist articulation.

## Guitar v2 resume point
- Next: rebuild branch at `9849f2e0`, recapture guitar frames 01..10, inspect front torso/lap crop, verify no runtime errors and hand-to-prop contact.

- 2026-11-03: guitar v2 independently re-captured 10/10 in qa3; visual PASS and runtime issues 0. Next: eat.

- 2026-11-03: eat captured/reviewed 10/10; PASS. Peak bite frame inspected enlarged; no penetration.

- 2026-11-03: QA3 captured eat 10/10 successfully; runtime issues=0 and joint/prop distances were coherent. Sandbox stopped before visual sheet review, so eat must be recaptured/reviewed visually before PASS.

- 2026-11-03: radio captured/reviewed 10/10; PASS. Hand-head distance ~0.24m, hand-radio ~0.08m, runtime issues 0.

- 2026-11-03: stretch baseline captured 10/10; runtime issues 0 but visual FAIL. Root cause: coarse 3-state head-relative IK ignored 4-part stretch intent. Staged IK fix committed.

- 2026-11-03: stretch fixed version recaptured 10/10 and visually PASS; staged phases are now readable.
