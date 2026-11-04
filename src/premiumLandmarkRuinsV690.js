import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

/**
 * AFTERDAY v6.9 — hero landmark ruin archetypes.
 *
 * Three selected mid-distance buildings stop reading as repeated tower boxes.
 * Each is rebuilt as a distinct original ruin archetype: office carcass,
 * split apartment block, or infrastructure-heavy civic/industrial shell.
 *
 * The replacement remains inside the original city holder, preserving lot
 * positions and all collapse/tornado ownership. Hidden legacy children are kept
 * so existing destruction systems can still treat the host as one building.
 */
const hash=n=>{const x=Math.sin(n*193.71+61.13)*43758.5453123;return x-Math.floor(x);};
const TAU=Math.PI*2;

function materials(){
  return {
    concrete:new THREE.MeshPhysicalMaterial({color:'#696d68',roughness:.94,metalness:.015,envMapIntensity:.48}),
    concreteDark:new THREE.MeshPhysicalMaterial({color:'#464b48',roughness:.98,metalness:.01,envMapIntensity:.30}),
    steel:new THREE.MeshPhysicalMaterial({color:'#6d7471',roughness:.52,metalness:.68,envMapIntensity:1.05,clearcoat:.035,clearcoatRoughness:.44}),
    rust:new THREE.MeshPhysicalMaterial({color:'#714f40',roughness:.77,metalness:.42,envMapIntensity:.72}),
    glass:new THREE.MeshPhysicalMaterial({color:'#35484e',roughness:.19,metalness:.13,transparent:true,opacity:.55,depthWrite:false,envMapIntensity:1.15,clearcoat:.4,clearcoatRoughness:.16}),
    interior:new THREE.MeshStandardMaterial({color:'#111716',roughness:1,metalness:0}),
    panel:new THREE.MeshPhysicalMaterial({color:'#555b56',roughness:.74,metalness:.22,envMapIntensity:.68}),
    soot:new THREE.MeshStandardMaterial({color:'#242a28',roughness:1,transparent:true,opacity:.18,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2}),
  };
}
function xf(g,pos=[0,0,0],rot=[0,0,0],scale=[1,1,1]){
  const c=g.clone(),q=new THREE.Quaternion().setFromEuler(new THREE.Euler(...rot));
  c.applyMatrix4(new THREE.Matrix4().compose(new THREE.Vector3(...pos),q,new THREE.Vector3(...scale)));
  return c;
}
const boxGeo=(s,p,r=[0,0,0])=>xf(new THREE.BoxGeometry(...s),p,r);
const cylGeo=(rad,h,p,r=[0,0,0],seg=10)=>xf(new THREE.CylinderGeometry(rad,rad,h,seg),p,r);
function beamGeo(a,b,r=.045,seg=7){
  const A=new THREE.Vector3(...a),B=new THREE.Vector3(...b),d=B.clone().sub(A);
  const g=new THREE.CylinderGeometry(r,r,d.length(),seg);
  const q=new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),d.clone().normalize());
  g.applyMatrix4(new THREE.Matrix4().compose(A.clone().add(B).multiplyScalar(.5),q,new THREE.Vector3(1,1,1)));
  return g;
}
function merge(list,material,name,{receive=true}={}){
  if(!list.length)return null;
  const indexed=list.every(g=>Boolean(g.index)===Boolean(list[0].index));
  const src=indexed?list:list.map(g=>g.index?g.toNonIndexed():g);
  const out=mergeGeometries(src,false);
  if(src!==list)for(const g of src)if(!list.includes(g))g.dispose();
  for(const g of list)g.dispose();
  if(!out)return null;
  out.computeBoundingBox();out.computeBoundingSphere();
  const m=new THREE.Mesh(out,material);m.name=name;m.castShadow=false;m.receiveShadow=receive;return m;
}

