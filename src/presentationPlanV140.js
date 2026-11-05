/**
 * Visual-only production plan for premium AFTERDAY character performance.
 * No time, survival economy, autonomy, or weather simulation is modified.
 */
export const PREMIUM_TAMAGOTCHI_VERSION='1.4.0';
export const clamp01=v=>Math.max(0,Math.min(1,Number.isFinite(v)?v:0));

export function resolveSurvivorExpression({health=100,food=100,water=100,temperature=50,weather='clear',activity='idle'}={}){
  const exhaustion=clamp01((85-Math.min(food,water))/70);
  const injury=clamp01((68-health)/58);
  const danger=['storm','tornado','dust','wildfire'].includes(weather);
  const chill=weather==='cold'||temperature<26;
  const heat=weather==='heat'||weather==='wildfire'||temperature>78;
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
  bloomStrength:.16+n*.12+w*.05,
  filmGrain:.0018+s*.0005,
  // v6.2 target: cool graphite/concrete world with small motivated amber
  // highlights. Preserve material colour; avoid both blanket grey and gamey
  // oversaturation.
  highlightWarmth:.24+t*.18,
  shadowBlue:.20+n*.080+s*.060,
  vignette:.070+n*.020,
  contrast:1.120+s*.030+n*.010,
  saturation:1.000-s*.080-n*.040,
  shadowLift:.026+n*.018+s*.020,
  midtoneGain:.055+n*.035+s*.020,
  highlightRolloff:.14+n*.020+w*.020,
 });
}
