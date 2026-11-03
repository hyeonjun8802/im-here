import * as THREE from 'three';
import {CITY_COMPOSITION} from './cityComposition.js';
import {fracturedRoofHeightAt} from './ruinedBuildingGeometry.js';

// Shared instanced architectural hardware: structural mass and dimensions come from
// the same deterministic city plots as the actual 3D buildings. No screen overlays.
const rand=n=>{const q=Math.sin(n*94.174+31.71)*21378.91;return q-Math.floor(q);};
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const {groundY,vegetationCeilingY}=CITY_COMPOSITION;

export class CityArchitecture {
 constructor(scene,primary,infill,isMobile=false){
  const records=[...primary.map((b,i)=>({...b,depth:b.width*.82,uid:i,variant:(Math.floor(rand(i+41)*4))})),
    ...infill.map((b,i)=>({...b,uid:i+1000}))];
  const matrices={bands:[],balconies:[],rails:[],uprights:[],drains:[],vents:[],fans:[],parapets:[],pilasters:[],roofBoxes:[]};
  const colors=Object.fromEntries(Object.keys(matrices).map(k=>[k,[]]));
  const upperDetailsByBuilding=new Map(); // Façade pieces above the 55% collapse line.
  const dummy=new THREE.Object3D();
  const color=(hex)=>new THREE.Color(hex);
  const concrete=[color('#6f7771'),color('#80857c'),color('#606d69'),color('#858378')];
  const metal=[color('#4c5857'),color('#6c6e66'),color('#665a4f'),color('#536368')];
  function add(type,b,lx,y,lz,wx,hy,dz,tint,turn=0){
   const c=Math.cos(b.rotation),s=Math.sin(b.rotation);
   dummy.position.set(b.x+lx*c+lz*s,groundY+y,b.z-lx*s+lz*c);
   dummy.rotation.set(0,b.rotation+turn,0);dummy.scale.set(wx,hy,dz);dummy.updateMatrix();
   const index=matrices[type].length;
   matrices[type].push(dummy.matrix.clone());colors[type].push(tint);
   if(b.id&&y+hy*.5>b.height*.57){
    let detail=upperDetailsByBuilding.get(b.id);
    if(!detail){detail={};upperDetailsByBuilding.set(b.id,detail);}
    (detail[type]??=[]).push(index);
   }
  }
  for(const b of records){
   const close=b.layer==='inner'||b.tier==='near';
   const middle=b.layer==='middle'||b.tier==='mid';
   const w=b.width,d=b.depth,h=b.height,uid=b.uid;
   const c=concrete[Math.floor(rand(uid*3+5)*4)];
   const rust=metal[Math.floor(rand(uid*7+17)*4)];
   const roof= h*(b.layer?fracturedRoofHeightAt(b.variant,0,0):.96);
   // Slender, horizontal concrete floor bands (large contiguous real slab facades).
   const floors=clamp(Math.round(h/3.55),4,10);
   const bandCount=close?floors-1:middle?Math.min(5,floors-1):Math.min(2,floors-1);
   for(let j=0;j<bandCount;j++){
    const floorIndex= Math.floor((j+1)*floors/(bandCount+1));
    const y=floorIndex*h/floors;
    add('bands',b,0,y,d*.5+.095,w,.14,.22,c);
    add('bands',b,0,y,-d*.5-.095,w,.14,.22,c);
    if(close){add('bands',b,w*.5+.095,y,0,d,.14,.22,c,Math.PI/2);
      add('bands',b,-w*.5-.095,y,0,d,.14,.22,c,Math.PI/2);}
   }
   // Balconies are shallow cantilevered plates, never screen-facing quads.
   const balconyCount=close?(isMobile?6:11):middle?(isMobile?3:6):(isMobile?1:2);
   for(let j=0;j<balconyCount;j++){
    const k=uid*97+j*71;
    const face=rand(k+9)>.30?1:-1;
    const col=Math.floor(rand(k+4)*5);
    const x=(col-2)*w*.155;
    const floor=1+Math.floor(rand(k+37)*(floors-2));
    const y=clamp(floor*h/floors,.8,h-1.15);
    const slabW=Math.min(w*.205,3.15),slabD=.66+rand(k+43)*.50;
    add('balconies',b,x,y,d*.5*face+face*slabD*.28,slabW,.16,slabD,c);
    // Broken dark metal lip, with two vertical posts (real depth and parallax).
    const front=d*.5*face+face*(slabD*.75);
    if(rand(k+23)>.19){
     add('rails',b,x,y+.81,front,slabW,.075,.085,rust);
     for(const dx of [-slabW*.43,slabW*.43])add('uprights',b,x+dx,y+.44,front,.06,.83,.07,rust);
    }
   }
   // Deep pilasters make rectangular ruins read as concrete residential
   // buildings from lateral views, instead of flat texture-only boxes.
   if(close||middle){
    for(let j=0;j<(close?4:2);j++){
     const x=(j<2?-.5:.5)*w*.92, z=(j%2?-.5:.5)*d*.92;
     const y=h*.43;
     add('pilasters',b,x,y,z,.27,h*.84,.31,c);
    }
   }
   // Distinctive low rooftop utility blocks, positioned BELOW the hero roof.
   // These are not towers or spires; a few are roof ventilation housings.
   if(close||middle){
    const equipmentCount=close?2:1;
    for(let j=0;j<equipmentCount;j++){
     const k=uid*37+j*97;
     const lx=(rand(k+8)-.5)*w*.53,lz=(rand(k+13)-.5)*d*.51;
     const height=Math.min(.45+rand(k+34)*.75,Math.max(.15,vegetationCeilingY-(groundY+roof)-.5));
     if(height>.17)add('roofBoxes',b,lx,roof+height*.5,lz,Math.min(2.35,w*.19),height,Math.min(2.25,d*.22),rust);
    }
   }
   // One or two utility risers on structural corners. Broken, aged and thin.
   if(close||middle){
    const count=close?2:1;
    for(let j=0;j<count;j++){
     const k=uid*79+j*43;
     const x=(rand(k+5)>.5?1:-1)*w*.42;
     add('drains',b,x,h*.46,d*.5+.13,.10,h*.9,.14,rust);
    }
    const acCount=close?2:1;
    for(let j=0;j<acCount;j++){
     const k=uid*47+j*11;
     const x=(rand(k+3)-.5)*w*.67;
     const y=clamp(h*(.24+rand(k+7)*.51),1,h-1);
     const z=d*.5+.31;
     add('vents',b,x,y,z,.92,.62,.54,c);
     add('fans',b,x,y,z+.29,.43,.43,.055,rust);
    }
   }
   // Low parapets / broken terrace edges make the top read like a roof.
   const roofY=roof+.16;
   if(groundY+roofY+1.2<vegetationCeilingY){
    for(let j=0;j<4;j++){
     const k=uid*59+j*23;
     if(rand(k+4)<(close?.15:middle?.24:.47))continue; // missing pieces from collapse
     const along=j<2?w*.82:d*.82;
     const offset=(rand(k+9)-.5)*along*.10;
     if(j<2){add('parapets',b,offset,roofY,(j===0?1:-1)*d*.46,along,.42,.29,c);}
     else{add('parapets',b,(j===2?1:-1)*w*.46,roofY,offset,along,.42,.29,c,Math.PI/2);}
    }
   }
  }
  const specs={
   bands:['#ffffff',.95,.02],balconies:['#ffffff',.95,.025],rails:['#ffffff',.79,.25],
   uprights:['#ffffff',.79,.25],drains:['#ffffff',.82,.2],vents:['#ffffff',.93,.08],
   fans:['#ffffff',.87,.19],parapets:['#ffffff',.96,.02],
   pilasters:['#ffffff',.96,.03],roofBoxes:['#ffffff',.94,.09]
  };
  this.meshes=[];this.meshByType={};this.originalMatrices=matrices;
  this.upperDetailsByBuilding=upperDetailsByBuilding;this.hiddenBuildingIds=new Set();
  this.stats={buildings:records.length,instances:{},drawCalls:0};
  const cube=new THREE.BoxGeometry(1,1,1);
  const fanGeo=new THREE.CylinderGeometry(.5,.5,1,10);fanGeo.rotateX(Math.PI/2);
  for(const [name,mats] of Object.entries(matrices)){
   if(!mats.length)continue;
   const [base,roughness,metalness]=specs[name];
   const mesh=new THREE.InstancedMesh(name==='fans'?fanGeo:cube,
     new THREE.MeshStandardMaterial({color:base,roughness,metalness,flatShading:name==='fans'}),mats.length);
   mesh.name=`Afterday city architectural detail — ${name}`;
   for(let i=0;i<mats.length;i++){mesh.setMatrixAt(i,mats[i]);mesh.setColorAt(i,colors[name][i]);}
   mesh.instanceMatrix.needsUpdate=true;if(mesh.instanceColor)mesh.instanceColor.needsUpdate=true;
   mesh.castShadow=false;mesh.receiveShadow=false;mesh.computeBoundingSphere();scene.add(mesh);
   this.meshes.push(mesh);this.meshByType[name]=mesh;this.stats.instances[name]=mats.length;
  }
  this.stats.drawCalls=this.meshes.length;
 }
 /** Remove only upper-story fixtures so collapsed towers have no floating railings.
  * All instanced matrices can be restored after exiting the weather preview. */
 setBuildingDamaged(id,damaged=false){
  if(!id||!this.upperDetailsByBuilding.has(id))return;
  const hide=Boolean(damaged);
  if(this.hiddenBuildingIds.has(id)===hide)return;
  if(hide)this.hiddenBuildingIds.add(id);
  else this.hiddenBuildingIds.delete(id);
  const zero=new THREE.Matrix4().makeScale(0,0,0);
  for(const [type,indices] of Object.entries(this.upperDetailsByBuilding.get(id))){
   const mesh=this.meshByType[type],orig=this.originalMatrices[type];
   if(!mesh)continue;
   for(const index of indices)mesh.setMatrixAt(index,hide?zero:orig[index]);
   mesh.instanceMatrix.needsUpdate=true;
  }
 }
}
