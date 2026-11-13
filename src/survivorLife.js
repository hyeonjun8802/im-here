import * as THREE from 'three';
import {LIFE_ACTIVITIES,activityAllowed,nextAutonomousActivity,planRooftopPath} from './lifePlan.js';
import {CampMusic} from './campMusic.js';
import {planCollisionFreeRoofPath,sweepRooftop,nearestOpenRooftop} from './roofNavigation.js';
import {routineDecision,sleepWeight,seoulTime,sleepAnimation,SLEEP_ENTER_SECONDS,SLEEP_EXIT_SECONDS} from './dailyCycle.js';
import {COT,sleepPosition} from './sleepBedding.js';
import {PIXAL3D_FORWARD_YAW,pixal3dFacingYaw} from './pixal3dOrientation.js';

// Correct standing movement in one explicit place; the GLB bind pose and
// carefully aligned sleep transform remain unchanged.
const M=(c,r=.8,m=.08)=>new THREE.MeshStandardMaterial({color:c,roughness:r,metalness:m});
const MAT={rust:M('#776152',.74,.3),cloth:M('#696857'),leather:M('#514539'),wood:M('#736049'),rubber:M('#393b37'),steel:M('#8e9590',.42,.55),lamp:new THREE.MeshStandardMaterial({color:'#edbc7e',emissive:'#e7a353',emissiveIntensity:1.1}),glass:M('#252c2d',.25,.3),white:M('#c0b8a4'),dark:M('#252c2b')};
// PBR fabrics, weathered wood and oxidised fittings for the *actual* interactive furniture.
const textureLoader=new THREE.TextureLoader();
for(const [key,stem] of [['wood','reclaimed_wood'],['cloth','tarp_canvas'],['rust','galvanized_rust']]){
 const material=MAT[key],base='./assets/materials/advanced/'+stem;
 textureLoader.load(base+'_albedo.jpg',t=>{
  t.colorSpace=THREE.SRGBColorSpace;t.wrapS=t.wrapT=THREE.RepeatWrapping;
  t.repeat.set(1.8,1.8);t.anisotropy=4;material.map=t;
  material.color.set('#ffffff');material.needsUpdate=true;
 },undefined,()=>{});
 textureLoader.load(base+'_normal.jpg',t=>{t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(1.8,1.8);material.normalMap=t;material.normalScale.set(.27,.27);material.needsUpdate=true;},undefined,()=>{});
}
const mesh=(p,geometry,mat,pos)=>{const o=new THREE.Mesh(geometry,mat);o.position.set(...pos);o.castShadow=true;o.receiveShadow=true;p.add(o);return o};
const box=(p,s,pos,m)=>mesh(p,new THREE.BoxGeometry(...s),m,pos);
function tube(p,a,b,r,mat){const A=new THREE.Vector3(...a),B=new THREE.Vector3(...b);const v=B.clone().sub(A);const o=mesh(p,new THREE.CylinderGeometry(r,r,v.length(),9),mat,A.add(B).multiplyScalar(.5).toArray());o.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),v.normalize());return o;}
function curvePipe(parent,points,radius,mat){
 const curve=new THREE.CatmullRomCurve3(points.map(v=>new THREE.Vector3(...v)));
 return mesh(parent,new THREE.TubeGeometry(curve,Math.max(12,points.length*7),radius,7,false),mat,[0,0,0]);
}
function hardware(parent,at,material=MAT.steel,r=.055){
 return mesh(parent,new THREE.SphereGeometry(r,9,6),material,at);
}
function saggingCanvas(p,width,depth,y,material){
 const nx=8,nz=6,positions=[],uvs=[],indices=[];
 for(let j=0;j<=nz;j++)for(let i=0;i<=nx;i++){
  const u=i/nx,v=j/nz;
  const sag=.085*Math.sin(Math.PI*u)*Math.sin(Math.PI*v);
  positions.push((u-.5)*width,y-sag,(v-.5)*depth);
  uvs.push(u,v);
 }
 for(let j=0;j<nz;j++)for(let i=0;i<nx;i++){
  const n=j*(nx+1)+i;indices.push(n,n+1,n+nx+1,n+1,n+nx+2,n+nx+1);
 }
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));g.setIndex(indices);g.computeVertexNormals();
 const m=material.clone();m.side=THREE.DoubleSide;
 return mesh(p,g,m,[0,0,0]);
}
function chair(parent,x,y,z,rotation=0){const g=new THREE.Group();g.position.set(x,y,z);g.rotation.y=rotation;parent.add(g);g.name='Folded scavenger chair · interact';
 box(g,[1.45,.065,1.04],[0,.85,0],MAT.leather);
 saggingCanvas(g,1.32,.89,.91,MAT.cloth);
 box(g,[1.51,1.03,.06],[0,1.52,-.52],MAT.cloth);
 for(const side of [-1,1]){
  curvePipe(g,[[side*.66,.85,-.43],[side*.66,.84,0],[side*.66,.85,.45]],.035,MAT.steel);
  curvePipe(g,[[side*.70,1.02,-.55],[side*.71,1.50,-.57],[side*.70,1.95,-.55]],.037,MAT.steel);
  for(const z of [-.40,.37])hardware(g,[side*.61,.87,z],MAT.rust,.052);
  hardware(g,[side*.72,1.8,-.55],MAT.steel,.06);
 }
 // Folding X frames and weathered canvas backrest stitching.
 for(const side of [-1,1]){
  tube(g,[side*.53,.14,-.51],[side*.57,.85,.47],.04,MAT.steel);
  tube(g,[side*.59,.12,.52],[side*.53,.9,-.50],.04,MAT.rust);
 }
 for(const h of [1.18,1.78])box(g,[1.38,.019,.076],[0,h,-.466],MAT.leather);
 for(const s of [-1,1])for(const f of [-1,1]){tube(g,[s*.54,.88,f*.37],[s*.67,.06,f*.58],.064,MAT.steel);}
 for(const s of [-1,1]){tube(g,[s*.55,.82,-.45],[s*.55,1.96,-.45],.07,MAT.rust);tube(g,[s*.67,.1,-.58],[s*.67,.95,.50],.035,MAT.steel);}return g;}
