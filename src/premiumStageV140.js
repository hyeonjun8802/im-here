import * as THREE from 'three';
import {premiumSceneBudget} from './presentationPlanV140.js';

// World-space contact occlusion, environmental micro-behaviours and life-station
// lighting. The stage contains zero additional rooftops or city buildings.
function radialAlphaTexture(){
 const c=document.createElement('canvas');c.width=c.height=256;const ctx=c.getContext('2d');
 const g=ctx.createRadialGradient(128,128,4,128,128,122);
 g.addColorStop(0,'rgba(14,17,14,.72)');g.addColorStop(.22,'rgba(18,21,16,.43)');
 g.addColorStop(.56,'rgba(16,20,17,.19)');g.addColorStop(1,'rgba(14,18,17,0)');
 ctx.fillStyle=g;ctx.fillRect(0,0,256,256);const tex=new THREE.CanvasTexture(c);tex.colorSpace=THREE.SRGBColorSpace;return tex;
}
const mat=(c,rough=.8,metal=0)=>new THREE.MeshStandardMaterial({color:c,roughness:rough,metalness:metal});
const rust=mat('#765d48',.73,.42),dark=mat('#313637',.84,.13),glass=new THREE.MeshPhysicalMaterial({color:'#eccb94',metalness:0,roughness:.13,clearcoat:1,transmission:0,transparent:true,opacity:.85}),
 amber=new THREE.MeshStandardMaterial({color:0xffc67a,emissive:'#f9aa54',emissiveIntensity:1.5,roughness:.35});
