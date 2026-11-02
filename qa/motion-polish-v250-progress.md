# AFTERDAY Motion Polish QA v2.50

Durable resume checkpoint. Continue from the first unchecked item.

## Findings fixed
- [x] Daytime `rest` used the aisle approach point as the seated destination, causing a floating seated pose in front of the pallet.
- [x] Rest now walks to `COT.approach`, sits on `COT.seat`, and exits back to the aisle.
- [x] `medicine / explore / shelter` had no dedicated visible 3D pose; added full-body poses.
- [x] `cook / repair` torso pitch leaned backward for a forward work action; corrected to local-front (-Z) lean.
- [x] Stretch release torso pitch had the same sign issue; corrected to a forward bend.
- [x] `drink` now drives the canteen hand toward the mouth with IK.
- [x] `watch` now raises the right hand to the brow and scans the skyline.
- [x] `medicine` now anchors the working hand to the middle of the opposite forearm.
- [x] `cook / repair` now use two-hand work-surface IK targets.
- [x] `shelter` now crouches and protects both sides of the head.
- [x] Character QA preview whitelist expanded to all daily-life actions.
- [x] Added 10-sample whole-activity and transition regression tests.

## Validation
- [ ] Gate preview build with full npm test suite.
- [ ] Fix any regression found by the gate.
- [ ] Restore normal build command.
- [ ] Normal preview READY.
- [ ] Merge to main and confirm production READY.

## Environment
Vercel Sandbox quota is exhausted until 2026-12-01, so validation uses Vercel preview builds with a temporary test-before-build gate.