function table(parent,x,y,z){const g=new THREE.Group();g.position.set(x,y,z);parent.add(g);g.name='Dining table with ration';
 box(g,[3.3,.16,1.65],[0,1.12,0],MAT.wood);
 for(let i=0;i<4;i++){
  const x=-1.22+i*.81;box(g,[.008,.006,1.60],[x,1.206,0],MAT.leather);
 }
 for(const x of [-1.45,1.45])for(const z of [-.69,.69])hardware(g,[x,1.215,z],MAT.rust,.032);
 for(const xx of [-1.32,1.32])for(const zz of [-.62,.62])tube(g,[xx,.11,zz],[xx,1.05,zz],.085,MAT.steel);
 for(let x of [-.8,.8])tube(g,[x,.82,-.5],[x,.82,.5],.033,MAT.rust);
 mesh(g,new THREE.CylinderGeometry(.31,.27,.095,22),MAT.steel,[-.85,1.27,0]);
 mesh(g,new THREE.TorusGeometry(.33,.025,7,25),MAT.steel,[-.85,1.32,0]).rotation.x=Math.PI/2;
 for(let i=0;i<5;i++){
  const a=i*6.283/5;
  hardware(g,[-.85+Math.cos(a)*.13,1.326,Math.sin(a)*.13],MAT.leather,.04);
 }
 // Field cup and simple spoon, attached to tabletop for a believable eating location.
 const cup=mesh(g,new THREE.CylinderGeometry(.14,.12,.28,16),MAT.steel,[.38,1.38,.12]);
 mesh(g,new THREE.TorusGeometry(.085,.022,5,12),MAT.steel,[.57,1.44,.13]).rotation.y=Math.PI/2;
 curvePipe(g,[[.58,1.22,-.22],[.72,1.24,-.24],[.87,1.27,-.26]],.016,MAT.steel);
 mesh(g,new THREE.CylinderGeometry(.15,.15,.26,16),MAT.dark,[.43,1.34,.03]);
 box(g,[.75,.16,.39],[1.1,1.27,.15],MAT.leather);return g;}
