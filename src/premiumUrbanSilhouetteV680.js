import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {CITY_COMPOSITION} from './cityComposition.js';

/**
 * AFTERDAY v6.8 — urban infrastructure & skyline silhouette pass.
 *
 * The city now reads as interconnected infrastructure rather than isolated tower
 * boxes. Existing ruined-building hosts receive rooftop trusses, antenna frames,
 * broken billboard cages, maintenance gantries and service scaffolds. A small
 * number of real world-space cable spans connect selected background buildings.
 *
 * Cable visibility is evaluated against the persisted tornado + autonomous
 * collapse ID sets so no wire can remain floating after an endpoint fails.
 * Survival economy, city lot positions and the playable roof are untouched.
 */
const GROUND=CITY_COMPOSITION.groundY;
const TAU=Math.PI*2;
const hash=n=>{const x=Math.sin(n*181.31+71.17)*43758.5453123;return x-Math.floor(x);};

const mats=()=>({
  steel:new THREE.MeshPhysicalMaterial({
    color:'#69716f',roughness:.52,metalness:.68,envMapIntensity:1.10,
    clearcoat:.035,clearcoatRoughness:.42
  }),
  rust:new THREE.MeshPhysicalMaterial({
    color:'#684b40',roughness:.78,metalness:.43,envMapIntensity:.70
  }),
  dark:new THREE.MeshStandardMaterial({color:'#202625',roughness:.94,metalness:.16}),
  cable:new THREE.MeshStandardMaterial({color:'#242a29',roughness:.72,metalness:.48}),
  porcelain:new THREE.MeshPhysicalMaterial({color:'#8b8b7f',roughness:.55,metalness:.03,envMapIntensity:.74}),
  panel:new THREE.MeshPhysicalMaterial({color:'#56594f',roughness:.74,metalness:.18,envMapIntensity:.60})
});

function xf(geometry,pos=[0,0,0],rot=[0,0,0],scale=[1,1,1]){
  const g=geometry.clone();
  const q=new THREE.Quaternion().setFromEuler(new THREE.Euler(...rot));
  g.applyMatrix4(new THREE.Matrix4().compose(new THREE.Vector3(...pos),q,new THREE.Vector3(...scale)));
  return g;
}
function boxGeo(size,pos,rot=[0,0,0]){return xf(new THREE.BoxGeometry(...size),pos,rot);}
function cylGeo(r,h,pos,rot=[0,0,0],seg=8){return xf(new THREE.CylinderGeometry(r,r,h,seg),pos,rot);}
function beamGeo(a,b,r=.04,seg=7){
  const A=new THREE.Vector3(...a),B=new THREE.Vector3(...b),d=B.clone().sub(A);
  const g=new THREE.CylinderGeometry(r,r,d.length(),seg);
  const q=new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),d.clone().normalize());
  g.applyMatrix4(new THREE.Matrix4().compose(A.clone().add(B).multiplyScalar(.5),q,new THREE.Vector3(1,1,1)));
  return g;
}
function mergeLayer(list,material,name){
  if(!list.length)return null;
  const indexed=list.every(g=>Boolean(g.index)===Boolean(list[0].index));
  const source=indexed?list:list.map(g=>g.index?g.toNonIndexed():g);
  const merged=mergeGeometries(source,false);
  if(source!==list)for(const g of source)if(!list.includes(g))g.dispose();
  for(const g of list)g.dispose();
  if(!merged)return null;
  merged.computeBoundingBox();merged.computeBoundingSphere();
  const m=new THREE.Mesh(merged,material);m.name=name;m.castShadow=false;m.receiveShadow=true;return m;
}

function addTrussTower(store,w,h,seed,mobile){
  const baseY=h*.92,th=mobile?5.5:7.5,half=.62+hash(seed+1)*.38;
  for(const x of [-half,half])for(const z of [-half,half])
    store.steel.push(beamGeo([x,baseY,z],[x,baseY+th,z],.045));
  const bays=mobile?3:4;
  for(let i=0;i<bays;i++){
    const y0=baseY+i*th/bays,y1=baseY+(i+1)*th/bays;
    for(const z of [-half,half]){
      store.rust.push(beamGeo([-half,y0,z],[half,y1,z],.032));
      store.rust.push(beamGeo([half,y0,z],[-half,y1,z],.032));
    }
    for(const x of [-half,half]){
      store.rust.push(beamGeo([x,y0,-half],[x,y1,half],.032));
      store.rust.push(beamGeo([x,y0,half],[x,y1,-half],.032));
    }
  }
  store.steel.push(cylGeo(.055,3.0,[0,baseY+th+1.5,0],[0,0,0],8));
  for(let i=0;i<(mobile?1:2);i++){
    const yy=baseY+th*.55+i*1.4;
    store.panel.push(boxGeo([1.2,.42,.05],[0,yy,half+.06],[0,hash(seed+i+3)>.5?.08:-.08,0]));
  }
}

