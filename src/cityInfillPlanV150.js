import {safeCityHeight,clearsHeroRoof} from './cityComposition.js';
import {CITY_COMPOSITION} from './cityComposition.js';
/** Street-grid plots, not scattered rings of tiny identical boxes. Sparse
 * shared cross-streets, irregular block edges and building footprints establish
 * residential neighborhoods visible from the single high rooftop. */
export const INFILL_LAYERS=Object.freeze([
 {name:'inner',min:34,max:94,desktop:195,mobile:116,minHeight:22,maxHeight:37},
 {name:'middle',min:95,max:171,desktop:275,mobile:155,minHeight:16,maxHeight:35},
 {name:'outer',min:172,max:258,desktop:285,mobile:145,minHeight:13,maxHeight:32}
]);
const fract=x=>x-Math.floor(x);
export const hash=n=>fract(Math.sin(n*91.71+12.745)*17389.214);
function radiusToLayer(r){return INFILL_LAYERS.findIndex(l=>r>=l.min&&r<=l.max)}
export function makeCityInfill(isMobile=false,existing=[]){
 const out=[],perLayer=[0,0,0],reserved=existing.map(b=>({...b,depth:b.depth||b.width*.82}));
 const maxCount=INFILL_LAYERS.map(l=>isMobile?l.mobile:l.desktop);
 const cell=15.7,limit=258;
 const candidates=[];
 // The playable roof is 46 world units across. Allocate the first row of
 // building lots along its four edges, across a genuine 5.5-unit alley.
 // These are ordinary 3D infill buildings with all existing facade details.
 for(let side=0;side<4;side++)for(let j=0;j<4;j++){
  const key=side*4+j,tangent=(j-1.5)*16.5;
  const width=11.8+hash(key+382)*2.4,depth=9.2+hash(key+491)*2.3;
  const normal=CITY_COMPOSITION.heroFootprintHalfWidth+CITY_COMPOSITION.heroNeighborGap+depth*.5+1.0;
  const zSide=side<2,sign=side%2?1:-1;
  const x=zSide?tangent:sign*normal,z=zSide?sign*normal:tangent;
  const rotation=zSide?0:Math.PI*.5,radius=Math.hypot(x,z);
  const h=hash(key+770),spec=INFILL_LAYERS[0];
  candidates.push({x,z,width,depth,height:safeCityHeight(spec.minHeight+(spec.maxHeight-spec.minHeight)*h),
   rotation,layer:'inner',variant:key%4,kind:key%4,id:`hero-adjacent-${side}-${j}`,score:-2-key*.0001});
 }
 for(let pass=0;pass<4;pass++)for(let ix=-16;ix<=16;ix++)for(let iz=-16;iz<=16;iz++){
  // Four interleaved deterministic lot samples fill close-range gaps while
  // collision rejection preserves real alleys and distinct 3D footprints.
  // A staggered street grid with diagonal/arterial breaks rather than a
  // random circular scatter. A few contiguous empty lots remain as ruins.
  const seq=(ix+23)*79+(iz+23)*193+pass*7321;
  const x=(ix+(pass===1?.51:pass===2?.24:pass===3?.71:0))*cell+(iz%3-1)*2.4+(hash(seq+1)-.5)*4.4;
  const z=(iz+(pass===1?.44:pass===2?.72:pass===3?.18:0))*cell+(ix%4-1.5)*1.5+(hash(seq+2)-.5)*4.4;
  const radius=Math.hypot(x,z);
  const layer=radiusToLayer(radius);
  if(layer<0||radius>limit)continue;
  if((ix%7===0&&hash(iz+91)>.14)||(iz%8===0&&hash(ix+23)>.18))continue;
  if(hash(seq+9)<(layer===0?.11:layer===1?.15:.22))continue;
  const footprint=layer===0?9.0:layer===1?10.2:11.1;
  const width=footprint+hash(seq+17)*(layer===0?5.6:7.4);
  const depth=(8.1+hash(seq+31)*6.3)*(hash(seq+62)>.71?1.1:.89);
  if(radius-Math.hypot(width,depth)*.5<=CITY_COMPOSITION.visualCityClearRadius+1 ||
     !clearsHeroRoof(x,z,width,depth,(Math.round(hash(seq+41)*2)%2)*Math.PI*.5))continue;
  const h=hash(seq+39),spec=INFILL_LAYERS[layer];
  const height=safeCityHeight(spec.minHeight+(spec.maxHeight-spec.minHeight)*Math.pow(h,layer===0?.95:1.14));
  candidates.push({x,z,width,depth,height,rotation:(Math.round(hash(seq+41)*2)%2)*Math.PI*.5,
   layer:spec.name,variant:Math.floor(hash(seq+62)*4),kind:Math.floor(hash(seq+61)*4),
   id:`${spec.name}-${pass}-${ix+16}-${iz+16}`,score:hash(seq+93)});
 }
 // Fair, deterministic pass per ring: preserve near, middle AND far layers.
 candidates.sort((a,b)=>a.score-b.score);
 for(let layer=0;layer<3;layer++){
  for(const b of candidates){if(b.layer!==INFILL_LAYERS[layer].name||perLayer[layer]>=maxCount[layer])continue;
   // Full footprint collision check against primary lots and other infill:
   // building edges never merge into one giant box or touch the hero roof.
   const collide=reserved.some(other=>Math.hypot(b.x-other.x,b.z-other.z)<
     (Math.max(b.width,b.depth)+Math.max(other.width,other.depth))*.48+1.5);
   if(collide || !clearsHeroRoof(b.x,b.z,b.width,b.depth,b.rotation))continue;
   reserved.push(b);out.push(b);perLayer[layer]++;
  }
 }
 return out;
}
export function measureInfill(plan){
 const byLayer=Object.fromEntries(INFILL_LAYERS.map(x=>[x.name,0]));
 let minDistance=Infinity,maxDistance=0;
 for(const b of plan){byLayer[b.layer]++;const r=Math.hypot(b.x,b.z);minDistance=Math.min(minDistance,r);maxDistance=Math.max(maxDistance,r);}
 return {count:plan.length,byLayer,minDistance,maxDistance};
}