function add(parent,geo,material,x,y,z,name=''){
 const mesh=new THREE.Mesh(geo,material);mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;mesh.name=name;parent.add(mesh);return mesh;
}
function beam(parent,a,b,r,material){
 const A=new THREE.Vector3(...a),B=new THREE.Vector3(...b),delta=B.clone().sub(A);
 const o=add(parent,new THREE.CylinderGeometry(r,r,delta.length(),9),material,...A.add(B).multiplyScalar(.5).toArray());
 o.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize());return o;
}
function lantern(parent,location){
 const g=new THREE.Group();g.position.set(...location);parent.add(g);g.name='Reclaimed storm lantern, glass lens and wire guard';
 add(g,new THREE.CylinderGeometry(.16,.17,.10,14),dark,0,-.18,0);
 add(g,new THREE.CylinderGeometry(.12,.13,.38,14),glass,0,.025,0);
 add(g,new THREE.CylinderGeometry(.17,.13,.10,14),rust,0,.27,0);
 add(g,new THREE.SphereGeometry(.045,12,9),amber,0,.04,0);
 for(const s of [-1,1])for(const z of [-1,1])beam(g,[s*.12,-.18,z*.12],[s*.12,.27,z*.12],.010,rust);
 const ring=add(g,new THREE.TorusGeometry(.10,.015,6,15),rust,0,.37,0);ring.rotation.x=Math.PI/2;
 const bulb=new THREE.PointLight('#f8b36d',1.0,10,2);bulb.position.y=.06;g.add(bulb);
 return {group:g,bulb};
}
function waterTexture(){
 const c=document.createElement('canvas');c.width=c.height=96;const x=c.getContext('2d');
 const g=x.createRadialGradient(48,48,0,48,48,44);
 g.addColorStop(0,'rgba(205,221,229,.52)');g.addColorStop(.52,'rgba(188,217,232,.16)');g.addColorStop(1,'rgba(189,212,230,0)');
 x.fillStyle=g;x.fillRect(0,0,96,96);return new THREE.CanvasTexture(c);
}
export class PremiumStageV140{
 constructor(world){
  this.world=world;this.group=new THREE.Group();this.group.name='Premium hero-rooftop finishing v1.4';world.scene.add(this.group);
  const budget=premiumSceneBudget(world.isMobile),contactMap=radialAlphaTexture();this.contactMap=contactMap;
  this.shadowMaterial=new THREE.MeshBasicMaterial({map:contactMap,transparent:true,opacity:.58,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1,color:0x18201d});
  const anchors=[
   [-8,-6,8.5,6.0],[16,-13,5.4,4.0],[12,10,5,4],[2,3,3.6,3.6],
   [-13,11,12,4],[-.4,6.8,2.1,2.4],[7.6,7.2,4.3,2.3],[-2.7,-1.8,3.2,2.1],
   [12,-.6,6,5],[-5.5,6.8,3,2],[-14,-13,2.5,2.5],[10,17,2,2],[-18,18,3,2.5],
   [17,12,3,3],[-18,-17,2.5,2.5]
  ].slice(0,budget.contactDecalCount);
  for(const [x,z,rx,rz] of anchors){
   const shadow=add(this.group,new THREE.PlaneGeometry(rx*2,rz*2),this.shadowMaterial,x,world.ROOF_Y+.167,z,'Grounding shadow • physical 3D surface');
   shadow.rotation.x=-Math.PI/2;shadow.castShadow=false;shadow.receiveShadow=false;
  }
  this.survivorShadow=add(this.group,new THREE.PlaneGeometry(3.5,2.75),this.shadowMaterial,0,world.ROOF_Y+.169,0,'Moving survivor contact shadow');
  this.survivorShadow.rotation.x=-Math.PI/2;this.survivorShadow.castShadow=false;
  // These lights physically exist at already-authored life locations.
  this.lanterns=[lantern(this.group,[-10.9,world.ROOF_Y+1.6,-4.5]),lantern(this.group,[6.1,world.ROOF_Y+1.73,7.1]),lantern(this.group,[-2.6,world.ROOF_Y+1.75,-1.6])];
  // Steam is actual translucent 3D quad geometry following the cooking station,
  // not an artificial screen overlay or UI animation.
  const tex=waterTexture();this.steamTex=tex;this.steam=[];
  for(let i=0;i<(world.isMobile?4:8);i++){
   const material=new THREE.MeshBasicMaterial({map:tex,color:0xc2d7d6,transparent:true,opacity:0,depthWrite:false,side:THREE.DoubleSide});
   const puff=add(this.group,new THREE.PlaneGeometry(.65,.65),material,4.9,world.ROOF_Y+1.05,5.9,'Steam from cooking pot');
   puff.castShadow=false;puff.receiveShadow=false;this.steam.push(puff);
  }
  this.time=0;
 }
 update(dt,weather,night){
  dt=Math.min(.075,Math.max(0,dt));this.time+=dt;
  const w=this.world,st=w.life?.stage,a=w.life?.current,cooking=st==='perform'&&a==='cook';
  const intensity=1+night*.9+(weather?.storm||0)*.14;
  for(const [i,obj] of this.lanterns.entries()){
   obj.bulb.intensity=THREE.MathUtils.damp(obj.bulb.intensity,intensity*(.66+.025*Math.sin(this.time*5+i*2)),3,dt);
  }
  this.survivorShadow.position.x=w.survivor.position.x;
  this.survivorShadow.position.z=w.survivor.position.z;
  this.survivorShadow.material.opacity=.44+(weather?.cloud||0)*.1;
  const wind=weather?.wind||0;
  for(let i=0;i<this.steam.length;i++){
   const p=this.steam[i];p.visible=cooking;
   if(!cooking){p.material.opacity=0;continue;}
   const phase=(this.time*.25+i/this.steam.length)%1;
   p.position.set(4.9+wind*phase*1.2, w.ROOF_Y+1.2+phase*2.5, 5.9+Math.sin(this.time*.36+i)*.15);
   p.quaternion.copy(w.camera.quaternion);
   p.scale.setScalar(.65+phase*2.5);
   p.material.opacity=(Math.sin(Math.PI*phase)*.16)*(1-(weather?.rain||0)*.5);
  }
 }
 dispose(){this.contactMap.dispose();this.steamTex.dispose();for(const p of this.steam)p.material.dispose();this.group.parent?.remove(this.group);}
}
