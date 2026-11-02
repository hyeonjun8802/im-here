import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {pose,seatedWeight} from '../src/characterMotionPlanV190.js';
import {LIFE_ACTIVITIES} from '../src/lifePlan.js';
import {stretchKeyframes} from '../src/dailyCycle.js';

const finitePose=p=>{
 for(const v of [p.rootY,p.torsoX,p.torsoZ,p.headX,p.headY,p.seat,p.sleeping]){
  assert.ok(Number.isFinite(v));
 }
 for(const side of ['L','R'])for(const k of ['armX','armZ','forearmX','handX','handY','handZ','thighX','kneeX','footX']){
  assert.ok(Number.isFinite(p[side][k]),side+'.'+k);
 }
};

test('v2.50 every daily activity has a finite bounded 10-sample full-body pose',()=>{
 for(const [activity,spec] of Object.entries(LIFE_ACTIVITIES)){
  const duration=Math.max(1,Math.min(16,spec.duration||10));
  for(let i=0;i<10;i++){
   const t=duration*i/9,p=pose({current:activity,stage:'perform',stageTime:t,performDuration:duration},t);
   finitePose(p);
   assert.ok(Math.abs(p.torsoX)<=.25,activity+' torsoX');
   assert.ok(Math.abs(p.torsoZ)<=.22,activity+' torsoZ');
   assert.ok(Math.abs(p.headX)<=.22,activity+' headX');
   assert.ok(Math.abs(p.headY)<=.35,activity+' headY');
   for(const side of ['L','R']){
    assert.ok(p[side].thighX>-0.7&&p[side].thighX<1.35,activity+' thigh '+side);
    assert.ok(p[side].kneeX>-1.35&&p[side].kneeX<0.5,activity+' knee '+side);
    assert.ok(p[side].footX>-0.65&&p[side].footX<0.35,activity+' foot '+side);
   }
  }
 }
});

test('rest uses the real shelter pallet edge and an aisle approach, not a floating aisle seat',()=>{
 const source=fs.readFileSync(new URL('../src/survivorLife.js',import.meta.url),'utf8');
 assert.match(source,/bed:\{pos:COT\.seat,approach:COT\.approach,yaw:0,seated:true\}/);
 const enter0=seatedWeight({current:'rest',stage:'enter',stageTime:0});
 const enterMid=seatedWeight({current:'rest',stage:'enter',stageTime:.325});
 const enterEnd=seatedWeight({current:'rest',stage:'enter',stageTime:.65});
 assert.equal(enter0,0);assert.ok(enterMid>0&&enterMid<1);assert.equal(enterEnd,1);
 const exit0=seatedWeight({current:'rest',stage:'exit',stageTime:0});
 const exitEnd=seatedWeight({current:'rest',stage:'exit',stageTime:.95});
 assert.equal(exit0,1);assert.equal(exitEnd,0);
});

test('work and medical actions lean toward the work area rather than backward',()=>{
 for(const activity of ['cook','repair','medicine']){
  const p=pose({current:activity,stage:'perform',stageTime:1.2,performDuration:12},1.2);
  assert.ok(p.torsoX<0,activity+' must lean toward local -Z/front');
  assert.ok(p.headX<0,activity+' should look down at the work');
 }
});

test('danger actions use an intentional ready/crouch lower body instead of idle standing',()=>{
 const explore=pose({current:'explore',stage:'perform',stageTime:1,performDuration:18},1);
 assert.ok(explore.L.kneeX<-.1&&explore.R.kneeX<-.1);
 assert.ok(explore.torsoX<0);
 const shelter=pose({current:'shelter',stage:'perform',stageTime:1,performDuration:16},1);
 assert.ok(shelter.L.thighX>.4&&shelter.R.thighX>.4);
 assert.ok(shelter.L.kneeX<-.6&&shelter.R.kneeX<-.6);
 assert.ok(shelter.torsoX<-.1);
 assert.ok(Math.abs(shelter.L.thighX-shelter.R.thighX)<1e-9);
 assert.ok(Math.abs(shelter.L.kneeX-shelter.R.kneeX)<1e-9);
});

test('watch scans the skyline and drink raises both canteen arm and gaze during a sip',()=>{
 const w0=pose({current:'watch',stage:'perform',stageTime:0,performDuration:15},0);
 const w1=pose({current:'watch',stage:'perform',stageTime:2,performDuration:15},2);
 assert.notEqual(w0.headY,w1.headY);
 assert.ok(w0.R.armX>.8&&w1.R.armX>.8);
 const d0=pose({current:'drink',stage:'perform',stageTime:0,performDuration:9},0);
 const d1=pose({current:'drink',stage:'perform',stageTime:1.4,performDuration:9},1.4);
 assert.ok(d1.sip>d0.sip);
 assert.ok(d1.R.armX>d0.R.armX);
 assert.ok(d1.headX>d0.headX);
});

test('stretch release bends forward, never backward',()=>{
 const a=stretchKeyframes(12.5,16);
 assert.ok(a.torsoX<0,'release torsoX must be negative toward local -Z/front');
});

test('perform to exit returns seated actions continuously instead of popping upright',()=>{
 for(const activity of ['sit','eat','guitar','rest']){
  const perform=pose({current:activity,stage:'perform',stageTime:1},1);
  const exit0=pose({current:activity,stage:'exit',stageTime:0},1);
  const exitHalf=pose({current:activity,stage:'exit',stageTime:.475},1.475);
  const exitEnd=pose({current:activity,stage:'exit',stageTime:.95},1.95);
  assert.equal(perform.seat,1);
  assert.equal(exit0.seat,1);
  assert.ok(exitHalf.seat>0&&exitHalf.seat<1);
  assert.equal(exitEnd.seat,0);
 }
});
