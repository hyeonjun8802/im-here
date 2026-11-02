import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {seoulTime,isSleepingHour,routineDecision,sleepWeight,stretchKeyframes} from '../src/dailyCycle.js';
import {pose} from '../src/characterMotionPlanV190.js';
import {planCollisionFreeRoofPath,sweepRooftop,collidesRooftop} from '../src/roofNavigation.js';
const kst=(d,h,m=0)=>Date.UTC(2026,10,d,h-9,m);
const src=file=>fs.readFileSync(path.join(process.cwd(),file),'utf8');
const choose=(t,record={},activity='idle',stage='idle',weather='clear',manual=false)=>routineDecision(t,record,activity,stage,weather,manual).type;

test('v300: exact Seoul clock boundaries: 22:59 -> 23:00 sleep; 06:59 -> 07:00 wake',()=>{
 assert.equal(seoulTime(kst(1,23)).hour,23);
 assert.equal(choose(kst(1,22,59)), 'free');
 assert.equal(choose(kst(1,23)), 'sleep');
 assert.equal(choose(kst(2,0)), 'sleep');
 assert.equal(choose(kst(2,6,59),'', 'sleep','perform'),'continue-sleep');
 assert.equal(choose(kst(2,7),{},'sleep','perform'),'wake');
 assert.equal(choose(kst(2,7,5),{},'sleep','exit'),'wake');
 assert.equal(isSleepingHour(6.99),true);
 assert.equal(isSleepingHour(7),false);
});

test('v300: 07-09 morning stretch happens once per Seoul date and resumes the following day',()=>{
 const day=seoulTime(kst(2,7)).day;
 assert.equal(choose(kst(2,7,1),{}),'stretch');
 assert.equal(choose(kst(2,8,59),{stretchDay:day}),'free');
 assert.equal(choose(kst(2,9),{}),'free');
 assert.equal(choose(kst(3,7,1),{stretchDay:day}),'stretch');
 assert.equal(choose(kst(2,7,1),{},'stretch','approach'),'continue-stretch');
});

test('v300: safety and user choice: storm overrides sleep, manual activity defers but cannot permanently cancel bedtime',()=>{
 assert.equal(choose(kst(2,0),{},'sleep','perform','storm'),'emergency');
 assert.equal(choose(kst(2,7),{},'sleep','perform','tornado'),'emergency');
 assert.equal(choose(kst(1,23),{},'eat','perform','clear',true),'defer');
 assert.equal(choose(kst(1,23),{},'eat','done','clear',false),'sleep');
 assert.equal(choose(kst(2,7),{},'repair','perform','clear',true),'defer');
});

test('v300: physical bed approach is safe, cot is the intentional contact surface and wake has reverse exit',()=>{
 const start=[-1,1],approach=[-8.85,-2.66],path=planCollisionFreeRoofPath(start,approach);
 assert.ok(path.length>=1,'cot has reachable clear path');
 let current=start;
 for(const point of path){
  const safe=sweepRooftop(current,point);
  assert.ok(Math.hypot(safe[0]-point[0],safe[1]-point[1])<.1,'every segment sweep is clear');
  current=point;
 }
 assert.equal(collidesRooftop(...approach),false);
 assert.equal(collidesRooftop(-10.20,-4.35),true,'actual sleeping body rests on cot obstacle');
 const life=src('src/survivorLife.js');
 assert.match(life,/sleepBed:\{pos:COT\.feet,approach:COT\.approach/);
 assert.match(life,/this\.stage='exit';this\.stageTime=0;this\.morningWaking=true/);
 assert.match(life,/this\.performDuration=action==='stretch'&&!manual\?16:spec\.duration/);
});

test('v300: actual articulated 3D rig tilts onto cot and returns upright during wake',()=>{
 assert.equal(sleepWeight('sleep','perform'),1);
 assert.equal(sleepWeight('sleep','enter',0),0);
 assert.ok(sleepWeight('sleep','enter',3.0)>0&&sleepWeight('sleep','enter',3.0)<1);
 assert.equal(sleepWeight('sleep','exit',0),1);
 assert.ok(sleepWeight('sleep','exit',2.5)>0&&sleepWeight('sleep','exit',2.5)<1);
 assert.equal(sleepWeight('rest','perform'),0);
 const plan=pose({current:'sleep',stage:'perform',stageTime:35},35);
 assert.equal(plan.sleeping,1);
 assert.ok(plan.L.armX>0&&plan.R.armX>0);
 const rig=src('src/beardedSurvivorV190.js');
 assert.match(rig,/this\.root\.quaternion\.slerp\(this\.sleepTarget,blend\)/);
 assert.match(rig,/this\.root\.position\.y=.*p\.lieHeight/);
});

test('v300: morning stretch has changing articulated arm and torso poses, without resource inflation',()=>{
 const samples=[0,2,5,8,11,14,16].map(v=>stretchKeyframes(v,16));
 for(const x of samples){for(const v of Object.values(x))assert.ok(Number.isFinite(v));}
 assert.notEqual(samples[1].leftArm,samples[2].leftArm);
 assert.notEqual(samples[2].leftArm,samples[4].leftArm);
 // Pixal3D faces local -Z, so a forward release is negative torso-X.
 assert.ok(samples.some(x=>x.torsoX<-.05));
 assert.ok(samples.some(x=>Math.abs(x.torsoZ)>.05));
 const perform=pose({current:'stretch',stage:'perform',stageTime:6,performDuration:16},6);
 assert.ok(perform.L.armX>1);
 const life=src('src/survivorLife.js');
 assert.doesNotMatch(life,/supply\.food\s*[-+]=|supply\.water\s*[-+]=/);
 assert.match(life,/AFTERDAY_DAILY_CYCLE_V300/);
});

test('v300: manual preview does not change the saved game clock, survival or weather source',()=>{
 const life=src('src/survivorLife.js');
 const html=src('index.html'),js=src('src/main.js');
 assert.match(html,/data-routine-preview="23\.1"/);
 assert.match(html,/data-routine-preview="7\.1"/);
 assert.match(html,/data-routine-preview="auto"/);
 assert.match(js,/world\.life\.setRoutinePreview\(hour\)/);
 assert.match(life,/routineNow=previewing\?/);
 assert.match(life,/previewing\?this\.previewRoutineRecord:this\.routineRecord/);
 assert.ok(!life.includes('game.dailyCycle'));
});

test('v300: a new manual command first rises from the occupied bed before navigating',()=>{
 const life=src('src/survivorLife.js');
 assert.match(life,/this\.pendingAfterWake=\{action,manual\}/);
 assert.match(life,/if\(this\.pendingAfterWake&&this\.stage==='done'\)/);
 assert.match(life,/this\.pendingAfterWake\?\.action!=='shelter'/);
});
