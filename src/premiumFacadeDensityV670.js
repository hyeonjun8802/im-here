import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

/**
 * AFTERDAY v6.7 — high-density facade services and urban micro-architecture.
 *
 * Adds original procedural fire escapes, HVAC, drain/service pipes, utility
 * boxes, broken sign frames, balcony rails and grime/soot streaks to selected
 * existing near/mid ruined buildings. Everything is attached to the existing
 * city holder so tornado/ambient collapse systems can hide the detail with the
 * host and no duplicate city layout is introduced.
 */
const TAU=Math.PI*2;
const hash=n=>{const x=Math.sin(n*149.31+23.77)*43758.5453123;return x-Math.floor(x);};

function pbr(color,rough=.8,metal=.1,extra={}){
  return new THREE.MeshPhysicalMaterial({
    color,roughness:rough,metalness:metal,
    envMapIntensity:extra.envMapIntensity??.75,
    clearcoat:extra.clearcoat??0,
    clearcoatRoughness:extra.clearcoatRoughness??.55,
    transparent:extra.transparent??false,
    opacity:extra.opacity??1,
    depthWrite:extra.depthWrite??true,
    side:extra.side??THREE.FrontSide,
    polygonOffset:extra.polygonOffset??false,
    polygonOffsetFactor:extra.polygonOffsetFactor??0,
    polygonOffsetUnits:extra.polygonOffsetUnits??0
  });
}
const makeMaterials=()=>({
  painted:pbr('#555f5e',.58,.52,{envMapIntensity:1.08,clearcoat:.05,clearcoatRoughness:.48}),
  steel:pbr('#737977',.46,.68,{envMapIntensity:1.24,clearcoat:.04,clearcoatRoughness:.40}),
  rust:pbr('#6d4e42',.76,.43,{envMapIntensity:.72}),
  duct:pbr('#777d79',.51,.58,{envMapIntensity:1.05}),
  concrete:pbr('#626762',.94,.015,{envMapIntensity:.38}),
  dark:new THREE.MeshStandardMaterial({color:'#181e1d',roughness:.98,metalness:.03}),
  sign:pbr('#59574d',.75,.24,{envMapIntensity:.68}),
  lamp:new THREE.MeshStandardMaterial({color:'#cfaa72',emissive:'#e68b38',emissiveIntensity:.12,roughness:.48}),
  grime:new THREE.MeshStandardMaterial({
    color:'#202725',roughness:1,metalness:0,transparent:true,opacity:.16,
    depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2
  })
});

function transformed(geometry,pos=[0,0,0],rot=[0,0,0],scale=[1,1,1]){
  const g=geometry.clone();
  const q=new THREE.Quaternion().setFromEuler(new THREE.Euler(...rot));
  const m=new THREE.Matrix4().compose(new THREE.Vector3(...pos),q,new THREE.Vector3(...scale));
  g.applyMatrix4(m);return g;
}
function boxGeo(size,pos,rot=[0,0,0]){
  return transformed(new THREE.BoxGeometry(...size),pos,rot);
}
function cylGeo(r,h,pos,rot=[0,0,0],segments=10){
  return transformed(new THREE.CylinderGeometry(r,r,h,segments),pos,rot);
}
function beamGeo(a,b,r=.04,segments=7){
  const A=new THREE.Vector3(...a),B=new THREE.Vector3(...b),d=B.clone().sub(A);
  const geo=new THREE.CylinderGeometry(r,r,d.length(),segments);
  const q=new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),d.clone().normalize());
  geo.applyMatrix4(new THREE.Matrix4().compose(A.clone().add(B).multiplyScalar(.5),q,new THREE.Vector3(1,1,1)));
  return geo;
}
function mergeLayer(list,material,name,{cast=false,receive=true}={}){
  if(!list.length)return null;
  const sameIndex=list.every(g=>Boolean(g.index)===Boolean(list[0].index));
  const source=sameIndex?list:list.map(g=>g.index?g.toNonIndexed():g);
  const merged=mergeGeometries(source,false);
  if(source!==list)for(const g of source)if(!list.includes(g))g.dispose();
  for(const g of list)g.dispose();
  if(!merged)return null;
  merged.computeBoundingBox();merged.computeBoundingSphere();
  const mesh=new THREE.Mesh(merged,material);mesh.name=name;mesh.castShadow=cast;mesh.receiveShadow=receive;
  return mesh;
}
function frontZ(d,offset=.04){return d*.5+offset;}
function sideX(w,offset=.04){return w*.5+offset;}

