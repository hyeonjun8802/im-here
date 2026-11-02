import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {pose} from '../src/characterMotionPlanV190.js';
import {sleepAnimation,SLEEP_ENTER_SECONDS,stretchKeyframes} from '../src/dailyCycle.js';

const finite=v=>Number.isFinite(v);
const motions=[
  ['wave',1.8],['guitar',2.4],['eat',2.35],['radio',2.4],['stretch',16]
];

test('v2.40 full-body pose audit stays finite and within conservative joint bounds over 10 samples',()=>{
  for(const [activity,duration] of motions){
    for(let i=0;i<10;i++){
      const t=duration*i/9;
      const p=pose({current:activity,stage:'perform',stageTime:t,performDuration:duration},t);
      for(const side of ['L','R']){
        for(const key of ['armX','armZ','forearmX','handX','handY','handZ','thighX','kneeX','footX']){
          assert.ok(finite(p[side][key]),`${activity} ${i+1} ${side}.${key}`);
        }
        assert.ok(p[side].thighX>-0.65&&p[side].thighX<1.35,`${activity} thigh ${side}`);
        assert.ok(p[side].kneeX>-1.35&&p[side].kneeX<0.45,`${activity} knee ${side}`);
        assert.ok(p[side].footX>-0.60&&p[side].footX<0.35,`${activity} foot ${side}`);
      }
      assert.ok(Math.abs(p.torsoX)<=.25&&Math.abs(p.torsoZ)<=.20,`${activity} torso bounds`);
      assert.ok(Math.abs(p.headX)<=.25&&Math.abs(p.headY)<=.25,`${activity} head bounds`);
    }
  }
});

test('eat and guitar keep seated lower body symmetric while head gaze is intentional',()=>{
  for(const activity of ['eat','guitar']){
    for(let i=0;i<10;i++){
      const duration=activity==='eat'?2.35:2.4,t=duration*i/9;
      const p=pose({current:activity,stage:'perform',stageTime:t,performDuration:duration},t);
      assert.ok(Math.abs(p.L.thighX-p.R.thighX)<1e-9);
      assert.ok(Math.abs(p.L.kneeX-p.R.kneeX)<1e-9);
      assert.ok(Math.abs(p.L.footX-p.R.footX)<1e-9);
      assert.ok(p.L.thighX>1&&p.L.kneeX<-.6&&p.L.footX<-.4);
    }
  }
  const eatStart=pose({current:'eat',stage:'perform',stageTime:0},0);
  const eatBite=pose({current:'eat',stage:'perform',stageTime:1.05},1.05);
  assert.ok(eatStart.headX<0,'eating starts by looking slightly down toward the food');
  assert.ok(eatBite.headX<=.005,'eating must not tilt the face upward at the bite');
  assert.ok(pose({current:'guitar',stage:'perform',stageTime:1},1).headX<0,'guitar gaze should be slightly downward');
  assert.ok(pose({current:'radio',stage:'perform',stageTime:1},1).headY>0,'radio pose should turn head slightly toward the handset');
});

test('stretch raises gaze gently and keeps lower body planted',()=>{
  for(let i=0;i<10;i++){
    const t=16*i/9,p=pose({current:'stretch',stage:'perform',stageTime:t,performDuration:16},t);
    assert.ok(Math.abs(p.L.thighX)<1e-9&&Math.abs(p.R.thighX)<1e-9);
    assert.ok(Math.abs(p.L.kneeX)<1e-9&&Math.abs(p.R.kneeX)<1e-9);
    assert.ok(Math.abs(p.L.footX)<1e-9&&Math.abs(p.R.footX)<1e-9);
  }
  const overhead=stretchKeyframes(5,16);
  assert.ok(overhead.headX>0,'overhead stretch should not tuck chin toward chest');
});

test('sleep enter is supine, symmetric through the legs, and fully extends at the final frame',()=>{
  let previousRoll=-1;
  for(let i=0;i<10;i++){
    const t=SLEEP_ENTER_SECONDS*i/9;
    const s=sleepAnimation('enter',t);
    const p=pose({current:'sleep',stage:'enter',stageTime:t},t);
    assert.ok(s.roll>=previousRoll-1e-9,'sleep roll should be monotonic');
    previousRoll=s.roll;
    assert.ok(Math.abs(p.L.thighX-p.R.thighX)<1e-9,`sleep thigh symmetry frame ${i+1}`);
    assert.ok(Math.abs(p.L.kneeX-p.R.kneeX)<1e-9,`sleep knee symmetry frame ${i+1}`);
    assert.ok(Math.abs(p.L.footX-p.R.footX)<1e-9,`sleep foot symmetry frame ${i+1}`);
    const qx=new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1,0,0),Math.PI*.5*s.roll);
    const qz=new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,0,1),Math.PI*.5*s.roll);
    const face=new THREE.Vector3(0,0,-1).applyQuaternion(qx.multiply(qz));
    assert.ok(face.y>=-1e-8,`sleep face must never rotate toward floor at frame ${i+1}: ${face.toArray()}`);
  }
  const final=pose({current:'sleep',stage:'enter',stageTime:SLEEP_ENTER_SECONDS},SLEEP_ENTER_SECONDS);
  assert.ok(Math.abs(final.L.thighX)<1e-9&&Math.abs(final.R.thighX)<1e-9);
  assert.ok(Math.abs(final.L.kneeX)<1e-9&&Math.abs(final.R.kneeX)<1e-9);
  assert.ok(Math.abs(final.L.footX)<1e-9&&Math.abs(final.R.footX)<1e-9);
  const qx=new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1,0,0),Math.PI*.5);
  const qz=new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,0,1),Math.PI*.5);
  const finalFace=new THREE.Vector3(0,0,-1).applyQuaternion(qx.multiply(qz));
  assert.ok(finalFace.y>.999,'final sleeping face must look at the sky');
});

test('walking lower body alternates without changing limb length targets',()=>{
  for(let i=0;i<10;i++){
    const t=.9*i/9,p=pose({current:'watch',stage:'approach',stageTime:t},t);
    assert.ok(Math.abs(p.L.thighX+p.R.thighX)<1e-9);
    assert.ok(p.L.kneeX>=0&&p.R.kneeX>=0);
    assert.ok(Math.abs(p.L.footX)<1e-12);assert.ok(Math.abs(p.R.footX)<1e-12);
  }
});

test('rest activity uses the same seated pelvis and lower-body posture as other chair/bed-edge actions',()=>{
  const rest=pose({current:'rest',stage:'perform',stageTime:1},1);
  const sit=pose({current:'sit',stage:'perform',stageTime:1},1);
  assert.equal(rest.seat,1);
  assert.equal(rest.rootY,sit.rootY);
  for(const side of ['L','R']){
    assert.equal(rest[side].thighX,sit[side].thighX);
    assert.equal(rest[side].kneeX,sit[side].kneeX);
    assert.equal(rest[side].footX,sit[side].footX);
  }
});
