/** Visual weather blending only. Survival state/time remain authoritative in simulation.js. */
export const VISUAL_WEATHER = Object.freeze({
 clear: {rain:0,cloud:.13,wind:.11,mist:.11,wet:.05,storm:0,heat:0,snow:0,tornado:0,dust:0,wildfire:0},
 cloud: {rain:0,cloud:.63,wind:.22,mist:.27,wet:.06,storm:0,heat:0,snow:0,tornado:0,dust:0,wildfire:0},
 heat: {rain:0,cloud:.12,wind:.13,mist:.37,wet:0,storm:0,heat:1,snow:0,tornado:0,dust:0,wildfire:0},
 rain: {rain:.85,cloud:.88,wind:.53,mist:.66,wet:.94,storm:.12,heat:0,snow:0,tornado:0,dust:0,wildfire:0},
 storm: {rain:1,cloud:1,wind:.88,mist:.85,wet:1,storm:1,heat:0,snow:0,tornado:0,dust:0,wildfire:0},
 tornado: {rain:.68,cloud:1,wind:1,mist:.84,wet:.95,storm:1,heat:0,snow:0,tornado:1,dust:0,wildfire:0},
 cold: {rain:0,cloud:.56,wind:.42,mist:.37,wet:.13,storm:0,heat:0,snow:.86,tornado:0,dust:0,wildfire:0},
 dust: {rain:0,cloud:.37,wind:1,mist:.43,wet:0,storm:0,heat:.22,snow:0,tornado:0,dust:1,wildfire:0},
 wildfire: {rain:0,cloud:.70,wind:.64,mist:.86,wet:0,storm:0,heat:.88,snow:0,tornado:0,dust:.16,wildfire:1},
});
export const WEATHER_KEYS=Object.freeze(Object.keys(VISUAL_WEATHER["clear"]));
export function visualTargets(name){return VISUAL_WEATHER[name]||VISUAL_WEATHER.clear;}
export function integrateWeather(current,name,dt,slowSeconds=6){
 const target=visualTargets(name),step=Math.max(0,Math.min(1,1-Math.exp(-Math.max(0,dt)/slowSeconds)));
 const next={};for(const k of WEATHER_KEYS)next[k]=(Number.isFinite(current?.[k])?current[k]:target[k])+(target[k]-(Number.isFinite(current?.[k])?current[k]:target[k]))*step;
 return next;
}
export function determineWeatherPhase(values){
 if(values.tornado>.65)return 'impact';
 if(values.storm>.6 || values.rain>.72)return 'impact';
 if(values.cloud>.42 && values.wind>.23)return 'buildup';
 if(values.wet>.34)return 'recovery';
 return 'calm';
}
