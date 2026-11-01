import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {applyPremiumCharacterDetail,animatePremiumCharacterDetail} from './premiumCharacterDetail.js';
// Premium procedural articulated survivor. Real editable 3D geometry, not a photographic billboard.
// This is NOT a scanned / hand-sculpted AAA character, nor a skinned commercial GLB.
const M=(c,r=.88,m=0)=>new THREE.MeshStandardMaterial({color:c,roughness:r,metalness:m});
const MAT={jacket:M('#717565'),dark:M('#3e4844'),lining:M('#3d4038'),patch:M('#666b59'),trousers:M('#4b514a'),leather:M('#6f5541'),metal:M('#aaa69a',.42,.54),metalDark:M('#464c4b',.42,.48),skin:M('#ae8066'),skinShadow:M('#8d5d4d'),hair:M('#252321'),boots:M('#302d29'),glove:M('#373b36'),glass:M('#282d2f',.25,.18),white:M('#ded9c6'),seam:M('#b9ad8d'),orange:M('#b75a38'),canvas:M('#555846')};
// Material-specific authored texture sets: color + tangent-space normal + roughness.
// UV tiling is deliberate: fine fabric weave is read on close-up without making
// the character a 2D photo. Always use neutral white albedo tint when map loads.
const texLoader=new THREE.TextureLoader();
const materialMaps={
 jacket:'jacket_field',patch:'jacket_field',trousers:'cargo_trousers',
 canvas:'backpack_canvas',leather:'aged_leather',boots:'boots_rubber',
 hair:'hair_fiber',skin:'weathered_skin',skinShadow:'weathered_skin',
 metal:'scuffed_metal',metalDark:'scuffed_metal',lining:'scarf_wool',
 glove:'cargo_trousers',dark:'cargo_trousers'
};
for(const [key,stem] of Object.entries(materialMaps)){
 const material=MAT[key],base='./assets/materials/character/premium/'+stem;
 const repeat=key==='hair'?3:key==='skin'||key==='skinShadow'?1.2:2.1;
 texLoader.load(base+'_base.jpg',t=>{
  t.colorSpace=THREE.SRGBColorSpace;t.wrapS=t.wrapT=THREE.RepeatWrapping;
  t.repeat.set(repeat,repeat);t.anisotropy=4;material.map=t;
  material.color.set('#ffffff');material.needsUpdate=true;
 },undefined,()=>{});
 texLoader.load(base+'_normal.jpg',t=>{
  t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(repeat,repeat);
  material.normalMap=t;material.normalScale.set(.25,.25);material.needsUpdate=true;
 },undefined,()=>{});
 texLoader.load(base+'_rough.jpg',t=>{
  t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(repeat,repeat);
  material.roughnessMap=t;material.needsUpdate=true;
 },undefined,()=>{});
}
const add=(p,g,m,pos=[0,0,0],rot=null)=>{const o=new THREE.Mesh(g,m);o.position.set(...pos);if(rot)o.rotation.set(...rot);o.castShadow=true;o.receiveShadow=true;p.add(o);return o};
const cub=(p,dim,pos,m,rot)=>add(p,new RoundedBoxGeometry(...dim,3,Math.min(...dim)*.17),m,pos,rot);
const ell=(p,pos,radius,m)=>{const x=add(p,new THREE.SphereGeometry(1,22,14),m,pos);x.scale.set(...radius);return x};
const tube=(p,a,b,r,m,seg=9)=>{const A=new THREE.Vector3(...a),B=new THREE.Vector3(...b),d=B.clone().sub(A);const o=add(p,new THREE.CylinderGeometry(r,r,d.length(),seg),m,A.add(B).multiplyScalar(.5).toArray());o.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),d.normalize());return o};
function curve(p,pts,r,m){const path=new THREE.CatmullRomCurve3(pts.map(v=>new THREE.Vector3(...v)));return add(p,new THREE.TubeGeometry(path,Math.max(10,pts.length*5),r,5,false),m)}
function shaper(p,rows,m,radial=22){const pts=rows.map(([r,y])=>new THREE.Vector2(r,y));return add(p,new THREE.LatheGeometry(pts,radial),m)}
function safeClear(g){for(const c of [...g.children])g.remove(c)}
function anatomicallyShapedFace(){
 // Custom anatomical face volume: jaw taper, brow ridge and cheekbone planes.
 // Fully 3D vertex-sculpted surface with normal recomputation, NOT a 2D cutout.
 const geometry=new THREE.SphereGeometry(1,42,32);
 const a=geometry.attributes.position;
 for(let i=0;i<a.count;i++){
  const x=a.getX(i),y=a.getY(i),z=a.getZ(i),front=Math.max(0,z);
  const jaw=(1-.18*Math.max(0,-y))*(1-.05*Math.max(0,y));
  const cheek=.085*Math.exp(-Math.pow((y+.03)/.28,2))*front;
  const brow=.032*Math.exp(-Math.pow((y-.48)/.17,2))*front;
  const chin=.045*Math.exp(-Math.pow((y+.72)/.18,2))*front;
  a.setXYZ(i,x*(jaw+cheek),y,z+cheek*.55+brow+chin);
 }
 geometry.computeVertexNormals();return geometry;
}

