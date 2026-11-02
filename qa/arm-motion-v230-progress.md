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
- [ ] Wave fixed 10-frame recapture + PASS/fix decision.
- [ ] Guitar baseline capture: previous sandbox stopped after frame 1/10. Recapture from scratch.
- [ ] Eat baseline 10/10.
- [ ] Radio baseline 10/10.
- [ ] Stretch baseline 10/10.
- [ ] Sleep-enter baseline 10/10.
- [ ] Apply arm/hand coordinate fixes.
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
