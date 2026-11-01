import * as THREE from 'three';
import {generateV130ArtPlan} from './premiumArtPlanV130.js';

/**
 * AFTERDAY v1.3: real 3D environmental finishing pass for the ONLY survivor roof.
 * All flora and structural detail is world-space geometry, not a photo overlay.
 * Dense leaves/debris are batched using InstancedMesh for mobile GPU draw-call control.
 * No changes to simulation / survival days / weather scheduling.
 */
const TAU = 2 * Math.PI;
const botanicalTexture=new THREE.TextureLoader().load('./assets/materials/botany/leaf_veined.png');botanicalTexture.colorSpace=THREE.SRGBColorSpace;botanicalTexture.anisotropy=4;
const frac = x => x - Math.floor(x);
const h = n => frac(Math.sin(n * 127.123 + 19.83) * 43758.5453);
const v = (x,y,z) => new THREE.Vector3(x,y,z);
const palette = {
  branch: new THREE.MeshStandardMaterial({color:'#383b2c',roughness:1}),
  bark: new THREE.MeshStandardMaterial({color:'#514534',roughness:.99}),
  vine: new THREE.MeshStandardMaterial({color:'#465238',roughness:1}),
  moss: new THREE.MeshStandardMaterial({color:'#485a38',roughness:1,side:THREE.DoubleSide}),
  leaf: new THREE.MeshStandardMaterial({color:'#ffffff',map:botanicalTexture,alphaTest:.24,roughness:.88,metalness:0,side:THREE.DoubleSide}),
  iron: new THREE.MeshStandardMaterial({color:'#6a5a4b',roughness:.77,metalness:.42}),
  dark: new THREE.MeshStandardMaterial({color:'#323937',roughness:.9,metalness:.14}),
  concrete: new THREE.MeshStandardMaterial({color:'#6b6d63',roughness:.96}),
  rain: new THREE.MeshPhysicalMaterial({color:'#90adb6',metalness:0,roughness:.15,transparent:true,opacity:0,depthWrite:false,side:THREE.DoubleSide}),
  ember: new THREE.MeshBasicMaterial({color:'#fbc681',transparent:true,opacity:.86,depthWrite:false,blending:THREE.AdditiveBlending})
};
function mesh(parent, geometry, material, p, name=''){
 const object=new THREE.Mesh(geometry,material); object.name=name; object.position.set(...p);
 object.castShadow=false; object.receiveShadow=true; parent.add(object); return object;
}
function pipe(parent,pts,r,material){
 const curve=new THREE.CatmullRomCurve3(pts.map(q=>v(...q)));
 const object=mesh(parent,new THREE.TubeGeometry(curve,Math.max(8,pts.length*5),r,5,false),material,[0,0,0]);
 return object;
}
function leafGeometry(){
 // Curved elliptical lamina with botanical alpha texture and proper UVs.
 const pos=[],uv=[],idx=[];for(let j=0;j<=8;j++){
  const v=j/8,w=Math.pow(Math.sin(Math.PI*v),.8);
  for(const side of [-1,1]){pos.push(side*w*.39,v-.47,Math.sin(v*Math.PI)*.075);uv.push(side===-1?0:1,v);}
 }
 for(let j=0;j<8;j++){const a=j*2;idx.push(a,a+1,a+2,a+1,a+3,a+2)}
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();return g;
}
function coloredLeaf(name,count,geometry){
 const m=new THREE.InstancedMesh(geometry,palette.leaf,count);
 m.name=name;m.frustumCulled=false;m.castShadow=false;m.receiveShadow=true;m.instanceMatrix.setUsage(THREE.StaticDrawUsage);return m;
}
const roofBound=(x,z)=>Math.abs(x)<=22.8&&Math.abs(z)<=22.8;
function windLeafMaterial(uniforms){
 const mat=palette.leaf.clone();
 mat.onBeforeCompile=shader=>{
  shader.uniforms.uV130Time=uniforms.time;
  shader.uniforms.uV130Wind=uniforms.wind;
  shader.vertexShader=shader.vertexShader.replace('#include <common>',
   '#include <common>\nuniform float uV130Time;\nuniform float uV130Wind;');
  shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',
   `#include <begin_vertex>
    #ifdef USE_INSTANCING
     vec3 artOrigin=(instanceMatrix*vec4(0.0,0.0,0.0,1.0)).xyz;
     float leafTip=max(0.0,position.y+0.47);
     transformed.x+=sin(uV130Time*1.15+artOrigin.x*0.38+artOrigin.z*0.23)*uV130Wind*leafTip*0.095;
     transformed.z+=cos(uV130Time*0.81+artOrigin.x*0.26-artOrigin.z*0.36)*uV130Wind*leafTip*0.074;
    #endif`);
 };
 mat.customProgramCacheKey=()=> 'afterday-v130-leaf-wind-1';
 return mat;
}

