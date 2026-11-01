import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const text=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
function glb(name){const data=fs.readFileSync(new URL('../public/assets/models/afterday/'+name,import.meta.url));const size=data.readUInt32LE(12);return JSON.parse(data.subarray(20,20+size).toString('utf8'))}
function node(doc,prefix){return doc.nodes.filter(n=>n.name?.startsWith(prefix));}
function bounds(doc,prefix){const n=node(doc,prefix)[0];assert.ok(n,`missing ${prefix}`);const pos=doc.accessors[doc.meshes[n.mesh].primitives[0].attributes.POSITION];return {min:pos.min,max:pos.max}}
test('v350: one original pallet remains, with a soft pillow and smaller folded blanket',()=>{
 const doc=glb('afterday_shelter_pbr.glb');
 assert.equal(node(doc,'narrow sleeping pallet').length,1);
 assert.equal(node(doc,'pillow_').length,1);
 assert.equal(node(doc,'folded sleeping blanket').length,1);
 assert.equal(node(doc,'wrinkled ivory fitted sheet').length,1);
 assert.equal(node(doc,'mattress cotton perimeter piping').length,1);
 const b=bounds(doc,'folded sleeping blanket'),bed=bounds(doc,'narrow sleeping pallet');
 assert.ok(b.max[0]-b.min[0]<(bed.max[0]-bed.min[0])*.5,'folded blanket must not cover full mattress when awake');
 const pillow=node(doc,'pillow_')[0];const acc=doc.accessors[doc.meshes[pillow.mesh].primitives[0].attributes.POSITION];assert.ok(acc.count>100,'soft pillow has a curved high-vertex surface, not 8 box corners');
});
test('v350: water tank and storage crate detail is in GLB, not hidden fallback',()=>{
 const tank=glb('afterday_water_tank_pbr.glb'),store=glb('afterday_storage_pbr.glb');
 assert.equal(node(tank,'old welded water stains').length,1);
 assert.equal(node(tank,'water inspection legend').length,1);
 assert.equal(node(store,'worn paper provision inventory placards').length,1);
 assert.equal(node(store,'tiny stencil strip marks').length,1);
});
test('v350: real GLBs own authored details; fallback decoration is not duplicated',()=>{
 const world=text('src/world.js');
 assert.match(world,/this\.scene\.add\(model\);old\.visible=false/);
 assert.doesNotMatch(world,/model\.add\(layer\)/);
 for(const name of ['afterday_shelter_pbr.glb','afterday_water_tank_pbr.glb','afterday_storage_pbr.glb']){
  const doc=glb(name);
  assert.ok(doc.meshes.length>=50,`${name}: detailed baked 3D object`);
 }
});
