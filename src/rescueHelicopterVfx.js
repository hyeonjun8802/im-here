/** AFTERDAY v5.2 — physically staged single-rooftop aid drop.
 * The existing radio simulation exclusively owns the single inventory award.
 * This module only animates a helicopter, suspended crate, canopy, drop shadow
 * and rooftop dust; saved news IDs prevent replay on reload.
 */
import * as THREE from 'three';

const clamp01=x=>THREE.MathUtils.clamp(Number(x)||0,0,1);
const smooth=x=>{const t=clamp01(x);return t*t*(3-2*t);};
export const RESCUE_DROP_START=6.3;
export const RESCUE_DROP_END=14.0;
export const RESCUE_EXIT=18.0;
export function flightPosition(t,roofY){
 const k=clamp01(t/RESCUE_EXIT);
 return new THREE.Vector3(-90+180*k,roofY+40+Math.sin(t*.45)*.9,-9+Math.sin(t*.28)*2.4);
}
export function parachutePosition(t,roofY){
 const p=smooth((t-RESCUE_DROP_START)/(RESCUE_DROP_END-RESCUE_DROP_START));
 // Begin exactly below the aircraft at release; wind carries the one supply
 // crate to the original playable roof, bounded within the parapet.
 const origin=flightPosition(RESCUE_DROP_START,roofY);
 const start=new THREE.Vector3(origin.x,roofY+37,origin.z);
 const target=new THREE.Vector3(8,roofY+.98,9);
 return start.lerp(target,p);
}
const bodyMat=new THREE.MeshStandardMaterial({color:'#4f5d54',metalness:.34,roughness:.62});
const stripeMat=new THREE.MeshStandardMaterial({color:'#afb9a9',metalness:.27,roughness:.62});
const glassMat=new THREE.MeshStandardMaterial({color:'#273c43',metalness:.4,roughness:.19,transparent:true,opacity:.88});
const bladeMat=new THREE.MeshStandardMaterial({color:'#283037',metalness:.31,roughness:.54});
const crateMat=new THREE.MeshStandardMaterial({color:'#967c54',roughness:.82});
const clothMat=new THREE.MeshStandardMaterial({color:'#a8b9a4',side:THREE.DoubleSide,roughness:.92});
const cableMat=new THREE.MeshStandardMaterial({color:'#b0a99b',roughness:.86});
function mesh(parent,geometry,material,position){
 const m=new THREE.Mesh(geometry,material);m.position.set(...position);
 m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;
}
export class RescueHelicopterVfx {
 constructor(scene,roofY,{mobile=false}={}){
  this.scene=scene;this.roofY=roofY;this.mobile=Boolean(mobile);
  this.lastNewsId=null;this.clock=0;this.active=false;this.landingTime=-1;
  this.root=new THREE.Group();this.root.name='Real three-dimensional aid helicopter · flight path';scene.add(this.root);
  this.body=new THREE.Group();this.root.add(this.body);
  const fuselage=mesh(this.body,new THREE.SphereGeometry(1,24,15),bodyMat,[0,0,0]);
  fuselage.scale.set(5,1.94,2.0);
  const windscreen=mesh(this.body,new THREE.SphereGeometry(1,20,12),glassMat,[2,.3,0]);
  windscreen.scale.set(2.15,1.45,1.82);
  mesh(this.body,new THREE.CylinderGeometry(.44,.58,12,9),bodyMat,[-8,.25,0]).rotation.z=Math.PI/2;
  mesh(this.body,new THREE.BoxGeometry(3.2,2.8,.24),stripeMat,[-13,.5,0]).rotation.z=.32;
  this.rotor=new THREE.Group();this.rotor.position.set(-.3,2.7,0);this.body.add(this.rotor);
  mesh(this.rotor,new THREE.CylinderGeometry(.12,.12,19,7),bladeMat,[0,0,0]).rotation.z=Math.PI/2;
  mesh(this.rotor,new THREE.CylinderGeometry(.12,.12,19,7),bladeMat,[0,0,0]).rotation.x=Math.PI/2;
  // Motion-blurred physical rotor disc behind the rotating blades.
  const discMat=new THREE.MeshBasicMaterial({color:'#9facb3',side:THREE.DoubleSide,
    transparent:true,opacity:.11,depthWrite:false});
  this.rotorBlur=mesh(this.body,new THREE.CircleGeometry(9.15,this.mobile?22:38),discMat,[-.3,2.72,0]);
  this.rotorBlur.rotation.x=-Math.PI/2;this.rotorBlur.castShadow=false;
  this.tailRotor=mesh(this.body,new THREE.BoxGeometry(.12,3.8,.16),bladeMat,[-13,.5,-.1]);
  for(const z of [-1.65,1.65]){
   mesh(this.body,new THREE.CylinderGeometry(.09,.10,8,7),stripeMat,[.1,-2,z]).rotation.z=Math.PI/2;
   for(const x of [-2.1,2.1])mesh(this.body,new THREE.CylinderGeometry(.055,.055,1.3,7),stripeMat,[x,-1.35,z]).rotation.z=.25;
  }
  this.light=mesh(this.body,new THREE.SphereGeometry(.21,9,7),new THREE.MeshBasicMaterial({color:'#f3c786'}),[4,-.2,0]);
  const flashing=new THREE.PointLight('#e7bd8c',0,14,2);flashing.position.set(4,-.2,0);this.body.add(flashing);this.beacon=flashing;
  this.crate=new THREE.Group();this.crate.name='Parachute supply crate · rooftop contact';scene.add(this.crate);
  mesh(this.crate,new THREE.BoxGeometry(2.1,1.65,1.82),crateMat,[0,0,0]);
  for(const z of [-.82,.82])mesh(this.crate,new THREE.BoxGeometry(.20,1.72,.095),stripeMat,[0,0,z]);
  for(const x of [-.85,.85])mesh(this.crate,new THREE.BoxGeometry(.09,1.72,.18),stripeMat,[x,0,0]);
  this.rigging=new THREE.Group();this.crate.add(this.rigging);
  for(const x of [-.75,.75])for(const z of [-.62,.62]){
   const cable=mesh(this.rigging,new THREE.CylinderGeometry(.023,.023,5.8,5),cableMat,[x*.75,3.25,z*.75]);
   cable.rotation.z=x*.095;cable.rotation.x=z*.075;
  }
  const canopy=mesh(this.rigging,
   new THREE.SphereGeometry(1,this.mobile?12:20,10,0,Math.PI*2,0,Math.PI/2),
   clothMat,[0,6,0]);
  canopy.name='Deployed low-poly emergency parachute';
  canopy.scale.set(3.25,1.18,3.05);
  this.canopy=canopy;
  this.shadow=mesh(scene,new THREE.CircleGeometry(2.6,26),
   new THREE.MeshBasicMaterial({color:'#0e1b19',transparent:true,opacity:.24,depthWrite:false}),
   [0,roofY+.28,0]);
  this.shadow.rotation.x=-Math.PI/2;this.shadow.castShadow=false;this.shadow.receiveShadow=false;
  this.dust=new THREE.Group();scene.add(this.dust);
  const dustCount=this.mobile?7:13;
  this.dustMat=new THREE.MeshBasicMaterial({color:'#a9aba3',transparent:true,opacity:.0,depthWrite:false});
  for(let i=0;i<dustCount;i++){
   const a=i/dustCount*Math.PI*2;
   const m=mesh(this.dust,new THREE.IcosahedronGeometry(.26+(i%3)*.12,0),
     this.dustMat,[Math.cos(a)*.5,.15,Math.sin(a)*.5]);
   m.castShadow=false;m.receiveShadow=false;
  }
  this.root.visible=false;this.crate.visible=false;
  this.rigging.visible=false;this.dust.visible=false;this.shadow.visible=false;
 }
 update(dt,newsId=0,newsType=''){
  const key=Number(newsId)||0;
  if(this.lastNewsId===null){this.lastNewsId=key;return;}
  if(key!==this.lastNewsId){
   this.lastNewsId=key;
   if(newsType==='drop'){
    this.active=true;this.clock=0;this.landingTime=-1;
    this.root.visible=true;this.crate.visible=false;
   }
  }
  if(!this.active)return;
  const step=Math.max(0,Math.min(.12,Number(dt)||0));
  this.clock+=step;
  const t=this.clock,land=t>=RESCUE_DROP_END;
  this.root.visible=t<RESCUE_EXIT;
  this.body.position.copy(flightPosition(t,this.roofY));
  this.body.rotation.y=-.09;
  this.body.rotation.z=Math.sin(t*.64)*.015;
  this.rotor.rotation.y+=step*28;
  this.tailRotor.rotation.x+=step*19;
  this.beacon.intensity=Math.sin(t*5.5)>0?.75:0;
  this.rotorBlur.material.opacity=.09+.045*Math.abs(Math.sin(t*25));
  this.crate.visible=t>=RESCUE_DROP_START&&t<RESCUE_EXIT;
  this.shadow.visible=this.crate.visible;
  if(this.crate.visible){
   const p=smooth((t-RESCUE_DROP_START)/(RESCUE_DROP_END-RESCUE_DROP_START));
   this.crate.position.copy(parachutePosition(t,this.roofY));
   this.crate.position.y+=land?0:Math.sin(t*6)*.20*(1-p);
   this.crate.rotation.z=land?0:Math.sin(t*1.8)*.14*(1-p);
   this.crate.rotation.x=land?0:Math.cos(t*1.4)*.08*(1-p);
   this.crate.rotation.y=land?Math.sin(t)*.008:Math.sin(t*.3)*.20;
   this.rigging.visible=!land;
   if(!land){
    this.canopy.scale.set(3.25,1.18,3.05);
    this.canopy.rotation.z=Math.sin(t*1.7)*.11;
   }
   const height=Math.max(0,this.crate.position.y-(this.roofY+.98));
   this.shadow.position.set(this.crate.position.x,this.roofY+.28,this.crate.position.z);
   this.shadow.material.opacity=.31*(1-THREE.MathUtils.clamp(height/45,0,1));
   this.shadow.scale.setScalar(.68+height*.038);
  }
  if(land&&this.landingTime<0)this.landingTime=t;
  const landingAge=this.landingTime<0?-1:t-this.landingTime;
  this.dust.visible=landingAge>=0&&landingAge<1.6;
  if(this.dust.visible){
   this.dust.position.set(8,this.roofY+.30,9);
   this.dustMat.opacity=.18*(1-smooth(landingAge/1.6));
   for(let i=0;i<this.dust.children.length;i++){
    const a=i/this.dust.children.length*Math.PI*2;
    const part=this.dust.children[i],rad=.8+landingAge*3.1;
    part.position.set(Math.cos(a)*rad,.15+Math.sin(landingAge*3+i)*.16,Math.sin(a)*rad);
    part.scale.setScalar(.8+landingAge*.8);
   }
  }
  if(t>=RESCUE_EXIT){
   this.active=false;this.root.visible=false;this.crate.visible=false;
   this.shadow.visible=false;this.dust.visible=false;
  }
 }
 dispose(){
  this.root.parent?.remove(this.root);this.crate.parent?.remove(this.crate);
  this.dust.parent?.remove(this.dust);this.shadow.parent?.remove(this.shadow);
  // Textures are shared per module, but geometries created per encounter
  // instance can and must be released with the existing world.
  for(const root of [this.root,this.crate,this.dust,this.shadow]){
   root.traverse?.(o=>{if(o.isMesh)o.geometry?.dispose();});
  }
  this.rotorBlur.material.dispose();this.shadow.material.dispose();this.dustMat.dispose();
  this.light.material.dispose();this.beacon.dispose();
 }
}