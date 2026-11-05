/**
 * AFTERDAY v9.3 — persistent weather fronts and paced disasters.
 * 1 real minute = 2.4 game hours at 1×; the game clock is authoritative.
 *
 * Instead of a new catastrophe every day, the seven distinct major hazards
 * unfold across ~24 game days. Ordinary weather follows recovery chains;
 * cold/snow and hot/rainy conditions never randomly replace each other.
 */
export const DISASTER_ARCS=Object.freeze([
  Object.freeze(['rain','storm','tornado','cold','heat','dust','wildfire']),
  Object.freeze(['rain','storm','tornado','cold','heat','wildfire','dust']),
  Object.freeze(['rain','storm','tornado','cold','heat','dust','wildfire'])
]);
/** Gap AFTER the given 1-based disaster serial; balanced events, not daily chaos. */
export const DISASTER_GAP_DAYS=Object.freeze([3,3,4,4,3,3,4]);
export const disasterGapMsAfter=serial=>
  DISASTER_GAP_DAYS[(Math.max(1,Math.floor(Number(serial)||1))-1)%7]*86400000;

export const WEATHER_TRANSITIONS=Object.freeze({
  clear:Object.freeze(['clear','clear','clear','cloud','cloud']),
  cloud:Object.freeze(['cloud','cloud','clear','clear','rain']),
  rain:Object.freeze(['rain','rain','cloud','cloud']),
  storm:Object.freeze(['rain','rain','cloud']),
  tornado:Object.freeze(['storm','rain','cloud']),
  cold:Object.freeze(['cold','cold','cloud','clear']),
  heat:Object.freeze(['heat','heat','clear','clear']),
  dust:Object.freeze(['heat','heat','clear','cloud']),
  wildfire:Object.freeze(['heat','cloud','clear'])
});
const HOUR=3600000;
/** A weather *front* lasts hours: no refresh every few game minutes. */
export const WEATHER_DURATION_HOURS=Object.freeze({
  clear:Object.freeze([7,12]),cloud:Object.freeze([5,9]),
  rain:Object.freeze([3.5,6.5]),storm:Object.freeze([1.5,2.6]),
  tornado:Object.freeze([.7,1.1]),cold:Object.freeze([8,13]),
  heat:Object.freeze([8,13]),dust:Object.freeze([4,7]),
  wildfire:Object.freeze([3.5,6.5])
});
const unit=v=>Math.max(0,Math.min(.999999,Number.isFinite(Number(v))?Number(v):0));
export function scriptedDisasterType(seed,serial){
  const n=Math.max(1,Math.trunc(Number(serial)||1));
  const block=Math.floor((n-1)/7);
  const key=((Number(seed)||47283)>>>0);
  const arcIndex=block===0?0:(Math.imul((key^block)>>>0,2654435761)>>>0)%DISASTER_ARCS.length;
  return DISASTER_ARCS[arcIndex][(n-1)%7];
}
/** Six-hour warning: cloud -> precipitation -> thunder; dry haze -> sand. */
export function preludeWeather(type,hoursLeft){
  if(!Number.isFinite(hoursLeft)||hoursLeft<=0||hoursLeft>6)return null;
  if(type==='rain'||type==='cold')return 'cloud';
  if(type==='storm')return hoursLeft<=2?'rain':'cloud';
  if(type==='tornado')return hoursLeft<=2?'storm':hoursLeft<=4?'rain':'cloud';
  if(type==='heat')return 'clear';
  if(type==='dust'||type==='wildfire')return hoursLeft<=3?'heat':'clear';
  return null;
}
const WET=new Set(['rain','storm','tornado']);
const DRY=new Set(['heat','dust','wildfire']);
/** No weather type can appear out of thin air between the scheduled hazards. */
export function chooseScenarioWeather(current,upcoming,hoursLeft,random){
  const prelude=preludeWeather(upcoming,hoursLeft);
  if(prelude)return prelude;
  const options=WEATHER_TRANSITIONS[current]||WEATHER_TRANSITIONS.clear;
  const allowed=options.filter(type=>{
    if(WET.has(upcoming))return type!=='cold'&&type!=='heat'&&type!=='dust';
    if(DRY.has(upcoming))return type!=='rain'&&type!=='storm'&&type!=='cold';
    if(upcoming==='cold')return type!=='rain'&&type!=='storm'&&type!=='heat'&&type!=='dust';
    return true;
  });
  const candidates=allowed.length?allowed:options;
  return candidates[Math.min(candidates.length-1,Math.floor(unit(random)*candidates.length))];
}
export function weatherDurationMs(type,random){
  const range=WEATHER_DURATION_HOURS[type]||WEATHER_DURATION_HOURS.clear;
  return Math.round((range[0]+(range[1]-range[0])*unit(random))*HOUR/60000)*60000;
}
