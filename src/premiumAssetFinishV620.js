import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';

/**
 * AFTERDAY v6.2 — premium asset / lighting finish.
 *
 * Goal: raise the existing rooftop game's material response, silhouette quality,
 * contact detail and practical-light readability without changing gameplay,
 * save data, city layout, weather logic, camera controls or the one-rooftop concept.
 *
 * Everything here is original procedural Three.js geometry attached to existing
 * rooftop anchors. Mobile uses a deliberately reduced detail budget.
 */
const clamp01=v=>Math.max(0,Math.min(1,Number(v)||0));
const hash=n=>{const x=Math.sin(n*127.19+17.73)*43758.5453;return x-Math.floor(x);};

function physical(color,{roughness=.7,metalness=0,clearcoat=0,clearcoatRoughness=.45,envMapIntensity=1}={}){
  return new THREE.MeshPhysicalMaterial({
    color,roughness,metalness,clearcoat,clearcoatRoughness,envMapIntensity
  });
}
const MAT={
  paintedMetal:physical('#555d5d',{roughness:.48,metalness:.58,clearcoat:.18,clearcoatRoughness:.52,envMapIntensity:1.18}),
  bareSteel:physical('#7b807d',{roughness:.34,metalness:.78,clearcoat:.08,clearcoatRoughness:.42,envMapIntensity:1.32}),
  oxidized:physical('#735246',{roughness:.73,metalness:.40,clearcoat:.05,clearcoatRoughness:.68,envMapIntensity:.92}),
  rubber:physical('#202525',{roughness:.88,metalness:.02,envMapIntensity:.45}),
  canvas:physical('#5e6255',{roughness:.91,metalness:.01,envMapIntensity:.52}),
  webbing:physical('#6f684f',{roughness:.96,metalness:0,envMapIntensity:.38}),
  wood:physical('#574536',{roughness:.87,metalness:.02,clearcoat:.03,envMapIntensity:.62}),
  concrete:physical('#737770',{roughness:.93,metalness:.01,envMapIntensity:.48}),
  glass:new THREE.MeshPhysicalMaterial({
    color:'#8fa5ad',roughness:.12,metalness:.04,transmission:.04,transparent:true,
    opacity:.72,clearcoat:1,clearcoatRoughness:.08,envMapIntensity:1.35
  }),
  lamp:new THREE.MeshStandardMaterial({
    color:'#ffd19a',emissive:'#ff9e45',emissiveIntensity:4.2,roughness:.26,metalness:0
  }),
  dark:new THREE.MeshStandardMaterial({color:'#252b2b',roughness:.82,metalness:.24})
};