function addFireEscape(store,w,d,h,seed,mobile){
  const levels=Math.max(2,Math.min(mobile?3:5,Math.floor(h/8)));
  const side=hash(seed+1)>.5?1:-1;
  const x=sideX(w,.20)*side;
  const railDepth=Math.min(3.6,d*.44);
  const baseY=4.4;
  for(let i=0;i<levels;i++){
    const y=baseY+i*5.1;
    if(y>h*.74)break;
    // Platform and wall brackets.
    store.steel.push(boxGeo([1.45,.13,railDepth],[x,y,0],[0,0,0]));
    store.steel.push(beamGeo([x-side*.80,y-.10,-railDepth*.42],[x-side*.80,y-.10,railDepth*.42],.035));
    for(const z of [-railDepth*.43,railDepth*.43]){
      store.rust.push(beamGeo([x,y-.02,z],[x-side*.85,y-1.05,z],.045));
      store.steel.push(beamGeo([x,y+.02,z],[x,y+1.05,z],.032));
    }
    // Railings.
    store.steel.push(beamGeo([x,y+1.05,-railDepth*.43],[x,y+1.05,railDepth*.43],.032));
    const posts=mobile?2:3;
    for(let p=0;p<posts;p++){
      const z=-railDepth*.43+p*(railDepth*.86/Math.max(1,posts-1));
      store.steel.push(beamGeo([x,y+.03,z],[x,y+1.05,z],.025));
    }
    // Alternating diagonal stair run to the next landing.
    if(i<levels-1){
      const z0=i%2?-railDepth*.38:railDepth*.38,z1=-z0;
      store.rust.push(beamGeo([x-side*.02,y+.06,z0],[x-side*.06,y+5.0,z1],.055));
      store.rust.push(beamGeo([x-side*.38,y+.06,z0],[x-side*.42,y+5.0,z1],.045));
      const steps=mobile?5:8;
      for(let st=0;st<steps;st++){
        const t=st/(steps-1),yy=y+.32+t*4.35,zz=THREE.MathUtils.lerp(z0,z1,t);
        store.steel.push(boxGeo([.72,.055,.34],[x-side*.20,yy,zz],[0,0,0]));
      }
    }
  }
}
function addHVAC(store,w,d,h,seed,mobile){
  const units=mobile?2:3+Math.floor(hash(seed+2)*3);
  for(let i=0;i<units;i++){
    const front=hash(seed+i*7)>.45;
    const y=3.1+hash(seed+i*11)*Math.max(5,h*.52);
    const span=(hash(seed+i*13)-.5)*(front?w*.55:d*.55);
    const bw=.85+hash(seed+i*17)*.65,bh=.62+hash(seed+i*19)*.45,bd=.42+hash(seed+i*23)*.32;
    if(front){
      const z=frontZ(d,.20);
      store.painted.push(boxGeo([bw,bh,bd],[span,y,z]));
      store.dark.push(cylGeo(Math.min(bw,bh)*.26,.035,[span,y,z+bd*.52],[Math.PI/2,0,0],16));
      for(let k=0;k<4;k++){
        const a=k*Math.PI/2;
        store.steel.push(beamGeo([span+Math.cos(a)*bw*.34,y+Math.sin(a)*bh*.34,z+bd*.55],
          [span+Math.cos(a+.85)*bw*.12,y+Math.sin(a+.85)*bh*.12,z+bd*.55],.018,6));
      }
    }else{
      const x=sideX(w,.20);
      store.painted.push(boxGeo([bd,bh,bw],[x,y,span]));
      store.dark.push(cylGeo(Math.min(bw,bh)*.26,.035,[x+bd*.52,y,span],[0,0,Math.PI/2],16));
    }
  }
}
function addServicePipes(store,w,d,h,seed,mobile){
  const count=mobile?2:4;
  for(let i=0;i<count;i++){
    const face=i%2;
    const metal=i%3===0?store.rust:store.duct;
    const yTop=h*(.42+hash(seed+i*31)*.40);
    const offset=(hash(seed+i*33)-.5)*(face?w:d)*.58;
    if(face===0){
      const z=frontZ(d,.15),x=offset;
      metal.push(cylGeo(.055+hash(seed+i)*.035,yTop-1.3,[x,(yTop+1.3)*.5,z],[0,0,0],8));
      // dog-leg joints avoid perfectly straight "CG tubes"
      metal.push(beamGeo([x,1.3,z],[x+(hash(seed+i+9)-.5)*.8,.75,z+.12],.065,8));
    }else{
      const x=sideX(w,.15),z=offset;
      metal.push(cylGeo(.055+hash(seed+i)*.035,yTop-1.6,[x,(yTop+1.6)*.5,z],[0,0,0],8));
    }
  }
}
function addUtilityBoxes(store,w,d,h,seed,mobile){
  const count=mobile?3:6;
  for(let i=0;i<count;i++){
    const front=i%2===0;
    const y=2.0+hash(seed+i*43)*Math.max(3,h*.45);
    const span=(hash(seed+i*47)-.5)*(front?w:d)*.60;
    const bw=.35+hash(seed+i*51)*.44,bh=.48+hash(seed+i*53)*.68;
    if(front){
      const z=frontZ(d,.13);
      store.painted.push(boxGeo([bw,bh,.18],[span,y,z]));
      store.steel.push(boxGeo([bw*.55,.035,.025],[span,y+bh*.08,z+.105]));
    }else{
      const x=sideX(w,.13);
      store.painted.push(boxGeo([.18,bh,bw],[x,y,span]));
    }
  }
}
function addBrokenSigns(store,w,d,h,seed,mobile){
  const count=mobile?1:2;
  for(let i=0;i<count;i++){
    const y=5.5+hash(seed+i*61)*Math.max(3,h*.32);
    const x=(hash(seed+i*67)-.5)*w*.45,z=frontZ(d,.55);
    const sw=1.4+hash(seed+i*71)*2.3,sh=.65+hash(seed+i*73)*1.25;
    const tilt=(hash(seed+i*79)-.5)*.35;
    store.sign.push(boxGeo([sw,.08,.08],[x,y+sh*.52,z],[0,0,tilt]));
    store.sign.push(boxGeo([sw,.08,.08],[x,y-sh*.52,z],[0,0,tilt]));
    store.rust.push(boxGeo([.08,sh,.08],[x-sw*.5,y,z],[0,0,tilt]));
    if(hash(seed+i*83)>.35)store.rust.push(boxGeo([.08,sh*.70,.08],[x+sw*.5,y-sh*.12,z],[0,0,tilt+.12]));
    // A surviving dull panel breaks empty-frame repetition.
    if(hash(seed+i*89)>.62)store.sign.push(boxGeo([sw*.84,sh*.72,.035],[x,y,z+.05],[0,0,tilt]));
  }
}
function addBalconyAndRails(store,w,d,h,seed,mobile){
  const count=mobile?2:4;
  for(let i=0;i<count;i++){
    const y=4.8+i*5.4+hash(seed+i*3)*.5;
    if(y>h*.66)break;
    const x=(hash(seed+i*91)-.5)*w*.50,z=frontZ(d,.46);
    const bw=1.7+hash(seed+i*97)*1.6;
    store.concrete.push(boxGeo([bw,.16,.82],[x,y,z-.02]));
    store.steel.push(beamGeo([x-bw*.45,y+.76,z+.30],[x+bw*.45,y+.76,z+.30],.026));
    for(const sx of [-.45,0,.45])store.steel.push(beamGeo([x+bw*sx,y+.10,z+.30],[x+bw*sx,y+.76,z+.30],.022));
    if(hash(seed+i*101)>.52)store.rust.push(beamGeo([x-bw*.40,y+.12,z-.22],[x+bw*.42,y+.80,z+.34],.035));
  }
}
function addGrime(store,w,d,h,seed,mobile){
  const count=mobile?3:7;
  for(let i=0;i<count;i++){
    const y=3.0+hash(seed+i*107)*Math.max(4,h*.63);
    const x=(hash(seed+i*109)-.5)*w*.72;
    const gw=.25+hash(seed+i*113)*.75,gh=1.1+hash(seed+i*127)*3.8;
    store.grime.push(boxGeo([gw,gh,.018],[x,y,frontZ(d,.225)],[0,0,(hash(seed+i*131)-.5)*.08]));
  }
}

