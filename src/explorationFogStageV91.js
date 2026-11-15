/** AFTERDAY v91 | Save-derived discovery stages for the Black Map.
 * Never mutates game state, quest progress or rewards. Stage 0 is almost
 * entirely dark; 6 completed locations in one zone fully clear that zone.
 */
export const FOG_ALPHA_BY_STAGE=Object.freeze([.985,.88,.76,.62,.46,.28,0]);
export const FOG_STAGE_NAMES=Object.freeze([
 '미탐사','첫 단서','주변 확인','경로 개척','구역 탐색','지형 파악','지도 완성'
]);
export function explorationFogStage(map,zone,sites){
 const local=(sites||[]).filter(site=>site.zone===zone);
 const total=local.length;
 const completed=local.reduce((sum,site)=>sum+(map?.sites?.[site.id]?.completed?1:0),0);
 const visited=local.reduce((sum,site)=>sum+((map?.sites?.[site.id]?.visits||0)>0?1:0),0);
 const stage=Math.min(6,Math.max(0,completed));
 return Object.freeze({
  stage,total,completed,visited,
  alpha:FOG_ALPHA_BY_STAGE[stage],
  name:FOG_STAGE_NAMES[stage],
  fullyRevealed:total>0&&completed===total
 });
}
