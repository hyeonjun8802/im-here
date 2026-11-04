/**
 * Visual-only production plan for premium AFTERDAY character performance.
 * No time, survival economy, autonomy, or weather simulation is modified.
 */
export const PREMIUM_TAMAGOTCHI_VERSION='1.4.0';
export const clamp01=v=>Math.max(0,Math.min(1,Number.isFinite(v)?v:0));

export function resolveSurvivorExpression({health=100,food=100,water=100,temperature=50,weather='clear',activity='idle'}={}){
  const exhaustion=clamp01((85-Math.min(food,water))/70);
  const injury=clamp01((68-health)/58);
  const danger=['storm','tornado'].includes(weather);
  const chill=weather==='cold'||temperature<26;
  const heat=weather==='heat'||temperature>78;
  const joy=['guitar','sit','eat','rest'].includes(activity)&&!danger;
  const stress=clamp01(Math.max(injury,exhaustion*.7,danger?.82:0));
  return Object.freeze({
    stress,joy:joy?1:0,
    eyeOpen:danger?1.12:Math.max(.76,1-stress*.12),
    browTilt:danger?.16:injury?-.13*injury:joy?-.075:.025,
    mouthSmile:joy?.35:-(stress*.27),
    headTilt:danger?-.055:joy?.02:0,
    breathRate:danger?2.45:heat?2.05:chill?1.75:1.35,
    breathAmplitude:danger?.026:.012,
    showBreath:chill&&!danger,
    focused:danger||activity==='radio'||activity==='repair',
    humid:weather==='rain'||weather==='storm'||weather==='tornado',
  });
}

export function premiumSceneBudget(isMobile=false){return Object.freeze({
  habitableRooftops:1,
  worldPositionUnchanged:true,
  legacySimulationUntouched:true,
  contactDecalCount:isMobile?9:15,
  performerHeadDetails:!isMobile,
  breathSprites:isMobile?2:4,
  postFx:!isMobile,
  backdropPhotoReplacement:false,
  characterShadowSize:3.5,
  fireplaceGlowRadius:10,
});}

export function calcPostGrade({night=0,storm=0,wetness=0,twilight=0}={}){
 const n=clamp01(night),s=clamp01(storm),w=clamp01(wetness),t=clamp01(twilight);
 return Object.freeze({
  bloomStrength:.18+n*.09+w*.06,
  filmGrain:.0020+s*.0006,
  // Bright, legible midtones and selective color rather than blanket grey.
  // Weather reduces saturation without crushing the entire scene to black.
  highlightWarmth:.18+t*.15,
  shadowBlue:.15+n*.060+s*.055,
  vignette:.064+n*.022,
  contrast:1.095+s*.030+n*.015,
  saturation:1.065-s*.105-n*.045,
  shadowLift:.033+n*.022+s*.026,
  midtoneGain:.064+n*.040+s*.023,
  highlightRolloff:.10+n*.015+w*.018,
 });
}