function radioTable(parent,x,y,z){const g=new THREE.Group();g.position.set(x,y,z);parent.add(g);g.name='Reclaimed radio set';
 box(g,[2.75,.17,1.35],[0,1.10,0],MAT.wood);
 for(const xx of [-1.12,1.12])for(const zz of [-.48,.48])tube(g,[xx,.08,zz],[xx,1.01,zz],.064,MAT.steel);
 const radio=box(g,[1.05,.52,.54],[-.48,1.45,0],MAT.rust);
 // Raised screws, sun-faded rubber buttons and a real coiled receiver cable.
 for(const xx of [-.89,-.07])for(const yy of [1.27,1.62])hardware(g,[xx,yy,.285],MAT.steel,.031);
 for(let i=0;i<5;i++)box(g,[.063,.042,.016],[-.87+i*.145,1.405,.304],MAT.dark);
 const dial=mesh(g,new THREE.CylinderGeometry(.105,.105,.025,20),MAT.steel,[-.19,1.48,.307]);dial.rotation.x=Math.PI/2;
 curvePipe(g,[[-.16,1.48,.33],[-.01,1.58,.4],[.25,1.48,.4],[.39,1.59,.28]],.012,MAT.leather);
 box(g,[.49,.22,.06],[-.62,1.52,.30],MAT.glass);
 for(let i=0;i<7;i++)tube(g,[-.93+i*.12,1.30,.29],[-.93+i*.12,1.37,.29],.015,MAT.steel);
 mesh(g,new THREE.CylinderGeometry(.095,.095,.12,14),MAT.steel,[-.03,1.46,.33]);
 tube(g,[-.76,1.72,-.16],[-1.1,3.2,-.10],.014,MAT.steel);
 for(let i=0;i<2;i++){const lamp=mesh(g,new THREE.SphereGeometry(.055,10,8),i?MAT.lamp:MAT.steel,[.24+i*.24,1.27,.12]);}
 box(g,[.49,.30,.58],[.82,1.39,0],MAT.dark);return g;}
