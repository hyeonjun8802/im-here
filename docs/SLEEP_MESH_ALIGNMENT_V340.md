# AFTERDAY v3.4 — Original GLB bed alignment, pose review

- Do not add a cot on top of the shelter GLB. The GLB already contains `narrow sleeping pallet_41`, `pillow_43`, `folded sleeping blanket_42`.
- Measured GLB-local mattress bounds (meters/world units): X[-3.925,-0.475], Y[0.545,0.815], Z[0.79,2.51]; pillow center local (-3.33,1.04,1.65).
- Shelter world origin (-8,ROOF+0.30,-6), so bed center (-10.20,ROOF+0.98,-4.35), top ROOF+1.115, pillow X=-11.33.
- `sleepBedPlan.js` is the sole source of the actor navigation and bed alignment. `sleepBedding.js` creates only a cloth overlay at night; a fallback pallet is visible only when the shelter GLB fails to load.
- Sleep root rotation points the actor's head -X and face +Y. At completion the avatar feet root X=-8.48, so the approximately 2.85-unit head lands over the pillow X=-11.33. Root height compensates for the actual skinned mesh thickness; the final screenshot places the head above the real green pillow.
- `character.html?pose=sleep-enter&at=0`, `&at=1.5`, `&at=2.5`, `&at=3.5`, `&at=4.5` allow paused keyframe review with the actual shelter GLB.
- Browser screenshots: the automated Chromium sandbox blocks local/data URLs with `net::ERR_BLOCKED_BY_ADMINISTRATOR`. Alternative offline reference renders can verify 3D world transforms but do not prove live game WebGL appearance.


## 오프스크린 GLB 관절 렌더 3차 검수

Python VTK 오프스크린으로 원본 `afterday_shelter_pbr.glb`와 `afterday_bearded_survivor_v190.glb` 메시를 로드하고, GLB의 joint indices/weights 및 inverse bind matrix를 직접 적용해 관절을 변형했습니다. 매 시간에 `dailyCycle.sleepAnimation`, `characterMotionPlanV190.pose`, `sleepBedPlan.sleepPosition`에서 계산한 수치를 사용해 렌더했습니다.

- 0.0초: 천막 안쪽 원본 침대 앞에 서기
- 1.3/2.5초: 가장자리 착석 및 유지
- 3.45초: 무릎을 굽혀 뒤로 눕는 중간 자세 (아직 약간의 몸 뜸/관절 단순화 잔존)
- 4.5초: 머리가 베개 쪽으로 이동, 몸이 매트리스에 놓이기 시작
- 5.6초: 베개 위에 머리가 놓이고 녹색 이불이 몸 위에 전개

세 차례 높이 프레임을 조정하며 비교했습니다. 이 렌더는 같은 GLB geometry와 동일한 자세 계산식을 사용하지만, Three.js 게임의 GPU 셰이딩 및 시간당 렌더/보간 효과를 그대로 복제하지는 않습니다. 따라서 게임 내 실화면 최종 승인은 아님을 명시합니다.
