/** AFTERDAY v3.0 — Tamagotchi daily routine, independent of frame rate and saves.
 * Uses the same Korea Standard Time wall-clock as the game HUD. No stat grants.
 */
export const KST_OFFSET_MS = 9 * 3600_000;
export const DAY_MS = 86_400_000;
export const BEDTIME_HOUR = 23;
export const WAKE_HOUR = 7;
export const MORNING_END_HOUR = 9;
export function seoulTime(now=Date.now()) {
  const n=Number(now);
  if(!Number.isFinite(n))throw new TypeError('Invalid clock');
  const shifted=n+KST_OFFSET_MS;
  const day=Math.floor(shifted/DAY_MS);
  const hour=(shifted-day*DAY_MS)/3600_000;
  return {day,hour};
}
export function isSleepingHour(hour){return hour>=BEDTIME_HOUR||hour<WAKE_HOUR;}
export function routineDecision(now,record={},activity='idle',stage='idle',weather='clear',manual=false){
  const {day,hour}=seoulTime(now);
  if(['storm','tornado'].includes(weather))return {type:'emergency',day,hour};
  const busy=!['idle','done'].includes(stage);
  if(isSleepingHour(hour)){
    if(activity==='sleep'&&busy)return {type:'continue-sleep',day,hour};
    if(manual&&busy)return {type:'defer',day,hour};
    return {type:'sleep',day,hour};
  }
  if(activity==='sleep'&&busy)return {type:'wake',day,hour};
  if(hour>=WAKE_HOUR&&hour<MORNING_END_HOUR&&record?.stretchDay!==day){
    if(manual&&busy)return {type:'defer',day,hour};
    if(activity==='stretch'&&busy)return {type:'continue-stretch',day,hour};
    return {type:'stretch',day,hour};
  }
  return {type:'free',day,hour};
}
/** 4-part gentle morning animation over a single stretch session. */
export function stretchKeyframes(seconds=0,duration=16){
  const q=Math.max(0,Math.min(1,Number(seconds)/Math.max(.01,duration)));
  const smooth=v=>{const u=Math.max(0,Math.min(1,v));return u*u*(3-2*u);};
  const envelope=smooth(q/.12)*(1-smooth((q-.88)/.12));
  // Two overhead reaches, a gentle lateral stretch and forward release.
  const reach=smooth((q-.08)/.17)*(1-smooth((q-.46)/.12));
  const lateral=smooth((q-.43)/.12)*(1-smooth((q-.73)/.11));
  const bend=smooth((q-.69)/.10)*(1-smooth((q-.90)/.08));
  return {
    leftArm:-.12-2.35*reach-1.75*lateral-.55*bend,
    rightArm:-.12-2.35*reach-.60*lateral-.55*bend,
    leftArmZ:.18+ .28*lateral,
    rightArmZ:-.18-.42*lateral,
    torsoX:.22*bend,
    torsoZ:Math.sin((q-.43)/.30*Math.PI)*.19*lateral*envelope,
    headX:-.14*reach+.13*bend
  };
}
/** v3.2: stand at original cot -> plant feet -> SIT visibly ->
 * turn hips and recline with head toward -X pillow -> pull up blanket.
 * Discrete sit pause is intentionally 1.2 sec; no instant 90 degree snap.
 * Sleep/wake are exact reverse poses, so interruptions cannot teleport.
 */
export const SLEEP_ENTER_SECONDS=5.6;
export const SLEEP_EXIT_SECONDS=5.2;
const SLEEP_KEYS=Object.freeze([
  {t:0,   travel:0,    roll:0,   height:0,    sit:0,    turn:0,    cover:0},
  {t:.22, travel:.55,  roll:0,   height:-.20,sit:1,    turn:0,    cover:0}, // seated
  {t:.45, travel:.55,  roll:0,   height:-.20,sit:1,    turn:0,    cover:0}, // seated pause
  {t:.64, travel:.78,  roll:.48, height:.76, sit:.78, turn:.85,  cover:0}, // brace and recline
  {t:.80, travel:.94,  roll:.94, height:1.38,sit:.10, turn:1,    cover:.50}, // pull cover
  {t:1,   travel:1,    roll:1,   height:1.45,sit:0,    turn:1,    cover:1}, // pillow at -X
]);
const smoothstep=v=>{const x=Math.max(0,Math.min(1,v));return x*x*(3-2*x);};
export function sleepAnimation(stage='idle',elapsed=0){
 const still={travel:0,roll:0,height:0,sit:0,turn:0,cover:0};
 if(!['enter','perform','exit'].includes(stage))return still;
 const duration=stage==='exit'?SLEEP_EXIT_SECONDS:SLEEP_ENTER_SECONDS;
 const p=stage==='perform'?1:Math.max(0,Math.min(1,Number(elapsed)/duration));
 const t=stage==='exit'?1-p:p;
 for(let i=1;i<SLEEP_KEYS.length;i++){
  const a=SLEEP_KEYS[i-1],b=SLEEP_KEYS[i];if(t>b.t)continue;
  const u=smoothstep((t-a.t)/(b.t-a.t));
  return Object.fromEntries(Object.keys(still).map(k=>[k,a[k]+(b[k]-a[k])*u]));
 }
 return {...SLEEP_KEYS[SLEEP_KEYS.length-1]};
}
/** Compatibility with the existing GLB pose adapter. */
export function sleepWeight(activity='idle',stage='idle',elapsed=0){
  return activity==='sleep'?sleepAnimation(stage,elapsed).roll:0;
}
