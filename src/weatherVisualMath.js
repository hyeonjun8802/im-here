/**
 * AFTERDAY visual simulation controls. Pure math, independent from Three.js and
 * the authoritative survivor/world clock. All quantities are normalized except
 * time (seconds), distances (world units), and fall speeds (world units/sec).
 */
export const clamp01 = v => Math.max(0,Math.min(1,Number.isFinite(v)?v:0));
export const smoothstep=(a,b,x)=>{const t=clamp01((x-a)/(b-a));return t*t*(3-2*t);};
export const mix=(a,b,t)=>a+(b-a)*clamp01(t);
export const rainVelocity = (rain,wind)=>mix(21,42,Math.max(clamp01(rain),clamp01(wind)*.5));
export const rainSlant = wind=>mix(.05,.78,clamp01(wind));
export const precipitationOpacity = (rain, distance) => clamp01(rain)*mix(.72,.13,smoothstep(8,100,distance));
export const wetSurfaceRoughness = wet => mix(.86,.22,clamp01(wet));
export const weatherCloudShadow = cloud => mix(1,.38,clamp01(cloud));
export const accumulatedSnow = (current,snow,dt)=>clamp01(current+Math.max(0,dt)*(clamp01(snow)*.0009-(1-clamp01(snow))*.0003));
/** A double-stroke cloud-to-ground strike: bright first stroke, weaker restrike. */
export function lightningEnvelope(age){
 if(age<0)return 0;
 const gaussian=(center,width)=>Math.exp(-Math.pow((age-center)/width,2));
 return clamp01(gaussian(.033,.023)+gaussian(.102,.019)*.74+gaussian(.23,.045)*.17);
}
export function rainLayers(isMobile){return isMobile?{near:920,far:580}:{near:2100,far:1500};}
