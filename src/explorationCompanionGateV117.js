/** AFTERDAY v117 | Persistent companion is the regional exploration unlock.
 * Supply scavenging remains independent so a lone survivor can still obtain
 * food, clean water and a radio to recruit the first companion.
 */
export const EXPLORATION_COMPANION_LOCK_TEXT=
 '동료 합류 후 지역 탐사가 열립니다. 무전기로 생존자를 찾고 함께하기를 선택하세요.';
export function hasExplorationCompanion(state){
 return Boolean(state?.companion?.present&&!state?.companion?.lost);
}
/** A saved in-progress mission may finish after a companion departs.
 * New departures remain locked until a companion is actually present. */
export function canAccessExplorationMap(state){
 return hasExplorationCompanion(state)||Boolean(state?.explorationMap?.mission);
}
