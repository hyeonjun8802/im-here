/**
 * AFTERDAY v9.2 weather director.
 * Deterministic, scenario-shaped climate arcs, independent of rendering.
 * The major-disaster forecast is a balanced seven-event cycle, while ordinary
 * weather follows physically plausible transitions and stays for game hours.
 */
export const DISASTER_ARCS=Object.freeze([
  Object.freeze(['rain','storm','tornado','cold','heat','dust','wildfire']),
  Object.freeze(['rain','storm','tornado','cold','heat','wildfire','dust']),
  Object.freeze(['rain','storm','tornado','cold','dust','heat','wildfire'])
]);
export const WEATHER_TRANSITIONS=Object.freeze({
  clear:Object.freeze(['clear','clear','clear','cloud','cloud','heat']),
  cloud:Object.freeze(['cloud','cloud','clear','rain','cold']),
  rain:Object.freeze(['rain','rain','cloud','cloud','storm']),
  storm:Object.freeze(['rain','rain','cloud']),
  tornado:Object.freeze(['storm','rain','cloud']),
  cold:Object.freeze(['cold','cold','cloud','clear']),
  heat:Object.freeze(['heat','heat','clear','clear','dust']),
  dust:Object.freeze(['dust','heat','clear','cloud']),
  wildfire:Object.freeze(['heat','cloud','clear'])
});
const HOUR=3600000;
export const WEATHER_DURATION_HOURS=Object.freeze({
  clear:Object.freeze([3.0,5.5]),
  cloud:Object.freeze([2.0,3.8]),
  rain:Object.freeze([1.8,3.3]),
  storm:Object.freeze([1.0,1.8]),
  tornado:Object.freeze([.65,1.1]),
  cold:Object.freeze([2.5,4.5]),
  heat:Object.freeze([3.0,5.0]),
  dust:Object.freeze([1.5,2.5]),
  wildfire:Object.freeze([1.3,2.4])
});
const unit=v=>Math.max(0,Math.min(.999999,Number.isFinite(Number(v))?Number(v):0));
export function scriptedDisasterType(seed,serial){
  const n=Math.max(1,Math.trunc(Number(serial)||1));
  const block=Math.floor((n-1)/7);
  // Fixed tutorial front during the first seven in-game days. Afterward,
  // choose a deterministic arc variant from the save's seed and cycle index.
  const key=((Number(seed)||47283)>>>0);
  const arcIndex=block===0?0:(Math.imul((key^block)>>>0,2654435761)>>>0)%DISASTER_ARCS.length;
  const arc=DISASTER_ARCS[arcIndex];
  return arc[(n-1)%7];
}
export function preludeWeather(type,hoursLeft){
  if(!Number.isFinite(hoursLeft)||hoursLeft<=0||hoursLeft>6)return null;
  if(type==='rain'||type==='cold')return 'cloud';
  if(type==='storm')return hoursLeft<=2?'rain':'cloud';
  if(type==='tornado')return hoursLeft<=2?'storm':'cloud';
  if(type==='heat')return 'clear';
  if(type==='dust'||type==='wildfire')return 'heat';
  return null;
}
export function chooseScenarioWeather(current,upcoming,hoursLeft,random){
  const prelude=preludeWeather(upcoming,hoursLeft);
  if(prelude)return prelude;
  const options=WEATHER_TRANSITIONS[current]||WEATHER_TRANSITIONS.clear;
  return options[Math.min(options.length-1,Math.floor(unit(random)*options.length))];
}
export function weatherDurationMs(type,random){
  const range=WEATHER_DURATION_HOURS[type]||WEATHER_DURATION_HOURS.clear;
  return Math.round((range[0]+(range[1]-range[0])*unit(random))*HOUR/60000)*60000;
}
