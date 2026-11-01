import * as THREE from 'three';
import {fracturedRoofHeightAt} from './ruinedBuildingGeometry.js';
import {CITY_COMPOSITION} from './cityComposition.js';

// Deterministic weathering remains attached to world-space building coordinates,
// so moving the camera or changing weather never moves the ivy or rubble.
const hash=n=>{const v=Math.sin(n*91.713+12.71)*43758.5453;return v-Math.floor(v);};
const TAU=Math.PI*2;
const TERRAIN_Y=CITY_COMPOSITION.groundY;

/**
 * Shared geometry + instancing, not hundreds of scene graph patches.
 * All primary GLBs, procedural fallback towers, and batched city blocks use
 * the same ruin treatment. The one playable hero rooftop is deliberately omitted.
 */
export class CityReclamation {
 constructor(scene,primary,infill){
  const lots=[
   ...primary.map((p,i)=>({id:i,x:p.x,z:p.z,width:p.width,depth:p.width*.82,height:p.height,
    rotation:p.rotation,layer:p.tier})),
   ...infill.map((p,i)=>({id:i+1000,...p}))
  ];
  const ivy=[],ivyColors=[],foliage=[],foliageColors=[],trunks=[],trunkColors=[],damage=[],damageColors=[],steel=[],steelColors=[];
  const dummy=new THREE.Object3D();
  const add=(store,colors,position,rotation,scale,tint)=>{
   dummy.position.set(...position);dummy.rotation.set(...rotation);dummy.scale.set(...scale);
   dummy.updateMatrix();store.push(dummy.matrix.clone());colors.push(tint);
  };
  const green=n=>new THREE.Color().setHSL(.22+hash(n+15)*.095,.20+hash(n+29)*.16,.17+hash(n+31)*.14);
  const apply=(b,lx,lz)=>{
   const c=Math.cos(b.rotation),s=Math.sin(b.rotation);
   return [b.x+lx*c+lz*s,b.z-lx*s+lz*c];
  };
  const facing=(b,side,along,offset)=>{
   const horizontal=side===0||side===2;
   const lx=horizontal?along:(side===1?offset:-offset);
   const lz=horizontal?(side===0?offset:-offset):along;
   const [x,z]=apply(b,lx,lz);
   const rotation=b.rotation+(horizontal?(side===0?0:Math.PI):(side===1?Math.PI*.5:-Math.PI*.5));
   return [x,z,rotation];
  };
  for(const b of lots){
   const near=b.layer==='near'||b.layer==='inner';
   const mid=b.layer==='mid'||b.layer==='middle';
   const density=near?5:mid?3:2;
   for(let j=0;j<density;j++){
    const k=b.id*47+j*173;
    const side=Math.floor(hash(k+11)*4),horizontal=side%2===0;
    const faceWidth=horizontal?b.width:b.depth,faceDepth=horizontal?b.depth:b.width;
    const along=(hash(k+37)-.5)*faceWidth*.79;
    const [x,z,rot]=facing(b,side,along,faceDepth*.5+.17);
    // A long broken strip of leaves; varied widths remove the wallpaper look.
    const h=Math.min(b.height*.60,near?31:mid?25:19)*(.54+hash(k+9)*.46);
    const w=Math.min(faceWidth*.55,2.0+hash(k+3)*4.5);
    const yy=TERRAIN_Y+b.height-h*(.42+hash(k+7)*.30)-hash(k+19)*b.height*.08;
    add(ivy,ivyColors,[x,yy,z],[0,rot,hash(k+12)*.14-.07],[w,h,1],green(k));
    // Embedded spalled concrete, missing window bays and water-damaged cuts.
    if((near||mid)&&j<3){
     const [dx,dz]=facing(b,side,along*.84,faceDepth*.5+.24);
     add(damage,damageColors,[dx,TERRAIN_Y+b.height*(.34+hash(k+15)*.54),dz],
      [0,rot,(hash(k+27)-.5)*.5],[Math.min(faceWidth*.5,1.4+hash(k+23)*3.7),
       2.2+hash(k+26)*5.5,1],
      new THREE.Color().setHSL(.15+hash(k+8)*.1,.04,.095+hash(k+16)*.12));
    }
   }
   // Plants sprout out of cracks around shattered parapets, with real trunks.
   const crownCount=near?4:mid?3:2;
   for(let j=0;j<crownCount;j++){
    const k=b.id*29+j*101;
    const lx=(hash(k+13)-.5)*b.width*.73,lz=(hash(k+18)-.5)*b.depth*.70;
    const [x,z]=apply(b,lx,lz);
    const roofFraction=b.variant===undefined?.95:fracturedRoofHeightAt(b.variant,lx/b.width,lz/b.depth);
    const localRoof=b.height*roofFraction;
    const y=TERRAIN_Y+localRoof;
    const tall=(near||mid)&&hash(k+43)>.59;
    const available=Math.max(.2,CITY_COMPOSITION.vegetationCeilingY-y-.25);
    const desiredTrunk=tall?1.7+hash(k+21)*3.9:.7+hash(k+21)*.8;
    const trunkHeight=Math.min(desiredTrunk,available*.64);
    const canopySize=Math.min(tall?1.65+hash(k+3)*1.9:.9+hash(k+3)*1.65,
      Math.max(.12,(available-trunkHeight)*.79));
    add(trunks,trunkColors,[x,y+trunkHeight*.49,z],
     [hash(k+2)*.12,hash(k+7)*TAU,hash(k+41)*.14],
     [.13+hash(k+48)*.14,trunkHeight,.13+hash(k+17)*.12],new THREE.Color('#4c4935'));
    // Clustered irregular foliage, not perfect identical spherical lollipops.
    for(let part=0;part<(tall?3:2);part++){
     const t=k+part*79;
     add(foliage,foliageColors,[x+(hash(t+9)-.5)*canopySize*.55,
      y+trunkHeight+canopySize*(.10+(hash(t+22)-.5)*.35),
      z+(hash(t+10)-.5)*canopySize*.5],
      [hash(t+2)*TAU,hash(t+5)*TAU,hash(t+7)*.45],
      [canopySize*(.68+hash(t+10)*.38),canopySize*(.32+hash(t+21)*.29),canopySize*(.6+hash(t+33)*.43)],green(t));
    }
   }
   // Low, collapsed service rails: ruined roofs do not sprout pointed towers.
   if((near||mid)&&hash(b.id*12+17)<(near?.34:.16)){
    const k=b.id*57+7;
    const lx=(hash(k+1)-.5)*b.width*.4,lz=(hash(k+2)-.5)*b.depth*.4;
    const [x,z]=apply(b,lx,lz);
    const roofFraction=b.variant===undefined?.95:fracturedRoofHeightAt(b.variant,lx/b.width,lz/b.depth);
    const roofTop=TERRAIN_Y+b.height*roofFraction;
    const h=Math.min(1.4+hash(k+4)*1.5,Math.max(.45,CITY_COMPOSITION.vegetationCeilingY-roofTop-1.5));
    const steelTint=new THREE.Color().setHSL(.08,.13,.20+hash(k+7)*.12);
    add(steel,steelColors,[x,TERRAIN_Y+b.height*roofFraction+h*.44,z],[0,b.rotation,(hash(k+10)-.5)*.28],[.17,h,.22],steelTint);
    add(steel,steelColors,[x+.9,TERRAIN_Y+b.height*roofFraction+h*.57,z],[0,b.rotation,.25],[.14,h*.7,.19],steelTint);
    add(steel,steelColors,[x+.42,roofTop+h*.67,z],[0,b.rotation,.94],[.13,Math.min(1.7,h),.18],steelTint);
   }
  }
  const addInstances=(name,geometry,material,matrices,colors)=>{
   const mesh=new THREE.InstancedMesh(geometry,material,matrices.length);mesh.name=name;
   for(let i=0;i<matrices.length;i++){mesh.setMatrixAt(i,matrices[i]);mesh.setColorAt(i,colors[i]);}
   mesh.instanceMatrix.needsUpdate=true;
   if(mesh.instanceColor)mesh.instanceColor.needsUpdate=true;
   mesh.castShadow=false;mesh.receiveShadow=false;
   mesh.computeBoundingSphere();scene.add(mesh);return mesh;
  };
  const ivyMap=new THREE.TextureLoader().load('./assets/materials/city/ivy_reclaimed.png');
  ivyMap.colorSpace=THREE.SRGBColorSpace;
  const ivyMat=new THREE.MeshStandardMaterial({map:ivyMap,color:'#ffffff',roughness:1,metalness:0,
   alphaTest:.38,side:THREE.DoubleSide,depthWrite:true});
  // Varied (non-square) concrete spalls read as damage from multiple viewing angles.
  const brokenShape=new THREE.Shape();brokenShape.moveTo(-.48,-.34);brokenShape.lineTo(-.23,-.5);
  brokenShape.lineTo(.17,-.39);brokenShape.lineTo(.47,-.49);brokenShape.lineTo(.42,.25);
  brokenShape.lineTo(.22,.39);brokenShape.lineTo(-.18,.5);brokenShape.lineTo(-.51,.23);brokenShape.closePath();
  this.instances=[
   addInstances('Overgrown city facades — climbing ivy',new THREE.PlaneGeometry(1,1),ivyMat,ivy,ivyColors),
   addInstances('Damaged tower facade — chipped and fractured concrete',new THREE.ShapeGeometry(brokenShape),
    new THREE.MeshStandardMaterial({color:'#ffffff',roughness:1,metalness:0,side:THREE.DoubleSide,polygonOffset:true,polygonOffsetFactor:-1}),damage,damageColors),
   addInstances('Rooted roof trees — trunks',new THREE.BoxGeometry(1,1,1),
    new THREE.MeshStandardMaterial({color:'#ffffff',roughness:1}),trunks,trunkColors),
   addInstances('Rooted roof trees — clustered foliage',new THREE.IcosahedronGeometry(1,1),
    new THREE.MeshStandardMaterial({color:'#ffffff',roughness:1,metalness:0,flatShading:true}),foliage,foliageColors),
   addInstances('Broken steel frames above abandoned rooftops',new THREE.BoxGeometry(1,1,1),
    new THREE.MeshStandardMaterial({color:'#ffffff',roughness:.96,metalness:.1}),steel,steelColors)
  ];
 }
}