function rounded(size,material,radius=.10,segments=3){
  const [x,y,z]=size;
  const geo=new RoundedBoxGeometry(x,y,z,segments,Math.min(radius,x*.18,y*.18,z*.18));
  const mesh=new THREE.Mesh(geo,material);
  mesh.castShadow=true;mesh.receiveShadow=true;
  return mesh;
}
function cylinder(r,h,material,segments=16){
  const mesh=new THREE.Mesh(new THREE.CylinderGeometry(r,r,h,segments),material);
  mesh.castShadow=true;mesh.receiveShadow=true;return mesh;
}
function beam(a,b,r,material,segments=8){
  const A=new THREE.Vector3(...a),B=new THREE.Vector3(...b),d=B.clone().sub(A);
  const mesh=new THREE.Mesh(new THREE.CylinderGeometry(r,r,d.length(),segments),material);
  mesh.position.copy(A).add(B).multiplyScalar(.5);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),d.normalize());
  mesh.castShadow=true;mesh.receiveShadow=true;return mesh;
}
function bolt(material=MAT.bareSteel,scale=1){
  const g=new THREE.Group();
  const head=cylinder(.07*scale,.045*scale,material,10);head.rotation.x=Math.PI/2;g.add(head);
  const slot=rounded([.075*scale,.012*scale,.018*scale],MAT.dark,.004,2);slot.position.z=.026*scale;g.add(slot);
  return g;
}
function addBolts(parent,size,offset=[0,0,0],count=4,scale=1){
  const [sx,sy,sz]=size;
  const points=[
    [-sx*.42, sy*.42, sz*.51],[ sx*.42, sy*.42, sz*.51],
    [-sx*.42,-sy*.42, sz*.51],[ sx*.42,-sy*.42, sz*.51]
  ];
  for(let i=0;i<Math.min(count,points.length);i++){
    const p=bolt(MAT.bareSteel,scale);p.position.set(points[i][0]+offset[0],points[i][1]+offset[1],points[i][2]+offset[2]);parent.add(p);
  }
}
function makePremiumCrate(seed=1){
  const g=new THREE.Group();g.name='v6.2 premium beveled supply crate';
  const base=rounded([1.55,.92,1.12],seed%2?MAT.wood:MAT.paintedMetal,.09,4);g.add(base);
  for(const x of [-.68,.68])for(const z of [-.47,.47]){
    const edge=rounded([.09,.98,.09],MAT.bareSteel,.018,2);edge.position.set(x,0,z);g.add(edge);
  }
  for(const y of [-.36,.36]){
    const band=rounded([1.58,.075,1.15],MAT.oxidized,.018,2);band.position.y=y;g.add(band);
  }
  const handle=new THREE.Group();handle.position.set(0,.03,.59);g.add(handle);
  const grip=beam([-.28,.03,0],[.28,.03,0],.035,MAT.bareSteel,10);handle.add(grip);
  handle.add(beam([-.28,-.17,0],[-.28,.03,0],.03,MAT.oxidized,8));
  handle.add(beam([.28,-.17,0],[.28,.03,0],.03,MAT.oxidized,8));
  addBolts(g,[1.55,.92,1.12],[0,0,0],4,.72);
  const label=rounded([.58,.30,.022],MAT.canvas,.018,2);label.position.set(.34,.05,.575);g.add(label);
  return g;
}
function makeBatteryBank(){
  const g=new THREE.Group();g.name='v6.2 premium battery bank';
  const frame=rounded([2.3,1.22,.92],MAT.paintedMetal,.12,4);g.add(frame);
  for(let i=0;i<4;i++){
    const cell=rounded([.43,.84,.72],i%2?MAT.dark:MAT.oxidized,.06,3);
    cell.position.set(-.78+i*.52,0,.08);g.add(cell);
    for(const sx of [-1,1]){
      const terminal=cylinder(.035,.08,MAT.bareSteel,10);terminal.rotation.x=Math.PI/2;
      terminal.position.set(cell.position.x+sx*.11,.35,.48);g.add(terminal);
    }
  }
  const panel=rounded([.62,.36,.035],MAT.dark,.035,3);panel.position.set(.72,.21,.48);g.add(panel);
  for(let i=0;i<3;i++){
    const led=new THREE.Mesh(new THREE.SphereGeometry(.035,10,8),new THREE.MeshStandardMaterial({
      color:i===0?'#d9b064':'#657b68',emissive:i===0?'#ff9f42':'#5f7f65',emissiveIntensity:i===0?1.5:.35,roughness:.4
    }));
    led.position.set(.52+i*.15,.23,.505);g.add(led);
  }
  addBolts(g,[2.3,1.22,.92],[0,0,0],4,.7);return g;
}
function makeToolCase(){
  const g=new THREE.Group();g.name='v6.2 premium field tool case';
  const body=rounded([1.18,.48,.76],MAT.paintedMetal,.10,4);g.add(body);
  const lid=rounded([1.20,.13,.78],MAT.oxidized,.08,4);lid.position.y=.29;g.add(lid);
  const handle=beam([-.18,.40,.0],[.18,.40,.0],.035,MAT.rubber,10);g.add(handle);
  for(const x of [-.35,.35]){const latch=rounded([.14,.20,.045],MAT.bareSteel,.02,2);latch.position.set(x,.17,.40);g.add(latch);}
  return g;
}
function makeFuelCan(seed=1){
  const g=new THREE.Group();g.name='v6.2 premium jerry can';
  const body=rounded([.62,.94,.30],seed%2?MAT.oxidized:MAT.paintedMetal,.07,4);g.add(body);
  const recess=rounded([.39,.47,.025],MAT.dark,.035,3);recess.position.z=.165;g.add(recess);
  const top=beam([-.18,.60,0],[.18,.60,0],.045,MAT.bareSteel,10);g.add(top);
  const neck=cylinder(.075,.12,MAT.bareSteel,12);neck.position.set(.20,.51,0);g.add(neck);
  return g;
}
function makeLamp(){
  const g=new THREE.Group();g.name='v6.2 practical work light';
  const cage=cylinder(.22,.36,MAT.glass,16);g.add(cage);
  const cap=cylinder(.24,.09,MAT.oxidized,16);cap.position.y=.22;g.add(cap);
  const foot=cylinder(.24,.08,MAT.dark,16);foot.position.y=-.22;g.add(foot);
  const bulb=new THREE.Mesh(new THREE.SphereGeometry(.07,16,10),MAT.lamp);g.add(bulb);
  for(let i=0;i<4;i++){
    const a=i*Math.PI/2;
    const x=Math.cos(a)*.18,z=Math.sin(a)*.18;
    g.add(beam([x,-.18,z],[x,.18,z],.012,MAT.bareSteel,6));
  }
  return g;
}
function makeCableReel(){
  const g=new THREE.Group();g.name='v6.2 premium cable reel';
  for(const x of [-.34,.34]){
    const side=cylinder(.54,.10,MAT.wood,20);side.rotation.z=Math.PI/2;side.position.x=x;g.add(side);
  }
  const hub=cylinder(.24,.72,MAT.oxidized,16);hub.rotation.z=Math.PI/2;g.add(hub);
  for(let i=0;i<5;i++){
    const wire=new THREE.Mesh(new THREE.TorusGeometry(.31+i*.023,.018,8,28),MAT.rubber);
    wire.rotation.y=Math.PI/2;wire.position.x=.10;g.add(wire);
  }
  return g;
}
function addContactPatch(parent,x,z,rx,rz,opacity=.20){
  const c=document.createElement('canvas');c.width=c.height=128;
  const ctx=c.getContext('2d'),grad=ctx.createRadialGradient(64,64,3,64,64,62);
  grad.addColorStop(0,'rgba(14,18,18,.72)');grad.addColorStop(.45,'rgba(26,30,28,.26)');grad.addColorStop(1,'rgba(30,32,29,0)');
  ctx.fillStyle=grad;ctx.fillRect(0,0,128,128);
  const tex=new THREE.CanvasTexture(c);tex.colorSpace=THREE.SRGBColorSpace;
  const mat=new THREE.MeshBasicMaterial({map:tex,transparent:true,opacity,depthWrite:false,color:'#1b201e',polygonOffset:true,polygonOffsetFactor:-2});
  const m=new THREE.Mesh(new THREE.PlaneGeometry(rx,rz),mat);m.rotation.x=-Math.PI/2;m.position.set(x,.176,z);m.renderOrder=5;parent.add(m);
  return {mesh:m,texture:tex,material:mat};
}

