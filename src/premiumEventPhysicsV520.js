import * as THREE from 'three';

/** AFTERDAY 5.2 original in-world performance, not a second renderer.
 * Cosmetic only: all equipment/health/resources are owned by simulation.js.
 */
const E=t=>{const x=THREE.MathUtils.clamp(t,0,1);return x*x*(3-2*x);};
const R=n=>{const t=Math.sin(n*127.1+13.9)*43758.5453;return t-Math.floor(t);};
export const TENT_BUILD_SECONDS=7.4;
export const IMPACT_SECONDS=6.2;
export const BUILD_DEBRIS_DESKTOP=22;
export const BUILD_DEBRIS_MOBILE=10;
export function tentAssemblyProgress(seconds){
 return E(Math.max(0,Number(seconds)||0)/TENT_BUILD_SECONDS);
}
export function bounceHeight(v,g,time){
 const t=Math.max(0,Number(time)||0);
 return Math.max(0,v*t-.5*g*t*t);
}
function pole(parent,length,at,mat){
 const m=new THREE.Mesh(new THREE.CylinderGeometry(.075,.095,length,8),mat);
 m.position.set(...at);m.castShadow=true;parent.add(m);return m;
}
function buildFabric(){
 const U=12,V=8,positions=[],uv=[],indices=[];
 for(let i=0;i<=U;i++)for(let j=0;j<=V;j++){
  const u=i/U,v=j/V;positions.push(0,0,0);uv.push(u,v);
  if(i<U&&j<V){const a=i*(V+1)+j;indices.push(a,a+1,a+V+1,a+1,a+V+2,a+V+1);}
 }
 const g=new THREE.BufferGeometry();
 g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
 g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(indices);
 return {g,U,V};
}
export class PremiumEventPhysicsV520{
 constructor(world){
  this.world=world;this.clock=0;this.kind='';this.tentAge=0;this.impactAge=0;
  this.tentFinished=true;this.tentActive=false;this.debrisActive=false;
  this.reduceMotion=Boolean(world.reducedMotion);this.isMobile=Boolean(world.isMobile);
  this.tent=new THREE.Group();this.tent.name='Physical tent frame raising and canvas unfolding';
  this.tent.position.set(-8,world.ROOF_Y+.3,-6);world.scene.add(this.tent);
  const canvasMaterial=new THREE.MeshStandardMaterial({
   color:'#6d7164',roughness:.96,metalness:0,side:THREE.DoubleSide,flatShading:false
  });
  const frameMaterial=new THREE.MeshStandardMaterial({color:'#6e6c60',roughness:.72,metalness:.42});
  const {g,U,V}=buildFabric();this.fabricGeo=g;this.U=U;this.V=V;
  this.fabric=new THREE.Mesh(g,canvasMaterial);this.fabric.castShadow=true;this.fabric.receiveShadow=true;
  this.fabric.frustumCulled=false;this.tent.add(this.fabric);
  this.poles=[];
  for(const x of [-4.65,4.65])for(const z of [-3.4,3.4]){
   const p=pole(this.tent,5.5,[x,2.75,z],frameMaterial);
   this.poles.push({mesh:p,x,z});
  }
  const ridge=pole(this.tent,8.2,[0,5.35,0],frameMaterial);
  ridge.rotation.x=Math.PI/2;this.ridge=ridge;
  this.tent.visible=false;
  // Storm shards are a single GPU instanced draw call with rough, irregular stone.
  const count=this.isMobile?BUILD_DEBRIS_MOBILE:BUILD_DEBRIS_DESKTOP;
  this.fragmentCount=count;
  this.fragmentGeometry=new THREE.TetrahedronGeometry(.48,0);
  this.fragmentMaterial=new THREE.MeshStandardMaterial({
   color:'#a6a59b',roughness:.92,metalness:.06,flatShading:true
  });
  this.fragments=new THREE.InstancedMesh(this.fragmentGeometry,this.fragmentMaterial,count);
  this.fragments.name='Actual rooftop debris: ballistic entry, bounce and floor collision';
  this.fragments.castShadow=!this.isMobile;this.fragments.receiveShadow=false;
  this.fragments.frustumCulled=false;this.fragments.visible=false;
  world.scene.add(this.fragments);
  this.dummy=new THREE.Object3D();this.fragmentsState=[];
  const colors=['#555a56','#777069','#4b5960','#816d56','#89908d'];
  for(let i=0;i<count;i++)this.fragments.setColorAt(i,new THREE.Color(colors[i%colors.length]));
  this.fragments.instanceColor.needsUpdate=true;
 }
 play(type){
  if(type==='tent'){
   this.tentAge=0;this.tentActive=true;this.tentFinished=false;
   this.tent.visible=true;this.applyTentVisibility();
   return true;
  }
  if(type==='tornadoNear'||type==='tornadoDirect'){
   this.kind=type;this.impactAge=0;this.debrisActive=true;
   this.fragments.visible=true;this.fragmentsState.length=0;
   const severity=type==='tornadoDirect'?1:.58,roof=this.world.ROOF_Y;
   // Use the existing 3D tornado's actual track direction, never a random
   // fake storm centre. Fragment paths remain within the ONE playable roof.
   const pos=this.world.cinematicTornado?.root?.position;
   const direction=new THREE.Vector2(pos?.x||1,pos?.z||1).normalize();
   for(let i=0;i<this.fragmentCount;i++){
    const spread=(R(i*19+3)-.5)*36;
    const startX=direction.x*24-direction.y*spread;
    const startZ=direction.y*24+direction.x*spread;
    const speed=9+R(i*41+9)*9,side=(R(i*23+21)-.5)*7;
    this.fragmentsState.push({
      position:new THREE.Vector3(startX,roof+6+R(i*13+5)*12,startZ),
      velocity:new THREE.Vector3(-direction.x*speed-direction.y*side,
        1+R(i*47+14)*4,-direction.y*speed+direction.x*side),
      spin:new THREE.Vector3(R(i*29)*5,R(i*33)*7,R(i*17)*4),
      scale:.31+R(i*53+4)*(.70*severity),
      settled:false,bounces:0
    });
   }
   return true;
  }
  return false;
 }
 applyTentVisibility(){
  if(!this.tentActive)return;
  const visible=false;
  if(this.world.shelter)this.world.shelter.visible=visible;
  if(this.world.shelterAsset)this.world.shelterAsset.visible=visible;
  if(this.world.sleepBedding?.group)this.world.sleepBedding.group.visible=visible;
 }
 completeTent(){
  this.tentAge=TENT_BUILD_SECONDS;this.tentActive=false;this.tentFinished=true;
  this.tent.visible=false;
  // The real permanent scene objects and their cached PBR textures replace
  // the temporary construction frame. The tent is already owned by the save.
  if(this.world.activeKit?.tent){
   if(this.world.shelter)this.world.shelter.visible=true;
   if(this.world.shelterAsset)this.world.shelterAsset.visible=true;
   if(this.world.sleepBedding?.group)this.world.sleepBedding.group.visible=true;
  }
 }
 update(dt,{reducedMotion=false,weather='clear'}={}){
  const step=Math.max(0,Math.min(.07,Number(dt)||0));
  if(this.tentActive){
   this.tentAge+=step;
   const f=tentAssemblyProgress(this.tentAge);
   // A roof-sized folded tarpaulin rises into the existing shelter footprint.
   // Continuously updating the same original vertex buffer avoids mesh pops.
   const pos=this.fabric.geometry.getAttribute('position');
   for(let i=0;i<=this.U;i++)for(let j=0;j<=this.V;j++){
    const u=i/this.U,v=j/this.V;
    const x=(u-.5)*9.2,z=(v-.5)*7.7;
    const up=E((f-.08)/.83);
    const wrinkle=(1-up)*.14*Math.sin(i*1.7+j*.8+this.tentAge*1.8);
    pos.setXYZ(i*(this.V+1)+j,
      THREE.MathUtils.lerp((u-.5)*1.6,x,up),
      THREE.MathUtils.lerp(.20,.48+4.85*(1-Math.pow(Math.abs(2*u-1),1.5)),up)+wrinkle,
      THREE.MathUtils.lerp((v-.5)*1.3,z,up));
   }
   pos.needsUpdate=true;this.fabric.geometry.computeVertexNormals();
   for(const pole of this.poles){
    const h=E((f-.10)/.75);
    pole.mesh.position.y=.22+h*2.75;
    pole.mesh.rotation.z=(1-h)*(pole.x<0?Math.PI/2:-Math.PI/2);
   }
   this.ridge.position.y=.25+5.1*E((f-.30)/.60);
   this.tent.rotation.z=reducedMotion?0:Math.sin(this.tentAge*2.9)*.011*(1-f);
   this.applyTentVisibility();
   if(this.tentAge>=TENT_BUILD_SECONDS)this.completeTent();
  }
  if(this.debrisActive){
   this.impactAge+=step;
   const floor=this.world.ROOF_Y+.26;
   const damp=(weather==='rain'||weather==='storm')?0.69:0.82;
   for(let i=0;i<this.fragmentsState.length;i++){
    const p=this.fragmentsState[i];
    if(!p.settled){
     p.velocity.y-=22*step;
     p.position.addScaledVector(p.velocity,step);
     if(p.position.y<=floor){
      p.position.y=floor;
      p.bounces++;
      p.velocity.y=Math.abs(p.velocity.y)*(.29*Math.pow(damp,p.bounces));
      p.velocity.x*=damp;p.velocity.z*=damp;
      if(p.bounces>=3||p.velocity.y<.45)p.settled=true;
     }
    }
    // A fragment cannot fly forever or penetrate the roof during a frame dip.
    if(p.position.y<floor)p.position.y=floor;
    p.position.x=THREE.MathUtils.clamp(p.position.x,-22.5,22.5);
    p.position.z=THREE.MathUtils.clamp(p.position.z,-22.5,22.5);
    this.dummy.position.copy(p.position);
    this.dummy.rotation.set(this.impactAge*p.spin.x,this.impactAge*p.spin.y,this.impactAge*p.spin.z);
    const fade=1-E((this.impactAge-4.3)/1.9);
    this.dummy.scale.setScalar(p.scale*fade);
    this.dummy.updateMatrix();this.fragments.setMatrixAt(i,this.dummy.matrix);
   }
   this.fragments.instanceMatrix.needsUpdate=true;
   // Hit reaction for the existing controllable actor. It changes no physical
   // position/health and is reset on completion. Accessibility disables it.
   const actor=this.world.survivor;
   if(actor){
    const a=this.impactAge,amp=(this.kind==='tornadoDirect'?.12:.065)*
      (reducedMotion?0:1)*Math.max(0,1-a/1.65);
    actor.rotation.z=Math.sin(a*14)*amp;
    actor.rotation.x=-Math.abs(Math.sin(a*8))*.40*amp;
   }
   if(this.impactAge>=IMPACT_SECONDS)this.finishDebris();
  }
 }
 finishDebris(){
  this.debrisActive=false;this.fragments.visible=false;this.fragmentsState.length=0;
  if(this.world.survivor){this.world.survivor.rotation.x=0;this.world.survivor.rotation.z=0;}
 }
 dispose(){
  this.completeTent();this.finishDebris();
  this.tent.parent?.remove(this.tent);this.fragments.parent?.remove(this.fragments);
  this.fabricGeo.dispose();this.fabric.material.dispose();
  for(const pole of this.poles)pole.mesh.geometry.dispose();
  this.ridge.geometry.dispose();this.poles[0]?.mesh.material?.dispose();
  this.fragmentGeometry.dispose();this.fragmentMaterial.dispose();
 }
}