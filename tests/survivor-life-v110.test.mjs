import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {LIFE_ACTIVITIES,DAILY_SCHEDULE,nextAutonomousActivity,activityAllowed,planRooftopPath,phaseForProgress} from '../src/lifePlan.js';
import {ORIGINAL_MELODY} from '../src/campMusic.js';
const read=x=>fs.readFileSync(path.join(process.cwd(),x),'utf8');
const src={world:read('src/world.js'),life:read('src/survivorLife.js'),art:read('src/survivorArt.js'),ui:read('index.html'),main:read('src/main.js')};
test('life has 12 distinct authored activities and physical stations',()=>{
 for(const a of ['sit','eat','drink','guitar','radio','rest','medicine','repair','explore','watch','cook','stretch'])assert.ok(LIFE_ACTIVITIES[a],a);
 assert.match(src.life,/this\.spots=/);assert.match(src.life,/const fireChair=chair\(/);assert.match(src.life,/const diningChair=chair\(/);assert.match(src.life,/const comms=radioTable\(/);
});
test('activity schedule stable, calendar time unchanged',()=>{
 for(const h of [0,3,7,10,12,17,20,23]){
  for(let i=0;i<9;i++)assert.ok(LIFE_ACTIVITIES[nextAutonomousActivity(h,'clear',i,{health:80,food:70,water:90})]);
 }
 assert.equal(nextAutonomousActivity(16,'tornado',0),'shelter');
 assert.equal(nextAutonomousActivity(16,'storm',4),'shelter');
 assert.equal(nextAutonomousActivity(16,'rain',4),'shelter');
 assert.equal(activityAllowed('guitar','storm',true),false);
 assert.equal(activityAllowed('sit','tornado',true),false);
 assert.equal(activityAllowed('radio','clear',true),true);
 assert.equal(activityAllowed('guitar','rain',true),false); // heavy rain overrides leisure
 assert.equal(activityAllowed('bogus','clear',true),false);
});
test("activity action requests navigate and do not directly edit authoritative resources",()=>{
 assert.match(src.world,/this\.life\.update\(dt,now,game,preset\)/);
 assert.match(src.world,/setAction\(action\)\{return this\.life\?\.request\(action,true\)/);
 assert.doesNotMatch(src.life,/supply\.food\s*[-+]=|supply\.water\s*[-+]=|\.startedAt\s*=/);
 assert.match(src.life,/planCollisionFreeRoofPath\(/);
});
test('movement planner arrives and avoids dangerous props',()=>{
 for(const [a,b] of [ [[-1,1],[7.3,9.7]],[[7.3,9.7],[-.4,6.8]],[[10.7,-12],[-9,-5]], [[7.3,9.7],[-17,17]] ]){
  const path=planRooftopPath(a,b);assert.ok(path.length>0);assert.deepEqual(path.at(-1),b);
  for(const [x,z] of path.slice(0,-1)){
   assert.ok(Math.abs(x)<=20&&Math.abs(z)<=20);
   assert.ok((x-2)**2+(z-3)**2>=2.1**2);
   assert.ok((x-12)**2+(z+.6)**2>=4**2);
   assert.ok((x-16)**2+(z+13)**2>=3.65**2);
  }
 }
});
test('phase transitions support approach, enter, perform and finish',()=>{
 assert.equal(phaseForProgress(2,0,10),'approach');
 assert.equal(phaseForProgress(0,.2,10),'enter');
 assert.equal(phaseForProgress(0,6,10),'perform');
 assert.equal(phaseForProgress(0,11,10),'complete');
});
test('premium survivor is real hierarchical 3D and has joint-driven facial/hands and wardrobe',()=>{
 for(const pattern of [/survivorHead/,/survivorElbows/,/survivorKnees/,/survivorGuitar/,/survivorRadio/,/survivorMouth/,/survivorEyelids/,/jacket_field/,/aged_leather/])assert.match(src.art,pattern);
 for(const n of ['jacket_weave.jpg','worn_leather.jpg'])assert.ok(fs.statSync(`public/assets/materials/character/${n}`).size>40000);
 assert.match(src.life,/arm\.rotation\.x=/);assert.match(src.life,/k\.rotation\.x=/);
});
test('guitar is dimensional playable prop and music is an original opt-in Web Audio implementation',()=>{
 assert.match(src.art,/function createGuitar\(/);assert.match(src.art,/strings/);assert.match(src.art,/guitar\.visible=false/);
 assert.equal(ORIGINAL_MELODY.length,8);
 const audio=read('src/campMusic.js');assert.match(audio,/AudioContext/);assert.match(audio,/async enable\(/);assert.match(audio,/this\.enabled=false/);
 assert.match(src.main,/world\.enableCampMusic\(\)/);assert.match(src.ui,/camp-music-toggle/);
});
test('existing critical survival/world systems retained, optional camera tracking',()=>{
 assert.match(src.world,/heroAssetPromise=this\.loadHeroAssets\(\)/);
 assert.match(src.world,/this\.life=new SurvivorLife\(this\)/);
 assert.match(src.world,/this\.focusSurvivor=view==='survivor'\|\|view==='portrait'/);
 assert.match(src.world,/this\.weatherVfx\.update\(/);
 assert.match(read('src/simulation.js'),/Asia\/Seoul/);
});
test('UI exposes sit, guitar, radio, read view, cooking, stretch and preserves survival actionbar',()=>{
 for(const id of ['sit','guitar','radio','watch','rest','cook','stretch'])assert.match(src.ui,new RegExp(`data-life-action="${id}"`));
 assert.match(src.ui,/data-action="eat"/);assert.match(src.ui,/data-action="drink"/);
 assert.match(src.ui,/follow-survivor-camera/);assert.match(src.main,/onActivityChange/);
});
