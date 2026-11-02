import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {pose,SEAT} from './characterMotionPlanV190.js';
import {makePalmSocket} from './handAnchors.js';

const MODEL='./assets/models/afterday/afterday_bearded_survivor_v190.glb';
const JOINTS=['RigRoot','Pelvis','Spine','Chest','Neck','Head','Shoulder_L','UpperArm_L','ForeArm_L','Hand_L','Shoulder_R','UpperArm_R','ForeArm_R','Hand_R','UpperLeg_L','LowerLeg_L','Foot_L','UpperLeg_R','LowerLeg_R','Foot_R'];
const REQUIRED_CLIPS=['Idle','Walk','Run','Wave','Point','Radio'];
const W=(color,roughness=.8,metalness=.03)=>new THREE.MeshStandardMaterial({color,roughness,metalness});
const WOOD=W('#986334'),EDGE=W('#593b23'),STEEL=W('#80766a',.47,.35);

function makeGuitar(){
 const group=new THREE.Group();group.name='Original compact acoustic guitar · activity only';
 const body=new THREE.Mesh(new THREE.SphereGeometry(.30,28,20),WOOD);body.scale.set(1.23,1.08,.43);group.add(body);
 const waist=new THREE.Mesh(new THREE.SphereGeometry(.20,24,16),WOOD);waist.scale.set(1,.90,.45);waist.position.y=.20;group.add(waist);
 const hole=new THREE.Mesh(new THREE.CircleGeometry(.096,28),EDGE);hole.position.set(0,.10,.135);group.add(hole);
 const neck=new THREE.Mesh(new THREE.BoxGeometry(.13,.72,.085),EDGE);neck.position.y=.55;group.add(neck);
 for(let i=0;i<5;i++){
  const fret=new THREE.Mesh(new THREE.BoxGeometry(.16,.009,.097),STEEL);fret.position.set(0,.32+i*.107,.056);group.add(fret);
 }
 for(let i=0;i<4;i++){
  const string=new THREE.Mesh(new THREE.CylinderGeometry(.003,.003,.98,5),STEEL);
  string.position.set((i-1.5)*.025,.26,.145);group.add(string);
 }
 group.rotation.set(-.17,0,-.66);group.position.set(0,-.14,.68);group.scale.setScalar(.91);
 group.traverse(o=>{if(o.isMesh)o.castShadow=true});group.visible=false;return group;
}
function accessory(kind){
 const g=new THREE.Group();g.name=kind+' · original 3D prop';
 if(kind==='radio'){
  const box=new THREE.Mesh(new THREE.BoxGeometry(.18,.31,.115),W('#4b4b3a'));
  g.add(box);const antenna=new THREE.Mesh(new THREE.CylinderGeometry(.009,.009,.32,8),STEEL);antenna.position.set(.06,.28,0);antenna.rotation.z=-.12;g.add(antenna);
 }else if(kind==='canteen'){
  const body=new THREE.Mesh(new THREE.CylinderGeometry(.095,.11,.27,18),STEEL);g.add(body);
  const cap=new THREE.Mesh(new THREE.CylinderGeometry(.032,.032,.05,12),EDGE);cap.position.y=.16;g.add(cap);
  const strap=new THREE.Mesh(new THREE.TorusGeometry(.08,.008,10,28,Math.PI*1.15),W('#5a4431',.85,.02));strap.rotation.x=Math.PI*.5;strap.position.set(.02,.07,.0);g.add(strap);
 }else{
  const bowl=new THREE.Mesh(new THREE.SphereGeometry(.18,24,12,0,Math.PI*2,Math.PI*.50,Math.PI*.50),STEEL);
  bowl.rotation.x=Math.PI;g.add(bowl);
 }
 g.visible=false;return g;
}

/** A real mesh-based character, no VRM or floating 2D face/hair layers.
 * CharacterRoot is a child of the world survivor position, independent of old
 * facial/limb code which runs only on hidden legacy nodes.
 */