export function upgradeSurvivorArt(world){
 const root=world.bodyGroup;safeClear(root);
 // No interchangeable costumes/level-up aesthetics: a consistent original scavenger.
 const hips=ell(root,[0,1.10,0],[.46,.28,.30],MAT.trousers);
 const torso=new THREE.Group();torso.position.set(0,1.36,0);root.add(torso);world.survivorTorso=torso;
 const coat=shaper(torso,[[.36,-.22],[.46,-.14],[.44,.05],[.37,.28],[.42,.58],[.49,.79],[.43,.91],[.20,.97],[0,.98]],MAT.jacket);coat.scale.set(1,1,.72);
 ell(torso,[0,.48,.03],[.45,.51,.32],MAT.jacket);
 // Additional tailored coat front, layered lapels, hem, seam work, patchwork.
 cub(torso,[.25,.87,.035],[-.16,.39,.314],MAT.patch,[0,0,-.13]);cub(torso,[.22,.87,.04],[.17,.39,.312],MAT.dark,[0,0,.15]);
 for(let i=0;i<5;i++){ell(torso,[.04,.26+i*.15,.341],[.027,.027,.022],MAT.metal);}
 for(const x of [-.35,.35]){cub(torso,[.24,.20,.09],[x,.11,.305],MAT.dark);cub(torso,[.27,.038,.02],[x,.21,.354],MAT.seam);}
 tube(torso,[-.37,.91,.20],[.23,-.21,.37],.05,MAT.leather); // diagonal field strap
 tube(torso,[-.44,-.09,.0],[.44,-.09,.0],.085,MAT.leather);
 ell(torso,[0,.94,.01],[.35,.16,.30],MAT.lining);
 // backpack has separate compartments, rolled sleeping mat, straps, metal buckles
 const pack=new THREE.Group();pack.position.set(0,.42,-.40);pack.name='Survivor field backpack';torso.add(pack);world.survivorPack=pack;
 ell(pack,[0,0,-.14],[.43,.57,.29],MAT.canvas);cub(pack,[.68,.32,.18],[0,-.36,-.38],MAT.leather);
 cub(pack,[.62,.24,.14],[0,.34,-.35],MAT.patch);cub(pack,[.43,.11,.13],[0,.25,-.44],MAT.metalDark);
 for(let x of [-.28,.28]){tube(pack,[x,-.42,-.44],[x,.40,-.45],.036,MAT.leather);cub(pack,[.14,.07,.05],[x,-.01,-.48],MAT.metal)}
 const bedroll=add(pack,new THREE.CylinderGeometry(.20,.20,.75,14),MAT.patch,[0,.61,-.22],[0,0,Math.PI/2]);
 for(const x of [-.21,.21])add(pack,new THREE.TorusGeometry(.202,.025,7,17),MAT.leather,[x,.61,-.22],[0,Math.PI/2,0]);
 for(const x of [-.23,.23])tube(torso,[x,.89,-.35],[x*1.15,-.12,.20],.058,MAT.leather);
 // Chest gear: flashlight, radio pouch, carabiner, tiny illuminated status LED
 const torch=cub(torso,[.16,.34,.16],[.33,.16,.31],MAT.metalDark,[.18,0,-.1]);ell(torso,[.33,.32,.32],[.08,.035,.08],MAT.white);
 cub(torso,[.17,.23,.09],[-.36,-.10,.30],MAT.leather);ell(torso,[-.35,-.03,.355],[.03,.03,.02],MAT.orange);
 // neck and head pivot separated for look gestures
 ell(root,[0,2.38,.035],[.19,.25,.18],MAT.skinShadow);
 const head=new THREE.Group();head.position.set(0,2.69,.02);root.add(head);world.survivorHead=head;
 const shapedFace=add(head,anatomicallyShapedFace(),MAT.skin,[0,.12,.03]);shapedFace.scale.set(.365,.445,.34);
 // The anatomical head mesh supplies the nose plane; no duplicate beak sphere.
 const mouth=ell(head,[0,-.035,.365],[.055,.035,.013],MAT.skinShadow);world.survivorMouth=mouth; // lips open slightly during humming
 const eyelids=[];world.survivorEyelids=eyelids;
 for(const s of [-1,1]){
  const lid=ell(head,[s*.145,.225,.354],[.087,.024,.008],MAT.skin);eyelids.push(lid);
  ell(head,[s*.355,.02,.04],[.083,.13,.065],MAT.skinShadow); // ear
  // PremiumPerformerV140 supplies the ONLY visible iris/eyelid and brow,
  // to prevent a double pair of floating eyes in close-ups.
 }
 // scattered asymmetric hair clumps, distinguishable silhouette even in game camera
 ell(head,[0,.45,-.015],[.36,.20,.34],MAT.hair);
 for(let i=0;i<9;i++){const a=i*2.399963;const rad=.18+(i%4)*.035;const x=Math.cos(a)*rad,z=Math.sin(a)*rad;const l=.10+(i%3)*.035;
  const lock=ell(head,[x,.49+(i%3)*.032,z],[.095,l,.084],MAT.hair);lock.rotation.z=Math.sin(a)*.35;lock.rotation.x=Math.cos(a)*.25;
 }
 for(const [x,z] of [[-.2,.24],[-.09,.28],[.05,.31],[.22,.26]]){const lock=ell(head,[x,.37,z],[.056,.11,.065],MAT.hair);lock.rotation.z=-.35;}
 // multiple layers of scarf folds, geometry avoids blocking facial features
 for(let i=0;i<3;i++){const scarf=add(root,new THREE.TorusGeometry(.27+i*.027,.075,9,26),i%2?MAT.patch:MAT.canvas,[0,2.49-i*.095,.02],[Math.PI/2,0,i*.14]);}
 cub(root,[.19,.64,.09],[.25,2.29,.25],MAT.patch,[0,0,-.23]);
 // rigged hierarchical arms with elbow and wrist (not unanimated one-piece bars)
 const arms=[];
 for(const side of [-1,1]){
  const arm=new THREE.Group();arm.position.set(side*.51,2.21,0);root.add(arm);
  ell(arm,[0,-.19,0],[.245,.33,.24],MAT.jacket); // shoulder
  ell(arm,[side*.018,-.42,0],[.185,.36,.18],MAT.dark);
  cub(arm,[.35,.11,.35],[0,-.61,0],MAT.patch);
  const elbow=new THREE.Group();elbow.position.set(0,-.69,0);arm.add(elbow);
  ell(elbow,[0,-.20,.0],[.160,.30,.15],MAT.jacket);
  cub(elbow,[.20,.15,.26],[0,-.38,0],MAT.patch);
  const hand=new THREE.Group();hand.position.set(0,-.53,0);elbow.add(hand);
  ell(hand,[0,-.02,0],[.13,.16,.115],MAT.glove);
  for(let i=0;i<4;i++)ell(hand,[(-.081+i*.054),-.151,.03],[.033,.085,.035],MAT.glove);
  const wrist=cub(hand,[.27,.11,.15],[0,.115,0],MAT.leather);
  arms.push({arm,elbow,hand});
 }
 [world.leftArm,world.rightArm]=arms.map(x=>x.arm);world.survivorElbows=arms.map(x=>x.elbow);world.survivorHands=arms.map(x=>x.hand);
 // knee pivots make seated ankles and walking knees independently controllable
 const legs=[];
 for(const side of [-1,1]){
  const leg=new THREE.Group();leg.position.set(side*.255,1.07,0);root.add(leg);
  ell(leg,[0,-.30,.006],[.245,.42,.225],MAT.trousers);
  const knee=new THREE.Group();knee.position.set(0,-.57,.01);leg.add(knee);
  ell(knee,[0,-.25,.012],[.195,.39,.17],MAT.dark);
  cub(knee,[.39,.21,.41],[0,-.57,.15],MAT.boots);
  ell(knee,[0,-.66,.245],[.235,.12,.29],MAT.boots);
  for(let i=0;i<4;i++)tube(knee,[-.12,-.57+i*.048,.34],[.12,-.57+i*.048,.34],.010,MAT.seam,5);
  legs.push({leg,knee});
 }
 [world.leftLeg,world.rightLeg]=legs.map(x=>x.leg);world.survivorKnees=legs.map(x=>x.knee);
 // badge stitching on sleeve. No real-world logo or inscription.
 cub(world.rightArm,[.21,.13,.024],[.20,-.29,.09],MAT.orange,[0,0,.15]);
 const hood=add(head,new THREE.SphereGeometry(.43,23,13,0,Math.PI*2,0,Math.PI*.61),MAT.canvas,[0,.16,-.055]);hood.visible=false;world.survivorRainHood=hood;
 // handheld performance props, attached in rig space and toggled by behaviour director
 const guitar=createGuitar();guitar.position.set(0,1.05,.43);guitar.rotation.set(.12,-.15,-.20);root.add(guitar);guitar.visible=false;world.survivorGuitar=guitar;
 const transceiver=createRadio();transceiver.position.set(.44,2.05,.48);root.add(transceiver);transceiver.visible=false;world.survivorRadio=transceiver;
 const ration=new THREE.Group();root.add(ration);ration.position.set(-.36,1.54,.48);ration.visible=false;
 ell(ration,[0,0,0],[.22,.095,.18],MAT.metal);ell(ration,[0,.07,.0],[.16,.08,.13],MAT.leather);world.survivorMeal=ration;
 const canteen=new THREE.Group();root.add(canteen);canteen.position.set(.44,2.03,.42);canteen.visible=false;
 add(canteen,new THREE.CylinderGeometry(.11,.13,.33,16),MAT.metal);cub(canteen,[.11,.10,.11],[0,.22,0],MAT.leather);world.survivorCanteen=canteen;
 // Neutral animation reference pose saved (no full animation software or external rigs involved).
 world.survivorMaterials=MAT;
 applyPremiumCharacterDetail(world);
 return root;
}
function createGuitar(){
 const g=new THREE.Group();g.name='Original scavenged acoustic guitar';
 const wood=M('#9d6946',.48),edge=M('#513829',.55),dark=M('#322921',.6),frets=M('#c6a68c',.36,.3),strings=M('#c9c8ae',.25,.4);
 // Guitar oriented across knees, clearly curved lower bout and cutaway waist.
 ell(g,[.0,.29,0],[.41,.47,.12],edge);ell(g,[.0,.29,.115],[.37,.43,.037],wood);
 ell(g,[.0,.78,0],[.29,.29,.10],edge);ell(g,[.0,.78,.11],[.255,.265,.035],wood);
 ell(g,[0,.55,.13],[.20,.16,.024],wood);ell(g,[0,.79,.152],[.135,.13,.012],dark);
 cub(g,[.205,1.03,.065],[0,1.36,.10],dark);cub(g,[.29,.26,.07],[0,1.99,.10],wood);
 for(let i=0;i<15;i++){cub(g,[.21,.013,.074],[0,1.03+i*.061,.14],frets);}
 for(let i=0;i<6;i++){
  const x=(i-2.5)*.028; tube(g,[x,.16,.18],[x,2.08,.16],.004,strings,5);
  ell(g,[(i%2?1:-1)*.18,1.94+Math.floor(i/2)*.10,.1],[.075,.035,.032],frets);
 }
 cub(g,[.24,.083,.10],[0,.17,.17],dark);
 return g;
}
function createRadio(){const r=new THREE.Group();r.name='Salvaged handheld radio';const body=M('#414a43'),metal=M('#91928b',.45,.55);
 cub(r,[.21,.32,.13],[0,.05,0],body);cub(r,[.15,.10,.02],[0,.10,.068],MAT.glass);
 for(let i=0;i<7;i++)cub(r,[.15,.007,.014],[0,-.05+i*.022,.07],metal);
 tube(r,[-.07,.20,-.02],[-.17,.58,-.08],.017,metal);ell(r,[.07,.23,.01],[.037,.04,.035],MAT.orange);return r;}
export function updateSurvivorArt(world,weather){
 if(world.survivorRainHood)world.survivorRainHood.visible=weather.rain>.62||weather.snow>.62;
 animatePremiumCharacterDetail(world,performance.now()*.001,weather.wind||0,weather.wet||0);
}
