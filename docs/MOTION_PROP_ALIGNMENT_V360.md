# AFTERDAY v3.6 Motion Prop Alignment Review

## Summary
This revision adjusts action props so they follow the survivor's arm motion more closely instead of floating around the shoulder/root area.

## Code changes
- Added action-aware prop alignment in `src/beardedSurvivorV190.js`
- Added new held canteen prop for the `drink` action
- Exposed `drink` preview pose in `character.html` and `src/characterPreviewV190.js`
- Extended `src/characterMotionPlanV190.js` with `drinkSipMotion()` and `showCanteen`
- Added regression test `tests/prop-hand-alignment-v360.test.mjs`

## Actions reviewed
- Eat: left-hand bowl + right-hand ration
- Drink: right-hand canteen raised toward mouth
- Radio: right-hand radio
- Guitar: torso-held guitar with hand overlap preserved

## QA artifact
- `docs/qa/v360_props/PROP_ALIGNMENT_QA_V360.png`

## Validation
- `npm test` → 201 / 201 passing

## Notes
Browser capture could not be reliably exported in this environment, so the QA image is an offline render built from the actual GLB and the same action/attachment transforms used by the runtime code.
