/** Single-rooftop, lightweight, original Three.js rescue flyby.
 * Radio drops only; no armed aircraft, combat or new playable survivor.
 * The reward is awarded once in simulation. This is a purely visual receipt.
 */
import * as THREE from 'three';
const mat=(color,metalness=.12)=>new THREE.MeshStandardMaterial({color,metalness,roughness:.67,flatShading:false});
const mBody=mat('#4e5f57',.35),mAccent=mat('#a9b5a9',.3),mGlass=new THREE.MeshStandardMaterial({color:'#263d48',metalness:.45,roughness:.12,transparent:true,opacity:.88});
const mRotors=mat('#20292c',.3),mBox=mat('#9e875e'),mRopes=mat('#b0aa94');
function piece(parent,geometry,material,pos){
 const mesh=new THREE.Mesh(geometry,material);mesh.position.set(...pos);
 mesh.castShadow=false;mesh.receiveShadow=false;parent.add(mesh);return mesh;
}
export class RescueHelicopterVfx{
 constructor(scene,roofY){
  this.scene=scene;this.roofY=roofY;this.lastNewsId=null;this.clock=0;this.active=false;
  this.root=new THREE.Group();this.root.name='Rescue flyby · radio supply drop';scene.add(this.root);
  this.body=new THREE.Group();this.root.add(this.body);
  const cabin=piece(this.body,new THREE.SphereGeometry(1,22,14),mBody,[0,0,0]);cabin.scale.set(5.0,1.95,2.0);
  const window=piece(this.body,new THREE.SphereGeometry(1,20,12),mGlass,[2,.3,0]);window.scale.set(2.15,1.45,1.82);
  piece(this.body,new THREE.CylinderGeometry(.44,.58,12,9),mBody,[-8,.25,0]).rotation.z=Math.PI/2;
  const tail=piece(this.body,new THREE.BoxGeometry(3.2,2.8,.24),mAccent,[-13,.5,0]);
  tail.rotation.z=.32;
  this.rotor=new THREE.Group();this.rotor.position.set(-.3,2.7,0);this.body.add(this.rotor);
  piece(this.rotor,new THREE.CylinderGeometry(.12,.12,19,7),mRotors,[0,0,0]).rotation.z=Math.PI/2;
  piece(this.rotor,new THREE.CylinderGeometry(.12,.12,19,7),mRotors,[0,0,0]).rotation.x=Math.PI/2;
  this.tailRotor=piece(this.body,new THREE.BoxGeometry(.12,4,.16),mRotors,[-13,.5,-.1]);
  for(const z of [-1.65,1.65]){
   const ski=piece(this.body,new THREE.CylinderGeometry(.09,.10,8,7),mAccent,[.1,-2,z]);
   ski.rotation.z=Math.PI/2;
   for(const x of [-2.1,2.1]){
    const brace=piece(this.body,new THREE.CylinderGeometry(.055,.055,1.3,7),mAccent,[x,-1.35,z]);
    brace.rotation.z=.25;
   }
  }
  this.light=piece(this.body,new THREE.SphereGeometry(.25,9,7),new THREE.MeshBasicMaterial({color:'#f7c788'}),[4,-.2,0]);
  this.crate=new THREE.Group();this.crate.name='Parachuted emergency food water medicine or parts';scene.add(this.crate);
  piece(this.crate,new THREE.BoxGeometry(2.1,1.6,1.8),mBox,[0,0,0]);
  for(const z of [-.7,.7])for(const x of [-.78,.78]){
   const rope=piece(this.crate,new THREE.CylinderGeometry(.028,.028,4.7,5),mRopes,[x,3,z]);
   rope.rotation.z=x<0?-.08:.08;
  }
  this.canopy=piece(this.crate,new THREE.SphereGeometry(1,18,9,0,Math.PI*2,0,Math.PI/2),new THREE.MeshStandardMaterial({color:'#b1c5a2',side:THREE.DoubleSide,roughness:.9}),[0,5.45,0]);
  this.canopy.scale.set(3,.9,2.8);
  this.root.visible=false;this.crate.visible=false;
 }
 update(dt,newsId=0,newsType=''){
  const key=Number(newsId)||0;
  if(this.lastNewsId===null){this.lastNewsId=key;return;}
  if(key!==this.lastNewsId){
   this.lastNewsId=key;
   if(newsType==='drop'){this.active=true;this.clock=0;}
  }
  if(!this.active)return;
  this.clock+=Math.min(.14,Math.max(0,dt));
  const t=this.clock;
  this.root.visible=t<18;
  this.body.position.set(-105+210*Math.min(1,t/18),this.roofY+40+Math.sin(t*.35)*.95,-40);
  this.body.rotation.y=-.10;
  this.rotor.rotation.y+=dt*27;this.tailRotor.rotation.x+=dt*19;
  this.crate.visible=t>=6&&t<=17;
  if(this.crate.visible){
   const fall=Math.max(0,Math.min(1,(t-6)/7));
   const eased=fall*fall*(3-2*fall);
   this.crate.position.set(0,this.roofY+32-30*eased,4);
   this.crate.rotation.y+=dt*.35;
   this.canopy.visible=t<12;
  }
  if(t>=18){this.active=false;this.root.visible=false;this.crate.visible=false;}
 }
 dispose(){this.root.parent?.remove(this.root);this.crate.parent?.remove(this.crate);}
}
