import {sleepAnimation,stretchKeyframes} from './dailyCycle.js';
/** AFTERDAY v1.9 original short-limbed survivor — game-agnostic pose maths.
 * All angles in radians, Y-up; Pixal3D model faces local -Z, feet at local Y≈0.
 * The seat root correction tracks the SAME furniture height as SurvivorLife.
 */
export const clamp=(v,lo=0,hi=1)=>Math.min(hi,Math.max(lo,v));
export const smoothstep=v=>{const x=clamp(v);return x*x*(3-2*x);};
export const SEAT={chairScale:.76,seatAboveRoof:.15+.91*.76,hipAboveFeet:1.12,survivorSpawnAboveRoof:.25,desiredClearance:.135};
export function seatedWeight(life={}){
 const seated=['sit','eat','guitar','rest'].includes(life.current);
 if(!seated)return 0;
 if(life.stage==='perform')return 1;
 if(life.stage==='enter')return smoothstep((life.stageTime||0)/.65);
 if(life.stage==='exit')return 1-smoothstep((life.stageTime||0)/.95);
 return 0;
}
/** Five discrete hand-to-mouth cycles during the real eating animation.
 * Starts at the bowl, rises, pauses for a bite, and returns before the next.
 */
export function foodBiteMotion(timeSeconds=0){
 const cycle=((Math.max(0,timeSeconds)%2.35)/2.35);
 if(cycle<.16)return 0;
 if(cycle<.42){const u=(cycle-.16)/.26;return u*u*(3-2*u);}
 if(cycle<.58)return 1;
 if(cycle<.87){const u=(cycle-.58)/.29;return 1-u*u*(3-2*u);}
 return 0;
}

