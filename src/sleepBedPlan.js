/** Authoritative inner-shelter GLB mattress measurements (model asset units).
 * Extracted directly from afterday_shelter_pbr.glb: pallet_41 and pillow_43.
 * Outer procedural cot is permanently retired. The real bed is owned by GLB.
 */
export const SHELTER_ASSET = Object.freeze({x:-8,z:-6,baseY:.30});
export const COT = Object.freeze({
 // Actual GLB pallet local x -3.925..-.475, z .79..2.51, top y .815.
 x:-10.20,z:-4.35,halfLength:1.725,halfWidth:.86,
 mattressTop:1.115,pillowX:-11.33,headX:-11.33,footX:-8.475,
 // This is the FRONT (positive-Z) edge: the survivor walks in, turns to face
 // outward and visibly sits before leaning back onto the pillow at -X.
 approach:Object.freeze([-8.85,-2.66]),
 seat:Object.freeze([-9.02,-3.58]),
 feet:Object.freeze([-8.48,-4.35]),
});
const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
const ease=t=>{const v=clamp(t);return v*v*(3-2*v)};
export function sleepPosition(frame){
 const v=clamp(frame.travel);
 const a=v<.55?COT.approach:COT.seat,b=v<.55?COT.seat:COT.feet;
 const t=v<.55?ease(v/.55):ease((v-.55)/.45);
 return [a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t];
}
