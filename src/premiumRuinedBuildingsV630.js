import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

/**
 * AFTERDAY v6.3 — premium ruined-city fidelity around the playable rooftop.
 *
 * This pass attaches real 3D detail to EXISTING near/mid city holders:
 * recessed window bays, exposed floor plates, concrete spall thickness,
 * rebar, structural columns, rooftop machinery and damaged service hardware.
 *
 * It never creates a second playable roof, never changes city lot positions,
 * and never touches survival/save/weather simulation state. Because every
 * detail group is a child of the existing city holder, permanent tornado
 * destruction automatically hides the intact premium detail with its host.
 */
const TAU=Math.PI*2;
const hash=n=>{const x=Math.sin(n*127.173+19.31)*43758.5453;return x-Math.floor(x);};
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));

function materialSet(){
  const physical=(color,roughness,metalness,extra={})=>new THREE.MeshPhysicalMaterial({
    color,roughness,metalness,envMapIntensity:extra.envMapIntensity??.9,
    clearcoat:extra.clearcoat??0,clearcoatRoughness:extra.clearcoatRoughness??.5,
    ...extra
  });
  return {
    concrete:physical('#6d726e',.91,.015,{envMapIntensity:.58}),
    aggregate:physical('#4f5552',.97,.01,{envMapIntensity:.38}),
    steel:physical('#6b706e',.54,.62,{envMapIntensity:1.15,clearcoat:.05,clearcoatRoughness:.42}),
    rust:physical('#674c42',.76,.43,{envMapIntensity:.78}),
    interior:new THREE.MeshStandardMaterial({color:'#141a1a',roughness:1,metalness:.02}),
    glass:new THREE.MeshPhysicalMaterial({
      color:'#2f4650',roughness:.20,metalness:.14,transparent:true,opacity:.72,
      clearcoat:.58,clearcoatRoughness:.14,envMapIntensity:1.12
    }),
    survivorGlow:new THREE.MeshStandardMaterial({
      color:'#4a3a2c',roughness:.82,metalness:.03,
      emissive:'#d48a4a',emissiveIntensity:.025
    }),
    soot:new THREE.MeshStandardMaterial({color:'#252b2a',roughness:.99,metalness:.01})
  };
}

function transformed(geometry,position=[0,0,0],rotation=[0,0,0],scale=[1,1,1]){
  let g=geometry;
  if(g.index)g=g.toNonIndexed();
  const e=new THREE.Euler(...rotation),q=new THREE.Quaternion().setFromEuler(e);
  const m=new THREE.Matrix4().compose(new THREE.Vector3(...position),q,new THREE.Vector3(...scale));
  g.applyMatrix4(m);
  return g;
}
function boxGeometry(size,position,rotation=[0,0,0]){
  return transformed(new THREE.BoxGeometry(...size),position,rotation);
}
function cylinderGeometry(radius,height,position,rotation=[0,0,0],segments=8){
  return transformed(new THREE.CylinderGeometry(radius,radius,height,segments),position,rotation);
}
function segmentGeometry(a,b,radius,segments=7){
  const A=new THREE.Vector3(...a),B=new THREE.Vector3(...b),mid=A.clone().add(B).multiplyScalar(.5);
  const delta=B.clone().sub(A),q=new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),delta.clone().normalize());
  let g=new THREE.CylinderGeometry(radius,radius,delta.length(),segments);
  if(g.index)g=g.toNonIndexed();
  g.applyMatrix4(new THREE.Matrix4().compose(mid,q,new THREE.Vector3(1,1,1)));
  return g;
}
function mergeLayer(geometries,material,name,{cast=false,receive=true}={}){
  if(!geometries.length)return null;
  const geometry=mergeGeometries(geometries,false);
  for(const g of geometries)g.dispose();
  if(!geometry)return null;
  geometry.computeBoundingBox();geometry.computeBoundingSphere();
  const mesh=new THREE.Mesh(geometry,material);mesh.name=name;
  mesh.castShadow=cast;mesh.receiveShadow=receive;return mesh;
}

