# AFTERDAY Full-body Motion QA v2.40

Durable resume checkpoint. Read this first after any interruption.

## Scope
Audit the same requested daily-life motions beyond the arms:
- root translation/rotation
- pelvis, spine, chest, neck, head
- left/right hips, knees, feet
- prop contact and seating/mattress contact
- walk/locomotion lower-body sanity

## Findings and fixes
- [x] Sleep orientation defect found: Pixal3D local face is -Z, but sleep used -90° X rotation, mapping the face to -Y (floor).
- [x] Sleep orientation fixed: +90° X rotation maps -Z to +Y (sky), with regression test.
- [x] Sleep final-leg defect found: residual +/- thigh and knee offsets remained after full recline.
- [x] Sleep final legs fixed: hips/knees/feet fully extend symmetrically once supine.
- [x] Eat head-gaze defect found: head pitched upward as food reached the mouth.
- [x] Eat head gaze fixed: slight downward look toward food, returning near neutral at bite.
- [x] Guitar head pose improved: slight downward gaze toward the instrument.
- [x] Radio head pose improved: small turn toward the handset.
- [x] Stretch head-gaze defect found: overhead reach used negative pitch, tucking chin down.
- [x] Stretch gaze fixed: slight upward gaze during overhead reach, small downward release.
- [x] QA telemetry expanded to RigRoot/Pelvis/Spine/Chest/Neck/Head/Hips/Knees/Feet + root face/up vectors.
- [x] Ten-sample numeric full-body regression test added for daily motions, sleep and walk.

## Still to verify
- [ ] Branch preview must build with all tests enabled.
- [ ] Inspect preview build logs for test/build failures.
- [ ] If preview is reachable, visually verify sleep-enter final frame faces sky.
- [ ] Restore package.json build script after temporary QA gate.
- [ ] Merge only after full-body test and preview build PASS.

## Environment note
Vercel Sandbox monthly Hobby quota is exhausted until 2026-12-01. QA therefore uses durable GitHub tests + Vercel preview build gate rather than ephemeral Sandbox.
