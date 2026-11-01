import * as THREE from 'three';
import {COT} from './sleepBedPlan.js';
export {COT,sleepPosition,SHELTER_ASSET} from './sleepBedPlan.js';
const clamp=x=>Math.max(0,Math.min(1,x));
const ease=v=>{const x=clamp(v);return x*x*(3-2*x)};
/** The only sleeping furniture is the pallet already inside the real shelter
 * GLB. This module adds a deforming night blanket, NOT a second cot. A tiny
 * procedural fallback is shown only if the shelter model fails to load.
 */
export function installOriginalCot(parent,roofY){
 const g=new THREE.Group();g.name='Inner-shelter GLB bedding overlay (no duplicate cot)';parent.add(g);
 const mat=(c,r=.95)=>new THREE.MeshStandardMaterial({color:c,roughness:r,metalness:.025});
 const fallback=new THREE.Group();fallback.name='Fallback ONLY when shelter GLB absent';g.add(fallback);
 const b=(size,p,m,name)=>{const o=new THREE.Mesh(new THREE.BoxGeometry(...size),m);o.position.set(...p);o.castShadow=true;o.receiveShadow=true;o.name=name;fallback.add(o);return o;};
 b([3.45,.27,1.72],[COT.x,roofY+.98,COT.z],mat('#525244'),'fallback inner pallet only');
 const pillow=new THREE.Mesh(new THREE.SphereGeometry(1,20,10),mat('#c3b99f'));
 pillow.name='fallback head-end pillow';pillow.position.set(COT.pillowX,roofY+1.34,COT.z);
 pillow.scale.set(.47,.12,.65);fallback.add(pillow);
 let staticFoldedBlanket=null;
 const coverMat=mat('#68725c');coverMat.side=THREE.DoubleSide;
 const NX=20,NZ=14,verts=new Float32Array((NX+1)*(NZ+1)*3),uv=new Float32Array((NX+1)*(NZ+1)*2),idx=[];
 for(let i=0;i<=NX;i++)for(let j=0;j<=NZ;j++){
  const k=i*(NZ+1)+j;uv[k*2]=i/NX;uv[k*2+1]=j/NZ;
  if(i<NX&&j<NZ){const a=k,d=k+NZ+1;idx.push(a,d,a+1,d,d+1,a+1);}
 }
 const geom=new THREE.BufferGeometry();geom.setAttribute('position',new THREE.BufferAttribute(verts,3));geom.setAttribute('uv',new THREE.BufferAttribute(uv,2));geom.setIndex(idx);
 const cover=new THREE.Mesh(geom,coverMat);cover.name='GLB-aligned blanket, animated without creating a cot';
 cover.castShadow=true;cover.receiveShadow=true;cover.frustumCulled=false;g.add(cover);
 const loader=new THREE.TextureLoader();
 loader.load('./assets/materials/advanced/tarp_canvas_albedo.jpg',tex=>{
  tex.colorSpace=THREE.SRGBColorSpace;tex.wrapS=tex.wrapT=THREE.RepeatWrapping;
  tex.repeat.set(.7,.85);coverMat.map=tex;coverMat.color.set('#bac4ad');coverMat.needsUpdate=true;
 },undefined,()=>{});
 let lastCover=0;
 function setCover(value,breathing=0){
  const t=ease(value);lastCover=t;
  // The asset itself owns the folded daytime blanket. Replace it with a
  // smooth cloth surface only after the sleeper actually pulls the covers up.
  if(staticFoldedBlanket)staticFoldedBlanket.visible=t<.03;
  cover.visible=t>=.03 || !staticFoldedBlanket;
  const length=.26+2.10*t,footX=COT.footX-.08;
  const a=geom.attributes.position;
  for(let i=0;i<=NX;i++)for(let j=0;j<=NZ;j++){
   const u=i/NX,v=j/NZ;
   const x=footX-length*u,z=COT.z+(v-.5)*1.49;
   const hump=t*.94*Math.pow(Math.sin(Math.PI*u),.75)*Math.pow(Math.max(0,1-Math.abs(2*v-1)**3),.7);
   const ripple=t*.025*Math.sin(u*19+v*7)*Math.sin(Math.PI*u);
   const y=roofY+COT.mattressTop+.045+hump+ripple+breathing*t*.33;
   a.setXYZ(i*(NZ+1)+j,x,y,z);
  }
  a.needsUpdate=true;geom.computeVertexNormals();geom.computeBoundingSphere();
 }
 function useShelterAsset(model){
  fallback.visible=false;
  const folded=model.getObjectByName('folded sleeping blanket_42');
  if(folded){staticFoldedBlanket=folded;staticFoldedBlanket.visible=lastCover<.03;}
  setCover(lastCover);
 }
 setCover(0);
 return {group:g,cover,pillow,fallback,setCover,useShelterAsset,
  dispose(){g.traverse(o=>{if(o.isMesh){o.geometry?.dispose();o.material?.dispose();}})}};
}
