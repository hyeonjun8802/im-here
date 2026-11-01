import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {ACTOR_RADIUS,ROOF_OBSTACLES,collidesRooftop,sweepRooftop,planCollisionFreeRoofPath} from '../src/roofNavigation.js';
import {foodBiteMotion,pose} from '../src/characterMotionPlanV190.js';
const read=x=>fs.readFileSync(new URL('../'+x,import.meta.url),'utf8');
test('garden planters, stairwell, dining table and water tank have registered measured colliders',()=>{
 for(const id of ['raised-garden-1','raised-garden-2','raised-garden-3','stairwell','water-tank','firepit','storage','dining-table','radio-table','bed','workbench'])assert.ok(ROOF_OBSTACLES.some(o=>o.id===id),id);
 for(const z of [11,14.2,17.4])assert.ok(collidesRooftop(-13,z),`garden bed z ${z}`);
 assert.ok(collidesRooftop(12,-.6));assert.ok(collidesRooftop(16,-13));
 assert.equal(collidesRooftop(-1,1),false);
});
test('swept capsule does not teleport through planters when an entire move crosses one',()=>{
 for(const [a,b] of [[[-6,11],[-19,11]],[[-13,7],[-13,20]],[[10,-13],[20,-13]],[[-5,-2],[0.8,-2]]]){
  const safe=sweepRooftop(a,b);assert.ok(!collidesRooftop(...safe));assert.ok(Math.hypot(safe[0]-b[0],safe[1]-b[1])>.4,JSON.stringify([a,b,safe]));
 }
});
test('all playable life station routes avoid all obstacle footprints, even between stations',()=>{
 const points=[[-1,1],[-.4,8.25],[7.3,11.55],[-2.8,-.2],[10.7,-12],[-8.85,-2.66],[-5.5,6.8],[7.3,-.8],[4.9,5.9],[-4,18]];
 for(const a of points)for(const b of points){
  const path=planCollisionFreeRoofPath(a,b);assert.ok(path.length,`no route ${a} -> ${b}`);
  let current=a;
  for(const next of path){
    assert.equal(collidesRooftop(...next),false,`point collided ${next}`);
    const safe=sweepRooftop(current,next);
    assert.ok(Math.hypot(safe[0]-next[0],safe[1]-next[1])<.095,`segment collision ${current} -> ${next} got ${safe}`);
    current=next;
  }
 }
});
test('visible character ration travels hand-to-mouth on five cycles with discrete pauses',()=>{
 assert.equal(foodBiteMotion(.05),0);
 assert.ok(foodBiteMotion(1.05)>.9);
 assert.ok(foodBiteMotion(2.19)<.02);
 const low=pose({current:'eat',stage:'perform',stageTime:.05},0);
 const high=pose({current:'eat',stage:'perform',stageTime:1.05},0);
 assert.equal(low.showFood,false);assert.equal(high.showFood,true);
 assert.ok(high.R.armX>low.R.armX+.4);
 assert.match(read('src/beardedSurvivorV190.js'),/this\.palms\.R\.add\(this\.radio,this\.ration,this\.canteen\)/);
 assert.match(read('src/beardedSurvivorV190.js'),/this.ration.visible=p.showFood/);
});
test('foliage and sky have unified assets with no photo-cylinder horizon artifacts',()=>{
 const world=read('src/world.js');
 assert.match(world,/new RooftopBotany\(this\)/);
 assert.match(world,/new THREE\.SphereGeometry\(1490,48,32\)/);
 assert.doesNotMatch(world,/new THREE\.CylinderGeometry\(1260\+i\*\.3/);
 assert.match(world,/uCloudMap/);
 const plants=read('src/rooftopBotany.js');assert.match(plants,/InstancedMesh/);assert.match(plants,/leaf_veined\.png/);
 assert.ok(fs.statSync(new URL('../public/assets/materials/botany/leaf_veined.png',import.meta.url)).size>10_000);
});
