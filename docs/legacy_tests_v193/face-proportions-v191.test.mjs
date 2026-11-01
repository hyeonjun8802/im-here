import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const model=path.join(root,'public/assets/models/afterday/afterday_bearded_survivor_v190.glb');
const blob=fs.readFileSync(model);
assert.equal(blob.toString('ascii',0,4),'glTF');
const size=blob.readUInt32LE(12);
const json=JSON.parse(blob.toString('utf8',20,20+size));
const names=json.nodes.map(n=>n.name||'');
function nodes(prefix){return json.nodes.filter(n=>(n.name||'').startsWith(prefix));}
function extents(prefix){return nodes(prefix).map(n=>{
 const p=json.meshes[n.mesh].primitives[0];const a=json.accessors[p.attributes.POSITION];
 return {name:n.name,min:a.min,max:a.max,width:a.max[0]-a.min[0],height:a.max[1]-a.min[1]};
});}
test('v1.9.1 real GLB keeps playable character skeleton and source URL',()=>{
 assert.equal(blob.readUInt32LE(4),2);
 for(const n of ['RigRoot','Torso','Head','UpperArm_L','UpperArm_R','UpperLeg_L','UpperLeg_R','Knee_L','Knee_R'])assert.ok(names.includes(n),n);
 assert.match(fs.readFileSync(path.join(root,'src/beardedSurvivorV190.js'),'utf8'),/afterday_bearded_survivor_v190\.glb/);
});
test('protruding cheek add-on spheres are fully removed',()=>{
 assert.equal(nodes('rounded cheeks').length,0);
 assert.equal(nodes('sculpted adult head').length,1);
});
test('ears have been reduced and stay close to skull',()=>{
 const ear=extents('small anatomical ear');assert.equal(ear.length,2);
 for(const e of ear){assert.ok(e.width<0.14,e.name);assert.ok(e.height<0.24,e.name);assert.ok(Math.max(Math.abs(e.min[0]),Math.abs(e.max[0]))<0.55,e.name);}
});
test('small eye spheres and thin brows without large bulging ridge',()=>{
 const eye=extents('small calm sclera'),brow=extents('thin relaxed eyebrow');
 assert.equal(eye.length,2);assert.equal(brow.length,2);
 for(const e of eye)assert.ok(e.width<0.205,e.name);
 for(const e of brow)assert.ok(e.height<0.055,e.name);
 assert.equal(nodes('thick eyebrow').length,0);
 assert.equal(nodes('brow ridge').length,0);
});
test('shoulders and jacket pockets no longer protrude like balloon armor',()=>{
 const shoulder=extents('soft tailored shoulder');assert.equal(shoulder.length,2);
 for(const s of shoulder)assert.ok(Math.max(Math.abs(s.min[0]),Math.abs(s.max[0]))<.60,s.name);
 const pocket=extents('small low profile coat pocket');assert.equal(pocket.length,2);
 for(const e of pocket)assert.ok(e.width<.22,e.name);
 assert.equal(nodes('rounded padded shoulder').length,0);
 assert.equal(nodes('square but soft coat chest pocket').length,0);
 assert.equal(nodes('pocket press stud').length,0);
});
test('unified beard and clean adult cap keep facial geometry compatible',()=>{
 assert.equal(nodes('single unified sculpted black beard').length,1);
 assert.equal(nodes('cap sculpted crown').length,1);
 assert.equal(nodes('soft scarf fold').length,3);
});
