/** A rescued NPC working beside the original survivor.
 * Reuses the already-loaded locally authored hero GLB with a separate mixer;
 * no new external model download, gameplay input, or second camera.
 */
import * as THREE from 'three';
import {clone as cloneRig} from 'three/addons/utils/SkeletonUtils.js';
export class SupportSurvivorVfx{
 constructor(world){
  this.world=world;this.present=false;this.created=false;
  this.group=new THREE.Group();
  this.group.name='Companion · non-playable rooftop survivor';
  this.group.position.set(-6.5,world.ROOF_Y+.25,14.6);
  this.group.rotation.y=-.45;
  world.scene.add(this.group);
  this.group.visible=false;
  const avatar=world.beardedSurvivor;
  this.ready=Promise.resolve(avatar?.ready).then(()=>{
   if(!avatar?.model||this.created)return;
   const model=cloneRig(avatar.model);
   model.name='Camp helper · recycled rig';
   model.scale.setScalar(.90);model.position.set(0,0,0);
   this.group.add(model);this.model=model;
   this.mixer=new THREE.AnimationMixer(model);
   const idle=avatar.clips?.get('Idle');
   if(idle)this.mixer.clipAction(idle).setLoop(THREE.LoopRepeat,Infinity).play();
   // Distinctive olive utility scarf on the original costume; model meshes,
   // textures and skeleton remain identical in ownership and scale.
   const band=new THREE.Mesh(
      new THREE.TorusGeometry(.46,.065,9,32),
      new THREE.MeshStandardMaterial({color:'#a9ae72',roughness:.91,metalness:.01})
   );
   band.position.set(0,1.85,0);band.rotation.x=Math.PI/2;
   this.group.add(band);this.band=band;
   this.created=true;
  }).catch(error=>{console.warn('[AFTERDAY] Support NPC rig unavailable',error);});
 }
 sync(game){this.present=Boolean(game?.companion?.present)&&game.survivalStatus!=='dead';this.group.visible=this.present;}
 update(dt,game){
  this.sync(game);
  if(this.present&&this.mixer)this.mixer.update(Math.max(0,Math.min(.12,dt)));
 }
 dispose(){
  this.mixer?.stopAllAction();
  this.group.parent?.remove(this.group);
  this.band?.geometry?.dispose();this.band?.material?.dispose();
 }
}
