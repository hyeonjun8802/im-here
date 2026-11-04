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
  bloomStrength:.17+n*.12+w*.08,
  filmGrain: .004+s*.002,
  highlightWarmth:.18+t*.15,
  shadowBlue:.20+n*.08+s*.07,
  vignette:.085+n*.035,
  contrast:1.055+s*.055+n*.025,
  saturation:.91-s*.085-n*.025,
 });
}
