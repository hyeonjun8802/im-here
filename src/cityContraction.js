import {SPATIAL_LAYOUT} from './spatialLayout.js';
import {safeCityHeight,CITY_COMPOSITION,clearsHeroRoof} from './cityComposition.js';

/** v2.7: Hero-adjacent 3D residential blocks with three depth layers. Each building is
 * below the inhabited rooftop; the physical buffer is measured using the
 * complete footprint, not just the tower center. */
const bands=Object.freeze({
 near:{min:47,max:91,height:[22,37]},
 mid:{min:94,max:148,height:[17,36]},
 far:{min:153,max:235,height:[13,35]}
});
export function contractCitySlot(slot){
 const source=SPATIAL_LAYOUT[slot.tier],target=bands[slot.tier];
 const t=Math.max(0,Math.min(1,(slot.radius-source.min)/(source.max-source.min)));
 const h=Math.max(0,Math.min(1,(slot.height-source.minHeight)/(source.maxHeight-source.minHeight)));
 const radius=target.min+(target.max-target.min)*t;
 const scale=radius/slot.radius;
 return {...slot, x:slot.x*scale,z:slot.z*scale,radius,
  width:Math.min(22,slot.width+4),height:safeCityHeight(target.height[0]+(target.height[1]-target.height[0])*h)};
}

/** Resolve intersections introduced by compacting the old three rings.
 * Repositions ONLY background-city blocks, not the playable rooftop or
 * gameplay paths. Deterministic for the exact same plan on every reload. */
export function settleContractedCity(plan){
 const settled=[];
 const footprint=b=>b.depth||b.width*.82;
 // The same circular street separation is shared by the infill planner and QA.
 const overlap=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z)<
  (Math.max(a.width,footprint(a))+Math.max(b.width,footprint(b)))*.48+1.5;
 const valid=b=>{
  const edge=Math.hypot(b.width,footprint(b))*.5;
  return b.radius-edge>CITY_COMPOSITION.visualCityClearRadius &&
   clearsHeroRoof(b.x,b.z,b.width,footprint(b),b.rotation||0) &&
   settled.every(x=>!overlap(b,x));
 };
 for(const original of plan){
  let best=original;
  if(!valid(best)){
   let found=false;
   const az=Math.atan2(original.x,original.z);
   // Walk neighboring streets in deterministic order; never leave an
   // overlapping primary plot behind when two contracted tiers meet.
   for(let ring=0;ring<=26&&!found;ring++){
    for(let offset=0;offset<32&&!found;offset++){
     const step=Math.ceil(offset/2)*(offset%2?1:-1);
     const angle=az+step*(.034+ring*.0006);
     const radial=(ring%2?1:-1)*Math.ceil(ring/2)*2.25;
     const r=original.radius+radial;
     if(r<43||r>252)continue;
     const candidate={...original,x:Math.sin(angle)*r,z:Math.cos(angle)*r,radius:r};
     if(valid(candidate)){best=candidate;found=true;}
    }
   }
   if(!found)throw new Error(`No legal lot for city building ${original.id}`);
  }
  settled.push(best);
 }
 return settled;
}