const clip=(x,a,b)=>Math.max(a,Math.min(b,x));
export class PremiumEnvironmentV130 {
 constructor(world){
   this.world=world;this.clock=0;this.root=new THREE.Group();
   this.root.name='Premium 3D environmental finish · single camp roof (v1.3)';
   world.scene.add(this.root);this.plan=generateV130ArtPlan(world.isMobile);
   this.windGroups=[];this.flows=[];this.foliageUniforms={time:{value:0},wind:{value:0}};this.prepareFoliage();this.prepareHeroTree();this.prepareArchitecturalWear();this.prepareWaterRunoff();this.prepareEmbers();
 }
 prepareFoliage(){
   const cfg=this.plan, Y=this.world.ROOF_Y;
   const leaves=coloredLeaf('3D vine leaves / actual world-space instances',cfg.foliageInstances,leafGeometry());
   leaves.material=windLeafMaterial(this.foliageUniforms);
   const dummy=new THREE.Object3D();let k=0;
   // Each vine starts at the parapet of the unique hero tower; stems grow down
   // the facade, rather than inventing more playable roofs or adjacent buildings.
   for(let i=0;i<cfg.hangingVines;i++){
     const side=i%4,along=(h(i*17+4)-.5)*42;
     let x=side===1?22.55:side===3?-22.55:along;
     let z=side===0?22.55:side===2?-22.55:along;
     const length=4.2+h(i*37+19)*14;
     const points=[];for(let n=0;n<=5;n++){
       const f=n/5;
       points.push([x+Math.sin(f*4+i)*.45,Y+1.5-length*f,z+Math.cos(f*4.4+i)*.43]);
     }
     pipe(this.root,points,.025+h(i)*.02,palette.vine);
     const foliagePerVine=Math.floor(cfg.foliageInstances*.61/cfg.hangingVines);
     for(let j=0;j<foliagePerVine&&k<cfg.foliageInstances;k++,j++){
       const f=(j+.4)/foliagePerVine;
       const twist=(j*2.399+i)*1.43;
       dummy.position.set(x+.34*Math.sin(f*4+i)+Math.cos(twist)*.25,Y+1.5-length*f,z+.36*Math.cos(f*4+i)+Math.sin(twist)*.25);
       dummy.rotation.set(.55+Math.sin(twist)*.6,twist,Math.sin(f*7+i)*.5);
       dummy.scale.set(.42+h(k*12)*.75,.42+h(k*7)*.75,.53+h(k*5)*.55);
       dummy.updateMatrix();leaves.setMatrixAt(k,dummy.matrix);
       const col=new THREE.Color().setHSL(.24+h(k*19)*.075,.22+h(k*27)*.28,.17+h(k*11)*.22);
       leaves.setColorAt(k,col);
     }
   }
   // Wild weeds and repaired roof planters, concentrated along outer edges.
   for(let i=0;i<cfg.rooftopShrubClusters;i++){
     const side=i%4,q=(h(i*17+100)-.5)*39;
     const cx=side===1?20:side===3?-20:q;
     const cz=side===0?20:side===2?-20:q;
     if(!roofBound(cx,cz))continue;
     const g=new THREE.Group();g.position.set(cx,Y+.24,cz);this.root.add(g);this.windGroups.push({group:g,strength:.01+.014*h(i+2),phase:i});
     const height=.6+1.2*h(i*11+4);
     for(let b=0;b<3;b++){
       const px=(h(i*7+b)-.5)*.38,pz=(h(i*17+b)-.5)*.42;
       pipe(g,[[px,0,pz],[px+.15,height*.5,pz],[px+Math.sin(b*4+i)*.32,height,pz+.12]],.022,palette.branch);
     }
     for(let j=0;j<Math.min(28,Math.floor(cfg.foliageInstances*.39/cfg.rooftopShrubClusters))&&k<cfg.foliageInstances;k++,j++){
       const ang=j*2.399+3*i,radius=.22+.75*Math.sqrt(h(j*19+i+9));
       dummy.position.set(cx+Math.cos(ang)*radius,Y+.52+h(j*15+i)*height,cz+Math.sin(ang)*radius);
       dummy.rotation.set(.6+h(j*8+i)*1.3,ang,h(j*31+i)*TAU);
       dummy.scale.set(.5+h(k*21)*.95,.48+h(k*31)*.9,.55+h(k)*.8);
       dummy.updateMatrix();leaves.setMatrixAt(k,dummy.matrix);
       leaves.setColorAt(k,new THREE.Color().setHSL(.18+h(k*19)*.105,.20+h(k)*.32,.22+h(k*17)*.24));
     }
   }
   // Remaining leaves are planted in the rooftop's existing herb beds only.
   for(;k<cfg.foliageInstances;k++){
     const x=-17.5+h(k*19)*9,z=10+h(k*23)*8;
     dummy.position.set(x,Y+.75+h(k*29)*1.1,z);
     dummy.rotation.set(h(k*9)*TAU,h(k*7)*TAU,h(k*3)*TAU);
     dummy.scale.set(.29+h(k*13)*.51,.31+h(k*17)*.58,.3+h(k*11)*.50);
     dummy.updateMatrix();leaves.setMatrixAt(k,dummy.matrix);
     leaves.setColorAt(k,new THREE.Color().setHSL(.20+h(k*17)*.085,.24+h(k)*.27,.18+h(k*5)*.24));
   }
   leaves.instanceMatrix.needsUpdate=true;leaves.instanceColor.needsUpdate=true;this.root.add(leaves);
   this.leafMesh=leaves;
 }
 prepareHeroTree(){
   // One mature volunteer tree anchors the left rear corner of the single roof,
   // matching the reference composition without another roof or adjacent building.
   const Y=this.world.ROOF_Y;const trunkRoot=new THREE.Group();
   trunkRoot.name='Wild volunteer rooftop tree · actual curved trunk and canopy';
   trunkRoot.position.set(-18,Y+.24,-14);this.root.add(trunkRoot);
   const base=new THREE.Mesh(new THREE.CylinderGeometry(.83,1.01,.62,16),palette.concrete);
   base.position.y=.29;base.receiveShadow=true;trunkRoot.add(base);
   const trunkPts=[[0,.58,0],[-.09,1.58,.06],[.24,2.75,-.14],[.38,4.04,-.18],[.31,5.26,-.12]];
   for(let i=0;i<trunkPts.length-1;i++){
     const a=v(...trunkPts[i]),b=v(...trunkPts[i+1]),diff=b.clone().sub(a);
     const trunk=new THREE.Mesh(new THREE.CylinderGeometry(.24-i*.031,.34-i*.046,diff.length(),11,1),palette.bark);
     trunk.position.copy(a.clone().add(b).multiplyScalar(.5));
     trunk.quaternion.setFromUnitVectors(v(0,1,0),diff.normalize());trunk.castShadow=true;trunkRoot.add(trunk);
   }
   for(let i=0;i<15;i++){
     const angle=i*2.399,originY=2.2+h(i+13)*2.6,branchLen=2.0+h(i*31)*1.7;
     const origin=[.15,originY,-.12];
     const mid=[.25+Math.cos(angle)*branchLen*.56,originY+.64,-.12+Math.sin(angle)*branchLen*.55];
     const tip=[.25+Math.cos(angle)*branchLen,originY+.3+h(i*17),-.12+Math.sin(angle)*branchLen];
     pipe(trunkRoot,[origin,mid,tip],.055+h(i+10)*.045,palette.branch);
   }
   const leafCount=this.world.isMobile?260:540;
   const meshLeaves=coloredLeaf('Wind-animated real 3D rooftop-tree foliage',leafCount,leafGeometry());
   meshLeaves.material=windLeafMaterial(this.foliageUniforms);
   meshLeaves.castShadow=!this.world.isMobile;
   const dummy=new THREE.Object3D();
   for(let i=0;i<leafCount;i++){
     const a=i*2.399,lat=2*(h(i*17+3)-.5),radius=1.15+1.9*Math.sqrt(h(i*37+9));
     const x=Math.cos(a)*radius,y=4.5+lat*1.3,z=Math.sin(a)*radius*.85;
     dummy.position.set(x,y,z);
     dummy.rotation.set(h(i*19)*TAU,a,h(i*71)*TAU);
     const size=.52+h(i*41)*.82;
     dummy.scale.set(size,size*.84,size*.72);dummy.updateMatrix();
     meshLeaves.setMatrixAt(i,dummy.matrix);
     meshLeaves.setColorAt(i,new THREE.Color().setHSL(.19+h(i*11)*.09,.20+h(i*37)*.27,.20+h(i*79)*.25));
   }
   meshLeaves.instanceMatrix.needsUpdate=true;meshLeaves.instanceColor.needsUpdate=true;trunkRoot.add(meshLeaves);
 }
 prepareArchitecturalWear(){
   const Y=this.world.ROOF_Y,cfg=this.plan,dummy=new THREE.Object3D();
   const shards=new THREE.InstancedMesh(new THREE.TetrahedronGeometry(.42,0),palette.concrete,cfg.grimeFragments);
   shards.name='Roof-edge spalling and scattered aggregate · batched';shards.castShadow=false;shards.receiveShadow=true;
   let k=0;for(let i=0;i<cfg.grimeFragments;i++){
     const s=i%4,q=(h(i*19)-.5)*43;
     const x=(s===1?21.8:s===3?-21.8:q)+(h(i*59)-.5)*.4;
     const z=(s===0?21.8:s===2?-21.8:q)+(h(i*73)-.5)*.4;
     dummy.position.set(x,Y+.19,z);dummy.rotation.set(h(i*7)*.8,h(i*9)*TAU,h(i*13)*.8);
     dummy.scale.set(.18+h(i*5)*.8,.075+h(i*13)*.21,.20+h(i*17)*.9);dummy.updateMatrix();shards.setMatrixAt(k,dummy.matrix);
     shards.setColorAt(k,new THREE.Color().setHSL(.11,.045,.27+h(i*11)*.16));k++;
   }shards.instanceMatrix.needsUpdate=true;shards.instanceColor.needsUpdate=true;this.root.add(shards);
   // Independent drain-pipes follow the building wall downwards, with 3D
   // collars and elbows. The rain can visibly travel down these pipes.
   for(const [x,z,axis] of [[-17.6,22.35,0],[15.8,22.35,0],[22.35,-17.2,1],[-22.35,-13.4,1]]){
     const p=[[x,Y+.12,z],[x,Y-.85,z],[x+(axis?-.3:.3),Y-1.2,z+(axis?-.3:.3)],
       [x+(axis?-.3:.3),Y-11,z+(axis?-.3:.3)]];
     pipe(this.root,p,.13,palette.iron);
     for(const hh of [Y-2,Y-6,Y-9]){
       const collar=mesh(this.root,new THREE.TorusGeometry(.18,.04,5,12),palette.dark,[x+(axis?-.3:.3),hh,z+(axis?-.3:.3)]);
       collar.rotation.x=Math.PI/2;
     }
   }
   // Roof repair flashing: irregular, thin rust-stained patches anchored to
   // perimeter only; no giant flat slab or canopy blocking the survivor.
   const stripGeo=new THREE.BoxGeometry(1,.035,.22),strip=new THREE.InstancedMesh(stripGeo,palette.iron,58);
   strip.name='Scavenged metal roof flashing';
   for(let i=0;i<58;i++){
     const side=i%4,along=(h(i*17+3)-.5)*40;
     const x=side===1?22.05:side===3?-22.05:along,z=side===0?22.05:side===2?-22.05:along;
     dummy.position.set(x,Y+.19,z);dummy.rotation.set(0,(side%2?Math.PI/2:0)+(h(i+5)-.5)*.15,0);
     dummy.scale.set(.55+h(i*8)*1.6,1,.6+h(i*9)*1.15);dummy.updateMatrix();strip.setMatrixAt(i,dummy.matrix);
   }strip.instanceMatrix.needsUpdate=true;strip.castShadow=false;this.root.add(strip);
 }
 prepareWaterRunoff(){
   const Y=this.world.ROOF_Y;const n=this.plan.rainRunoffStreams;
   const geo=new THREE.CylinderGeometry(.027,.055,1,5,1,true);
   for(let i=0;i<n;i++){
     const side=i%4,q=(h(i*37+10)-.5)*41;
     const x=side===1?23.32:side===3?-23.32:q;
     const z=side===0?23.32:side===2?-23.32:q;
     const len=3+h(i+12)*10;
     const drop=mesh(this.root,geo,palette.rain.clone(),[x,Y+1.2-len*.5,z],'Rain runoff at the ONLY tower parapet');
     drop.scale.set(.4+h(i*13)*.8,len,.45+h(i*11)*.9);drop.userData.sway=i*.73;
     drop.visible=false;this.flows.push(drop);
   }
 }
 prepareEmbers(){
   this.embers=new THREE.InstancedMesh(new THREE.SphereGeometry(.043,5,4),palette.ember,this.world.isMobile?28:64);
   this.embers.name='World-space rising embers from real campfire';this.embers.frustumCulled=false;this.root.add(this.embers);
   this.emberDummy=new THREE.Object3D();
 }
 update(dt,weather,night,time){
   this.clock+=dt;const t=this.clock,wind=clip(weather.wind||0,0,1);
   this.foliageUniforms.time.value=t;this.foliageUniforms.wind.value=wind;
   for(const {group,strength,phase} of this.windGroups){
     group.rotation.x=Math.sin(t*.85+phase)*strength*(.5+wind*1.6);
     group.rotation.z=Math.sin(t*.77+phase*1.4)*strength*(.5+wind*1.5);
   }
   const rain=clip(weather.rain||0,0,1),wet=clip(weather.wet||0,0,1);
   for(const drop of this.flows){
     drop.visible=rain>.09;drop.material.opacity=(.07+.42*rain)*Math.min(1,wet+.23);
     drop.position.x+=Math.sin(t*3+drop.userData.sway)*.0006*wind;
   }
   const count=this.embers.count,d=this.emberDummy;
   for(let i=0;i<count;i++){
     const phase=h(i*17+7),u=(t*(.17+h(i+3)*.19)+phase)%1;
     const r=.16+h(i*13)*.66,angle=i*2.399+t*.9;
     d.position.set(2+Math.cos(angle)*r+wind*u*.7,this.world.ROOF_Y+.9+u*3.3,3+Math.sin(angle)*r);
     const size=(.45+h(i*7)*1.8)*Math.pow(1-u,1.5)*(1-rain*.86);
     d.scale.setScalar(Math.max(.00001,size));d.rotation.set(0,angle,0);d.updateMatrix();this.embers.setMatrixAt(i,d.matrix);
   }
   this.embers.instanceMatrix.needsUpdate=true;
   this.embers.material.opacity=Math.max(.05,.75-rain*.67)*(1+night*.14);
 }
 dispose(){
   this.root.traverse(o=>{if(o.isMesh){o.geometry?.dispose();if(o.material&&o.material!==palette.leaf){(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>{if(!Object.values(palette).includes(m))m.dispose()});}}});
   this.world.scene.remove(this.root);
 }
}
