import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {resolveSurvivorExpression,premiumSceneBudget} from './presentationPlanV140.js';

// Original 3D character's face/garment micro-rig: true scene geometry attached
// to the already animated head and jacket. No photo planes, duplicate avatars,
// copyright music, or avatar-level mechanics.
const m=(color,roughness=.9,metalness=0)=>new THREE.MeshStandardMaterial({color,roughness,metalness,side:THREE.DoubleSide});
const SKIN=m('#ad816b',.88),LIP=m('#815c52',.85),IRIS=m('#322b26',.23),PUPIL=m('#10120f',.12),SPARK=new THREE.MeshBasicMaterial({color:0xf5eee4}),
    HAIR=m('#232828',.78),BROW=m('#262726'),THREAD=m('#a89e88'),COAT=m('#525c4b',.95),LINING=m('#414b44',.94),LEATHER=m('#493c32',.84),METAL=m('#868981',.41,.45);
function add(parent,geo,material,position,name=''){
 const o=new THREE.Mesh(geo,material);o.position.set(...position);o.castShadow=true;o.receiveShadow=true;o.name=name;parent.add(o);return o;
}
function curve3(parent,points,radius,material,name=''){
 const spline=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p)));
 return add(parent,new THREE.TubeGeometry(spline,Math.max(8,points.length*8),radius,6,false),material,[0,0,0],name);
}
function fabricFlap(parent,shape,mat,name){
 const verts=new Float32Array(shape.flat()),uv=[],idx=[];
 for(let i=0;i<shape.length;i++)uv.push((i%3)/2,Math.floor(i/3)/2);
 for(let i=1;i<shape.length-1;i++)idx.push(0,i,i+1);
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(verts,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();
 const o=add(parent,g,mat,[0,0,0],name);o.userData.rest=new Float32Array(verts);return o;
}
function breathTexture(){
 const c=document.createElement('canvas');c.width=c.height=128;const x=c.getContext('2d');
 const g=x.createRadialGradient(64,64,5,64,64,60);
 g.addColorStop(0,'rgba(225,240,248,.35)');g.addColorStop(.3,'rgba(223,239,246,.16)');g.addColorStop(1,'rgba(223,239,246,0)');
 x.fillStyle=g;x.fillRect(0,0,128,128);return new THREE.CanvasTexture(c);
}

export class PremiumPerformerV140{
 constructor(world){
  this.world=world;this.root=new THREE.Group();this.root.name='Original survivor · expression and micro-performance rig v1.4';
  this.head=world.survivorHead;this.torso=world.survivorTorso;
  if(!this.head||!this.torso)return;
  const budget=premiumSceneBudget(world.isMobile);
  this.head.add(this.root);this.eyes=[];this.brows=[];this.hair=[];
  for(const s of [-1,1]){
   const g=new THREE.Group();g.name='3D articulated eye';g.position.set(s*.143,.193,.354);this.root.add(g);
   const iris=add(g,new THREE.SphereGeometry(.041,16,11),IRIS,[0,0,.005],'PBR iris');iris.scale.set(.87,.86,.39);
   const pupil=add(g,new THREE.SphereGeometry(.019,13,10),PUPIL,[0,0,.022]);pupil.scale.z=.65;
   add(g,new THREE.SphereGeometry(.009,8,8),SPARK,[-.012,.015,.034],'Natural catchlight');
   // Functional eyelid shading: eyelids narrow with fatigue and blink.
   const lid=add(g,new THREE.SphereGeometry(.071,15,10),SKIN,[0,.048,.011],'Upper eyelid');lid.scale.set(1,.36,.34);
   this.eyes.push({group:g,lid,iris});
   const eyebrow=curve3(this.head,[[s*.071,.286,.351],[s*.145,.294,.355],[s*.216,.282,.328]],.020,BROW,'Expressive brow');this.brows.push({mesh:eyebrow,s});
  }
  this.lowerLip=curve3(this.head,[[-.08,-.054,.361],[-.04,-.062,.380],[0,-.066,.390],[.04,-.062,.380],[.08,-.054,.361]],.008,LIP,'Lip contour');
  this.cheeks=[-1,1].map(s=>{const o=add(this.head,new THREE.SphereGeometry(.060,14,10),SKIN,[s*.215,.062,.30]);o.scale.set(1,.45,.26);return o});
  // Ragged, layered and flexible cloth silhouette. Body/hood remain fully 3D.
  this.flaps=[
   fabricFlap(this.torso,[[-.42,.14,.11],[-.46,-.13,.02],[-.37,-.41,.16],[-.23,-.45,.31],[-.10,-.19,.34]],COAT,'Layered left coat hem'),
   fabricFlap(this.torso,[[.40,.15,.14],[.46,-.10,.07],[.43,-.38,.14],[.20,-.43,.33],[.11,-.19,.35]],LINING,'Layered right coat hem')
  ];
  // Fine 3D belt stitching and seams, sparse enough for mobile.
  for(const s of [-1,1]){
   const shoulder=new THREE.Group();shoulder.position.set(s*.38,.78,.04);this.torso.add(shoulder);
   for(let i=0;i<3;i++)curve3(shoulder,[[s*-.08,-.06-i*.045,.285],[s*.018,-.09-i*.045,.320],[s*.12,-.10-i*.045,.284]],.006,THREAD);
   add(shoulder,new RoundedBoxGeometry(.10,.13,.032,2,.008),LEATHER,[s*.12,-.17,.295],'Repaired shoulder patch');
   const buckle=add(this.torso,new THREE.TorusGeometry(.055,.011,6,12),METAL,[s*.31,-.09,.29],'Hand-stitched gear buckle');buckle.rotation.x=.25;
  }
  // Hair clumps bend subtly in wind; this is secondary motion on the actual head.
  for(let i=0;i<(budget.performerHeadDetails?10:5);i++){
   const a=i*2.399,r=.12+(i%4)*.035;
   const x=Math.sin(a)*r,z=.18+Math.cos(a)*.06;
   const strand=curve3(this.root,[[x,.57,z-.11],[x+.03,.48,z],[x+.06,.34,z+.09]],.018+(i%3)*.005,HAIR,'Wind-affected hair strand');
   this.hair.push({strand,phase:a});
  }
  // Localized warm bounce from the campfire gives the face an actual 3D warm rim.
  // No visible flashlight/spotlight mesh; no light is baked into a texture.
  this.faceFill=new THREE.PointLight(0xffbc85,0,5.5,2);world.scene.add(this.faceFill);
  const breathMap=breathTexture();this.breath=[];
  for(let i=0;i<budget.breathSprites;i++){
   const p=new THREE.Mesh(new THREE.PlaneGeometry(.4,.4),new THREE.MeshBasicMaterial({map:breathMap,color:0xc4e0ed,transparent:true,opacity:0,depthWrite:false,side:THREE.DoubleSide}));
   p.renderOrder=11;p.visible=false;p.name='Cold breath plume · survivor';world.scene.add(p);this.breath.push(p);
  }
  this.elapsed=0;this.state=null;this.smile=0;
 }
 update(dt,game,weather){
  if(!this.head)return;
  dt=Math.min(.075,Math.max(0,dt));this.elapsed+=dt;
  const t=this.elapsed,l=this.world.life;
  const data=resolveSurvivorExpression({health:game.health,food:game.food,water:game.water,temperature:game.temperature,weather,activity:l?.current||'idle'});this.state=data;
  const focus=Math.min(1,dt*5),saccade=Math.sin(t*.61)*.43+Math.sin(t*.17)*.36;
  const blinkWindow=Math.pow(Math.max(0,Math.sin(t*1.43+Math.sin(t*.3))),21);
  for(let i=0;i<this.eyes.length;i++){
   const e=this.eyes[i],s=i===0?-1:1;
   e.group.position.x=s*.143+THREE.MathUtils.lerp(0,.010*saccade,focus);
   e.group.position.y=.193+Math.sin(t*.19+i)*.003;
   const target=.36+blinkWindow*2.5+data.stress*.12;
   e.lid.scale.y=THREE.MathUtils.damp(e.lid.scale.y,target,14,dt);
   e.group.rotation.y=THREE.MathUtils.damp(e.group.rotation.y,(data.focused?.035:.11)*saccade,3,dt);
  }
  this.smile=THREE.MathUtils.damp(this.smile,data.mouthSmile,2.3,dt);
  this.lowerLip.scale.y=.7+Math.abs(this.smile)*1.9;
  this.lowerLip.position.y=this.smile*.015;
  for(const b of this.brows)b.mesh.rotation.z=THREE.MathUtils.damp(b.mesh.rotation.z,b.s*data.browTilt,3.6,dt);
  // Keep the existing animator in charge of head movement; add only a small
  // independently parented expression pivot, never accumulate main head rotations.
  this.root.rotation.z=THREE.MathUtils.damp(this.root.rotation.z,data.headTilt,2.3,dt);
  const wind=this.world.visualWeather?.wind||0;
  for(const [i,cloth] of this.flaps.entries()){
   const p=cloth.geometry.attributes.position,rest=cloth.userData.rest;
   for(let k=0;k<p.count;k++){
    const y=rest[k*3+1],weight=Math.max(0,Math.min(1,(.3-y)*1.5));
    p.setZ(k,rest[k*3+2]+Math.sin(t*2.0+i*1.8+k*.47)*wind*.095*weight);
    p.setX(k,rest[k*3]+Math.sin(t*.9+i)*wind*.047*weight);
   }
   p.needsUpdate=true;cloth.geometry.computeVertexNormals();
  }
  for(const h of this.hair){h.strand.rotation.z=Math.sin(t*1.35+h.phase)*wind*.035;}
  const nearFire=this.world.survivor.position.distanceTo(this.world.fireLight.position)<9.7;
  this.faceFill.intensity=THREE.MathUtils.damp(this.faceFill.intensity,nearFire?1.5:0,2.4,dt);
  this.faceFill.position.copy(this.world.survivor.position).add(new THREE.Vector3(1.3,2.3,1.6));
  // Breath plumes come from the character, never from screen-space fog.
  for(let i=0;i<this.breath.length;i++){
   const plume=this.breath[i];plume.visible=data.showBreath;
   if(!plume.visible){plume.material.opacity=0;continue;}
   const phase=((t*.45+i/this.breath.length)%1),body=this.world.survivor;
   plume.position.set(body.position.x+Math.sin(body.rotation.y)*(.60+phase*.48),body.position.y+2.82+phase*.32,body.position.z+Math.cos(body.rotation.y)*(.60+phase*.48));
   plume.scale.setScalar(.45+phase*1.1);plume.quaternion.copy(this.world.camera.quaternion);
   plume.material.opacity=Math.sin(Math.PI*phase)*.13;
  }
 }
 dispose(){for(const b of this.breath){b.material.dispose();b.geometry.dispose();this.world.scene.remove(b);}this.faceFill&&this.world.scene.remove(this.faceFill);}
}
