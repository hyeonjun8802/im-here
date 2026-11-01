import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {pose} from '../src/characterMotionPlanV190.js';
const src=fs.readFileSync(new URL('../src/beardedSurvivorV190.js',import.meta.url),'utf8');

test('v360: props are aligned per action and no longer rely on one static arm offset',()=>{
 assert.match(src,/alignProps\(p,life=\{\}\)/);
 assert.match(src,/this\.canteen=accessory\('canteen'\)/);
 assert.match(src,/this\.palms\.R\.add\(this\.radio,this\.ration,this\.canteen\)/);
 assert.match(src,/this\.setTransform\(this\.radio/);
 assert.match(src,/this\.setTransform\(this\.bowl/);
 assert.match(src,/this\.setTransform\(this\.ration/);
});

test('v360: pose exposes drink animation and canteen visibility',()=>{
 const a=pose({current:'drink',stage:'perform',stageTime:0},0);
 const b=pose({current:'drink',stage:'perform',stageTime:1.2},0);
 assert.equal(a.showCanteen,true);
 assert.ok(typeof a.sip==='number');
 assert.ok(b.sip>a.sip,'drink action must animate toward the mouth');
});

test('v360: eating still exposes bowl and food bite separately for hand-held props',()=>{
 const start=pose({current:'eat',stage:'perform',stageTime:0},0);
 const bite=pose({current:'eat',stage:'perform',stageTime:1.0},0);
 assert.equal(start.showBowl,true);
 assert.ok(bite.bite>=start.bite);
 assert.equal(bite.showFood,true);
});
