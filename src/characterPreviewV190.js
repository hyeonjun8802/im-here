/** Independent Three.js visual QA scene; exactly the GLB used by AFTERDAY game. */
import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {BeardedSurvivorV190} from './beardedSurvivorV190.js';
import {SEAT} from './characterMotionPlanV190.js';
import {sleepAnimation,SLEEP_ENTER_SECONDS,SLEEP_EXIT_SECONDS} from './dailyCycle.js';
import {COT,installOriginalCot,sleepPosition,SHELTER_ASSET} from './sleepBedding.js';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';

const $=s=>document.querySelector(s),el=$('#viewport');
const renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.setSize(innerWidth,innerHeight);
renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.23;
el.appendChild(renderer.domElement);
const scene=new THREE.Scene();scene.background=new THREE.Color('#202b31');scene.fog=new THREE.FogExp2('#202b31',.014);
// Pixal3D's authored face points toward local -Z. Start on that side so the
// QA page and the corrected in-game locomotion use the same visible "front".
const camera=new THREE.PerspectiveCamera(35,innerWidth/innerHeight,.1,120);camera.position.set(0,2.85,-7.6);
const controls=new OrbitControls(camera,renderer.domElement);controls.target.set(0,1.66,0);controls.enableDamping=true;controls.dampingFactor=.085;controls.minDistance=3.5;controls.maxDistance=14;controls.maxPolarAngle=Math.PI*.49;
scene.add(new THREE.HemisphereLight('#d9e5ef','#473e31',2.15));
const sun=new THREE.DirectionalLight('#ffdaad',3.5);sun.position.set(-3,8,6);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);sun.shadow.camera.left=-8;sun.shadow.camera.right=8;sun.shadow.camera.top=8;sun.shadow.camera.bottom=-8;sun.shadow.normalBias=.014;scene.add(sun);
const rim=new THREE.DirectionalLight('#91b9e4',2);rim.position.set(4,4,-5);scene.add(rim);
const material=(c,r=.88,m=0)=>new THREE.MeshStandardMaterial({color:c,roughness:r,metalness:m});
const ground=new THREE.Mesh(new THREE.CircleGeometry(14,100),material('#38443e'));
ground.rotation.x=-Math.PI/2;ground.receiveShadow=true;ground.position.y=-.02;scene.add(ground);
const mat=material('#6b6251'),iron=material('#6b7470',.55,.6),fabric=material('#596054');
// Actual compact folding chair with the seat at y = SEAT.seatAboveRoof.
const chair=new THREE.Group();chair.name='Compact survival folding chair: seat matched to avatar hip';scene.add(chair);
chair.position.set(0,.15,0);chair.scale.setScalar(SEAT.chairScale);
function box(w,h,d,x,y,z,m,parent=chair){const o=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m);o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;parent.add(o);return o;}
box(1.1,.09,.94,0,.91,0,fabric);box(1.12,.75,.10,0,1.53,.46,fabric);
for(const s of [-1,1])for(const z of [-.35,.35]){
 const bar=box(.052,.88,.055,s*.43,.45,z,iron);bar.rotation.z=s*.14;
}
for(const s of [-1,1])box(.046,1.10,.05,s*.48,1.34,.47,iron);
box(1,.035,.06,0,.82,.41,iron);
// small camping rug and warm practical lantern help evaluate floor shadows
const rug=new THREE.Mesh(new THREE.CircleGeometry(2.2,48),material('#66553c'));
rug.rotation.x=-Math.PI/2;rug.position.y=.005;rug.receiveShadow=true;scene.add(rug);
const lamp=new THREE.PointLight('#f5b76b',.55,5,2);lamp.position.set(2.1,1.4,1);scene.add(lamp);