export class PremiumAssetFinishV620{
  constructor(world){
    this.world=world;this.time=0;this.group=new THREE.Group();
    this.group.name='AFTERDAY v6.2 premium object fidelity pass';
    this.group.position.y=world.ROOF_Y;world.scene.add(this.group);
    this.contacts=[];this.dynamicMaterials=[];
    this.addStorageCluster();
    this.addWorkbenchCluster();
    this.addUtilityCluster();
    this.addFireRingDetail();
    this.addPracticalLighting();
    this.applySceneMaterialResponse();
    this.configureLighting();
  }

  addStorageCluster(){
    const anchor=new THREE.Group();anchor.position.set(11.5,.55,12.0);anchor.rotation.y=-.18;this.group.add(anchor);
    const count=this.world.isMobile?3:6;
    for(let i=0;i<count;i++){
      const c=makePremiumCrate(i+1);
      c.position.set((i%3)*1.55-1.45,Math.floor(i/3)*.95,(Math.floor(i/3))*-.48);
      c.rotation.y=(hash(i+4)-.5)*.18;anchor.add(c);
    }
    const reel=makeCableReel();reel.position.set(-2.25,.18,-.55);reel.rotation.z=.05;anchor.add(reel);
    this.contacts.push(addContactPatch(this.group,11.8,.18+12.0,7.0,4.4,.22));
  }

