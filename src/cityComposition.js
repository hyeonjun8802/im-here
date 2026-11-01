/**
 * AFTERDAY: one-rooftop city composition (world units, deterministic).
 * The ruined skyline remains physically below the playable rooftop, including
 * planted parapets, collapsed frames and rooftop utility blocks.
 * No camera-facing backdrops or scene-space patches are used.
 */
export const CITY_COMPOSITION = Object.freeze({
  heroRoofY:16,
  visualCityClearRadius:24.5,
  heroFootprintHalfWidth:23,
  heroNeighborGap:5.5,
  groundY:-23.5,
  roofCeilingY:14,
  vegetationCeilingY:15.3,
  primaryRadiusFactor:.90,
  // The ground fog must never cross the player's only playable roof.
  upperMistY:-4.2
});
export const cityRoofTop = (height)=>CITY_COMPOSITION.groundY+height;
export const safeCityHeight = (height)=>Math.min(height,CITY_COMPOSITION.roofCeilingY-CITY_COMPOSITION.groundY);

/** Exact horizontal clearance from the one playable 46x46 roof.
 * Rotated city plots may closely flank its sides, but never intersect it. */
export function clearsHeroRoof(x,z,width,depth,rotation=0){
 const c=Math.abs(Math.cos(rotation)),s=Math.abs(Math.sin(rotation));
 const halfX=(width*c+depth*s)*.5,halfZ=(width*s+depth*c)*.5;
 const safe=CITY_COMPOSITION.heroFootprintHalfWidth+CITY_COMPOSITION.heroNeighborGap;
 return Math.abs(x)-halfX>=safe || Math.abs(z)-halfZ>=safe;
}