function officeCarcass(slot,mat,mobile){
  const root=new THREE.Group();root.name='v6.9 landmark office carcass';
  const w=Math.max(10,slot.width||12),d=w*.82,h=Math.max(26,slot.height||34);
  const s={concrete:[],dark:[],steel:[],rust:[],glass:[],soot:[]};
  const floorH=3.45,floors=Math.max(7,Math.min(mobile?10:14,Math.floor(h/floorH)));
  const coreW=w*.28,coreD=d*.34;
  // Solid elevator/service core gives mass while perimeter is skeletal.
  s.concreteDark.push(boxGeo([coreW,h*.88,coreD],[-w*.15,h*.44,-d*.09]));
  for(let f=0;f<floors;f++){
    const y=1.0+f*floorH;
    const broken=f>floors*.55 && hash(f+slot.x*.1)>.38;
    const slabW=broken?w*(.55+hash(f+17)*.30):w*.94;
    const x=broken?(hash(f+19)-.5)*w*.16:0;
    s.concrete.push(boxGeo([slabW,.20,d*.90],[x,y,0],[0,0,(hash(f+21)-.5)*(broken?.055:.012)]));
    // facade columns, some snapped
    if(f<floors-1){
      for(const xx of [-w*.44,w*.44]){
        const missing=hash(f*31+xx+slot.z*.02)>.86;
        if(!missing)s.steel.push(boxGeo([.15,floorH*.96,.15],[xx,y+floorH*.5,d*.40]));
      }
    }
  }
  // surviving curtain-wall strips on lower floors
  const windows=mobile?8:16;
  for(let i=0;i<windows;i++){
    const row=i%Math.max(2,Math.floor(floors*.45)),col=Math.floor(i/Math.max(2,Math.floor(floors*.45)));
    const y=2.0+row*floorH,x=-w*.33+col*w*.28;
    if(y>h*.48)continue;
    s.glass.push(boxGeo([w*.18,1.55,.035],[x,y,d*.455]));
  }
  // torn corner frame, diagonal braces, rebar fringe
  for(let i=0;i<(mobile?6:12);i++){
    const y=h*(.52+hash(i+4)*.34),x=w*(.30+hash(i+8)*.14),z=(hash(i+12)-.5)*d*.65;
    s.rust.push(beamGeo([x,y,z],[x+(hash(i+20)-.5)*1.8,y-1.5-hash(i+22)*2.8,z+(hash(i+24)-.5)*1.2],.04));
  }
  s.steel.push(beamGeo([-w*.43,h*.76,-d*.38],[w*.38,h*.93,d*.34],.085));
  // soot streaks around vertical cavity
  for(let i=0;i<(mobile?3:6);i++){
    const x=(hash(i+70)-.5)*w*.42,y=h*(.30+hash(i+73)*.42);
    s.soot.push(boxGeo([.5+hash(i+74)*.8,2.0+hash(i+75)*4,.018],[x,y,d*.465]));
  }
  for(const m of [
    merge(s.concrete,mat.concrete,'v6.9 office exposed floor plates'),
    merge(s.dark,mat.concreteDark,'v6.9 office dark elevator core'),
    merge(s.steel,mat.steel,'v6.9 office structural frame'),
    merge(s.rust,mat.rust,'v6.9 office torn steel and rebar'),
    merge(s.glass,mat.glass,'v6.9 office surviving curtain wall',{receive:false}),
    merge(s.soot,mat.soot,'v6.9 office soot scars',{receive:false})
  ].filter(Boolean))root.add(m);
  return root;
}

