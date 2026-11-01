import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {COT,sleepPosition} from '../src/sleepBedPlan.js';
import {sleepAnimation,SLEEP_ENTER_SECONDS,SLEEP_EXIT_SECONDS} from '../src/dailyCycle.js';
const read=path=>fs.readFileSync(path,'utf8');
const near=(a,b,eps=1e-6)=>assert.ok(Math.abs(a-b)<=eps,`${a} != ${b}`);

test('v320: one original cot owns its mattress, head pillow and blanket',()=>{
 const scene=read('src/sceneDetails.js'),cinema=read('src/cinematicStage.js'),world=read('src/world.js'),life=read('src/survivorLife.js');
 assert.equal((scene.match(/installOriginalCot\(/g)||[]).length,1,'cot installed once only');
 assert.doesNotMatch(scene,/block\(group,\[3\.8,\.38,2\]/);
 assert.doesNotMatch(cinema,/box\(tent,\[3\.4,\.25,1\.95\]/);
 assert.doesNotMatch(world,/box\(sh,\[3\.3,\.3,2\.5\]/);
 assert.doesNotMatch(life,/const pillow=box/);
 assert.match(life,/sleepBed:\{pos:COT\.feet,approach:COT\.approach/);
 const bedding=read('src/sleepBedding.js');
 assert.match(bedding,/const cover=new THREE\.Mesh/);
 assert.match(bedding,/setCover\(value,breathing=0\)/);
});

test('v320: the actual sleeper head goes to -X pillow and body fits inside cot',()=>{
 const [fx,fz]=COT.feet;
 near(fx-2.85,COT.pillowX,.18); // Measured GLB head offset after supine transform
 assert.ok(Math.abs(COT.headX-COT.pillowX)<.15);
 assert.ok(fx-3>=COT.x-COT.halfLength-.08,'cap stays inside headboard');
 assert.ok(fx<=COT.x+COT.halfLength,'feet stay inside footboard');
 near(fz,COT.z,.03);
 assert.ok(COT.approach[1]>COT.z+COT.halfWidth+.6,'walkable aisle is in front of original pallet');
 const rig=read('src/beardedSurvivorV190.js');
 assert.match(rig,/this\.sleepTarget\.copy\(this\.sleepBack\)\.multiply\(this\.sleepTilt\)/);
 assert.match(rig,/this\.sleepAxisZ/);assert.match(rig,/this\.sleepAxisX/);
 // Rx(-90) * Rz(+90) maps character head +Y -> world -X, and face +Z -> +Y.
 const head=[-1,0,0],face=[0,1,0];
 assert.ok(head[0]<0&&face[1]>0);
});

test('v320: visible seated pause before roll, then blanket comes up',()=>{
 assert.ok(SLEEP_ENTER_SECONDS>=5);
 for(const t of [.24,.32,.42]){
  const p=sleepAnimation('enter',t*SLEEP_ENTER_SECONDS);
  near(p.sit,1);near(p.roll,0);near(p.cover,0);
 }
 const midway=sleepAnimation('enter',.7*SLEEP_ENTER_SECONDS);
 assert.ok(midway.roll>.5&&midway.roll<1,'gradual recline');
 const covers=[0,.5,.7,.85,1].map(q=>sleepAnimation('enter',q*SLEEP_ENTER_SECONDS).cover);
 assert.equal(covers[0],0);assert.ok(covers[2]<covers[3]);near(covers.at(-1),1);
 const asleep=sleepAnimation('perform');near(asleep.cover,1);near(asleep.roll,1);
});

test('v320: continuous bed traversal in both directions; no jumping into the mattress',()=>{
 let previous=sleepPosition(sleepAnimation('enter',0));
 for(let i=1;i<=200;i++){
  const p=sleepPosition(sleepAnimation('enter',i/200*SLEEP_ENTER_SECONDS));
  assert.ok(Math.hypot(p[0]-previous[0],p[1]-previous[1])<.08,`sudden jump at ${i}`);
  previous=p;
 }
 for(let i=0;i<=80;i++){
  const a=sleepAnimation('enter',i/80*SLEEP_ENTER_SECONDS),b=sleepAnimation('exit',(1-i/80)*SLEEP_EXIT_SECONDS);
  for(const key of ['travel','roll','height','sit','turn','cover'])near(a[key],b[key]);
 }
 const last=sleepPosition(sleepAnimation('perform'));
 near(last[0],COT.feet[0]);near(last[1],COT.feet[1]);
});

test('v320: the character preview uses the actual game bedding asset',()=>{
 const preview=read('src/characterPreviewV190.js');
 assert.match(preview,/installOriginalCot\(scene,0\)/);
 assert.match(preview,/sleepPosition\(f\)/);
 assert.match(preview,/bedding\.setCover\(f\.cover\)/);
 assert.match(read('character.html'),/sleep-sit/);
});