export function drinkSipMotion(timeSeconds=0){
 const cycle=((Math.max(0,timeSeconds)%2.9)/2.9);
 if(cycle<.14)return 0;
 if(cycle<.46){const u=(cycle-.14)/.32;return u*u*(3-2*u);}
 if(cycle<.64)return 1;
 if(cycle<.92){const u=(cycle-.64)/.28;return 1-u*u*(3-2*u);}
 return 0;
}
/** Negative when lowering the character's pelvis onto the chair cushion. */
export const seatDrop=()=>SEAT.seatAboveRoof+SEAT.desiredClearance-(SEAT.hipAboveFeet+SEAT.survivorSpawnAboveRoof);
export function pose(life={},elapsed=0){
 const phase=life.stage||'idle',activity=life.current||'idle';
 const sleep=activity==='sleep'?sleepAnimation(phase,life.stageTime||0):{travel:0,roll:0,height:0,sit:0};
 const sleeping=sleep.roll;
 const walking=phase==='approach'||(phase==='exit'&&activity!=='sleep');
 const performing=phase==='perform';
 const bite=performing&&activity==='eat'?foodBiteMotion(life.stageTime||0):0;
 const sip=performing&&activity==='drink'?drinkSipMotion(life.stageTime||0):0;
 const seat=seatedWeight(life);
 const step=walking?Math.sin(elapsed*7.5)*.47:0;
 const L={armX:0,armZ:-.22,forearmX:0,handX:0,handY:0,handZ:0,thighX:step,kneeX:Math.max(0,-step)*.35,footX:0};
 const R={armX:0,armZ:.22,forearmX:0,handX:0,handY:0,handZ:0,thighX:-step,kneeX:Math.max(0,step)*.35,footX:0};
 if(walking){L.armX=-step*.64;R.armX=step*.64;}
 if(performing){
  // Pixal3D faces local -Z, so positive X brings an arm toward the face/front.
  const pair={sit:[.22,.25],eat:[.88,1.06],guitar:[1.05,.78],radio:[.18,1.55],cook:[.58,.76],repair:[.70,.82],drink:[.18,1.05],stretch:[2.1,2.1],watch:[.18,.72],rest:[.18,.20],medicine:[.56,.72],explore:[.32,.46],shelter:[.82,.82],wave:[0,.35],point:[0,1.48]}[activity];
  if(pair){L.armX=pair[0];R.armX=pair[1]}
  if(activity==='guitar'){
   const strum=Math.sin(elapsed*8.6);
   L.armX=.48;L.armZ=-.26;L.forearmX=-1.02;L.handZ=-.08;
   R.armX=.42+.035*strum;R.armZ=.22;R.forearmX=-.92+.10*strum;R.handZ=.18*strum;
  }
  if(activity==='eat'){
   R.armX=.68+.48*bite;R.armZ=.18;R.forearmX=-1.12-.38*bite;R.handX=-.10*bite;
   L.armX=.52;L.armZ=-.20;L.forearmX=-1.08;L.handZ=-.08;
  }
  if(activity==='radio'){R.armX=1.08;R.armZ=.34;R.forearmX=-1.48;R.handZ=.12;L.armX=.16;L.armZ=-.24;}
  if(activity==='drink'){R.armX=.98+.58*sip;R.armZ=.06;R.forearmX=-1.18;L.armX=.16;L.armZ=-.12;}
  if(activity==='cook'){
   const stir=Math.sin(elapsed*4.8);
   L.armX=.54;L.armZ=-.18;L.forearmX=-.88;L.handZ=-.06;
   R.armX=.66+.04*stir;R.armZ=.16;R.forearmX=-.96+.08*stir;R.handZ=.08*stir;
  }
  if(activity==='repair'){
   const work=Math.sin(elapsed*6.4);
   L.armX=.62+.035*work;L.armZ=-.16;L.forearmX=-.94-.06*work;
   R.armX=.70-.035*work;R.armZ=.16;R.forearmX=-.98+.06*work;
  }
  if(activity==='medicine'){
   L.armX=.58;L.armZ=-.08;L.forearmX=-1.05;
   R.armX=.76;R.armZ=.12;R.forearmX=-1.12;
  }
  if(activity==='watch'){
   R.armX=.92;R.armZ=.18;R.forearmX=-1.10;R.handZ=.06;
   L.armX=.12;L.armZ=-.20;
  }
  if(activity==='explore'){
   L.armX=.28;L.armZ=-.18;L.forearmX=-.28;
   R.armX=.42;R.armZ=.18;R.forearmX=-.42;
  }
  if(activity==='shelter'){
   L.armX=.92;L.armZ=-.10;L.forearmX=-1.08;
   R.armX=.92;R.armZ=.10;R.forearmX=-1.08;
  }
  if(activity==='wave'){
   // Keep the shoulder stable and let the elbow/wrist do the visible wave.
   // The previous pose moved almost as one rigid block next to the head.
   const wave=Math.sin(elapsed*7.0),counter=Math.cos(elapsed*7.0);
   R.armX=1.13+.025*counter;R.armZ=.33+.020*wave;
   R.forearmX=-1.24+.16*wave;R.handY=.10*counter;R.handZ=.48*wave;
   L.armX=.04;L.armZ=-.24;
  }
  if(activity==='point'){R.armX=1.50;R.armZ=.08;R.forearmX=.05;}
  if(activity==='stretch'){
   const stretch=stretchKeyframes(life.stageTime||0,life.performDuration||16);
   L.armX=-stretch.leftArm;R.armX=-stretch.rightArm;
   L.armZ=stretch.leftArmZ;R.armZ=stretch.rightArmZ;
  }
 }
 // Pixal3D faces local -Z. Positive hip flexion brings the knees forward;
 // negative knee flexion drops the shins instead of folding them behind the
 // chair. Counter-rotate the ankle so the boot sole stays level.
 L.thighX=L.thighX*(1-seat)+1.16*seat;R.thighX=R.thighX*(1-seat)+1.16*seat;
 L.kneeX=L.kneeX*(1-seat)-.70*seat;R.kneeX=R.kneeX*(1-seat)-.70*seat;
 L.footX=-.46*seat;R.footX=-.46*seat;
 // Standing action-specific lower-body posture. These actions previously
 // changed only the upper body, so danger/medical actions looked like idle.
 if(performing&&activity==='medicine'){
  L.thighX=.22;R.thighX=.22;L.kneeX=-.34;R.kneeX=-.34;L.footX=-.08;R.footX=-.08;
 }
 if(performing&&activity==='explore'){
  L.thighX=.14;R.thighX=.10;L.kneeX=-.22;R.kneeX=-.18;L.footX=-.05;R.footX=-.04;
 }
 if(performing&&activity==='shelter'){
  L.thighX=.48;R.thighX=.48;L.kneeX=-.66;R.kneeX=-.66;L.footX=-.16;R.footX=-.16;
 }
 // During the approach to the mattress, fold the hips and knees, brace on
 // the cot with both hands, then extend the legs as the back meets the pillow.
 if(activity==='sleep'&&['enter','perform','exit'].includes(phase)){
  const sit=sleep.sit,lie=sleep.roll;
  L.armX=.12+.62*sit+.16*lie;R.armX=.12+.56*sit+.20*lie;
  L.armZ=-.20+.08*sit;R.armZ=.20-.08*sit;
  L.forearmX=-.92*sit-.10*lie;R.forearmX=-.88*sit-.08*lie;
  L.handZ=-.08*sit;R.handZ=.08*sit;
  // Legs fold while sitting on the cot, then fully extend once supine.
  // Residual +/- thigh and knee offsets made the final sleeping pose look
  // twisted even though the body was already flat on the mattress.
  L.thighX=1.12*sit;R.thighX=1.12*sit;
  L.kneeX=-1.22*sit;R.kneeX=-1.22*sit;
  L.footX=-.44*sit;R.footX=-.44*sit;
 }

 const stretching=performing&&activity==='stretch'?stretchKeyframes(life.stageTime||0,life.performDuration||16):null;
 return {phase,activity,walking,seat,sleeping,sleepSit:sleep.sit,lieHeight:sleep.height,lieTravel:sleep.travel,rootY:seatDrop()*seat+(walking?Math.abs(Math.sin(elapsed*7.5))*.035:Math.sin(elapsed*1.6)*.012),
  // Negative chest-X leans the torso toward local -Z (the character's front).
  torsoX:stretching?stretching.torsoX:performing&&['repair','cook'].includes(activity)?-.10:performing&&activity==='medicine'?-.14:performing&&activity==='shelter'?-.18:performing&&activity==='explore'?-.07:performing&&activity==='radio'?-.02:0,
  torsoZ:stretching?stretching.torsoZ:performing&&activity==='explore'?Math.sin(elapsed*.55)*.025:0,
  // Local face is -Z: negative head-X looks slightly down, positive looks up.
  headX:activity==='sleep'?.12*sleep.roll:stretching?stretching.headX:performing&&activity==='eat'?-.08+.07*bite:performing&&activity==='guitar'?-.055:performing&&activity==='radio'?-.015:performing&&activity==='drink'?.04+.08*sip:performing&&activity==='cook'?-.10:performing&&activity==='repair'?-.08:performing&&activity==='medicine'?-.12:performing&&activity==='shelter'?-.10:performing&&activity==='explore'?-.035:performing&&activity==='watch'?.035:performing&&activity==='rest'?-.025:Math.sin(elapsed*.55)*.015,
  headY:performing&&activity==='watch'?Math.sin(elapsed*.45)*.28:performing&&activity==='explore'?Math.sin(elapsed*.72)*.22:performing&&activity==='radio'?.075:performing&&activity==='shelter'?.04:Math.sin(elapsed*.3)*.045,
  L,R,bite,sip,showFood:performing&&activity==='eat'&&bite>.07,showGuitar:performing&&activity==='guitar',showRadio:performing&&activity==='radio',showBowl:performing&&activity==='eat',showCanteen:performing&&activity==='drink'};
}