function splitApartment(slot,mat,mobile){
  const root=new THREE.Group();root.name='v6.9 landmark split apartment ruin';
  const w=Math.max(10,slot.width||12),d=w*.82,h=Math.max(27,slot.height||36);
  const s={concrete:[],dark:[],steel:[],rust:[],panel:[],glass:[]};
  const gap=w*.18,leftW=w*.42,rightW=w*.34;
  const leftH=h*.92,rightH=h*(.68+hash(slot.x*.17)*.14);
  s.concrete.push(boxGeo([leftW,leftH,d*.90],[-(gap+leftW)*.5,leftH*.5,0]));
  s.concreteDark.push(boxGeo([rightW,rightH,d*.83],[(gap+rightW)*.52,rightH*.5,-d*.04],[0,0,-.018]));
  // central split is dark and deep
  s.dark.push(boxGeo([gap*.85,Math.min(leftH,rightH)*.9,d*.94],[0,Math.min(leftH,rightH)*.45,d*.02]));
  const balconies=mobile?4:7;
  for(let i=0;i<balconies;i++){
    const y=3.6+i*4.1;if(y>leftH*.80)break;
    const bw=leftW*.78,x=-(gap+leftW)*.5,z=d*.49;
    s.concrete.push(boxGeo([bw,.17,.75],[x,y,z]));
    s.steel.push(beamGeo([x-bw*.45,y+.8,z+.30],[x+bw*.45,y+.8,z+.30],.025));
    for(const q of [-.45,0,.45])s.steel.push(beamGeo([x+bw*q,y+.15,z+.30],[x+bw*q,y+.8,z+.30],.021));
    if(i%3===2)s.rust.push(beamGeo([x-bw*.42,y+.12,z+.28],[x+bw*.34,y+.75,z+.35],.035));
  }
  // exposed apartment floor slabs inside split
  const floorN=mobile?4:7;
  for(let i=0;i<floorN;i++){
    const y=2.8+i*3.9;if(y>rightH*.83)break;
    s.concreteDark.push(boxGeo([gap*.95,.15,d*.72],[(hash(i+41)-.5)*gap*.08,y,0],[0,0,(hash(i+45)-.5)*.05]));
  }
  // hanging cladding / laundry rail remnants / ducts
  for(let i=0;i<(mobile?4:9);i++){
    const x=(hash(i+50)-.5)*w*.7,y=h*(.20+hash(i+53)*.55),z=d*.46;
    s.panel.push(boxGeo([.45+hash(i+55)*1.2,.8+hash(i+57)*1.9,.04],[x,y,z],[0,0,(hash(i+59)-.5)*.28]));
  }
  for(let i=0;i<(mobile?4:8);i++){
    const x=(hash(i+90)-.5)*gap*.75,y=h*(.35+hash(i+92)*.45);
    s.rust.push(beamGeo([x,y,d*.32],[x+(hash(i+94)-.5)*.8,y-1.2-hash(i+95)*2.4,d*.56],.04));
  }
  for(const m of [
    merge(s.concrete,mat.concrete,'v6.9 apartment surviving concrete wing'),
    merge(s.concreteDark,mat.concreteDark,'v6.9 apartment exposed split floors'),
    merge(s.dark,mat.interior,'v6.9 apartment deep central rupture'),
    merge(s.steel,mat.steel,'v6.9 apartment balcony rails'),
    merge(s.rust,mat.rust,'v6.9 apartment hanging rebar'),
    merge(s.panel,mat.panel,'v6.9 apartment torn cladding'),
    merge(s.glass,mat.glass,'v6.9 apartment surviving glass',{receive:false})
  ].filter(Boolean))root.add(m);
  return root;
}