function buildFacadeGroup(slot,materials,mobile){
  const group=new THREE.Group();group.name='AFTERDAY v6.7 premium facade micro-architecture · '+slot.id;
  const w=slot.width||11,d=w*.82,h=slot.height||32;
  const seed=(slot.modelIndex||0)*131+w*17+h*7+slot.x*.03+slot.z*.05;
  const store={steel:[],rust:[],painted:[],duct:[],concrete:[],dark:[],sign:[],grime:[]};
  addFireEscape(store,w,d,h,seed,mobile);
  addHVAC(store,w,d,h,seed,mobile);
  addServicePipes(store,w,d,h,seed,mobile);
  addUtilityBoxes(store,w,d,h,seed,mobile);
  addBrokenSigns(store,w,d,h,seed,mobile);
  addBalconyAndRails(store,w,d,h,seed,mobile);
  addGrime(store,w,d,h,seed,mobile);

  const layers=[
    mergeLayer(store.steel,materials.steel,'v6.7 merged facade steel',{receive:true}),
    mergeLayer(store.rust,materials.rust,'v6.7 merged oxidized fire-escape structure',{receive:true}),
    mergeLayer(store.painted,materials.painted,'v6.7 merged HVAC and utility housings',{receive:true}),
    mergeLayer(store.duct,materials.duct,'v6.7 merged service pipes',{receive:true}),
    mergeLayer(store.concrete,materials.concrete,'v6.7 merged balcony slabs',{receive:true}),
    mergeLayer(store.dark,materials.dark,'v6.7 merged fan recesses',{receive:false}),
    mergeLayer(store.sign,materials.sign,'v6.7 merged broken sign frames',{receive:true}),
    mergeLayer(store.grime,materials.grime,'v6.7 merged facade grime and soot',{receive:false})
  ].filter(Boolean);
  for(const m of layers)group.add(m);
  group.userData={layers:layers.length,slotId:slot.id,tier:slot.tier};
  return group;
}

