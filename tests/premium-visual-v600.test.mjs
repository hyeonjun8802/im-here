import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as THREE from 'three';
import {calcPostGrade} from '../src/presentationPlanV140.js';
import {finishPreset,finishTexture,finishMaterial,finishImportedGLB} from '../src/premiumMaterialFinishV600.js';

test('calibrated color has brighter midtones and readable shadows without washing out storms',()=>{
 const day=calcPostGrade({night:0,storm:0,wetness:0,twilight:0});
 const cold=calcPostGrade({night:1,storm:1,wetness:1,twilight:0});
 const sunset=calcPostGrade({night:.35,storm:0,wetness:0,twilight:1});
 assert.ok(day.saturation>1&&day.saturation<1.15);
 assert.ok(cold.saturation<day.saturation&&cold.saturation>.87);
 assert.ok(cold.shadowLift>day.shadowLift&&cold.shadowLift<.10);
 assert.ok(cold.midtoneGain>day.midtoneGain&&cold.midtoneGain<.14);
 assert.ok(cold.contrast>day.contrast&&cold.contrast<1.2);
 assert.ok(sunset.highlightWarmth>day.highlightWarmth);
 assert.ok(day.highlightRolloff>.07&&cold.highlightRolloff<.16);
 assert.ok(cold.filmGrain<.01);
});
test('high quality desktop recovers the native device pixel density through the composer',()=>{
 const code=readFileSync(new URL('../src/cinematicPostV130.js',import.meta.url),'utf8');
 assert.match(code,/this\.composer\.setPixelRatio\(world\.renderer\.getPixelRatio\(\)\)/);
 assert.match(code,/this\.composer\.setPixelRatio\(this\.world\.renderer\.getPixelRatio\(\)\)/);
 assert.match(code,/new ShaderPass\(FXAAShader\)/);
 assert.match(code,/uniforms\.resolution\.value\.set\(/);
 assert.match(code,/this\.composer\.addPass\(new OutputPass\(\)\)/);
 assert.match(code,/uShadowLift/);
 assert.match(code,/uMidtoneGain/);
 assert.match(code,/uRolloff/);
 assert.match(code,/if\(world\.isMobile\)return/);
});
test('material finishing smooths imported textured surfaces without replacing UVs or PBR maps',()=>{
 const albedo=new THREE.Texture(),normal=new THREE.Texture();
 const originalUV=new THREE.BoxGeometry(2,1,1),mat=new THREE.MeshStandardMaterial({
  color:'#9e8c6b',map:albedo,normalMap:normal,
  roughness:.15,metalness:.8,flatShading:true
 });
 const m=new THREE.Mesh(originalUV,mat);m.name='weathered canvas shelter';
 const root=new THREE.Group();root.add(m);
 const oldPos=m.geometry.attributes.position,oldUV=m.geometry.attributes.uv;
 const report=finishImportedGLB(root,{mobile:false});
 assert.equal(report.meshes,1);assert.equal(report.maps,2);
 assert.equal(m.geometry.attributes.position,oldPos);
 assert.equal(m.geometry.attributes.uv,oldUV);
 assert.equal(m.material.map,albedo);
 assert.equal(m.material.normalMap,normal);
 assert.equal(m.material.flatShading,false);
 assert.ok(mat.roughness>=.78&&mat.metalness<=.09);
 assert.equal(albedo.anisotropy,12);
 assert.equal(albedo.magFilter,THREE.LinearFilter);
 assert.equal(albedo.minFilter,THREE.LinearMipmapLinearFilter);
 assert.ok(mat.normalScale.x<=.46);
 assert.equal(root.children.length,1,'no new placeholder object nor rooftop');
 root.clear();originalUV.dispose();mat.dispose();albedo.dispose();normal.dispose();
});
test('imported GLB normal generation is limited to genuinely missing attributes',()=>{
 const root=new THREE.Group();
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute([
  -1,0,0,1,0,0,0,1,0
 ],3));
 const mat=new THREE.MeshStandardMaterial({roughness:.7});
 const mesh=new THREE.Mesh(g,mat);root.add(mesh);
 assert.equal(mesh.geometry.attributes.normal,undefined);
 const first=finishImportedGLB(root,{mobile:true});
 assert.equal(first.normalMeshes,1);
 assert.ok(mesh.geometry.attributes.normal);
 const second=finishImportedGLB(root,{mobile:true});
 assert.equal(second.normalMeshes,0);
 assert.equal(mesh.castShadow,true);
 assert.equal(mesh.receiveShadow,true);
 g.dispose();mat.dispose();
});
test('mobile retains safe texture filtering and desktop uses more anisotropic detail',()=>{
 assert.equal(finishPreset(true).anisotropy,4);
 assert.equal(finishPreset(false).anisotropy,12);
 const t=new THREE.Texture();finishTexture(t,4);
 assert.equal(t.anisotropy,4);
 assert.equal(t.generateMipmaps,true);
 const m=new THREE.MeshStandardMaterial({roughness:.17,metalness:.4,normalMap:t});
 finishMaterial(m,'rusted metal pipe',true);
 assert.ok(m.roughness>=.34);
 assert.ok(Math.abs(m.normalScale.x)<=.35);
 t.dispose();m.dispose();
});
test('actual key lights and shadows are brighter while weather still controls the one world',()=>{
 const s=readFileSync(new URL('../src/world.js',import.meta.url),'utf8');
 assert.match(s,/new THREE\.HemisphereLight\('#cfdad5','#55564f',1\.48\)/);
 assert.match(s,/1\.30-night\*\.37-haze\*\.20-vw\.storm\*\.13/);
 assert.match(s,/1\.27\+twilight\*\.06\+night\*\.035-vw\.storm\*\.035/);
 assert.match(s,/mobile\?1024:3072/);
 assert.match(s,/finishImportedGLB\(model,\{mobile:this\.isMobile\}\)/);
 assert.match(s,/finishTexture\(texture,8\)/);
 assert.match(s,/target\.normalScale\.set\(\.38,\.38\)/);
 assert.match(s,/this\.scene\.environmentIntensity=\.64-night\*\.16/);
 assert.match(s,/this\.sun\.position\.set\(/);
});
test('real screenshot QA exposes separate weather and pixel-density metrics but never invents images',()=>{
 const script=readFileSync(new URL('../scripts/qa_visual_v600.mjs',import.meta.url),'utf8');
 const compare=readFileSync(new URL('../scripts/compare_premium_frames_v600.py',import.meta.url),'utf8');
 for(const marker of ['01_clear_day_desktop','03_sunset_desktop','04_night_camp_desktop',
  '05_storm_desktop','06_near_tornado_desktop','07_day_mobile','08_night_mobile']){
   assert.ok(script.includes(marker),marker);
 }
 assert.match(script,/page\.screenshot\(/);
 assert.match(script,/renderer\.getPixelRatio\(\)/);
 assert.match(script,/composerPixelRatio:/);
 assert.match(compare,/FileNotFoundError/);
 assert.match(compare,/mean_saturation_0_1/);
 assert.match(compare,/black_clipping_fraction/);
 assert.match(compare,/side_by_side\.jpg/);
});
