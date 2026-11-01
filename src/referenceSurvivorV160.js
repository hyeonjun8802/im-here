import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {REFERENCE_HEAD_FILE,REFERENCE_SUIT_FILE,REFERENCE_SUIT_PARTS,validReferenceHeadBounds} from './referenceSurvivorPlanV160.js';

/**
 * Reference-built continuous 3D human head. Replaces (not stacks onto) all
 * old face, brow, iris and hair objects. The animation hierarchy/limbs remain
 * unchanged: the GLB sits inside world.survivorHead and follows all actions.
 * The old model is retained only as a loading/error fallback.
 */
export class ReferenceSurvivorV160{
 constructor(world){
  this.world=world;this.head=world.survivorHead;this.legacy=[...this.head.children];
  this.status='loading';this.loaded=null;this.error=null;this.garments=[];this.mixer=null;
  // QA compared the experimental smooth garment shell against the detailed
  // existing clothes. Do NOT ship that regression by default. The GLB outfit
  // can be inspected explicitly with ?experimentalSuit=1.
  this.experimentalSuit=typeof location!=='undefined' && new URLSearchParams(location.search).get('experimentalSuit')==='1';
  this.suitStatus=this.experimentalSuit?'loading':'disabled';
  this.suitReady=this.experimentalSuit?this.loadSuit():Promise.resolve(false);
  this.ready=new GLTFLoader().loadAsync(REFERENCE_HEAD_FILE).then(gltf=>{
   const model=gltf.scene;
   const dimensions=new THREE.Box3().setFromObject(model).getSize(new THREE.Vector3()).toArray();
   if(!validReferenceHeadBounds(dimensions))throw new Error('Head GLB out of bounds: '+dimensions.join(', '));
   // If GLB texture is missing or unsupported, do not switch to a featureless skull.
   let textured=false,meshes=0;
   model.traverse(o=>{
    if(!o.isMesh)return;meshes++;
    if(o.material?.map)textured=true;
    o.castShadow=true;o.receiveShadow=true;
    o.frustumCulled=true;
   });
   if(!textured||meshes<5)throw new Error('Reference face texture/geometry missing');
   model.name='AFTERDAY Reference survivor GLB – unified organic face';
   // Keep the head pivot so sit/eat/guitar/radio/head-turn still work.
   this.head.add(model);this.loaded=model;
   // Future truly rigged GLBs may ship authored animation clips. The current
   // reference face is static geometry that moves via the existing head pivot.
   if(gltf.animations?.length){this.mixer=new THREE.AnimationMixer(model);this.clips=gltf.animations;}
   for(const old of this.legacy)old.visible=false;
   this.status='loaded';
   world.survivorAppearanceStatus={status:'loaded',file:REFERENCE_HEAD_FILE,meshes,dimensions};
   return true;
  }).catch(err=>{
   this.status='fallback';this.error=err.message;
   world.survivorAppearanceStatus={status:'fallback',reason:err.message};
   console.warn('[AFTERDAY] Reference character GLB unavailable; original head retained:',err);
   return false;
  });
 }
 async loadSuit(){
  try{
   const scene=(await new GLTFLoader().loadAsync(REFERENCE_SUIT_FILE)).scene;
   const pieces=Object.fromEntries(REFERENCE_SUIT_PARTS.map(name=>[name,scene.getObjectByName(name)]));
   if(Object.values(pieces).some(obj=>!obj?.isMesh))throw new Error('Suit GLB missing one or more named organic meshes');
   const pairs=[
    [pieces['Organic Jacket Shell'],this.world.survivorTorso],
    ...[this.world.leftArm,this.world.rightArm].map(p=>[pieces['Organic Arm Sleeve'],p]),
    ...[this.world.leftLeg,this.world.rightLeg].map(p=>[pieces['Organic Thigh Trouser'],p]),
    ...this.world.survivorKnees.map(p=>[pieces['Organic Calf Trouser'],p])
   ];
   if(pairs.some(([,parent])=>!parent))throw new Error('Survivor animation joint missing');
   for(const [source,parent] of pairs){
    const garment=source.clone();
    garment.name='AFTERDAY Reference Suit GLB '+source.name;
    garment.castShadow=true;garment.receiveShadow=true;
    // The authored jacket stays attached to the existing animated torso; arms
    // and trousers follow limb joints during walk/sit/guitar/radio activities.
    parent.add(garment);this.garments.push(garment);
   }
   this.suitStatus='loaded';
   this.world.survivorSuitStatus={status:'loaded',file:REFERENCE_SUIT_FILE,parts:this.garments.length};
   return true;
  }catch(err){
   this.suitStatus='fallback';this.world.survivorSuitStatus={status:'fallback',reason:String(err)};
   console.warn('[AFTERDAY] Organic suit GLB unavailable; original articulated clothing retained:',err);
   return false;
  }
 }
 update(){
  if(!this.loaded)return;
  // Existing v1.1-v1.5 animator may reactivate a rain hood; never allow it to
  // overlay/disfigure the new unified head mesh. New head itself stays visible.
  for(const old of this.legacy)if(old.visible)old.visible=false;
 }
 dispose(){
  this.mixer?.stopAllAction();
  // Model resources can be shared by left/right garment copies: dispose once.
  const geometries=new Set(),materials=new Set(),textures=new Set();
  for(const obj of [this.loaded,...this.garments]){
   if(!obj)continue;obj.parent?.remove(obj);
   obj.traverse(o=>{if(!o.isMesh)return;geometries.add(o.geometry);const mats=Array.isArray(o.material)?o.material:[o.material];for(const m of mats){if(!m)continue;materials.add(m);if(m.map)textures.add(m.map);if(m.normalMap)textures.add(m.normalMap);}});
  }
  for(const g of geometries)g?.dispose();
  for(const m of materials)m?.dispose();
  for(const t of textures)t?.dispose();
  for(const old of this.legacy)old.visible=true;
 }
}