export class PremiumFacadeDensityV670{
  constructor(world){
    this.world=world;this.mobile=Boolean(world.isMobile);this.materials=makeMaterials();this.groups=[];
    const near=(world.distantCityPlan||[]).filter(s=>s.tier==='near');
    const mid=(world.distantCityPlan||[]).filter(s=>s.tier==='mid');
    const midBudget=this.mobile?Math.min(5,mid.length):Math.min(12,mid.length);
    const step=Math.max(1,Math.floor(mid.length/Math.max(1,midBudget)));
    const selected=[...near,...mid.filter((_,i)=>i%step===0).slice(0,midBudget)];
    for(const slot of selected){
      const host=world.cityBuildings?.get(slot.id);if(!host)continue;
      const detail=buildFacadeGroup(slot,this.materials,this.mobile);
      host.add(detail);this.groups.push(detail);
    }
    this.stats={detailedBuildings:this.groups.length,near:near.length,mid:this.groups.length-near.length};
  }

  update(dt,weather={},night=0){
    const wet=Math.max(0,Math.min(1,Number(weather.wet)||0));
    const storm=Math.max(0,Math.min(1,Number(weather.storm)||0));
    this.materials.grime.opacity=.12+wet*.12+storm*.035;
    this.materials.painted.roughness=.60-wet*.10;
    this.materials.steel.roughness=.48-wet*.08;
    this.materials.lamp.emissiveIntensity=.08+Math.max(0,Math.min(1,night))*.52;
  }

  dispose(){
    for(const g of this.groups){
      g.traverse(o=>{if(o.isMesh)o.geometry?.dispose?.();});
      g.parent?.remove(g);
    }
    for(const m of Object.values(this.materials))m?.dispose?.();
    this.groups.length=0;
  }
}