function faceTransform(face,u,y,offset,w,d){
  if(face===0)return {p:[u,y,d*.5+offset],r:[0,0,0]};
  if(face===1)return {p:[w*.5+offset,y,-u],r:[0,Math.PI*.5,0]};
  if(face===2)return {p:[-u,y,-d*.5-offset],r:[0,Math.PI,0]};
  return {p:[-w*.5-offset,y,u],r:[0,-Math.PI*.5,0]};
}
function addFacadeRect(store,face,u,y,size,depth,w,d,offset=.03,tilt=0){
  const t=faceTransform(face,u,y,offset,w,d);
  store.push(boxGeometry([size[0],size[1],depth],t.p,[tilt,t.r[1],0]));
}
function addFacadeSlab(store,face,u,y,width,projection,w,d){
  const t=faceTransform(face,u,y,projection*.26,w,d);
  store.push(boxGeometry([width,.22,projection],t.p,[0,t.r[1],0]));
}
function addFaceBeam(store,face,u,y,len,thickness,w,d,offset=.09){
  const t=faceTransform(face,u,y,offset,w,d);
  store.push(boxGeometry([len,thickness,.12],t.p,[0,t.r[1],0]));
}

function makeDetailedRuin(slot,materials,{mobile=false}={}){
  const w=slot.width,d=slot.width*.82,h=slot.height,seed=slot.modelIndex*13+slot.width*7+slot.height;
  const group=new THREE.Group();group.name='AFTERDAY v6.3 detailed ruin · '+slot.id;

  const concrete=[],aggregate=[],steel=[],rust=[],interior=[],glass=[],glow=[],soot=[];
  const highDetail=slot.tier==='near';
  const faces=mobile?(highDetail?2:1):(highDetail?4:2);
  const levelH=4.15;
  const levels=Math.max(4,Math.floor(h/levelH));
  const startFace=Math.floor(hash(seed+9)*4);

  // Recessed window bays: dark depth + raised structural mullions.
  for(let f=0;f<faces;f++){
    const face=(startFace+f)%4,faceWidth=(face%2===0?w:d);
    const columns=highDetail?(mobile?3:4):3;
    const visibleLevels=highDetail?Math.min(levels-1,mobile?5:7):Math.min(levels-1,4);
    for(let row=1;row<=visibleLevels;row++){
      const y=2.0+row*levelH;
      if(y>h*.82)continue;
      for(let col=0;col<columns;col++){
        const q=seed+f*101+row*17+col*31;
        if(hash(q)>.84)continue;
        const spacing=faceWidth/(columns+.65);
        const u=(col-(columns-1)/2)*spacing*.90+(hash(q+4)-.5)*.18;
        const bayW=Math.min(2.15,spacing*.64),bayH=1.72+hash(q+6)*.32;
        const broken=hash(q+11)>.57;
        addFacadeRect(broken?interior:glass,face,u,y,[bayW,broken?bayH:bayH*.94],broken?.22:.08,w,d,.055);
        if(!broken&&hash(q+15)>.72){
          addFacadeRect(glow,face,u,y,[bayW*.72,bayH*.72],.035,w,d,.105);
        }
        // Window heads/sills and side jambs give the facade real thickness.
        addFaceBeam(concrete,face,u,y+bayH*.55,bayW+.28,.13,w,d,.11);
        addFaceBeam(concrete,face,u,y-bayH*.55,bayW+.28,.12,w,d,.11);
        for(const side of [-1,1]){
          const jt=faceTransform(face,u+side*(bayW*.5+.10),y,.11,w,d);
          concrete.push(boxGeometry([.13,bayH+.25,.13],jt.p,[0,jt.r[1],0]));
        }
        if(broken&&highDetail){
          const fragments=mobile?1:2;
          for(let k=0;k<fragments;k++){
            const ft=faceTransform(face,u+(hash(q+k+40)-.5)*bayW*.9,y+(hash(q+k+43)-.5)*bayH*.65,.20,w,d);
            aggregate.push(boxGeometry([
              .25+hash(q+k+45)*.55,.20+hash(q+k+47)*.56,.18+hash(q+k+49)*.22
            ],ft.p,[(hash(q+k+3)-.5)*.6,ft.r[1]+(hash(q+k+5)-.5)*.4,(hash(q+k+7)-.5)*.5]));
          }
        }
      }
    }
  }

  // One hero damage zone per nearby building: exposed interior, slabs and rebar.
  const damageFace=(startFace+Math.floor(hash(seed+77)*faces))%4;
  const damageFaceWidth=damageFace%2===0?w:d;
  const cavityW=clamp(damageFaceWidth*(.35+hash(seed+31)*.18),4.2,8.6);
  const cavityH=clamp(h*(.20+hash(seed+34)*.10),5.6,10.5);
  const cavityY=clamp(h*(.48+hash(seed+36)*.20),cavityH*.65,h-cavityH*.7);
  addFacadeRect(interior,damageFace,(hash(seed+32)-.5)*damageFaceWidth*.24,cavityY,[cavityW,cavityH],.34,w,d,.14,(hash(seed+41)-.5)*.025);

  const slabCount=mobile?2:3;
  for(let i=0;i<slabCount;i++){
    const y=cavityY-cavityH*.38+i*(cavityH*.76/Math.max(1,slabCount-1));
    addFacadeSlab(concrete,damageFace,(hash(seed+i+60)-.5)*.30,y,cavityW*.90,1.10+hash(seed+i+70)*.55,w,d);
    const u=(hash(seed+i+80)-.5)*cavityW*.55;
    const t=faceTransform(damageFace,u,y+.52,1.0,w,d);
    // Horizontal rebar projects toward the camera from the damaged cavity.
    const dir=new THREE.Vector3(0,0,1).applyEuler(new THREE.Euler(0,t.r[1],0));
    const start=new THREE.Vector3(...t.p).addScaledVector(dir,-.45);
    const end=start.clone().addScaledVector(dir,.95+hash(seed+i+83)*.85);
    steel.push(segmentGeometry(start.toArray(),end.toArray(),.045+hash(seed+i+85)*.025,6));
  }

  // Broken columns at cavity edges.
  for(const side of [-1,1]){
    const u=side*cavityW*.44;
    const t=faceTransform(damageFace,u,cavityY,.58,w,d);
    const pieceH=cavityH*(.74+hash(seed+side+99)*.18);
    concrete.push(boxGeometry([.34,pieceH,.38],t.p,[0,t.r[1],(hash(seed+side+101)-.5)*.07]));
    if(highDetail&&!mobile){
      const tip=faceTransform(damageFace,u,cavityY+pieceH*.47,.78,w,d);
      rust.push(cylinderGeometry(.055,1.35,tip.p,[Math.PI*.5,tip.r[1],(hash(seed+side+107)-.5)*.35],7));
    }
  }

  // Fire/impact staining around the main cavity, geometry offset prevents z-fight.
  for(let i=0;i<(mobile?2:4);i++){
    const u=(hash(seed+201+i)-.5)*cavityW*.78;
    const y=cavityY+(hash(seed+211+i)-.5)*cavityH*.75;
    const t=faceTransform(damageFace,u,y,.19,w,d);
    soot.push(boxGeometry([.65+hash(seed+i)*1.05,1.0+hash(seed+i+4)*2.0,.025],t.p,[0,t.r[1],(hash(seed+i+8)-.5)*.22]));
  }

  // Rooftop silhouette: low mechanical masses, snapped rail, tank and vent stacks.
  const roofY=h*.94;
  const stairW=Math.min(4.2,w*.30),stairD=Math.min(3.2,d*.30);
  concrete.push(boxGeometry([stairW,2.2,stairD],[(hash(seed+401)-.5)*w*.28,roofY+1.1,(hash(seed+403)-.5)*d*.25],[0,0,0]));
  const ventCount=mobile?1:2;
  for(let i=0;i<ventCount;i++){
    const x=(hash(seed+420+i)-.5)*w*.52,z=(hash(seed+430+i)-.5)*d*.52;
    steel.push(cylinderGeometry(.22+hash(seed+i)*.09,1.4+hash(seed+i+8)*1.0,[x,roofY+.75,z],[0,0,0],10));
    const capY=roofY+1.45+hash(seed+i+8)*1.0;
    steel.push(cylinderGeometry(.34,.12,[x,capY,z],[0,0,0],12));
  }
  if(highDetail&&(!mobile||hash(seed+450)>.35)){
    const tx=(hash(seed+451)-.5)*w*.35,tz=(hash(seed+452)-.5)*d*.32;
    rust.push(cylinderGeometry(.78,1.35,[tx,roofY+.83,tz],[0,0,0],16));
    steel.push(cylinderGeometry(.10,2.2,[tx,roofY+.90,tz],[0,0,0],7));
  }

  // Bent perimeter steel and parapet chunks.
  const railSegments=mobile?3:6;
  for(let i=0;i<railSegments;i++){
    const side=i%4,u=(hash(seed+500+i)-.5)*(side%2===0?w:d)*.72;
    const t=faceTransform(side,u,roofY+.55,.04,w,d);
    const len=1.0+hash(seed+510+i)*2.1;
    rust.push(boxGeometry([len,.13,.12],t.p,[0,t.r[1],(hash(seed+520+i)-.5)*.35]));
  }

  const layers=[
    mergeLayer(concrete,materials.concrete,'v6.3 concrete shells and exposed slabs',{receive:true}),
    mergeLayer(aggregate,materials.aggregate,'v6.3 broken aggregate and edge chunks',{receive:true}),
    mergeLayer(steel,materials.steel,'v6.3 exposed structural steel and rebar',{receive:true}),
    mergeLayer(rust,materials.rust,'v6.3 oxidized rooftop hardware',{receive:true}),
    mergeLayer(interior,materials.interior,'v6.3 deep blown-out interiors',{receive:true}),
    mergeLayer(glass,materials.glass,'v6.3 surviving dirty window glass',{receive:true}),
    mergeLayer(glow,materials.survivorGlow,'v6.3 sparse abandoned-city warm windows',{receive:false}),
    mergeLayer(soot,materials.soot,'v6.3 fire and blast staining',{receive:false})
  ].filter(Boolean);
  for(const mesh of layers)group.add(mesh);
  group.userData.premiumRuinStats={
    meshes:layers.length,highDetail,faces,levels,
    cavity:true,roofHardware:true,hostId:slot.id
  };
  return group;
}