function addBillboardCage(store,w,d,h,seed,mobile){
  const y=h*.91+1.5,bw=Math.min(w*.55,4.5+hash(seed+11)*2.5),bh=2.0+hash(seed+13)*1.8;
  const z=(hash(seed+15)>.5?1:-1)*d*.30;
  const tilt=(hash(seed+17)-.5)*.16;
  store.rust.push(boxGeo([bw,.10,.10],[0,y+bh*.5,z],[0,0,tilt]));
  store.rust.push(boxGeo([bw,.10,.10],[0,y-bh*.5,z],[0,0,tilt]));
  for(const x of [-bw*.5,0,bw*.5])store.steel.push(boxGeo([.10,bh,.10],[x,y,z],[0,0,tilt]));
  if(!mobile&&hash(seed+19)>.40){
    store.panel.push(boxGeo([bw*.62,bh*.42,.035],[-bw*.08,y+.08,z+.075],[0,0,tilt+.02]));
  }
  for(const x of [-bw*.38,bw*.38])store.rust.push(beamGeo([x,y-bh*.5,z],[x*.7,h*.91,z*.62],.04));
}

function addMaintenanceGantry(store,w,d,h,seed,mobile){
  const y=h*.90+.65,span=Math.min(w*.62,5.5),depth=Math.min(d*.42,3.5);
  for(const x of [-span*.5,span*.5])for(const z of [-depth*.5,depth*.5])
    store.steel.push(boxGeo([.11,1.3,.11],[x,y+.65,z]));
  store.steel.push(boxGeo([span,.10,.10],[0,y+1.3,-depth*.5]));
  store.steel.push(boxGeo([span,.10,.10],[0,y+1.3,depth*.5]));
  store.steel.push(boxGeo([.10,.10,depth],[-span*.5,y+1.3,0]));
  store.steel.push(boxGeo([.10,.10,depth],[span*.5,y+1.3,0]));
  if(!mobile){
    const cross=Math.min(span,depth)*.9;
    store.rust.push(beamGeo([-span*.45,y+1.3,-depth*.45],[span*.45,y+1.3,depth*.45],.028));
    store.rust.push(beamGeo([span*.45,y+1.3,-depth*.45],[-span*.45,y+1.3,depth*.45],.028));
  }
}

function addBrokenRoofScaffold(store,w,d,h,seed,mobile){
  const side=hash(seed+31)>.5?1:-1;
  const x=side*w*.36,base=h*.88,count=mobile?2:3;
  for(let i=0;i<count;i++){
    const yy=base+i*1.75;
    store.rust.push(beamGeo([x-.9,yy,-1.3],[x-.9,yy,1.3],.035));
    store.rust.push(beamGeo([x+.9,yy,-1.3],[x+.9,yy,1.3],.035));
    store.steel.push(beamGeo([x-.9,yy,-1.3],[x+.9,yy+1.4,1.3],.030));
  }
  for(const xx of [x-.9,x+.9])for(const z of [-1.3,1.3])
    store.steel.push(beamGeo([xx,base,z],[xx,base+count*1.75,z],.038));
}

function addInsulators(store,h,seed,mobile){
  const n=mobile?2:4;
  for(let i=0;i<n;i++){
    const a=i/n*TAU+hash(seed+40)*.5,r=.75;
    const x=Math.cos(a)*r,z=Math.sin(a)*r,y=h*.93+.55;
    store.porcelain.push(cylGeo(.09,.34,[x,y,z],[0,0,0],10));
    store.steel.push(beamGeo([0,h*.93+.20,0],[x,y-.18,z],.025));
  }
}

function makeRoofInfrastructure(slot,materials,mobile){
  const root=new THREE.Group();root.name='AFTERDAY v6.8 skyline infrastructure · '+slot.id;
  const w=slot.width||11,d=w*.82,h=slot.height||32;
  const seed=(slot.modelIndex||0)*229+w*19+h*11+slot.x*.041+slot.z*.067;
  const store={steel:[],rust:[],panel:[],porcelain:[]};
  if(hash(seed+2)>.18)addTrussTower(store,w,h,seed,mobile);
  if(hash(seed+5)>.28)addBillboardCage(store,w,d,h,seed,mobile);
  if(hash(seed+7)>.42)addMaintenanceGantry(store,w,d,h,seed,mobile);
  if(hash(seed+9)>.38)addBrokenRoofScaffold(store,w,d,h,seed,mobile);
  addInsulators(store,h,seed,mobile);
  const layers=[
    mergeLayer(store.steel,materials.steel,'v6.8 merged rooftop steel infrastructure'),
    mergeLayer(store.rust,materials.rust,'v6.8 merged broken scaffold and billboard frame'),
    mergeLayer(store.panel,materials.panel,'v6.8 merged weathered rooftop panels'),
    mergeLayer(store.porcelain,materials.porcelain,'v6.8 merged ceramic line insulators')
  ].filter(Boolean);
  for(const m of layers)root.add(m);
  root.userData={slotId:slot.id,layers:layers.length};
  return root;
}

