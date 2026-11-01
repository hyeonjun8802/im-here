import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {join} from 'node:path';
const root=process.cwd();
const model=join(root,'public/assets/models/afterday/afterday_bearded_survivor_v190.glb');
const data=fs.readFileSync(model);
const size=data.readUInt32LE(12);
const gltf=JSON.parse(data.toString('utf8',20,20+size));
const node=(name)=>gltf.nodes.find(n=>n.name===name);
const material=(name)=>gltf.materials.find(m=>m.name===name);
test('v1.9.3 uses actual embedded GLB with 3D geometry and named articulated rig',()=>{
 assert.equal(data.toString('ascii',0,4),'glTF');
 assert.equal(data.readUInt32LE(4),2);
 assert.equal(data.readUInt32LE(8),data.length);
 for(const n of ['RigRoot','Torso','Head','UpperArm_L','UpperArm_R','UpperLeg_L','UpperLeg_R','Knee_L','Knee_R'])assert.ok(node(n),n);
 assert.ok(gltf.meshes.length>100);
 assert.ok(gltf.accessors.length>100);
});
test('approved clothing texture is embedded in 3D PBR material with tangent-space normal map',()=>{
 const jacket=material('approved character jacket photo-baked fabric');
 assert.ok(jacket,'Reference-derived jacket material');
 assert.ok(jacket.pbrMetallicRoughness?.baseColorTexture,'real UV color texture');
 assert.ok(jacket.normalTexture,'PBR normal map');
 assert.ok(gltf.images.length>=10,'embedded textures must exist');
 assert.ok(gltf.meshes.every(m=>m.primitives.every(p=>p.attributes.POSITION!==undefined)));
});
test('caps, compact beard and sculpted eyes are genuine named meshes',()=>{
 for(const prefix of ['cap sculpted crown','structured baseball cap bill','single unified sculpted black beard','small calm sclera']){
  assert.ok(gltf.nodes.some(n=>(n.name||'').startsWith(prefix)),prefix);
 }
 assert.ok(!gltf.nodes.some(n=>(n.name||'').startsWith('rounded cheeks')));
});
test('lowered shoulders and compact chibi head scale do not change gameplay joint IDs',()=>{
 const head=node('Head');assert.ok(head.matrix,'head world transform');
 assert.ok(head.matrix[5]>.85&&head.matrix[5]<.9);
 for(const side of ['L','R']){
  const arm=node('UpperArm_'+side);assert.ok(arm.matrix[13]>=1.71&&arm.matrix[13]<=1.75);
  assert.ok(Math.abs(arm.matrix[12])>.60&&Math.abs(arm.matrix[12])<.68);
 }
});
test('art reference and matched offscreen GLB renders exist, do not claim browser screenshot',()=>{
 for(const path of ['docs/qa/APPROVED_CHARACTER_TURNAROUND.png','docs/qa/V193_BEFORE_AFTER_3D_RENDER.jpg','docs/qa/V193_APPROVED_VS_GLB_FRONT.jpg','docs/qa/CHARACTER_MOTION_GEOMETRY_QA.jpg']){
  assert.ok(fs.statSync(join(root,path)).size>10000,path);
 }
});
