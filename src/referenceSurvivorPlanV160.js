/** Pure validation and visibility plan for the replacement character head GLB. */
export const REFERENCE_HEAD_FILE='./assets/models/character/afterday_survivor_head_reference_v160.glb';
export const REFERENCE_SUIT_FILE='./assets/models/character/afterday_survivor_suit_reference_v160.glb';
export const REFERENCE_SUIT_PARTS=['Organic Jacket Shell','Organic Arm Sleeve','Organic Thigh Trouser','Organic Calf Trouser'];
export const REFERENCE_HEAD_BOUNDS={min:[.60,.76,.54],max:[1.05,1.35,1.02]};
export function validReferenceHeadBounds(dim){
 if(!Array.isArray(dim)||dim.length!==3)return false;
 return dim.every((n,i)=>Number.isFinite(n)&&n>=REFERENCE_HEAD_BOUNDS.min[i]&&n<=REFERENCE_HEAD_BOUNDS.max[i]);
}
export function shouldKeepOldFaceWhenModelFails(success){return !success;}
