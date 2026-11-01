import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
const root=process.cwd();
const modelPath=path.join(root,'public/assets/models/afterday/afterday_bearded_survivor_v190.glb');
const bytes=fs.readFileSync(modelPath);
assert.equal(bytes.toString('ascii',0,4),'glTF');
assert.equal(bytes.readUInt32LE(4),2);
const j=JSON.parse(bytes.toString('utf8',20,20+bytes.readUInt32LE(12)));
const byName=name=>j.nodes.find(n=>n.name===name);
const pref=prefix=>j.nodes.filter(n=>(n.name??'').startsWith(prefix));
const bounds=n=>j.accessors[j.meshes[n.mesh].primitives[0].attributes.POSITION];
const nodeTranslation=(name)=>{
 const n=byName(name);assert.ok(n,name);
 const M=n.matrix;assert.equal(M.length,16);
 return [M[12],M[13],M[14]];
};
test('the same game GLB remains wired to Three.js; joints are compatible',()=>{
 const src=fs.readFileSync(path.join(root,'src/beardedSurvivorV190.js'),'utf8');
 assert.match(src,/GLTFLoader/);
 assert.match(src,/afterday_bearded_survivor_v190\.glb/);
 for(const name of ['RigRoot','Head','Torso','UpperArm_L','UpperArm_R','UpperLeg_L','UpperLeg_R','Knee_L','Knee_R'])assert.ok(byName(name),name);
});
test('cap uses a structured square-ish crown and thin separate baseball visor',()=>{
 assert.equal(pref('cap sculpted crown').length,1);
 assert.equal(pref('structured baseball cap bill').length,1);
 assert.equal(pref('rounded baseball visor').length,0);
 const c=bounds(pref('cap sculpted crown')[0]);
 const bill=bounds(pref('structured baseball cap bill')[0]);
 assert.ok(c.max[1]>.67 && c.min[1]>.2,'upright cap with broad flat top');
 assert.ok(c.max[0]-c.min[0]>.98,'cap remains broad without bun shape');
 assert.ok(bill.max[2]>.75,'visor extends forward');
 assert.ok(bill.max[1]-bill.min[1]<.13,'visor is thin, not puffed');
});
test('shoulders are dropped, tucked and tapered',()=>{
 for(const name of ['UpperArm_L','UpperArm_R']){
   const t=nodeTranslation(name);
   assert.ok(t[1]>=1.71 && t[1]<=1.75,`${name} pivot Y=${t[1]}`);
   assert.ok(Math.abs(t[0])>.60 && Math.abs(t[0])<.68,`${name} shoulder pivots inward`);
 }
 const sh=pref('soft tailored shoulder');
 assert.equal(sh.length,2);
 for(const n of sh){const b=bounds(n);assert.ok(b.max[1]<.39 && b.max[1]>.34,'padding is lower than neckline');assert.ok(b.max[0]-b.min[0]<.20);}
 const sleeves=pref('slim work sleeve');assert.equal(sleeves.length,2);
 for(const n of sleeves){const b=bounds(n);assert.ok((b.max[1]-b.min[1])>.47);assert.ok((b.max[0]-b.min[0])<.42);}
});
test('offline matched-camera GLB screenshots and approved reference exist',()=>{
 for(const f of ['APPROVED_REFERENCE_CAP_SHOULDER.png','V192_APPROVED_VS_BEFORE_AFTER.jpg','V192_CAP_SHOULDER_ZOOM_COMPARE.jpg','CHARACTER_MOTION_GEOMETRY_QA.jpg']){
  assert.ok(fs.statSync(path.join(root,'docs/qa',f)).size>3000,f);
 }
});