  addWorkbenchCluster(){
    const g=new THREE.Group();g.position.set(4.3,.62,-11.2);g.rotation.y=.03;this.group.add(g);
    const battery=makeBatteryBank();battery.position.set(0,0,0);g.add(battery);
    const tools=makeToolCase();tools.position.set(-1.65,.18,.25);tools.rotation.y=-.2;g.add(tools);
    const cans=this.world.isMobile?2:4;
    for(let i=0;i<cans;i++){
      const can=makeFuelCan(i);can.position.set(1.65+i*.68,.12,(i%2)*.45-.25);can.rotation.y=(hash(i+2)-.5)*.3;g.add(can);
    }
    const cableMat=MAT.rubber;
    const cable=new THREE.CatmullRomCurve3([
      new THREE.Vector3(.8,.08,.42),new THREE.Vector3(1.6,.04,.9),
      new THREE.Vector3(2.5,.06,.72),new THREE.Vector3(3.15,.10,.15)
    ]);
    const cableMesh=new THREE.Mesh(new THREE.TubeGeometry(cable,28,.035,7,false),cableMat);cableMesh.receiveShadow=true;g.add(cableMesh);
    this.contacts.push(addContactPatch(this.group,4.6,-11.0,8.4,4.4,.19));
  }

  addUtilityCluster(){
    const g=new THREE.Group();g.position.set(16.4,.45,-10.3);this.group.add(g);
    const rack=rounded([2.65,.20,1.15],MAT.bareSteel,.055,3);rack.position.y=.15;g.add(rack);
    for(const x of [-1.12,1.12])for(const z of [-.43,.43]){
      const leg=rounded([.12,.85,.12],MAT.oxidized,.02,2);leg.position.set(x,-.25,z);g.add(leg);
    }
    for(let i=0;i<(this.world.isMobile?2:3);i++){
      const bottle=cylinder(.22,1.10,MAT.paintedMetal,18);bottle.position.set(-.7+i*.7,.83,0);g.add(bottle);
      const neck=cylinder(.08,.18,MAT.bareSteel,12);neck.position.set(-.7+i*.7,1.47,0);g.add(neck);
      const ring=new THREE.Mesh(new THREE.TorusGeometry(.23,.028,8,24),MAT.oxidized);ring.rotation.x=Math.PI/2;ring.position.set(-.7+i*.7,.48,0);g.add(ring);
    }
    this.contacts.push(addContactPatch(this.group,16.4,-10.3,4.9,3.5,.18));
  }

  addFireRingDetail(){
    const g=new THREE.Group();g.position.set(2,.22,3);this.group.add(g);
    for(let i=0;i<10;i++){
      const a=i*Math.PI*2/10,r=1.14;
      const stone=new THREE.Mesh(new THREE.DodecahedronGeometry(.30,1),i%3?MAT.concrete:MAT.oxidized);
      stone.position.set(Math.cos(a)*r,.20,Math.sin(a)*r);stone.scale.set(1.16,.58,1);
      stone.rotation.set((hash(i)-.5)*.25,a,(hash(i+7)-.5)*.18);stone.castShadow=true;stone.receiveShadow=true;g.add(stone);
    }
    for(let i=0;i<5;i++){
      const log=rounded([1.55,.17,.17],MAT.wood,.06,3);log.position.set(0,.31+i*.05,0);log.rotation.y=(i%2?.68:-.68)+(hash(i)*.13);g.add(log);
    }
  }

  addPracticalLighting(){
    const positions=[[-10.2,2.0,-4.8],[5.8,2.1,7.2],[-2.5,2.0,-1.5]];
    this.practical=[];
    const count=this.world.isMobile?2:positions.length;
    for(let i=0;i<count;i++){
      const lamp=makeLamp();lamp.position.set(...positions[i]);this.group.add(lamp);
      const light=new THREE.PointLight('#ffb36a',this.world.isMobile?1.4:2.6,11,2.0);
      light.position.copy(lamp.position);light.position.y+=.02;
      light.castShadow=!this.world.isMobile&&i===0;
      if(light.castShadow){light.shadow.mapSize.set(768,768);light.shadow.bias=-.0004;light.shadow.normalBias=.03;}
      this.group.add(light);this.practical.push(light);
    }
  }