function civicShell(slot,mat,mobile){
  const root=new THREE.Group();root.name='v6.9 landmark civic industrial shell';
  const w=Math.max(11,slot.width||13),d=w*.86,h=Math.max(24,slot.height||32);
  const s={concrete:[],dark:[],steel:[],rust:[],panel:[],glass:[]};
  // stepped massing rather than a single tower
  s.concrete.push(boxGeo([w,h*.50,d],[0,h*.25,0]));
  s.concreteDark.push(boxGeo([w*.72,h*.30,d*.74],[-w*.08,h*.65,-d*.04]));
  s.concrete.push(boxGeo([w*.46,h*.18,d*.56],[w*.10,h*.89,-d*.06]));
  // damaged front atrium
  s.dark.push(boxGeo([w*.46,h*.27,.22],[0,h*.29,d*.51]));
  const cols=mobile?3:5;
  for(let i=0;i<cols;i++){
    const x=THREE.MathUtils.lerp(-w*.38,w*.38,i/Math.max(1,cols-1));
    if(i===Math.floor(cols/2))continue;
    s.steel.push(boxGeo([.18,h*.28,.18],[x,h*.30,d*.55]));
  }
  // rooftop plant room + ducts
  const roofY=h*.80;
  s.panel.push(boxGeo([w*.26,2.2,d*.24],[-w*.20,roofY+1.1,-d*.15]));
  const ducts=mobile?3:6;
  for(let i=0;i<ducts;i++){
    const x=-w*.32+i*(w*.64/Math.max(1,ducts-1)),z=-d*.25+(i%2)*d*.20;
    s.steel.push(cylGeo(.16+hash(i+3)*.08,2.2+hash(i+4)*2.0,[x,roofY+1.3,z]));
    s.panel.push(cylGeo(.26,.10,[x,roofY+2.45+hash(i+4)*2.0,z]));
  }
  // broken overhead gantry/crane-like maintenance frame
  const gy=roofY+4.5;
  for(const x of [-w*.30,w*.30])s.rust.push(beamGeo([x,roofY,-d*.28],[x,gy,-d*.28],.07));
  s.steel.push(beamGeo([-w*.30,gy,-d*.28],[w*.35,gy,-d*.28],.075));
  s.rust.push(beamGeo([w*.35,gy,-d*.28],[w*.52,gy-1.8,d*.10],.055));
  // broken service bridge frame on one side
  const by=h*.48;
  s.steel.push(beamGeo([w*.5,by,-d*.28],[w*.5+3.4,by+.4,-d*.28],.065));
  s.steel.push(beamGeo([w*.5,by,d*.28],[w*.5+2.7,by-.2,d*.28],.065));
  s.rust.push(beamGeo([w*.5,by,-d*.28],[w*.5+2.7,by-.2,d*.28],.035));
  for(let i=0;i<(mobile?4:8);i++){
    const x=(hash(i+130)-.5)*w*.80,y=h*(.18+hash(i+133)*.42);
    s.glass.push(boxGeo([.65+hash(i+135)*.8,.9+hash(i+137)*1.1,.025],[x,y,d*.505]));
  }
  for(const m of [
    merge(s.concrete,mat.concrete,'v6.9 civic stepped concrete masses'),
    merge(s.concreteDark,mat.concreteDark,'v6.9 civic damaged upper block'),
    merge(s.dark,mat.interior,'v6.9 civic blown-out atrium'),
    merge(s.steel,mat.steel,'v6.9 civic rooftop plant steel'),
    merge(s.rust,mat.rust,'v6.9 civic broken maintenance frame'),
    merge(s.panel,mat.panel,'v6.9 civic rooftop plant housings'),
    merge(s.glass,mat.glass,'v6.9 civic surviving atrium glass',{receive:false})
  ].filter(Boolean))root.add(m);
  return root;
}

export class PremiumLandmarkRuinsV690{
  constructor(world){
    this.world=world;this.mobile=Boolean(world.isMobile);this.materials=materials();this.entries=[];
    const mids=(world.distantCityPlan||[])
      .filter(s=>s.tier==='mid')
      .sort((a,b)=>Math.hypot(a.x,a.z)-Math.hypot(b.x,b.z));
    const count=this.mobile?2:3;
    const picks=[];
    for(const s of mids){
      if(picks.every(p=>Math.hypot(p.x-s.x,p.z-s.z)>48))picks.push(s);
      if(picks.length>=count)break;
    }
    const builders=[officeCarcass,splitApartment,civicShell];
    for(let i=0;i<picks.length;i++){
      const slot=picks[i],host=world.cityBuildings?.get(slot.id);if(!host)continue;
      const previous=[...host.children];
      for(const c of previous)c.visible=false;
      const landmark=builders[i%builders.length](slot,this.materials,this.mobile);
      host.add(landmark);
      this.entries.push({slot,host,previous,landmark});
    }
    this.stats={landmarks:this.entries.length,distinctArchetypes:Math.min(3,this.entries.length)};
  }
  update(dt,weather={},night=0,game=null){
    const blocked=new Set([...(game?.ambientCollapseIds||[]),...(game?.tornadoDamagedIds||[])]);
    for(const e of this.entries){
      // Destruction systems own the final state. Do not resurrect a landmark
      // once its host has been persisted as collapsed.
      if(blocked.has(e.slot.id))e.landmark.visible=false;
    }
    const wet=Math.max(0,Math.min(1,Number(weather.wet)||0));
    this.materials.glass.opacity=.48+wet*.10;
    this.materials.steel.roughness=.53-wet*.08;
  }
  dispose(){
    for(const e of this.entries){
      e.landmark.traverse(o=>{if(o.isMesh)o.geometry?.dispose?.();});
      e.landmark.parent?.remove(e.landmark);
      for(const c of e.previous)c.visible=true;
    }
    for(const m of Object.values(this.materials))m?.dispose?.();
    this.entries.length=0;
  }
}
