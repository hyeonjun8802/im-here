import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {COT,SHELTER_ASSET,sleepPosition} from '../src/sleepBedPlan.js';
import {sleepAnimation,SLEEP_ENTER_SECONDS} from '../src/dailyCycle.js';
import {collidesRooftop,planCollisionFreeRoofPath} from '../src/roofNavigation.js';
const source=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
const close=(a,b,epsilon=.001)=>assert.ok(Math.abs(a-b)<epsilon,`${a} differs from ${b}`);
const glb=fs.readFileSync(new URL('../public/assets/models/afterday/afterday_shelter_pbr.glb',import.meta.url));
const jsonSize=glb.readUInt32LE(12),doc=JSON.parse(glb.subarray(20,20+jsonSize).toString('utf8'));
function boundsOf(nodeName){
 const node=doc.nodes.find(n=>n.name===nodeName);assert.ok(node,`Missing real 3D object: ${nodeName}`);
 const prim=doc.meshes[node.mesh].primitives[0],acc=doc.accessors[prim.attributes.POSITION];
 return [acc.min,acc.max];
}
test('v340: genuine shelter GLB contains ONE inner sleeping pallet, pillow, and folded blanket',()=>{
 assert.equal(doc.nodes.filter(n=>n.name.startsWith('narrow sleeping pallet')).length,1);
 assert.equal(doc.nodes.filter(n=>n.name.startsWith('pillow_')).length,1);
 assert.equal(doc.nodes.filter(n=>n.name.startsWith('folded sleeping blanket')).length,1);
 const [lo,hi]=boundsOf('narrow sleeping pallet_41');
 close(SHELTER_ASSET.x+(lo[0]+hi[0])/2,COT.x);
 close(SHELTER_ASSET.z+(lo[2]+hi[2])/2,COT.z);
 close(SHELTER_ASSET.baseY+hi[1],COT.mattressTop);
 assert.ok(COT.headX>=COT.x-COT.halfLength&&COT.headX<COT.x,'pillow lies at head end');
});
test('v340: original bed is not duplicated and GLB is bound to cover',()=>{
 assert.doesNotMatch(source('src/world.js'),/box\(sh,\[7,\.18,4\]/);
 assert.match(source('src/world.js'),/this\.sleepBedding\?\.useShelterAsset\(model\)/);
 assert.match(source('src/sleepBedding.js'),/fallback\.visible=false/);
 assert.match(source('src/sleepBedding.js'),/folded sleeping blanket_42/);
 const preview=source('src/characterPreviewV190.js');
 assert.match(preview,/afterday_shelter_pbr\.glb/);
});
test('v340: path reaches the only inner bed, and placement is exact and continuous',()=>{
 assert.equal(collidesRooftop(...COT.approach),false);
 assert.equal(collidesRooftop(COT.x,COT.z),true);
 const route=planCollisionFreeRoofPath([-1,1],COT.approach);assert.ok(route.length>1);
 let previous=sleepPosition(sleepAnimation('enter',0));
 for(let i=1;i<=200;i++){
  const next=sleepPosition(sleepAnimation('enter',SLEEP_ENTER_SECONDS*i/200));
  assert.ok(Math.hypot(next[0]-previous[0],next[1]-previous[1])<.09);
  previous=next;
 }
 close(previous[0]-2.85,COT.pillowX,.18);
 close(previous[1],COT.z);
});
test('v340: frame order remains standing, full seated pause, then supine with pillow and blanket',()=>{
 const still=sleepAnimation('enter',2.5),flat=sleepAnimation('perform');
 close(still.roll,0);close(still.sit,1);close(still.cover,0);
 close(flat.roll,1);close(flat.cover,1);
 assert.ok(flat.height>=1.35,'actual model lower surface is positioned over mattress');
});