// This QA uses the SAME original cot mesh, pillow and animated blanket as the game.
const bedding=installOriginalCot(scene,0);
const cot=bedding.group;let shelterModel=null;
const PREVIEW_SHIFT=[-COT.x,-COT.z];
// Import the SAME shelter GLB used in the game, not a procedural stand-in.
new GLTFLoader().load('./assets/models/afterday/afterday_shelter_pbr.glb',gltf=>{
 const actual=gltf.scene;shelterModel=actual;actual.position.set(SHELTER_ASSET.x+PREVIEW_SHIFT[0],SHELTER_ASSET.baseY,SHELTER_ASSET.z+PREVIEW_SHIFT[1]);
 actual.traverse(o=>{if(o.isMesh&&!/narrow sleeping pallet|pillow_|folded sleeping blanket/.test(o.name))o.visible=false;});
 scene.add(actual);bedding.useShelterAsset(actual);actual.visible=selected.startsWith('sleep');
});
cot.position.set(PREVIEW_SHIFT[0],0,PREVIEW_SHIFT[1]);
cot.visible=false;
// Character appearance is the same GLB and same motion adapter as the real game.
const fakeWorld={survivor:new THREE.Group(),life:{current:'idle',stage:'idle',stageTime:0},report:msg=>console.log(msg)};
fakeWorld.survivor.position.set(0,.25,0);scene.add(fakeWorld.survivor);
const actor=new BeardedSurvivorV190(fakeWorld);
const params=new URLSearchParams(location.search);let selected=params.get('pose')||'idle';
const VIEWS=['front','left','right','back'];let selectedView=VIEWS.includes(params.get('view'))?params.get('view'):'front';
let qaPaused=params.has('at'),qaAt=Math.max(0,Number(params.get('at'))||0);
if(!['idle','walk','run','wave','point','sit','eat','drink','guitar','radio','stretch','watch','sleep-enter','sleep-sit','sleep','sleep-exit'].includes(selected))selected='idle';
const state=fakeWorld.life;
function setView(view=selectedView,isSleep=selected.startsWith('sleep')){
 selectedView=VIEWS.includes(view)?view:'front';
 const target=isSleep?new THREE.Vector3(1.45,1.18,0):new THREE.Vector3(0,1.66,0);
 const distance=isSleep?9:7.6,height=isSleep?3.6:1.19;
 const direction={front:[0,0,-1],left:[-1,0,0],right:[1,0,0],back:[0,0,1]}[selectedView];
 controls.target.copy(target);camera.position.set(target.x+direction[0]*distance,target.y+height,target.z+direction[2]*distance);
 controls.update();
 document.querySelectorAll('[data-view]').forEach(b=>b.classList.toggle('active',b.dataset.view===selectedView));
}
function choose(next){selected=next;
 const isSleep=next.startsWith('sleep');
 const locomotion=['walk','run'].includes(next),gesture=['wave','point'].includes(next);
 state.current=isSleep?'sleep':locomotion?'watch':next;
 state.stage=next==='sleep-enter'||next==='sleep-sit'?'enter':next==='sleep-exit'?'exit':locomotion?'approach':next==='idle'?'idle':'perform';
 state.stageTime=next==='sleep-sit'?SLEEP_ENTER_SECONDS*.34:qaPaused?qaAt:0;
 const pt=sleepPosition(sleepAnimation(state.stage,state.stageTime));
 fakeWorld.survivor.position.x=isSleep?pt[0]+PREVIEW_SHIFT[0]:0;
 fakeWorld.survivor.position.z=isSleep?pt[1]+PREVIEW_SHIFT[1]:0;
 fakeWorld.survivor.rotation.y=isSleep?0:0;
 document.querySelectorAll('[data-pose]').forEach(b=>b.classList.toggle('active',b.dataset.pose===next));
 chair.visible=['sit','eat','guitar'].includes(next);
 cot.visible=isSleep;
 if(shelterModel)shelterModel.visible=isSleep;
 setView(selectedView,isSleep);
 // Default QA mirrors the actual game's procedural pose adapter. Raw embedded
 // clip inspection remains available with ?clips=1 for asset-level diagnosis.
 const embedded=params.get('clips')==='1'?{idle:'Idle',walk:'Walk',run:'Run',wave:'Wave',point:'Point',radio:'Radio'}[next]:null;
 if(actor.status==='ready')actor.setEmbeddedClip(embedded||null);
 $('#status').textContent=actor.status==='ready'?`실제 게임 Pixal3D GLB · 4K PBR · 휴머노이드 20본 · 6클립 · ${next}\nIdle / Walk / Run / Wave / Point / Radio`:actor.status==='failed'?'3D GLB 로딩 실패: '+actor.error:'3D GLB 로딩 중…';
}
document.querySelectorAll('[data-pose]').forEach(b=>b.addEventListener('click',()=>choose(b.dataset.pose)));
document.querySelectorAll('[data-view]').forEach(b=>b.addEventListener('click',()=>setView(b.dataset.view)));
const freeze=$('#qa-freeze'),timeInput=$('#qa-time'),timeValue=$('#qa-time-value');
freeze.checked=qaPaused;timeInput.value=String(qaAt);timeValue.value=`${qaAt.toFixed(1)}s`;
freeze.addEventListener('change',()=>{qaPaused=freeze.checked;if(qaPaused)state.stageTime=qaAt});
timeInput.addEventListener('input',()=>{qaAt=Number(timeInput.value);timeValue.value=`${qaAt.toFixed(1)}s`;qaPaused=true;freeze.checked=true;state.stageTime=qaAt});
actor.ready.then(()=>choose(selected));choose(selected);
let previous=performance.now();let elapsed=0;
function frame(now){const dt=Math.min(.05,(now-previous)/1000||0);previous=now;elapsed+=dt;
 if(!qaPaused)state.stageTime+=dt;else state.stageTime=selected==='sleep-sit'?SLEEP_ENTER_SECONDS*.34:qaAt;
 if(selected==='sleep-enter'){
  const f=sleepAnimation('enter',state.stageTime),pt=sleepPosition(f);
  fakeWorld.survivor.position.set(pt[0]+PREVIEW_SHIFT[0],.25,pt[1]+PREVIEW_SHIFT[1]);
  fakeWorld.survivor.rotation.y=0;bedding.setCover(f.cover);
  if(!qaPaused&&state.stageTime>=SLEEP_ENTER_SECONDS){state.stage='perform';state.stageTime=0;selected='sleep';}
 }else if(selected==='sleep-sit'){
  state.stageTime=SLEEP_ENTER_SECONDS*.34;
  const f=sleepAnimation('enter',state.stageTime),pt=sleepPosition(f);
  fakeWorld.survivor.position.set(pt[0]+PREVIEW_SHIFT[0],.25,pt[1]+PREVIEW_SHIFT[1]);
  fakeWorld.survivor.rotation.y=0;bedding.setCover(0);
 }else if(selected==='sleep-exit'){
  const f=sleepAnimation('exit',state.stageTime),pt=sleepPosition(f);
  fakeWorld.survivor.position.set(pt[0]+PREVIEW_SHIFT[0],.25,pt[1]+PREVIEW_SHIFT[1]);
  fakeWorld.survivor.rotation.y=0;bedding.setCover(f.cover);
  if(!qaPaused&&state.stageTime>=SLEEP_EXIT_SECONDS){state.stage='idle';state.stageTime=0;selected='sleep-exit-done';state.current='idle';bedding.setCover(0);}
 }else if(selected==='sleep'){
  const f=sleepAnimation('perform'),pt=sleepPosition(f);
  fakeWorld.survivor.position.set(pt[0]+PREVIEW_SHIFT[0],.25,pt[1]+PREVIEW_SHIFT[1]);
  fakeWorld.survivor.rotation.y=0;bedding.setCover(1);
 }else if(selected==='sleep-exit-done'){
  const f=sleepAnimation('idle'),pt=sleepPosition(f);
  fakeWorld.survivor.position.set(pt[0]+PREVIEW_SHIFT[0],.25,pt[1]+PREVIEW_SHIFT[1]);
  bedding.setCover(0);
 }else if(selected==='walk')fakeWorld.survivor.position.x=Math.sin(elapsed*1.2)*.95;
 else if(selected==='run')fakeWorld.survivor.position.x=Math.sin(elapsed*1.8)*1.35;
 else fakeWorld.survivor.position.x=THREE.MathUtils.damp(fakeWorld.survivor.position.x,0,4,dt);
 if(qaPaused)actor.elapsed=qaAt;
 actor.update(dt,state);
 if(qaPaused&&actor.clipAction){actor.mixer.setTime(qaAt);actor.update(0,state)}
 controls.update();renderer.render(scene,camera);
 const qaWorldPos=name=>{const o=actor.nodes?.[name];if(!o)return null;const v=new THREE.Vector3();o.getWorldPosition(v);return v.toArray().map(n=>Number(n.toFixed(4)));};
 const qaObjectPos=o=>{if(!o)return null;const v=new THREE.Vector3();o.getWorldPosition(v);return v.toArray().map(n=>Number(n.toFixed(4)));};
 window.qaAfterdayCharacter={
  status:actor.status,pose:selected,view:selectedView,time:state.stageTime,rigCount:actor.status==='ready'?20:0,
  clipCount:actor.clips?.size||0,activeClip:actor.embeddedClip,seatAboveRoof:SEAT.seatAboveRoof,
  poseRootY:actor.model?.position.y??null,modelLoaded:actor.status==='ready',
  joints:actor.status==='ready'?{
   root:qaWorldPos('RigRoot'),pelvis:qaWorldPos('Pelvis'),spine:qaWorldPos('Spine'),chest:qaWorldPos('Chest'),neck:qaWorldPos('Neck'),head:qaWorldPos('Head'),
   shoulderL:qaWorldPos('Shoulder_L'),upperL:qaWorldPos('UpperArm_L'),elbowL:qaWorldPos('ForeArm_L'),handL:qaWorldPos('Hand_L'),
   shoulderR:qaWorldPos('Shoulder_R'),upperR:qaWorldPos('UpperArm_R'),elbowR:qaWorldPos('ForeArm_R'),handR:qaWorldPos('Hand_R'),
   hipL:qaWorldPos('UpperLeg_L'),kneeL:qaWorldPos('LowerLeg_L'),footL:qaWorldPos('Foot_L'),
   hipR:qaWorldPos('UpperLeg_R'),kneeR:qaWorldPos('LowerLeg_R'),footR:qaWorldPos('Foot_R')
  }:null,
  orientation:actor.status==='ready'?(()=>{
   const q=new THREE.Quaternion();actor.root.getWorldQuaternion(q);
   const face=new THREE.Vector3(0,0,-1).applyQuaternion(q).normalize();
   const up=new THREE.Vector3(0,1,0).applyQuaternion(q).normalize();
   return {rootQuaternion:q.toArray().map(n=>Number(n.toFixed(5))),face:face.toArray().map(n=>Number(n.toFixed(5))),up:up.toArray().map(n=>Number(n.toFixed(5)))};
  })():null,
  props:actor.status==='ready'?{guitar:qaObjectPos(actor.guitar),radio:qaObjectPos(actor.radio),bowl:qaObjectPos(actor.bowl),ration:qaObjectPos(actor.ration)}:null
 };
 requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
window.addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);});