export class BeardedSurvivorV190{
 constructor(world,{loader=new GLTFLoader()}={}){
  this.world=world;this.status='loading';this.elapsed=0;this.nodes={};this.restRotations=new Map();this.restQuaternions=new Map();this.error=null;this.embeddedClip=null;
  this.legacy=[...world.survivor.children];
  // Prevent displaying the old VRM or distorted duplicate features even while loading.
  for(const obj of this.legacy)obj.visible=false;
  this.root=new THREE.Group();this.root.name='AFTERDAY · adult bearded survivor · complete 3D';
  this.sleepTilt=new THREE.Quaternion();this.sleepBack=new THREE.Quaternion();this.sleepTarget=new THREE.Quaternion();
  this.sleepAxisX=new THREE.Vector3(1,0,0);this.sleepAxisZ=new THREE.Vector3(0,0,1);
  this.armDelta=new THREE.Quaternion();this.armSwing=new THREE.Quaternion();this.armTarget=new THREE.Quaternion();this.armBase=new THREE.Quaternion();this.armTuck=new THREE.Quaternion();
  this.ikJoint=new THREE.Vector3();this.ikHand=new THREE.Vector3();this.ikTarget=new THREE.Vector3();this.ikFrom=new THREE.Vector3();this.ikTo=new THREE.Vector3();
  this.ikWorldQ=new THREE.Quaternion();this.ikParentQ=new THREE.Quaternion();this.ikDeltaQ=new THREE.Quaternion();this.ikLocalQ=new THREE.Quaternion();this.ikTempQ=new THREE.Quaternion();
  world.survivor.add(this.root);
  this.guitar=makeGuitar();this.root.add(this.guitar);
  this.radio=accessory('radio');this.root.add(this.radio);
  this.bowl=accessory('bowl');this.root.add(this.bowl);
  this.canteen=accessory('canteen');this.root.add(this.canteen);
  // Food is a separate, small 3D ration attached to the actual right-hand bone.
  this.ration=new THREE.Group();this.ration.name='3D ration · visible while moving hand to mouth';
  const foodMat=W('#b99c65',.93),crust=W('#7b5936',.91);
  const rationMesh=new THREE.Mesh(new THREE.IcosahedronGeometry(.102,1),foodMat);rationMesh.scale.set(1.30,.64,.86);this.ration.add(rationMesh);
  for(let i=0;i<3;i++){const crumb=new THREE.Mesh(new THREE.IcosahedronGeometry(.017+i*.004,0),crust);crumb.position.set((i-1)*.043,.045,.06);this.ration.add(crumb);}this.ration.visible=false;
  this.ready=loader.loadAsync(MODEL).then(gltf=>{
   const scene=gltf.scene;
   for(const n of JOINTS){
    this.nodes[n]=scene.getObjectByName(n);if(!this.nodes[n])throw Error('Missing articulated 3D joint: '+n);
    this.restRotations.set(this.nodes[n],this.nodes[n].rotation.clone());
    this.restQuaternions.set(this.nodes[n],this.nodes[n].quaternion.clone());
   }
   // Compatibility aliases keep the existing daily-life pose code readable.
   this.nodes.Torso=this.nodes.Chest;this.nodes.Knee_L=this.nodes.LowerLeg_L;this.nodes.Knee_R=this.nodes.LowerLeg_R;
   const b=new THREE.Box3().setFromObject(scene),s=b.getSize(new THREE.Vector3());
   if(s.y<2.5||s.y>3.6||s.x<.9||s.x>2.3)throw Error('Invalid character model dimensions '+s.toArray());
   scene.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});
   // Props MUST follow articulated character joints. Attaching them to a
   // stationary world root was the cause of prior floating guitar/radio props.
   this.palms={L:makePalmSocket(this.nodes.Hand_L,'L'),R:makePalmSocket(this.nodes.Hand_R,'R')};
   this.nodes.Chest.add(this.guitar);
   this.palms.R.add(this.radio,this.ration,this.canteen);
   this.palms.L.add(this.bowl);
   this.model=scene;this.root.add(scene);
   this.mixer=new THREE.AnimationMixer(scene);this.clips=new Map(gltf.animations.map(clip=>[clip.name,clip]));
   for(const name of REQUIRED_CLIPS)if(!this.clips.has(name))throw Error('Missing embedded animation clip: '+name);
   this.status='ready';
   world.survivorAppearanceStatus={status:'ready',provider:'TencentARC Pixal3D · Apple Silicon MLX',character:'Bearded adult in cap · integrated backpack · short limbs',rigNodes:JOINTS.length,animations:REQUIRED_CLIPS.length,format:'4096 textured PBR skinned GLB · 20-bone humanoid'};
   return true;
  }).catch(e=>{
   this.status='failed';this.error=String(e?.message||e);
   world.survivorAppearanceStatus={status:'failed',model:MODEL,error:this.error};
   console.error('[AFTERDAY] Original character GLB missing; old character remains hidden:',e);
   world.report?.('캐릭터 3D 모델 로딩 실패 · GLB 파일을 확인해 주세요');
   return false;
  });
 }
 setEmbeddedClip(name=null){
  if(this.status!=='ready')return false;
  if(this.clipAction){this.clipAction.fadeOut(.12);this.clipAction=null;}
  this.embeddedClip=null;
  if(!name){this.mixer.stopAllAction();for(const [node,rest] of this.restRotations)node.rotation.copy(rest);return true;}
  const clip=this.clips.get(name);if(!clip)return false;
  this.clipAction=this.mixer.clipAction(clip);this.clipAction.reset().setLoop(THREE.LoopRepeat,Infinity).fadeIn(.12).play();
  this.embeddedClip=name;return true;
 }
 setTransform(node,{pos=[0,0,0],rot=[0,0,0],scale=1}){
  node.position.set(...pos);node.rotation.set(...rot);
  if(typeof scale==='number')node.scale.setScalar(scale);else node.scale.set(...scale);
 }
 alignProps(p,life={}){
  const a=life.current||'idle',bite=p.bite||0,sip=p.sip||0;
  // All handheld items use the SAME real mesh-derived wrist socket. No offsets
  // in arbitrary shoulder or world coordinates, even when the actor rotates.
  this.setTransform(this.radio,{pos:[.018,-.10,.035],rot:[-.04,0,-.10],scale:.74});
  this.setTransform(this.canteen,{pos:[.018,.03,.035],rot:[-.10-.42*sip,0,-.06],scale:1});
  this.setTransform(this.ration,{pos:[.015,.045,.072],rot:[.06,0,.02],scale:1-.12*bite});
  this.setTransform(this.bowl,{pos:[-.012,.000,.115],rot:[0,0,.04],scale:1});
  // Body of the guitar rests across the lap at the same Y as the hands;
  // torso bind origin is near y=1.02, so a negative y would drop below the lap.
  // Pixal3D faces local -Z: the guitar must sit in FRONT of the torso.
  // The guitar must rest on the lap, not cover the chest. Chest world Y is
  // about 1.44 m while seated, so a negative local Y places the body at ~1.30 m.
  this.setTransform(this.guitar,{pos:[0,-.13,-.44],rot:[-.08,-.04,.30],scale:.93});
  if(a==='guitar')this.guitar.rotation.z+=Math.sin(this.elapsed*4.3)*.012;
 }
 solveArmIK(side,target,weight=.72,iterations=3){
  const n=this.nodes,hand=n['Hand_'+side],fore=n['ForeArm_'+side],upper=n['UpperArm_'+side];
  if(!hand||!fore||!upper)return;
  for(let pass=0;pass<iterations;pass++){
   for(const joint of [fore,upper]){
    this.root.updateMatrixWorld(true);
    joint.getWorldPosition(this.ikJoint);hand.getWorldPosition(this.ikHand);
    this.ikFrom.copy(this.ikHand).sub(this.ikJoint);this.ikTo.copy(target).sub(this.ikJoint);
    if(this.ikFrom.lengthSq()<1e-6||this.ikTo.lengthSq()<1e-6)continue;
    this.ikFrom.normalize();this.ikTo.normalize();
    this.ikDeltaQ.setFromUnitVectors(this.ikFrom,this.ikTo);
    joint.getWorldQuaternion(this.ikWorldQ);
    this.ikWorldQ.premultiply(this.ikDeltaQ);
    joint.parent.getWorldQuaternion(this.ikParentQ).invert();
    this.ikLocalQ.copy(this.ikParentQ).multiply(this.ikWorldQ).normalize();
    joint.quaternion.slerp(this.ikLocalQ,weight);
   }
  }
 }
 actionHandTarget(anchor,offset,out=this.ikTarget){
  out.set(...offset);anchor.localToWorld(out);return out;
 }
 applyActionArmIK(p,life,blend){
  if(!life||life.stage!=='perform'&&life.current!=='sleep')return;
  const a=life.current,n=this.nodes,w=Math.max(.42,Math.min(.82,.46+blend*.42));
  this.root.updateMatrixWorld(true);
  if(a==='wave'){
   const wob=Math.sin(this.elapsed*7.0),counter=Math.cos(this.elapsed*7.0);
   // A real hand path around the temple: the target travels laterally instead
   // of pinning the hand to one point while the whole arm rotates.
   this.actionHandTarget(n.Head,[.46+.145*wob,.13+.045*counter,-.12],this.ikTarget);
   this.solveArmIK('R',this.ikTarget,Math.min(.80,w),4);return;
  }
  if(a==='radio'){
   this.actionHandTarget(n.Head,[.19,-.015,-.135],this.ikTarget);
   this.solveArmIK('R',this.ikTarget,w,4);return;
  }
  if(a==='eat'){
   const bite=p.bite||0;
   const start=this.actionHandTarget(n.Chest,[.22,-.36,-.31],new THREE.Vector3());
   const end=this.actionHandTarget(n.Head,[.055,-.105,-.205],new THREE.Vector3());
   this.ikTarget.copy(start).lerp(end,bite);
   this.solveArmIK('R',this.ikTarget,w,4);
   this.actionHandTarget(n.Chest,[-.20,-.34,-.30],this.ikTarget);
   this.solveArmIK('L',this.ikTarget,w,4);return;
  }
  if(a==='guitar'){
   this.guitar.updateWorldMatrix(true,true);
   // Fretting hand grips the lower neck; keep it stable while the strumming
   // hand travels visibly across the strings/sound-hole.
   this.actionHandTarget(this.guitar,[-.015,.48,.105],this.ikTarget);
   this.solveArmIK('L',this.ikTarget,Math.min(.80,w+.05),5);
   const strum=Math.sin(this.elapsed*8.6);
   this.actionHandTarget(this.guitar,[.010+.085*strum,.055,.155],this.ikTarget);
   this.solveArmIK('R',this.ikTarget,Math.min(.80,w+.05),5);return;
  }
  if(a==='stretch'){
   const q=Math.max(0,Math.min(1,(life.stageTime||0)/Math.max(.01,life.performDuration||16)));
   let lo,ro;
   if(q<.43){lo=[-.27,.62,-.06];ro=[.27,.62,-.06];}
   else if(q<.73){lo=[-.54,.42,-.04];ro=[.25,.60,-.05];}
   else {lo=[-.28,.26,-.30];ro=[.28,.26,-.30];}
   this.actionHandTarget(n.Head,lo,this.ikTarget);this.solveArmIK('L',this.ikTarget,w,4);
   this.actionHandTarget(n.Head,ro,this.ikTarget);this.solveArmIK('R',this.ikTarget,w,4);return;
  }
  if(a==='sleep'&&['enter','perform','exit'].includes(life.stage)){
   const lie=p.sleeping||0,sit=Math.max(0,Math.min(1,1-lie));
   const y=.72*sit+1.18*lie,z=-.30*sit-.08*lie,x=.34;
   this.actionHandTarget(this.root,[-x,y,z],this.ikTarget);this.solveArmIK('L',this.ikTarget,w,3);
   this.actionHandTarget(this.root,[x,y,z],this.ikTarget);this.solveArmIK('R',this.ikTarget,w,3);
  }
 }
 update(dt,life=this.world.life){
  if(this.status!=='ready')return;
  dt=Math.min(.07,Math.max(dt||0,0));this.elapsed+=dt;
  const p=pose(life||{},this.elapsed),blend=1-Math.exp(-dt*8);
  const n=this.nodes;
  if(this.embeddedClip){
   this.mixer.update(dt);
   // The transferred clips encode a clean +/-X swing relative to the bind
   // pose, but the Pixal3D arm bind axes are yawed. Rebuild that delta around
   // the PARENT X axis so the hands travel front/back rather than up/down.
   if(this.embeddedClip==='Walk'||this.embeddedClip==='Run')for(const s of ['L','R']){
    const arm=n['UpperArm_'+s],rest=this.restQuaternions.get(arm);
    this.armDelta.copy(rest).invert().multiply(arm.quaternion).normalize();
    let swing=2*Math.atan2(this.armDelta.x,this.armDelta.w);
    if(swing>Math.PI)swing-=Math.PI*2;if(swing<-Math.PI)swing+=Math.PI*2;
    this.armSwing.setFromAxisAngle(this.sleepAxisX,swing);
    this.armTuck.setFromAxisAngle(this.sleepAxisZ,s==='L'?-.22:.22);
    this.armBase.copy(rest).multiply(this.armTuck);
    arm.quaternion.copy(this.armSwing).multiply(this.armBase);
   }
   this.alignProps(p,life);
   this.guitar.visible=p.showGuitar;this.radio.visible=p.showRadio;this.bowl.visible=p.showBowl;this.ration.visible=p.showFood;this.canteen.visible=p.showCanteen;
   return;
  }
  // Blender bones can have a non-zero bind rotation (the downward arm and leg
  // bones use PI around X). Game poses are offsets from that authored bind pose.
  const lerp=(o,axis,v)=>{const rest=this.restRotations.get(o)?.[axis]??0;o.rotation[axis]=THREE.MathUtils.lerp(o.rotation[axis],rest+v,blend);};
  this.model.position.y=THREE.MathUtils.lerp(this.model.position.y,p.rootY,blend);
  // Time-keyed standing -> seated on edge -> recline -> mattress -> wake.
  // Lay SUPINE: head points to -X (the actual pillow), face turns UP to +Y.
  // A world-X back rotation composed after the Z tilt avoids lying on the face.
  this.sleepTilt.setFromAxisAngle(this.sleepAxisZ,Math.PI*.5*p.sleeping);
  this.sleepBack.setFromAxisAngle(this.sleepAxisX,-Math.PI*.5*p.sleeping);
  this.sleepTarget.copy(this.sleepBack).multiply(this.sleepTilt);
  this.root.quaternion.slerp(this.sleepTarget,blend);
  const breathing=p.sleeping>.95&&life?.stage==='perform'?Math.sin(this.elapsed*1.55)*.012:0;
  this.root.position.y=THREE.MathUtils.lerp(this.root.position.y,p.lieHeight+breathing,blend);
  lerp(n.Chest,'x',p.torsoX);lerp(n.Chest,'z',p.torsoZ);lerp(n.Head,'x',p.headX);lerp(n.Head,'y',p.headY);
  for(const s of ['L','R']){
   const arm=n['UpperArm_'+s];
   const rest=this.restQuaternions.get(arm);
   this.armTuck.setFromAxisAngle(this.sleepAxisZ,p[s].armZ);
   this.armBase.copy(rest).multiply(this.armTuck);
   this.armSwing.setFromAxisAngle(this.sleepAxisX,p[s].armX);
   this.armTarget.copy(this.armSwing).multiply(this.armBase);
   arm.quaternion.slerp(this.armTarget,blend);
   lerp(n['ForeArm_'+s],'x',p[s].forearmX||0);
   lerp(n['Hand_'+s],'x',p[s].handX||0);lerp(n['Hand_'+s],'y',p[s].handY||0);lerp(n['Hand_'+s],'z',p[s].handZ||0);
   lerp(n['UpperLeg_'+s],'x',p[s].thighX);lerp(n['LowerLeg_'+s],'x',p[s].kneeX);lerp(n['Foot_'+s],'x',p[s].footX);
  }
  this.alignProps(p,life);
  this.applyActionArmIK(p,life,blend);
  this.guitar.visible=p.showGuitar;this.radio.visible=p.showRadio;this.bowl.visible=p.showBowl;this.ration.visible=p.showFood;this.canteen.visible=p.showCanteen;
  // The guitar is animated inside alignProps; avoid cumulative rotation drift.
 }
 dispose(){this.mixer?.stopAllAction();if(this.model)this.root.remove(this.model);this.world.survivor.remove(this.root);}
}
export const BEARDED_CHARACTER_ASSET=MODEL;
export const BEARDED_CHARACTER_JOINTS=JOINTS;
export const BEARDED_CHARACTER_CLIPS=REQUIRED_CLIPS;
export const CHIBI_FURNITURE_SCALE=SEAT.chairScale;