export class PremiumRuinedCityV630{
  constructor(world){
    this.world=world;this.materials=materialSet();this.groups=[];this.time=0;
    const near=world.distantCityPlan.filter(s=>s.tier==='near');
    const mid=world.distantCityPlan.filter(s=>s.tier==='mid');
    const midBudget=world.isMobile?Math.min(4,mid.length):Math.min(10,mid.length);
    const selected=[
      ...near,
      ...mid.filter((_,i)=>i%Math.max(1,Math.floor(mid.length/Math.max(1,midBudget)))===0).slice(0,midBudget)
    ];
    for(const slot of selected){
      const host=world.cityBuildings?.get(slot.id);
      if(!host)continue;
      const detail=makeDetailedRuin(slot,this.materials,{mobile:world.isMobile});
      host.add(detail);this.groups.push(detail);
    }
    this.stats={
      detailedBuildings:this.groups.length,
      nearBuildings:near.length,
      midLandmarks:Math.max(0,this.groups.length-near.length),
      attachedToExistingHosts:true
    };
  }

  update(dt,weather={},night=0){
    this.time+=Math.min(.08,Math.max(0,dt||0));
    const n=clamp(Number(night)||0,0,1),storm=clamp(Number(weather.storm)||0,0,1);
    // Nearly abandoned city: only a few windows retain a faint, non-gameplay glow.
    this.materials.survivorGlow.emissiveIntensity=.018+n*.095+storm*.018;
    this.materials.glass.opacity=.70-storm*.10;
    this.materials.glass.envMapIntensity=.92+(Number(weather.wet)||0)*.42+n*.12;
  }

  dispose(){
    for(const group of this.groups){
      group.traverse(o=>{if(o.isMesh)o.geometry?.dispose?.();});
      group.parent?.remove(group);
    }
    for(const m of Object.values(this.materials))m.dispose?.();
    this.groups.length=0;
  }
}
