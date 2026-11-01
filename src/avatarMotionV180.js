/**
 * AFTERDAY v1.8: deterministic motion targets for an imported, complete VRM.
 * No procedurally constructed head, torso or facial features.
 * Gameplay units use Y-up and the shared roof origin.
 */
export const RELEASE_AVATAR_PROFILE = Object.freeze({
  chairSeatAboveRoof: 1.06, // chair root at roof+.15 and cushion surface at +.91
  seatPelvisClearance: .11,
  restingSeatAboveRoof: .57,
  maxPelvisDrop: 1.65,
  maxPelvisRise: .25,
  rootBlendRate: 7.0,
  boneBlendRate: 8.5,
  seatedActions: Object.freeze(['sit','eat','guitar']),
});
export const clamp=(v,lo,hi)=>Math.max(lo,Math.min(hi,v));
export function smoothstep(t){const x=clamp(t,0,1);return x*x*(3-2*x)}
export function isSeatedActivity(life){
  return RELEASE_AVATAR_PROFILE.seatedActions.includes(life?.current);
}
export function seatedWeight(life){
  if(!isSeatedActivity(life) && life?.current!=='rest')return 0;
  if(life.stage==='perform')return 1;
  if(life.stage==='exit')return 1-smoothstep((life.stageTime||0)/.72);
  if(life.stage==='enter')return smoothstep((life.stageTime||0)/.52);
  return 0;
}
export function actionProfile(life){
  if(life?.stage==='approach'||life?.stage==='exit')return 'walk';
  if(life?.stage!=='perform' && life?.stage!=='enter')return 'idle';
  if(isSeatedActivity(life))return 'sit';
  return ({rest:'rest',radio:'radio',drink:'drink',cook:'cook',repair:'repair',stretch:'stretch',watch:'watch',shelter:'shelter'})[life.current]||'idle';
}
/** World-space seat, not the character's A-pose center or foot origin. */
export function seatSurfaceWorldY(roofY,life){
  if(life?.current==='rest')return roofY+RELEASE_AVATAR_PROFILE.restingSeatAboveRoof;
  return roofY+RELEASE_AVATAR_PROFILE.chairSeatAboveRoof;
}
/** Signed root correction derived from the imported model's actual humanoid hip height. */
export function correctedRootHeight(baseRootY,neutralHipsWorldY,seatWorldY){
  const drop=clamp(seatWorldY+RELEASE_AVATAR_PROFILE.seatPelvisClearance-neutralHipsWorldY,
    -RELEASE_AVATAR_PROFILE.maxPelvisDrop,RELEASE_AVATAR_PROFILE.maxPelvisRise);
  return baseRootY+drop;
}
export function getPoseTargets(life,t){
 const mode=actionProfile(life),seated=seatedWeight(life);
 const moving=mode==='walk',s=Math.sin(t*7.0),stride=moving?s*.42:0;
 const performing=life?.stage==='perform';
 const torso={x:0,y:Math.sin(t*.52)*.019,z:Math.sin(t*.8)*.008};
 const head={x:mode==='watch'?.10:mode==='eat'?.10:0,y:Math.sin(t*.42)*.032,z:0};
 const leftArm={x:-.14,y:0,z:.34};
 const rightArm={x:-.14,y:0,z:-.34};
 const leftForearm={x:-.13,y:0,z:0};
 const rightForearm={x:-.13,y:0,z:0};
 if(moving){
  leftArm.x=-stride*.75;rightArm.x=stride*.75;
  leftForearm.x=-.22;rightForearm.x=-.22;
 }else if(performing){
  if(mode==='radio'){rightArm.x=-.98;rightForearm.x=-1.05;head.y=.10}
  if(mode==='eat'){leftArm.x=-.77;rightArm.x=-.65;leftForearm.x=-.82;rightForearm.x=-.87}
  if(mode==='guitar'){leftArm.x=-.64;rightArm.x=-.91;leftForearm.x=-.53;rightForearm.x=-.64+Math.sin(t*7)*.11}
  if(mode==='drink'){rightArm.x=-.9;rightForearm.x=-1.05}
  if(mode==='repair'){leftArm.x=-.8;rightArm.x=-.9;rightForearm.x=-.62}
  if(mode==='cook'){rightArm.x=-.73;rightForearm.x=-.6}
  if(mode==='stretch'){leftArm.x=-2.3;rightArm.x=-2.3}
  if(mode==='shelter'){head.x=.17;leftArm.x=-.40;rightArm.x=-.40}
 }
 const thigh=-1.23*seated;
 const shin=1.28*seated;
 return {
  spine:torso,head,
  leftUpperArm:leftArm,rightUpperArm:rightArm,
  leftLowerArm:leftForearm,rightLowerArm:rightForearm,
  leftUpperLeg:{x:thigh+stride*(1-seated),y:0,z:0},
  rightUpperLeg:{x:thigh-stride*(1-seated),y:0,z:0},
  leftLowerLeg:{x:shin+(moving?Math.max(0,-stride)*.48:0),y:0,z:0},
  rightLowerLeg:{x:shin+(moving?Math.max(0,stride)*.48:0),y:0,z:0},
 };
}
export function avatarQaMetrics({seatHeight,hipHeight,leftFootHeight,rightFootHeight,roofHeight,seated}){
 const numbers=[hipHeight,leftFootHeight,rightFootHeight,roofHeight];
 if(numbers.some(v=>!Number.isFinite(v)))return {valid:false,reason:'missing joint coordinates'};
 if(!seated)return {valid:true,seated:false};
 const hipError=Math.abs(hipHeight-(seatHeight+RELEASE_AVATAR_PROFILE.seatPelvisClearance));
 const nearestFoot=Math.min(leftFootHeight,rightFootHeight);
 const footFloorPenetration=Math.max(0,roofHeight-nearestFoot);
 const footHover=Math.max(0,nearestFoot-roofHeight-.10);
 return {valid:hipError<.25&&footFloorPenetration<.16&&footHover<.24,seated:true,hipError,footFloorPenetration,footHover};
}