function sagCurve(a,b,sag,side=0){
  const A=a.clone(),B=b.clone(),mid=A.clone().lerp(B,.5);
  mid.y-=sag;
  const dir=B.clone().sub(A);const horizontal=new THREE.Vector3(dir.z,0,-dir.x).normalize();
  mid.addScaledVector(horizontal,side);
  return new THREE.CatmullRomCurve3([A,mid,B],false,'centripetal');
}

function buildCableSpan(a,b,materials,index){
  const root=new THREE.Group();root.name='AFTERDAY v6.8 suspended service span '+index;
  const start=new THREE.Vector3(a.x,GROUND+Math.min(a.height||32,78)*.88,a.z);
  const end=new THREE.Vector3(b.x,GROUND+Math.min(b.height||32,78)*.88,b.z);
  const distance=start.distanceTo(end),sag=Math.min(8,Math.max(1.4,distance*.055));
  const count=2+(index%2);
  for(let i=0;i<count;i++){
    const side=(i-(count-1)/2)*.34;
    const curve=sagCurve(start,end,sag*(.90+i*.12),side);
    const mesh=new THREE.Mesh(new THREE.TubeGeometry(curve,Math.max(14,Math.ceil(distance/4)),.035,6,false),materials.cable);
    mesh.name='v6.8 sagging utility cable';mesh.castShadow=false;mesh.receiveShadow=false;root.add(mesh);
  }
  // A few porcelain attachment points make the cable read as infrastructure.
  for(const [p,slot] of [[start,a],[end,b]]){
    const ins=new THREE.Mesh(new THREE.CylinderGeometry(.10,.10,.35,10),materials.porcelain);
    ins.position.copy(p);ins.position.y+=.22;ins.name='v6.8 cable endpoint insulator';root.add(ins);
  }
  root.userData={a:a.id,b:b.id,distance};
  return root;
}

function selectSpans(plan,mobile){
  const candidates=plan.filter(s=>s.tier==='mid'||s.tier==='far');
  const pairs=[],used=new Set(),max=mobile?5:10;
  for(let i=0;i<candidates.length&&pairs.length<max;i++){
    const a=candidates[i];if(used.has(a.id))continue;
    let best=null,bestD=Infinity;
    for(let j=i+1;j<candidates.length;j++){
      const b=candidates[j];if(used.has(b.id))continue;
      const d=Math.hypot(a.x-b.x,a.z-b.z);
      if(d>34&&d<115&&d<bestD){best=b;bestD=d;}
    }
    if(best){
      pairs.push([a,best]);used.add(a.id);used.add(best.id);
    }
  }
  return pairs;
}

export class PremiumUrbanSilhouetteV680{
  constructor(world){
    this.world=world;this.mobile=Boolean(world.isMobile);this.materials=mats();this.roots=[];this.spans=[];
    const near=(world.distantCityPlan||[]).filter(s=>s.tier==='near');
    const mid=(world.distantCityPlan||[]).filter(s=>s.tier==='mid');
    const midBudget=this.mobile?Math.min(5,mid.length):Math.min(14,mid.length);
    const step=Math.max(1,Math.floor(mid.length/Math.max(1,midBudget)));
    const selected=[...near.filter((_,i)=>i%2===0),...mid.filter((_,i)=>i%step===0).slice(0,midBudget)];
    for(const slot of selected){
      const host=world.cityBuildings?.get(slot.id);if(!host)continue;
      const root=makeRoofInfrastructure(slot,this.materials,this.mobile);
      host.add(root);this.roots.push(root);
    }
    const pairs=selectSpans(world.distantCityPlan||[],this.mobile);
    for(let i=0;i<pairs.length;i++){
      const span=buildCableSpan(pairs[i][0],pairs[i][1],this.materials,i);
      world.scene.add(span);this.spans.push(span);
    }
    this.stats={infrastructureBuildings:this.roots.length,cableSpans:this.spans.length};
  }

  update(dt,weather={},night=0,game=null){
    const blocked=new Set([...(game?.ambientCollapseIds||[]),...(game?.tornadoDamagedIds||[])]);
    for(let i=0;i<this.spans.length;i++){
      const span=this.spans[i];
      // Endpoints remain structurally anchored. Weather does not rotate or slide
      // the whole span away from its building attachment points.
      span.visible=!blocked.has(span.userData.a)&&!blocked.has(span.userData.b);
    }
  }

  dispose(){
    for(const r of this.roots){
      r.traverse(o=>{if(o.isMesh)o.geometry?.dispose?.();});
      r.parent?.remove(r);
    }
    for(const s of this.spans){
      s.traverse(o=>{if(o.isMesh)o.geometry?.dispose?.();});
      s.parent?.remove(s);
    }
    for(const m of Object.values(this.materials))m?.dispose?.();
    this.roots.length=0;this.spans.length=0;
  }
}
