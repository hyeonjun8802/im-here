import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
/**
 * AFTERDAY v1.2 original articulated survivor asset refinement.
 * These are actual additional 3D meshes parented to the existing animated joints.
 * Not AI image planes, a static billboard, or a replacement for a professionally rigged humanoid.
 * All additions are local to the one existing survivor. No new buildings or rooftop instances.
 */
let currentDetailWorld=null;
const MAT={
 thread:new THREE.MeshStandardMaterial({color:'#a49b7e',roughness:1}),
 lightThread:new THREE.MeshStandardMaterial({color:'#b6aa8d',roughness:1}),
 trim:new THREE.MeshStandardMaterial({color:'#363f39',roughness:.91}),
 leather:new THREE.MeshStandardMaterial({color:'#69523c',roughness:.83}),
 rust:new THREE.MeshStandardMaterial({color:'#7b5541',metalness:.52,roughness:.7}),
 steel:new THREE.MeshStandardMaterial({color:'#8b8a80',metalness:.6,roughness:.42}),
 fabric:new THREE.MeshStandardMaterial({color:'#5e6355',roughness:.94,side:THREE.DoubleSide}),
 darkCloth:new THREE.MeshStandardMaterial({color:'#454c44',roughness:.97,side:THREE.DoubleSide}),
 rubber:new THREE.MeshStandardMaterial({color:'#2b302d',roughness:.94}),
 skinShade:new THREE.MeshStandardMaterial({color:'#95674f',roughness:.9}),
 softEye:new THREE.MeshStandardMaterial({color:'#1b201d',roughness:.2}),
 glow:new THREE.MeshStandardMaterial({color:'#e0af70',emissive:'#eb9447',emissiveIntensity:.7,roughness:.56})
};
const add=(p,g,m,pos,rot)=>{const o=new THREE.Mesh(g,m);o.position.set(...pos);if(rot)o.rotation.set(...rot);o.castShadow=true;o.receiveShadow=true;p.add(o);return o;};
function bead(p,loc,size,m){const obj=add(p,new THREE.SphereGeometry(1,12,9),m,loc);obj.scale.set(...size);return obj;}
function block(p,size,loc,m,rot){return add(p,new RoundedBoxGeometry(...size,2,Math.min(...size)*.14),m,loc,rot)}
function line(p,A,B,rad,m){const a=new THREE.Vector3(...A),b=new THREE.Vector3(...B),dir=b.clone().sub(a),o=add(p,new THREE.CylinderGeometry(rad,rad,dir.length(),6),m,a.add(b).multiplyScalar(.5).toArray());o.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),dir.normalize());return o;}
function stroke(p,path,r,m,closed=false){const curve=new THREE.CatmullRomCurve3(path.map(x=>new THREE.Vector3(...x)),closed,'centripetal');const obj=add(p,new THREE.TubeGeometry(curve,Math.max(12,path.length*5),r,5,closed),m,[0,0,0]);if(r<=.012&&currentDetailWorld)currentDetailWorld.premiumMicroDetails.push(obj);return obj;}
function clothPanel(p,vertices,m){const geometry=new THREE.BufferGeometry(),arr=new Float32Array(vertices.flat());geometry.setAttribute('position',new THREE.BufferAttribute(arr,3));const triangles=[];for(let i=1;i<vertices.length-1;i++)triangles.push(0,i,i+1);geometry.setIndex(triangles);geometry.computeVertexNormals();const o=add(p,geometry,m,[0,0,0]);o.material.side=THREE.DoubleSide;return o;}
function stitchedLine(p,A,B,m=MAT.lightThread,n=12){const a=new THREE.Vector3(...A),b=new THREE.Vector3(...B);for(let k=0;k<n;k++){const c=a.clone().lerp(b,(k+.5)/n),d=new THREE.Vector3(-.014,.014,.012);const obj=line(p,c.clone().sub(d).toArray(),c.clone().add(d).toArray(),.004,m);if(currentDetailWorld)currentDetailWorld.premiumMicroDetails.push(obj)}}
function buckle(p,x,y,z,size=.12){const tor=add(p,new THREE.TorusGeometry(size,.018,5,10),MAT.steel,[x,y,z]);tor.scale.y=1.15;return tor;}
function bootDetails(knee,side){
  // Boot is fixed to the original ankle group; toe remains on ground through walk/seated bends.
  block(knee,[.41,.052,.59],[0,-.762,.16],MAT.rubber);
  for(let k=0;k<5;k++)block(knee,[.39,.028,.033],[0,-.798,-.09+k*.13],MAT.trim);
  for(const z of [.28,.34])stroke(knee,[[-.17,-.54,z],[-.09,-.51,z+.02],[.09,-.51,z+.02],[.17,-.54,z]],.008,MAT.lightThread);
  for(let i=0;i<5;i++){
    const y=-.55+i*.055;
    line(knee,[-.125,y,.36],[.12,y+.017,.365],.010,MAT.thread);
    bead(knee,[-.13,y,.35],[.018,.018,.01],MAT.steel);
    bead(knee,[.13,y,.35],[.018,.018,.01],MAT.steel);
  }
  // Protective knee patch is actually parented to knee, not floating in world-space.
  const cap=bead(knee,[0,-.12,.19],[.205,.20,.055],MAT.darkCloth);
  stroke(knee,[[-.15,-.23,.23],[0,-.27,.245],[.15,-.23,.23]],.011,MAT.thread);
  // Scuffed cargo trouser folds above ankle.
  for(let j=0;j<3;j++)stroke(knee,[[-.16,-.3+j*.065,.015],[0,-.29+j*.07,.19],[.17,-.29+j*.06,.012]],.010,MAT.trim);
}
function faceDetails(head){
  // Subtle 3D facial planes rather than large cartoon eyes or an image overlay.
  // The shaped face already has a nose profile, avoid overlaying a second protruding tip.
  bead(head,[-.048,.040,.413],[.033,.017,.018],MAT.skinShade);
  bead(head,[.048,.040,.413],[.033,.017,.018],MAT.skinShade);
  stroke(head,[[-.078,-.03,.367],[0,-.049,.415],[.078,-.03,.367]],.009,MAT.skinShade);
  for(const side of [-1,1]){
   // Eyebrows and eyelid upper lashes are fixed to head joint.
   // The animated eyebrows belong to PremiumPerformerV140; avoid duplicates.
   stroke(head,[[side*.085,.168,.355],[side*.15,.158,.368],[side*.23,.178,.324]],.007,MAT.skinShade);
   bead(head,[side*.27,-.035,.253],[.094,.10,.025],MAT.skinShade);
  }
  bead(head,[0,-.17,.294],[.21,.08,.037],MAT.skinShade); // chin shading
  // Real wisps projecting past the forehead / side silhouette; limited for mobile.
  const hair=new THREE.Group();hair.name='Hair silhouette • brushed strands';head.add(hair);
  for(let i=0;i<21;i++){
   const u=i/20,x=-.32+u*.64,z=.23+Math.sin(u*Math.PI)*.075;
   const len=.12+Math.sin(i*2.5)*.045;
   stroke(hair,[[x,.53,z-.08],[x+.03*Math.sin(i),.45,z+.02],[x+.025,.33-len,z+.07]],.025+(i%3)*.004,MAT.softEye);
  }
  for(let i=0;i<8;i++){
   const s=i%2?1:-1,y=.24+(i%4)*.12;
   stroke(hair,[[s*.33,y+.22,-.02],[s*.38,y+.04,.02],[s*.36,y-.13,.09]],.016,MAT.softEye);
  }
}
function buildJacket(torso){
 // Uneven, rain-softened coat hem: angular cloth panels cast actual shadows.
 const skirtL=clothPanel(torso,[[-.42,.09,-.08],[-.43,-.33,-.01],[-.35,-.37,.30],[-.07,-.34,.36],[-.08,.08,.35]],MAT.fabric);
 const skirtR=clothPanel(torso,[[.06,.09,.35],[.13,-.37,.34],[.42,-.33,.26],[.48,-.31,-.05],[.43,.10,.04]],MAT.darkCloth);
 const seamL=stroke(torso,[[-.41,-.32,.28],[-.26,-.35,.34],[-.08,-.34,.39]],.011,MAT.thread);
 stroke(torso,[[.13,-.37,.37],[.3,-.36,.31],[.43,-.31,.21]],.011,MAT.thread);
 // V-shaped collar and storm flap. Folds stay visible on camera orbit.
 clothPanel(torso,[[-.23,.86,.24],[-.05,.58,.38],[-.015,.37,.37],[-.41,.72,.26]],MAT.darkCloth);
 clothPanel(torso,[[.23,.86,.24],[.015,.52,.385],[.14,.33,.36],[.39,.70,.26]],MAT.fabric);
 stroke(torso,[[-.39,.73,.28],[-.06,.52,.40],[-.11,.33,.385]],.010,MAT.lightThread);
 // Open utilitarian pockets, seam ridges, fabric patch repairs.
 for(const s of [-1,1]){
  const x=s*.31;
  block(torso,[.205,.18,.085],[x,.07,.345],MAT.darkCloth);
  block(torso,[.23,.035,.094],[x,.165,.386],MAT.trim);
  stitchedLine(torso,[x-.085,.15,.405],[x+.085,.15,.405],MAT.lightThread,6);
  line(torso,[s*.38,.74,.02],[s*.42,.56,.07],.022,MAT.thread);
  block(torso,[.15,.10,.018],[s*.39,.58,.29],MAT.rust);
 }
 // Zip and hand-sewn repair details on front.
 line(torso,[.045,.16,.37],[.045,.70,.36],.012,MAT.steel);
 for(let i=0;i<13;i++){
  const y=.18+i*.038;
  line(torso,[.029,y,.39],[.068,y,.391],.004,MAT.lightThread);
 }
 block(torso,[.044,.072,.022],[.04,.52,.41],MAT.steel);
 stitchedLine(torso,[-.34,.65,.305],[-.26,.56,.335],MAT.thread,7);
 for(let i=0;i<4;i++){
  const y=.13+i*.11;
  stroke(torso,[[-.40,y,-.13],[-.44,y-.02,.08],[-.40,y-.06,.29]],.008,MAT.trim);
 }
 return [skirtL,skirtR];
}
function detailedBackpack(pack){
  if(!pack)return;
  // Layered rolltop and flap with straps and attachment D-rings.
  block(pack,[.72,.055,.27],[0,.40,-.33],MAT.fabric);
  for(const x of [-.25,.25]){
   line(pack,[x,.41,-.49],[x,-.42,-.48],.025,MAT.leather);
   buckle(pack,x,-.18,-.51,.082);
   bead(pack,[x,.45,-.43],[.07,.07,.065],MAT.steel);
  }
  for(let x of [-.24,.24])for(let y of [-.28,.10])buckle(pack,x,y,-.53,.047);
  block(pack,[.41,.31,.075],[0,-.09,-.50],MAT.darkCloth);
  block(pack,[.40,.045,.087],[0,.060,-.508],MAT.trim);
  stroke(pack,[[-.38,.36,-.23],[-.42,.1,-.24],[-.40,-.25,-.30]],.015,MAT.leather);
  stroke(pack,[[.38,.36,-.23],[.42,.1,-.24],[.40,-.25,-.30]],.015,MAT.leather);
  // Clipped emergency cord and paracord carabiners.
  stroke(pack,[[.34,-.20,-.48],[.54,-.22,-.48],[.53,-.48,-.45]],.018,MAT.rust);
  buckle(pack,.49,-.41,-.45,.066);
}
function armDetails(arm,elbow,hand){
  const shoulder=bead(arm,[0,-.12,.18],[.195,.15,.09],MAT.fabric);
  for(let k=0;k<3;k++)stroke(arm,[[-.18,-.3-k*.068,.12],[0,-.27-k*.07,.23],[.18,-.31-k*.068,.11]],.009,MAT.thread);
  block(arm,[.27,.13,.03],[0,-.27,.244],MAT.darkCloth);
  stitchedLine(arm,[-.12,-.32,.264],[.11,-.32,.264],MAT.lightThread,8);
  if(elbow){
   const elbowPad=bead(elbow,[0,-.15,.16],[.16,.18,.075],MAT.fabric);
   for(let j=0;j<2;j++)stroke(elbow,[[-.17,-.28+j*.11,.15],[0,-.27+j*.11,.235],[.17,-.28+j*.11,.15]],.01,MAT.trim);
   block(elbow,[.29,.058,.26],[0,-.39,.05],MAT.leather);
  }
  if(hand){
   for(let i=0;i<4;i++)line(hand,[-.09+i*.053,-.11,.115],[-.09+i*.053,-.16,.085],.007,MAT.leather);
   block(hand,[.23,.038,.19],[0,.125,.01],MAT.fabric);
  }
}
export function applyPremiumCharacterDetail(world){
 const torso=world.survivorTorso,head=world.survivorHead;
 if(!torso||!head)return false;
 world.premiumMicroDetails=[];currentDetailWorld=world;
 buildJacket(torso);faceDetails(head);detailedBackpack(world.survivorPack);
 for(let i=0;i<2;i++){
  const leg=world[['leftLeg','rightLeg'][i]],knee=world.survivorKnees?.[i];
  if(leg){
   block(leg,[.27,.25,.10],[0,-.28,.225],MAT.darkCloth);
   block(leg,[.30,.052,.14],[0,-.16,.29],MAT.fabric);
   stitchedLine(leg,[-.11,-.29,.29],[.13,-.29,.29],MAT.lightThread,7);
   for(let j=0;j<3;j++)stroke(leg,[[-.19,-.15-j*.11,.09],[0,-.14-j*.11,.21],[.19,-.16-j*.11,.08]],.008,MAT.thread);
  }
  if(knee)bootDetails(knee,i);
  armDetails(world[['leftArm','rightArm'][i]],world.survivorElbows?.[i],world.survivorHands?.[i]);
 }
 // On-jacket field compass, stitched patches and small practical hardware.
 const compass=add(torso,new THREE.CylinderGeometry(.095,.095,.03,22),MAT.rust,[.22,.64,.34],[Math.PI/2,0,0]);
 bead(torso,[.22,.64,.364],[.057,.057,.008],MAT.darkCloth);
 line(torso,[.22,.605,.374],[.24,.667,.373],.007,MAT.lightThread);
 const scarfTail=clothPanel(torso,[[.21,.86,.015],[.32,.70,.16],[.37,.16,.10],[.31,.09,.02],[.23,.64,-.06]],MAT.darkCloth);
 scarfTail.name='Soft scarf end • wind response';
 world.premiumScarfTail=scarfTail;
 world.premiumCharacterDetail=true;currentDetailWorld=null;
 return true;
}
export function animatePremiumCharacterDetail(world,seconds,wind,wetness){
 if(!world.premiumCharacterDetail)return;
 const microVisible=world.radius<=(world.isMobile?16:24);
 if(microVisible!==world.premiumMicroVisible){for(const part of world.premiumMicroDetails||[])part.visible=microVisible;world.premiumMicroVisible=microVisible;}
 if(world.premiumScarfTail){
  world.premiumScarfTail.rotation.z=Math.sin(seconds*1.6)*(.02+wind*.12);
  world.premiumScarfTail.rotation.x=Math.sin(seconds*.8)*(.015+wind*.09);
 }
 const mat=world.survivorMaterials;
 if(!mat)return;
 // Darkening is modest and continuous, not flashing with each rain particle.
 const damp=1-Math.max(0,Math.min(1,wetness))*.22;
 for(const key of ['jacket','patch','trousers','canvas','boots']){
  const m=mat[key];if(!m)continue;
  m.color.setScalar(damp);m.roughness=key==='boots'?.78:(key==='canvas'?.84:.9)-wetness*.11;
 }
}
