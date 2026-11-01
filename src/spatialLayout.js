/**
 * AFTERDAY spatial contract v0.9: ONE inhabitable rooftop at the origin.
 * Seoul's ruins occupy fixed, deterministic 3D positions and THREE DISTINCT
 * physical depth rings. No near neighbor roof is reachable or attached.
 * Distances are game world units; not inferred real-world metres.
 */
export const SPATIAL_LAYOUT = Object.freeze({
  heroRoofCount: 1,
  heroRoofHalfWidth: 23,
  clearZoneRadius: 140,
  cityMinRadius: 166,
  cityMaxRadius: 875,
  maxCameraRadius: 124,
  desktopCityBuildings: 160,
  mobileCityBuildings: 88,
  near: Object.freeze({ min:166, max:295, desktop:28, mobile:18, minHeight:52, maxHeight:117 }),
  mid: Object.freeze({ min:315, max:535, desktop:52, mobile:28, minHeight:57, maxHeight:164 }),
  far: Object.freeze({ min:570, max:875, desktop:80, mobile:42, minHeight:65, maxHeight:195 }),
  distantRoadOffset: 340,
  distantVehicleMinRadius: 270,
  tornadoMinDistance: 280,
  editableRoofBounds:Object.freeze({minX:-22,maxX:22,minZ:-22,maxZ:22})
});

const clamp = (x,lo,hi)=>Math.max(lo,Math.min(hi,x));
const rings=['near','mid','far'];

/** A stable, natural skyline regardless of weather, day/night, or reload. */
export function planDistantCity(isMobile,rand){
  const slots=[];
  for(let ringIndex=0;ringIndex<rings.length;ringIndex++){
    const tier=rings[ringIndex], spec=SPATIAL_LAYOUT[tier];
    const count=isMobile?spec.mobile:spec.desktop;
    const phase=ringIndex*1.91;
    for(let i=0;i<count;i++){
      const index=slots.length;
      // Stratified angle, staggered rings; not one wall of uniform skyscrapers.
      const section=(i+.5+(rand(index*17+8)-.5)*.72)/count;
      const azimuth=section*Math.PI*2+phase;
      const radial=spec.min+(spec.max-spec.min)*(0.12+rand(index*53+11)*.76);
      // A few taller buildings create readable distinct landmark silhouettes.
      const height=spec.minHeight+(spec.maxHeight-spec.minHeight)*Math.pow(rand(index*13+31),.85);
      slots.push({
        id:`${tier}-${String(i).padStart(3,'0')}`,
        tier,
        x:Math.sin(azimuth)*radial,
        z:Math.cos(azimuth)*radial,
        radius:radial,
        height,
        rotation:Math.PI/2*Math.round(rand(index*9+93)*4),
        width:7+rand(index*39+3)*10,
        modelIndex:index
      });
    }
  }
  return slots;
}

export function outsideHeroClearZone(x,z){return Math.hypot(x,z)>=SPATIAL_LAYOUT.clearZoneRadius;}

/** Fog alpha grows monotonically with depth. Actual 3D renderer also uses FogExp2. */
export function depthFogOpacity(distance,mist=0){
  const d=Math.max(0,distance);
  const density=.00128+clamp(mist,0,1)*.00148;
  return clamp(1-Math.exp(-Math.pow(d*density,2)),0,1);
}

/** In a storm the city contracts to silhouettes; in clear dawn it stays layered. */
export function depthAtmosphere(mist=0,night=0){
  const wet=clamp(mist,0,1),dark=clamp(night,0,1);
  return {
    fogDensity:.00128+wet*.00148,
    cloudBankOpacity:.09+wet*.39,
    distanceFade:[depthFogOpacity(220,wet),depthFogOpacity(420,wet),depthFogOpacity(740,wet)],
    skylineDim:.93-wet*.31-dark*.26
  };
}