  applySceneMaterialResponse(){
    const mobile=this.world.isMobile,seen=new Set();
    this.world.scene.traverse(o=>{
      if(!o.isMesh||!o.material)return;
      const mats=Array.isArray(o.material)?o.material:[o.material];
      for(const m of mats){
        if(!m||seen.has(m)||(!m.isMeshStandardMaterial&&!m.isMeshPhysicalMaterial))continue;
        seen.add(m);
        const name=((o.name||'')+' '+(m.name||'')).toLowerCase();
        if(/leaf|plant|foliage|moss/.test(name)){m.envMapIntensity=.48;}
        else if(/tarp|canvas|cloth|fabric|coat|blanket/.test(name)){m.envMapIntensity=.55;m.roughness=Math.max(.76,m.roughness);}
        else if(/glass|window|lens/.test(name)){m.envMapIntensity=1.30;m.roughness=Math.min(.38,Math.max(.10,m.roughness));}
        else if(/metal|steel|iron|rust|tank|pipe|wire|antenna|generator/.test(name)){m.envMapIntensity=mobile?.95:1.25;m.roughness=Math.max(.28,Math.min(.84,m.roughness));}
        else {m.envMapIntensity=mobile?.68:.88;}
        if(m.isMeshPhysicalMaterial&&/metal|steel|tank|generator/.test(name)){m.clearcoat=Math.max(m.clearcoat||0,.08);m.clearcoatRoughness=Math.max(.28,m.clearcoatRoughness||.28);}
        m.needsUpdate=true;
      }
    });
  }

  configureLighting(){
    const w=this.world;
    // Preserve the existing solar system; only tighten the hero-roof light quality.
    if(!w.isMobile){
      w.sun.shadow.mapSize.set(4096,4096);
      Object.assign(w.sun.shadow.camera,{left:-51,right:51,top:51,bottom:-51,far:175});
      w.sun.shadow.bias=-.00015;w.sun.shadow.normalBias=.021;
    }
    this.coolBounce=new THREE.DirectionalLight('#91abc0',w.isMobile?.18:.30);
    this.coolBounce.position.set(-28,22,34);this.coolBounce.target.position.set(0,w.ROOF_Y+2,0);
    w.scene.add(this.coolBounce,this.coolBounce.target);
    this.warmBounce=new THREE.PointLight('#d98243',w.isMobile?.60:1.05,24,2);
    this.warmBounce.position.set(2,w.ROOF_Y+1.8,3);w.scene.add(this.warmBounce);
  }

  update(dt,weather={},night=0){
    this.time+=Math.min(.08,Math.max(0,dt||0));
    const wet=clamp01(weather.wet||0),storm=clamp01(weather.storm||0),n=clamp01(night);
    this.coolBounce.intensity=(this.world.isMobile?.16:.28)+storm*.16+n*.10;
    this.warmBounce.intensity=(this.world.isMobile?.48:.88)+n*.65+storm*.12;
    this.warmBounce.distance=22+n*5;
    for(let i=0;i<this.practical.length;i++){
      const base=this.world.isMobile?1.25:2.25;
      this.practical[i].intensity=base*(.65+n*.95+storm*.18)*(1+.025*Math.sin(this.time*5.7+i*1.9));
    }
    for(const c of this.contacts)c.mesh.material.opacity=(.16+wet*.10+n*.035);
  }

  setQuality(low,balanced=false){
    if(!this.world.sun)return;
    const mobile=this.world.isMobile||low;
    const size=mobile?1024:balanced?2048:4096;
    if(this.world.sun.shadow.mapSize.x!==size||this.world.sun.shadow.mapSize.y!==size){
      this.world.sun.shadow.mapSize.set(size,size);
      this.world.sun.shadow.map?.dispose();this.world.sun.shadow.map=null;
    }
    // The one extra practical-light shadow is only needed in HIGH mode.
    for(const l of this.practical)l.castShadow=!mobile&&!balanced&&l===this.practical[0];
  }

  dispose(){
    const w=this.world;
    w.scene.remove(this.coolBounce,this.coolBounce.target,this.warmBounce);
    this.group.traverse(o=>{
      if(o.isMesh){
        o.geometry?.dispose?.();
        const mats=Array.isArray(o.material)?o.material:[o.material];
        for(const m of mats)m?.dispose?.();
      }
    });
    for(const c of this.contacts)c.texture?.dispose?.();
    this.group.parent?.remove(this.group);
  }
}
