import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {VRMLoaderPlugin,VRMUtils} from '@pixiv/three-vrm';
import {OFFICIAL_AVATAR,normalizeAvatarHeight} from './avatarProviderV170.js';
import {RELEASE_AVATAR_PROFILE,actionProfile,seatedWeight,seatSurfaceWorldY,correctedRootHeight,getPoseTargets,avatarQaMetrics} from './avatarMotionV180.js';

/**
 * v1.8 — complete imported VRM, not an assortment of primitive facial parts.
 * The source avatar's face, hair shape and rig remain intact. Clothing is only
 * toned down via PBR material multiplication, without inventing new anatomy.
 */
export function survivalOutfitTint(materialName){
 const n=String(materialName||'').toLowerCase();
 if(/face|skin|body|hair|eyebrow|eyelash|eye_|mouth|teeth|tongue|iris|lip|head/.test(n))return null;
 if(/tops|shirt|uniform|jacket|vest|coat|sweater|cloth/.test(n))return '#6b7968';
 if(/bottoms|pants|trousers/.test(n))return '#757b6c';
 if(/shoes|boots/.test(n))return '#777b73';
 return null;
}
export class OfficialVRMAvatarV170 {
 constructor(world){
  this.world=world;this.status='loading';this.vrm=null;
  this.legacy=[...world.survivor.children];
  this.container=new THREE.Group();this.container.name='Licensed VRoid humanoid · no custom face';
  world.survivor.add(this.container);
  this.elapsed=0;this.rest=new Map();this.bones=new Map();this.baseY=0;this.neutralHipsWorldY=null;
  this._quat=new THREE.Quaternion();this._offset=new THREE.Quaternion();this._euler=new THREE.Euler();
  const loader=new GLTFLoader();loader.register(parser=>new VRMLoaderPlugin(parser));
  this.ready=loader.loadAsync(OFFICIAL_AVATAR.model).then(gltf=>{
   const vrm=gltf.userData.vrm;
   if(!vrm?.humanoid?.getNormalizedBoneNode)throw Error('Model has no VRM normalized humanoid rig');
   VRMUtils.rotateVRM0(vrm);
   const bounds=new THREE.Box3().setFromObject(vrm.scene),size=bounds.getSize(new THREE.Vector3());
   const scale=normalizeAvatarHeight(size.y);
   this.container.scale.setScalar(scale);
   this.baseY=-bounds.min.y*scale;
   this.container.position.y=this.baseY;
   this.container.add(vrm.scene);
   let meshes=0;
   vrm.scene.traverse(object=>{
    if(!object.isMesh&&!object.isSkinnedMesh)return;
    meshes++;object.castShadow=true;object.receiveShadow=true;
    // Only desaturate existing clothing; never recolor face/eyes/hair.
    // Avoid custom face, hairstyle, hat, beard or wind deformation.
    const mats=Array.isArray(object.material)?object.material:[object.material];
    const adjusted=mats.map(m=>{
      if(!m)return m;
      const tint=survivalOutfitTint(m.name);
      if(!tint||!m.color)return m;
      const clone=m.clone();clone.color.multiply(new THREE.Color(tint));return clone;
    });
    object.material=Array.isArray(object.material)?adjusted:adjusted[0];
   });
   if(meshes===0)throw Error('VRM contains no meshes');
   for(const name of ['hips','spine','chest','upperChest','neck','head','leftUpperArm','rightUpperArm','leftLowerArm','rightLowerArm','leftUpperLeg','rightUpperLeg','leftLowerLeg','rightLowerLeg','leftFoot','rightFoot']){
    const node=vrm.humanoid.getNormalizedBoneNode(name);
    if(node){this.bones.set(name,node);this.rest.set(name,node.quaternion.clone())}
   }
   if(!this.bones.has('hips')||!this.bones.has('leftUpperLeg')||!this.bones.has('rightUpperLeg'))throw Error('VRM lacks required seated joints');
   world.survivor.updateMatrixWorld(true);
   // Foot bones are a much more reliable floor anchor than glTF mesh AABBs:
   // imported VRM0 skeletons and skinned meshes sometimes report loose bounds.
   const feet=['leftFoot','rightFoot'].map(name=>this.bones.get(name))
     .filter(Boolean).map(node=>node.getWorldPosition(new THREE.Vector3()).y);
   if(feet.length){
     const actualFootY=Math.min(...feet);
     const intendedFootY=world.ROOF_Y+.25+.105;
     const correction=THREE.MathUtils.clamp(intendedFootY-actualFootY,-1.8,1.8);
     this.baseY+=correction;
     this.container.position.y=this.baseY;
     world.survivor.updateMatrixWorld(true);
   }
   this.neutralHipsWorldY=this.bones.get('hips').getWorldPosition(new THREE.Vector3()).y;
   this.vrm=vrm;this.status='ready';
   for(const old of this.legacy)old.visible=false;
   world.survivorAppearanceStatus={status:'ready',provider:'@pixiv/three-vrm',model:OFFICIAL_AVATAR.model,meshes,meshCount:meshes,format:'VRM humanoid with anchored motion'};
   world.report?.('VRM 생존자 로딩 · 의자 기준 관절 정렬');
   return true;
  }).catch(e=>{
   this.status='fallback';this.error=String(e?.message||e);
   this.container.removeFromParent();this.world.survivorAppearanceStatus={status:'fallback',reason:this.error};
   console.warn('[AFTERDAY] Full VRM unavailable; fallback appearance used. Run npm run download:assets.',e);
   return false;
  });
 }
 update(dt){
  if(!this.vrm)return;
  const d=THREE.MathUtils.clamp(dt,0,.05);this.elapsed+=d;
  const life=this.world.life,mode=actionProfile(life);
  // Legacy procedural actor remains hidden, including props that are toggled on
  // every frame by the old motion controller. No two stacked faces or bodies.
  for(const n of this.legacy)if(n.visible)n.visible=false;
  const targets=getPoseTargets(life,this.elapsed);
  const alpha=1-Math.exp(-RELEASE_AVATAR_PROFILE.boneBlendRate*d);
  for(const [name,rotation] of Object.entries(targets)){
   const bone=this.bones.get(name),base=this.rest.get(name);
   if(!bone||!base)continue;
   this._euler.set(rotation.x,rotation.y,rotation.z,'XYZ');
   this._offset.setFromEuler(this._euler);
   this._quat.copy(base).multiply(this._offset);
   bone.quaternion.slerp(this._quat,alpha);
  }
  const weight=seatedWeight(life);
  const seatY=seatSurfaceWorldY(this.world.ROOF_Y,life);
  const seatTarget=correctedRootHeight(this.baseY,this.neutralHipsWorldY,seatY);
  const baseTarget=this.baseY*(1-weight)+seatTarget*weight;
  // Critical fix: an actor's pelvis must move DOWN to the actual chair cushion.
  // Rotating thigh and shin bones alone leaves the character levitating.
  this.container.position.y=THREE.MathUtils.damp(this.container.position.y,baseTarget,RELEASE_AVATAR_PROFILE.rootBlendRate,d);
  // Expressions use authored VRM morphs only; no procedural mouth geometry.
  const exp=this.vrm.expressionManager;
  if(exp){
   try{exp.setValue('blink',Math.pow(Math.max(0,Math.sin(this.elapsed*1.5)),30))}catch{}
   try{exp.setValue('aa',mode==='sit'&&life.current==='guitar'&&life.stage==='perform'?.13:0)}catch{}
  }
  // No synthetic wind force on hair, coat or spring-bones.
  this.vrm.update(d);
 }
 /** Capture actual world joint coordinates for automated browser QA. */
 measureSeat(){
  if(!this.vrm)return {valid:false,reason:'VRM not loaded'};
  this.world.survivor.updateMatrixWorld(true);
  const at=n=>this.bones.get(n)?.getWorldPosition(new THREE.Vector3()).y;
  const seated=seatedWeight(this.world.life)>.98;
  return avatarQaMetrics({
   seatHeight:seatSurfaceWorldY(this.world.ROOF_Y,this.world.life),
   hipHeight:at('hips'),leftFootHeight:at('leftFoot'),rightFootHeight:at('rightFoot'),
   roofHeight:this.world.ROOF_Y+.25,seated
  });
 }
 dispose(){
  this.container?.removeFromParent();
  for(const n of this.legacy)n.visible=true;
  this.vrm=null;this.bones.clear();this.rest.clear();
 }
}