const smooth=(v,to,s)=>THREE.MathUtils.damp(v,to,s,.05);
const SLEEP_ACTIVITY=Object.freeze({label:'침대에서 잠자는 중',spot:'sleepBed',duration:Infinity,calm:true});
export class SurvivorLife{
 constructor(world){this.world=world;this.group=new THREE.Group();this.group.name='Life stations • single roof';world.scene.add(this.group);this.music=new CampMusic();
  this.spots={
   fireside:{pos:[-.4,6.8],yaw:2.35,seated:true},
   cooking:{pos:[4.9,5.9],yaw:3.65},
   dining:{pos:[7.3,9.7],yaw:Math.PI,seated:true},
   tank:{pos:[10.7,-12.0],yaw:1.0},
   radio:{pos:[-2.8,-.2],yaw:Math.PI,seated:false},
   shelter:{pos:[-9,-5.0],yaw:.35},
   // Daytime rest uses the real pallet edge, approached from the aisle.
   // The old target was COT.approach itself, which made the seated pose float in the walkway.
   bed:{pos:COT.seat,approach:COT.approach,yaw:0,seated:true},
   // The actual inner-shelter GLB bed: -X pillow, +X foot, +Z aisle.
   sleepBed:{pos:COT.feet,approach:COT.approach,yaw:0},
   workbench:{pos:[-5.5,6.8],yaw:1.0},
   stairwell:{pos:[7.3,-.8],yaw:1.4},
   overlook:{pos:[-4,18.0],yaw:2.0}
  };
  // Front-of-chair approach points prevent walking INTO a rigid seat.
  // All coordinates are in the same real 3D world as the chair meshes.
  for(const name of ['fireside','dining']){
   const spot=this.spots[name];
   spot.approach=name==='dining'?[7.3,11.55]:[spot.pos[0]+Math.sin(spot.yaw)*1.45,spot.pos[1]+Math.cos(spot.yaw)*1.45];
  }
  // Gameplay layout: one chair next to fire, one dining chair/table and one radio console.
  const fireChair=chair(this.group,-.4,world.ROOF_Y+.15,6.8,2.35);fireChair.scale.setScalar(.76);fireChair.userData.lifeAction='guitar';
  const diningChair=chair(this.group,7.3,world.ROOF_Y+.15,9.7,Math.PI);diningChair.scale.setScalar(.76);diningChair.userData.lifeAction='eat';
  // The guitar exists in the world even when nobody performs: it rests beside the chair.
  this.guitarRest=world.survivorGuitar.clone(true);this.guitarRest.name='Acoustic guitar leaning against the camp chair';
  this.guitarRest.visible=true;this.guitarRest.position.set(-1.55,world.ROOF_Y+.45,7.40);
  this.guitarRest.rotation.set(.12,.18,-.32);this.guitarRest.scale.setScalar(.85);
  this.guitarRest.userData.lifeAction='guitar';this.group.add(this.guitarRest);
  const eatingTable=table(this.group,7.6,world.ROOF_Y+.15,7.2);eatingTable.userData.lifeAction='eat';
  const comms=radioTable(this.group,-2.7,world.ROOF_Y+.15,-1.8);comms.userData.lifeAction='radio';this.comms=comms;
  // Small lantern on dining table creates depth during nighttime interaction.
  const light=new THREE.PointLight('#ffb46d',.65,7,2);light.position.set(7.6,world.ROOF_Y+2.5,7.2);this.group.add(light);
  this.current='idle';this.stage='idle';this.manual=false;this.clock=0;this.stageTime=0;this.performDuration=0;this.nextAt=8;this.manualAt=0;this.sequence=0;this.route=[];this.morningWaking=false;this.pendingAfterWake=null;this.nextSleepRetry=0;this.previewRoutineHour=null;this.previewRoutineRecord={stretchDay:-1};
  this.routineRecord={stretchDay:-1};
  try{const record=JSON.parse(globalThis.localStorage?.getItem('AFTERDAY_DAILY_CYCLE_V300')||'null');
   if(Number.isSafeInteger(record?.stretchDay))this.routineRecord.stretchDay=record.stretchDay;
  }catch{}
  this.rig=world.bodyGroup;this.head=world.survivorHead;this.knees=world.survivorKnees;this.elbows=world.survivorElbows;
  this.raycaster=new THREE.Raycaster();this.pointer=new THREE.Vector2();this.lastEvent=null;this.activityLabel='주변을 살피는 중';this.onActivityChange=null;
 }
 setRoutinePreview(hour=null){
  this.previewRoutineHour=hour===null?null:Math.max(0,Math.min(23.99,Number(hour)));
  this.previewRoutineRecord={stretchDay:-1};
  this.nextSleepRetry=0;this.nextAt=this.clock;
 }
 request(action,manual=true){
  if(action==='radio'&&this.world.activeKit&&!this.world.activeKit.radio)return false;
  if(action==='sleep'&&this.current==='sleep'&&['approach','enter','perform'].includes(this.stage))return true;
  // Cinematic-only tent construction is a local visual action, never part
  // of the approved deterministic autonomous-life schedule.
  const spec=action==='sleep'?SLEEP_ACTIVITY:
   action==='install_tent'?{label:'야전 텐트 설치 · 밧줄과 기둥 고정',spot:'shelter',duration:9,calm:false}:
   LIFE_ACTIVITIES[action];if(!spec)return false;
  const w=this.world.previewWeather||this.world.simulatedWeather;
  if(action!=='sleep'&&action!=='install_tent'&&!activityAllowed(action,w,manual))return false;
  const spot=this.spots[spec.spot];if(!spot)return false;
  // A command issued while in the cot must first stand the survivor up and
  // move them OUT of the bed collision volume, never pathfind from inside it.
  if(action!=='sleep'&&this.current==='sleep'&&['enter','perform','exit'].includes(this.stage)){
   this.pendingAfterWake={action,manual};
   if(this.stage!=='exit'){this.stage='exit';this.stageTime=0;}
   this.manual=manual;this.morningWaking=true;
   this.activityLabel='침대에서 일어나 다음 행동 준비 중';
   this.onActivityChange?.(this.activityLabel,'wake');
   return true;
  }
  this.morningWaking=false;
  if(action!=='sleep')this.world.sleepBedding?.setCover(0);
  this.current=action;this.activitySpec=spec;this.stage='approach';this.manual=manual;this.stageTime=0;
  // Manual rest reuses the authored lying/sleeping pose, but wakes after 18s.
  // Nightly autonomous sleep remains until the morning clock triggers waking.
  this.performDuration=action==='sleep'&&manual?18:action==='stretch'&&!manual?16:spec.duration;this.activityLabel=`${spec.label} · 이동 중`;
  const start=this.world.survivor.position;
  // For chair actions, first arrive IN FRONT of the chair, then settle onto it.
  const approach=spot.approach??spot.pos;
  // Keep legacy planner available for compatibility; active motion uses actual obstacle bounds.
  this.route=planCollisionFreeRoofPath([start.x,start.z],approach);
  if(!this.route.length){this.stage='idle';this.activityLabel='이동 가능한 경로가 없습니다';return false;}
  this.target=spot;this.world.survivorTarget.set(approach[0],this.world.ROOF_Y+.25,approach[1]);
  this.world.survivorMode=action;this.onActivityChange?.(this.activityLabel,action);
  this.music.setGuitarActive(false);
  return true;
 }
 markMorningStretch(day){
  if(this.routineRecord.stretchDay===day)return;
  this.routineRecord.stretchDay=day;
  try{globalThis.localStorage?.setItem('AFTERDAY_DAILY_CYCLE_V300',JSON.stringify(this.routineRecord));}catch{}
 }
 listenEvents(game){const last=game.events?.at(-1);if(this.lastEvent===null){this.lastEvent=last||'';return;}if(!last||last===this.lastEvent)return;this.lastEvent=last;
  if(this.manual||this.stage==='approach')return;
  if(last.includes('식사했다')&&this.current!=='eat')this.request('eat',false);
  else if(last.includes('마셨다')&&this.current!=='drink')this.request('drink',false);
 }
 animate(dt,phase){
  const w=this.world,body=w.bodyGroup,t=this.clock,a=this.current;
  const sitting=phase==='perform'&&['sit','guitar','eat','rest'].includes(a);
  const sleeping=sleepWeight(a,this.stage,this.stageTime);
  const working=phase==='perform',moving=phase==='approach';
  const transition=1-Math.exp(-dt*(moving?7:5.0));const lerp=(from,to)=>THREE.MathUtils.lerp(from,to,transition);
  const bob=Math.sin(t*2.5)*.022;
  body.position.y=lerp(body.position.y,(sitting?-.28:sleeping?(w.activeKit?.tent?1.18:.14):0)+(moving?Math.abs(Math.sin(t*7.4))*.055:bob));
  body.rotation.z=lerp(body.rotation.z,-Math.PI*.5*sleeping);
  body.rotation.x=lerp(body.rotation.x,working&&['repair','radio','install_tent'].includes(a)?.12:0);
  body.rotation.z=lerp(body.rotation.z,moving?Math.sin(t*7.4)*.035:0);
  for(let i=0;i<2;i++){
   const sign=i===0?1:-1;
   const step=moving?Math.sin(t*7.4+i*Math.PI)*.50:0;
   const l=w[['leftLeg','rightLeg'][i]],k=this.knees[i],arm=w[['leftArm','rightArm'][i]],e=this.elbows[i];
   const legPose=sitting?-1.19:step;
   const kneePose=sitting?1.37:moving?Math.max(0,-step)*.48:0;
   l.rotation.x=lerp(l.rotation.x,legPose);k.rotation.x=lerp(k.rotation.x,kneePose);
   const armPose=moving?-step*.65:working?({eat:[-.67,-.91],drink:[-.1,-1.08],guitar:[-1.01,-.95],radio:[-.14,-1.14],repair:[-.92,-.78],install_tent:[-1.25,-1.34],cook:[-.91,-.75],stretch:[-2.30,-2.30],medicine:[-.84,-.94],rest:[-.18,-.20],sit:[-.20,-.18],shelter:[-.40,-.52],watch:[-.15,-.13]}[a]||[-.1,-.1])[i]:-.10;
   arm.rotation.x=lerp(arm.rotation.x,armPose+(working&&a==='eat'&&i===0?Math.sin(t*4.6)*.16:0));
   arm.rotation.z=lerp(arm.rotation.z,working&&(a==='guitar'||a==='radio')?(i===0?-.32:.31):0);
   const elbowPose=working?({eat:[-.87,-.84],drink:[-.06,-1.17],guitar:[-.81,-.50],radio:[-.06,-1.55],repair:[-.9,-.8],install_tent:[-.44,-.61],cook:[-.8,-.9],stretch:[-.15,-.15],medicine:[-.5,-.78],sit:[-.22,-.22]}[a]||[-.14,-.14])[i]:.02;
   e.rotation.x=lerp(e.rotation.x,elbowPose+(working&&a==='guitar'&&i===1?Math.sin(t*8.9)*.32:0));
  }
  this.head.rotation.y=lerp(this.head.rotation.y,working&&a==='watch'?Math.sin(t*.50)*.55:working&&a==='radio'?.12:Math.sin(t*.39)*.07);
  this.head.rotation.x=lerp(this.head.rotation.x,working&&['eat','guitar','repair','install_tent','cook'].includes(a)?.12:0);
  if(w.survivorTorso)w.survivorTorso.scale.y=lerp(w.survivorTorso.scale.y,1+Math.sin(t*1.9)*.008);
  if(w.survivorMouth)w.survivorMouth.scale.y=lerp(w.survivorMouth.scale.y,working&&a==='guitar'?.75+Math.abs(Math.sin(t*4.2))*.6:working&&a==='radio'?1.5:.55);
  if(w.survivorEyelids)for(const lid of w.survivorEyelids){lid.scale.y=sleeping>.5?2.0:(Math.sin(t*.32)> .994)?2.0:.30;}
  this.guitarRest.visible=!(working&&a==='guitar');
  w.survivorGuitar.visible=working&&a==='guitar';w.survivorMeal.visible=working&&a==='eat';w.survivorRadio.visible=working&&a==='radio';w.survivorCanteen.visible=working&&a==='drink';
  if(w.survivorGuitar.visible)w.survivorGuitar.rotation.x=.1+Math.sin(t*2)*.025;
  this.music.setGuitarActive(working&&a==='guitar'&&this.music.enabled);this.music.update();
 }
 pickFromPointer(event){
  if(!this.world.canvas||!this.group)return null;
  const rect=this.world.canvas.getBoundingClientRect();
  this.pointer.set(((event.clientX-rect.left)/rect.width)*2-1,-((event.clientY-rect.top)/rect.height)*2+1);
  this.raycaster.setFromCamera(this.pointer,this.world.camera);
  const hits=this.raycaster.intersectObjects(this.group.children,true);
  for(const hit of hits){let ob=hit.object;while(ob&&ob!==this.group){if(ob.userData.lifeAction)return ob.userData.lifeAction;ob=ob.parent;}}
  return null;
 }
 update(dt,now,game,preset){
  this.clock+=dt;this.listenEvents(game);
  if(this.pendingAfterWake&&this.stage==='done'){
   const queued=this.pendingAfterWake;this.pendingAfterWake=null;
   this.request(queued.action,queued.manual);
  }
  // The authoritative real Seoul clock drives bedtime and waking. A weather
  // preview changes LIGHT ONLY; it never changes saved dates or sleep times.
  const previewing=this.previewRoutineHour!==null;
  const routineNow=previewing?(Math.floor((now+9*3600000)/86400000)*86400000-9*3600000+this.previewRoutineHour*3600000):now;
  const record=previewing?this.previewRoutineRecord:this.routineRecord;
  const decision=routineDecision(routineNow,record,this.current,this.stage,preset,this.manual);
  const isDanger=['storm','tornado'].includes(preset);
  if(isDanger&&this.current!=='shelter'&&this.pendingAfterWake?.action!=='shelter')this.request('shelter',false);
  if(!isDanger&&this.current==='shelter'&&this.stage==='perform'&&this.stageTime>8){this.stage='done';}
  if(!isDanger){
   if(decision.type==='sleep'&&this.clock>=this.nextSleepRetry){
    if(!this.request('sleep',false))this.nextSleepRetry=this.clock+8;
    else this.nextSleepRetry=0;
   }else if(decision.type==='wake'&&!(this.current==='sleep'&&this.manual)&&!this.morningWaking&&this.stage!=='exit'){
    // No teleport: rise from the real cot, then walk to the morning stretch spot.
    this.stage='exit';this.stageTime=0;this.morningWaking=true;
    this.activityLabel='07:00 · 잠에서 깨어 일어나는 중';
    this.onActivityChange?.(this.activityLabel,'wake');
   }else if(decision.type==='stretch'&&activityAllowed('stretch',preset,false)){
    if(this.request('stretch',false)){
     if(previewing)this.previewRoutineRecord.stretchDay=decision.day;else this.markMorningStretch(decision.day);
     this.morningWaking=false;
     this.activityLabel='아침 기상 · 스트레칭하러 이동 중';
     this.onActivityChange?.(this.activityLabel,'stretch');
    }
   }
  }
  // A manual stretch during the morning window also fulfills today's routine.
  const local=seoulTime(routineNow);
  if(local.hour>=7&&local.hour<9&&this.current==='stretch'&&this.manual&&this.stage!=='done'){
   if(previewing)this.previewRoutineRecord.stretchDay=local.day;else this.markMorningStretch(local.day);
  }
  if(this.stage==='idle'||this.stage==='done'){
   if(this.current==='sleep')this.world.sleepBedding?.setCover(0);
   if(this.clock>=this.nextAt){const action=nextAutonomousActivity(local.hour,preset,this.sequence++,game);this.request(action,false);this.nextAt=this.clock+22+this.sequence%4*5;}
   else this.animate(dt,'idle');return;
  }
  const p=this.world.survivor;
  if(this.stage==='approach'){
   const point=this.route[0]||this.target.pos;const dx=point[0]-p.position.x,dz=point[1]-p.position.z,d=Math.hypot(dx,dz);
   if(d<.40){this.route.shift();if(this.route.length===0){this.stage='enter';this.stageTime=0;this.sleepStart=[p.position.x,p.position.z];this.sleepEntryYaw=p.rotation.y;this.activityLabel=this.activitySpec?.label||'일상 행동';this.onActivityChange?.(this.activityLabel,this.current)}}
   else{const speed=this.current==='shelter'?5.0:2.8,step=Math.min(d,speed*dt);const safe=sweepRooftop([p.position.x,p.position.z],[p.position.x+dx/d*step,p.position.z+dz/d*step]);
    if(Math.hypot(safe[0]-p.position.x,safe[1]-p.position.z)<.005){
      this.route=planCollisionFreeRoofPath([p.position.x,p.position.z],this.target.approach||this.target.pos);
      if(!this.route.length){this.stage='done';this.activityLabel='장애물로 이동 중단';return;}
    }else{p.position.x=safe[0];p.position.z=safe[1];}
    const targetYaw=pixal3dFacingYaw(dx,dz);p.rotation.y+=Math.atan2(Math.sin(targetYaw-p.rotation.y),Math.cos(targetYaw-p.rotation.y))*Math.min(1,dt*8);}
   this.animate(dt,'approach');return;
  }
  this.stageTime+=dt;
  if(this.current!=='sleep'){
   const facing=this.target.yaw+PIXAL3D_FORWARD_YAW;
   p.rotation.y+=Math.atan2(Math.sin(facing-p.rotation.y),Math.cos(facing-p.rotation.y))*Math.min(1,dt*5);
  }
  if(this.stage==='enter'){
   // Move from the front of the folding chair to its ACTUAL cushion center.
   // The imported VRM rig lowers the hips during this same stage.
   const k=1-Math.exp(-dt*10);
   if(this.current==='sleep'){
    // All cot motion uses the same travel keyframes as the GLB rig: no
    // character teleport into the bed before the reclining animation.
    const sleep=sleepAnimation('enter',this.stageTime);
    const pt=sleepPosition(sleep);
    const offset=1-Math.min(1,sleep.travel/.55);
    p.position.x=pt[0]+((this.sleepStart?.[0]??COT.approach[0])-COT.approach[0])*offset;
    p.position.z=pt[1]+((this.sleepStart?.[1]??COT.approach[1])-COT.approach[1])*offset;
    // Face the open aisle at the sitting edge. A 180 degree spin during
    // recline made the old motion look like a roll off the mattress.
    const q=Math.min(1,this.stageTime/(SLEEP_ENTER_SECONDS*.22));
    const turn=q*q*(3-2*q);
    const angle=Math.atan2(Math.sin(-this.sleepEntryYaw),Math.cos(-this.sleepEntryYaw));
    p.rotation.y=this.sleepEntryYaw+angle*turn;
    if(this.stageTime>=SLEEP_ENTER_SECONDS){
     p.position.x=this.target.pos[0];p.position.z=this.target.pos[1];
     this.stage='perform';this.stageTime=0;
    }
   }else{
    if(['sit','eat','guitar','rest'].includes(this.current)){
     p.position.x=THREE.MathUtils.lerp(p.position.x,this.target.pos[0],k);
     p.position.z=THREE.MathUtils.lerp(p.position.z,this.target.pos[1],k);
    }else{const next=sweepRooftop([p.position.x,p.position.z],[THREE.MathUtils.lerp(p.position.x,this.target.pos[0],k),THREE.MathUtils.lerp(p.position.z,this.target.pos[1],k)]);
     p.position.x=next[0];p.position.z=next[1];}
    if(this.stageTime>.72){
     if(['sit','eat','guitar','rest'].includes(this.current)){p.position.x=this.target.pos[0];p.position.z=this.target.pos[1];}
     this.stage='perform';this.stageTime=0;if(this.current==='radio')this.music.radioPing();
    }
   }
  }
  if(this.stage==='perform'&&this.stageTime>this.performDuration){
   // Do not pop up through the chair at the end of a performance.
   this.stage=this.target.approach?'exit':'done';this.stageTime=0;
   this.nextAt=this.clock+(this.manual?9:11);this.manual=false;
   this.music.setGuitarActive(false);
   this.onActivityChange?.(this.current==='radio'?'무전 종료 · 외부 응답 없음':this.current==='guitar'?'기타 연주를 마치고 캠프를 정리합니다':'캠프의 일상으로 돌아가는 중','idle');
  }
  if(this.stage==='exit'){
   const dest=this.target.approach;
   if(this.current==='sleep'&&dest){
    // Reverse the cot keyframes: lift shoulders, sit at the edge, THEN stand
    // and step into the walkable aisle. No body glide through the mattress.
    const sleep=sleepAnimation('exit',this.stageTime);
    const pt=sleepPosition(sleep);
    p.position.x=pt[0];p.position.z=pt[1];
    p.rotation.y=0;
    if(this.stageTime>=SLEEP_EXIT_SECONDS){
     p.position.x=dest[0];p.position.z=dest[1];
     this.stage='done';this.nextAt=this.clock;this.morningWaking=false;
    }
   }else if(dest){
    const k=1-Math.exp(-dt*2.8);
    p.position.x=THREE.MathUtils.lerp(p.position.x,dest[0],k);
    p.position.z=THREE.MathUtils.lerp(p.position.z,dest[1],k);
    if(Math.hypot(p.position.x-dest[0],p.position.z-dest[1])<.11 || this.stageTime>1.75)this.stage='done';
   }else this.stage='done';
  }
  if(this.current==='sleep'){
   const frame=sleepAnimation(this.stage,this.stageTime);
   this.world.sleepBedding?.setCover(frame.cover,this.stage==='perform'?Math.sin(this.clock*1.6)*.04:0);
  }
  this.animate(dt,this.stage==='perform'?'perform':'idle');
 }
 dispose(){this.music.dispose()}
}
