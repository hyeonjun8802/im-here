import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {sleepAnimation,sleepWeight,SLEEP_ENTER_SECONDS,SLEEP_EXIT_SECONDS} from '../src/dailyCycle.js';
import {pose} from '../src/characterMotionPlanV190.js';

const diff=(a,b)=>Math.abs(a-b);
const near=(a,b,eps=1e-7)=>assert.ok(diff(a,b)<=eps,`${a} vs ${b}`);

test('v310: enter moves to real mattress in keyframed steps: standing > sit > recline > lie',()=>{
 const phases=[0,.22,.43,.60,.77,1].map(t=>sleepAnimation('enter',t*SLEEP_ENTER_SECONDS));
 near(phases[0].travel,0);near(phases[0].roll,0);
 assert.ok(phases[1].sit>.85 && phases[1].roll<.01,'sit on the cot edge before rolling backward');
 assert.ok(phases[2].sit>.95&&phases[2].travel<=.55,'support body on edge before sliding');
 assert.ok(phases[3].roll>phases[2].roll&&phases[3].roll<phases[4].roll,'gradual recline');
 for(let i=1;i<phases.length;i++)assert.ok(phases[i].travel>=phases[i-1].travel,'cot travel must be monotonic');
 near(phases.at(-1).travel,1);near(phases.at(-1).roll,1);
 near(phases.at(-1).height,1.45);
});

test('v310: reverse wake restores feet to walkable aisle, and is continuous at frame boundaries',()=>{
 for(let i=0;i<=80;i++){
  const a=sleepAnimation('enter',i/80*SLEEP_ENTER_SECONDS);
  const b=sleepAnimation('exit',(1-i/80)*SLEEP_EXIT_SECONDS);
  for(const k of ['roll','travel','height','sit'])near(a[k],b[k],1e-6);
 }
 const finish=sleepAnimation('exit',SLEEP_EXIT_SECONDS);
 near(finish.travel,0);near(finish.roll,0);near(finish.height,0);
 for(let t=0;t<SLEEP_EXIT_SECONDS;t+=.035){
  const a=sleepAnimation('exit',t),b=sleepAnimation('exit',t+.035);
  assert.ok(diff(a.roll,b.roll)<.08 && diff(a.travel,b.travel)<.08,'no one-frame pop');
 }
});

test('v310: active GLB rig receives different pose at seated edge and on mattress',()=>{
 const seated=pose({current:'sleep',stage:'enter',stageTime:.43*SLEEP_ENTER_SECONDS},0);
 const flat=pose({current:'sleep',stage:'perform',stageTime:200},0);
 assert.ok(seated.L.thighX>.9 && seated.L.kneeX<-1,'real articulated seated pose');
 assert.ok(flat.L.thighX>-.1 && flat.L.kneeX>-.3,'legs extend for sleep');
 assert.equal(flat.sleeping,1);
 assert.ok(flat.lieHeight>1);
 assert.equal(sleepWeight('sleep','perform'),1);
});

test('v310: sleeping cot movement and GLB are driven by the same timing (no bed teleport)',()=>{
 const life=fs.readFileSync('src/survivorLife.js','utf8');
 const rig=fs.readFileSync('src/beardedSurvivorV190.js','utf8');
 assert.match(life,/sleepAnimation\('enter',this\.stageTime\)/);
 assert.match(life,/sleepAnimation\('exit',this\.stageTime\)/);
 assert.match(life,/SLEEP_ENTER_SECONDS/);assert.match(life,/SLEEP_EXIT_SECONDS/);
 assert.match(rig,/p\.lieHeight\+breathing/);
 assert.match(rig,/Math\.PI\*\.5\*p\.sleeping/);
});
