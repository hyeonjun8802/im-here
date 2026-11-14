# AFTERDAY — Black Map / first two playable expeditions (v78)

## Status
Playable MVP only. NOT a 12-region open-world implementation, free-roam 3D city, complete in-world stairwell descent, or rescue-ending campaign.

## Game flow
1. Use the existing bottom supply/chest slot when no mandatory daily event is open, or tap **동네 탐사 지도** inside 주변 생존 장비 > 기능.
2. The map initially reveals the home vicinity and rumors of **무너진 주택**; **편의점** begins unknown.
3. Select a location and **탐험 출발**. The existing 3D character's 'explore' activity heads toward the rooftop stairwell. The game saves the outbound stage.
4. Arrival opens a 4-choice location encounter: deep search / safe scout / salvage / return. These choices use `resolveScavengeChoice` on an **isolated temporary quest**, with the same probabilities, consumables, injuries and permanent equipment. The regular daily quest is never replaced, consumed or rerolled.
5. Choosing once commits the resource outcome and saves the 'returning' stage. Reloading cannot re-award it.
6. On return, the location becomes visited or completed, permanent fog clears in the map, and the next location is rumored. A failed visit remains visited and can be revisited on a later game day; a completed visit is non-repeatable.
7. Existing emergency and daily scavenging controls remain available from the map.

## Game rules / engineering constraints
- Uses a new optional `explorationMap` object in existing save schema v4. Existing DAY 43 saves/kit/resources/tornado destruction remain untouched.
- One map expedition per game day. Hazardous weather or severely injured survivor prevents departure.
- Each phase has 25 minutes of **game time** travel plus a minimum 2.4 seconds of real time. Survives refresh. At 50× visual transitions cannot be skipped in a single frame.
- Auto survival temporarily waits while a mapped expedition is underway. The actual encounter choice pauses game time, like other mandatory story choices. Safety alerts/choice dialogs take precedence over the map overlay.
- Map canvas uses dynamic destination-out fog masks. State and positions are separate from art; location IDs are stable.
- Current map and location scenes are lightweight **scalable SVG adaptation art**, and three marker SVGs come directly from v2. The full v2 original map and 512×256 original cards remain in the user's packaged ZIP and can replace these source files later. Do not represent them as already installed original high-resolution art.
- The 3D exit is a route to the existing stairwell spot. The game does not yet load 3D interiors or actually move the survivor through an external street scene.
- Distinct outing outcome and location unlocks are saved once; UI transition displays only the committed result.
- Browser screenshot QA on a real mobile device is still required; tests validate domain logic and CSS source limits, not actual pixels.

## Following increment
- Replace adapter SVG with optimized original v2 map/card PNG/WebP via reliable binary GitHub asset delivery.
- Add full stairwell descent and return animation states with proper 50× interruption handling.
- Extend from two sites to six, then 12; add communication tower quests and multi-ending story.
- Add exploration record journal and real event analytics.
