import * as THREE from 'three';

/** AFTERDAY v6.0 · asset surface finishing on existing GLB assets only.
 * Keeps authored UVs, metal/rough/normal maps, rig bones and geometry.
 * It never adds new geometry or changes player/world layout.
 */
export const finishPreset=(mobile=false)=>Object.freeze({
  anisotropy:mobile?4:16,
  maxNormalScale:mobile?.35:.46,
  clothRoughnessMin:.78,
  metalRoughnessMin:.34
});
export function finishTexture(texture,anisotropy=8){
 if(!texture?.isTexture)return false;
 const n=Math.max(1,Math.min(16,Math.round(anisotropy)));
 texture.anisotropy=n;
 texture.magFilter=THREE.LinearFilter;
 texture.minFilter=THREE.LinearMipmapLinearFilter;
 texture.generateMipmaps=true;
 texture.needsUpdate=true;
 return true;
}
const typeHint=name=>{
 const v=(name||'').toLowerCase();
 if(/tarp|canopy|fabric|canvas|cloth|coat|jacket|tent|strap|blanket|curtain/.test(v))return 'fabric';
 if(/glass|windscreen|lens|pane|window/.test(v))return 'glass';
 if(/steel|metal|iron|rust|hinge|handle|tank|pipe|cap|wire|antenna/.test(v))return 'metal';
 return 'generic';
};
export function finishMaterial(material,meshName='',mobile=false){
 if(!material?.isMaterial)return false;
 const preset=finishPreset(mobile),name=(meshName+' '+(material.name||'')).toLowerCase();
 const hint=typeHint(name);
 for(const key of ['map','normalMap','roughnessMap','metalnessMap','aoMap','emissiveMap','alphaMap']){
  if(material[key]?.isTexture)finishTexture(material[key],preset.anisotropy);
 }
 if(material.isMeshStandardMaterial||material.isMeshPhysicalMaterial){
  if(hint==='fabric'){
   material.flatShading=false;
   material.roughness=Math.max(material.roughness,preset.clothRoughnessMin);
   material.metalness=Math.min(material.metalness,.09);
   material.envMapIntensity=mobile?.48:.62;
   if(material.isMeshPhysicalMaterial){
    material.sheen=Math.max(material.sheen||0,.10);
    material.sheenRoughness=Math.max(material.sheenRoughness||0,.78);
    material.sheenColor?.set?.('#8c897d');
   }
  }else if(hint==='glass'){
   material.roughness=THREE.MathUtils.clamp(material.roughness,.10,.42);
   material.metalness=Math.min(material.metalness,.24);
   material.envMapIntensity=mobile?1.0:1.35;
   if(material.isMeshPhysicalMaterial){
    material.clearcoat=Math.max(material.clearcoat||0,.55);
    material.clearcoatRoughness=Math.min(material.clearcoatRoughness||.18,.22);
   }
  }else if(hint==='metal'){
   material.roughness=THREE.MathUtils.clamp(material.roughness,preset.metalRoughnessMin,.88);
   material.envMapIntensity=mobile?.92:1.28;
   if(material.isMeshPhysicalMaterial){
    material.clearcoat=Math.max(material.clearcoat||0,.06);
    material.clearcoatRoughness=Math.max(material.clearcoatRoughness||.28,.28);
   }
  }else{
   material.envMapIntensity=mobile?.62:.82;
  }
  if(material.normalMap&&material.normalScale){
   material.normalScale.x=THREE.MathUtils.clamp(material.normalScale.x,-preset.maxNormalScale,preset.maxNormalScale);
   material.normalScale.y=THREE.MathUtils.clamp(material.normalScale.y,-preset.maxNormalScale,preset.maxNormalScale);
  }
  material.needsUpdate=true;
 }
 return true;
}
export function finishImportedGLB(root,{mobile=false}={}){
 if(!root?.traverse)return {meshes:0,maps:0,normalMeshes:0};
 let meshes=0,maps=0,normalMeshes=0;
 // A GLB can reuse materials between mesh primitives. Finish each material
 // once; no per-frame recompilation, clone, or material leak.
 const finished=new Set();
 root.traverse(o=>{
  if(!o.isMesh||!o.geometry)return;
  meshes++;
  if(!o.geometry.attributes.normal&&o.geometry.attributes.position){
   o.geometry.computeVertexNormals();normalMeshes++;
  }
  o.castShadow=true;o.receiveShadow=true;
  for(const mat of Array.isArray(o.material)?o.material:[o.material]){
   if(!mat||finished.has(mat))continue;
   finished.add(mat);
   maps+=['map','normalMap','roughnessMap','metalnessMap','aoMap','emissiveMap','alphaMap']
    .filter(k=>mat[k]?.isTexture).length;
   finishMaterial(mat,o.name,mobile);
  }
 });
 return {meshes,maps,normalMeshes};
}
