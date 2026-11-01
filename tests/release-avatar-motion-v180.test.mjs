import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {RELEASE_AVATAR_PROFILE,smoothstep,isSeatedActivity,seatedWeight,actionProfile,seatSurfaceWorldY,correctedRootHeight,getPoseTargets,avatarQaMetrics} from '../src/avatarMotionV180.js';
const source=(p)=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
const r=RELEASE_AVATAR_PROFILE;
test('actual foldable chair cushion is used, not an arbitrary body bob',()=>{
 assert.equal(seatSurfaceWorldY(20,{current:'sit'}),21.06);
 assert.equal(seatSurfaceWorldY(20,{current:'guitar'}),21.06);
 assert.equal(seatSurfaceWorldY(20,{current:'eat'}),21.06);
 assert.equal(seatSurfaceWorldY(20,{current:'rest'}),20.57);
});
test('pelvis is lowered to cushion height based on actual imported hip joint',()=>{
 assert.ok(correctedRootHeight(0,22,21.06)<0);
 assert.ok(Math.abs(correctedRootHeight(0,22,21.06)-(-.83))<.0001);
 assert.equal(correctedRootHeight(0,40,20),-r.maxPelvisDrop);
 assert.equal(correctedRootHeight(0,19,20),r.maxPelvisRise);
});
test('seated poses blend in and back out, with no teleport in hip target',()=>{
 assert.equal(seatedWeight({current:'sit',stage:'approach'}),0);
 assert.equal(seatedWeight({current:'sit',stage:'enter',stageTime:0}),0);
 assert.ok(seatedWeight({current:'sit',stage:'enter',stageTime:.26})>.4);
 assert.equal(seatedWeight({current:'sit',stage:'perform'}),1);
 assert.equal(seatedWeight({current:'sit',stage:'exit',stageTime:0}),1);
 assert.equal(seatedWeight({current:'sit',stage:'exit',stageTime:1}),0);
 assert.equal(seatedWeight({current:'sit',stage:'done'}),0);
 assert.equal(smoothstep(-1),0);assert.equal(smoothstep(2),1);
});
test('all seated activities are classified; radio is a standing pose',()=>{
 for(const action of ['sit','eat','guitar'])assert.equal(isSeatedActivity({current:action}),true);
 assert.equal(isSeatedActivity({current:'radio'}),false);
 assert.equal(actionProfile({current:'guitar',stage:'approach'}),'walk');
 assert.equal(actionProfile({current:'sit',stage:'enter'}),'sit');
 assert.equal(actionProfile({current:'guitar',stage:'perform'}),'sit');
 assert.equal(actionProfile({current:'radio',stage:'perform'}),'radio');
 assert.equal(actionProfile({current:'guitar',stage:'exit'}),'walk');
});
test('all stages produce finite humanoid bone targets; walking has opposite gait',()=>{
 const examples=['approach','enter','perform','exit','done'];
 for(const stage of examples){
  for(const act of ['sit','eat','guitar','radio','rest','drink','repair','cook','shelter']){
   const poses=getPoseTargets({stage,current:act,stageTime:.2},3);
   for(const [joint,values] of Object.entries(poses)){
    assert.ok(values&&['x','y','z'].every(k=>Number.isFinite(values[k])),joint+' '+stage+' '+act);
    assert.ok(Math.abs(values.x)<3.2&&Math.abs(values.z)<2.4);
   }
  }
 }
 const pose=getPoseTargets({stage:'approach',current:'guitar'},.23);
 assert.ok(pose.leftUpperLeg.x*pose.rightUpperLeg.x<0);
});
test('measured world-space body contact must meet hip and foot clearance thresholds',()=>{
 const valid=avatarQaMetrics({seatHeight:21.06,hipHeight:21.17,leftFootHeight:20.36,rightFootHeight:20.32,roofHeight:20.25,seated:true});
 assert.equal(valid.valid,true);
 const floating=avatarQaMetrics({seatHeight:21.06,hipHeight:22.48,leftFootHeight:20.7,rightFootHeight:20.6,roofHeight:20.25,seated:true});
 assert.equal(floating.valid,false);assert.ok(floating.hipError>1);
 const footHover=avatarQaMetrics({seatHeight:21.06,hipHeight:21.17,leftFootHeight:20.86,rightFootHeight:20.82,roofHeight:20.25,seated:true});
 assert.equal(footHover.valid,false);assert.ok(footHover.footHover>.24);
 const buried=avatarQaMetrics({seatHeight:21.06,hipHeight:21.17,leftFootHeight:20.0,rightFootHeight:20.2,roofHeight:20.25,seated:true});
 assert.equal(buried.valid,false);
 assert.equal(avatarQaMetrics({seatHeight:0,hipHeight:NaN,leftFootHeight:0,rightFootHeight:0,roofHeight:0,seated:true}).valid,false);
});
test('actor approaches FRONT of chair and exits without standing through rigid seat',()=>{
 const code=source('src/survivorLife.js');
 assert.match(code,/spot\.approach=name==='dining'\?/);
 assert.match(code,/this\.stage=this\.target\.approach\?'exit':'done'/);
 assert.match(code,/this\.stage==='enter'/);
 assert.match(code,/spot\.pos\[0\]/);
 assert.match(code,/this\.target\.approach/);
});
test('production VRM uses the imported real skeleton, not additive face or wind primitives',()=>{
 const code=source('src/officialVRMAvatarV170.js');
 assert.match(code,/getNormalizedBoneNode/);
 assert.match(code,/getWorldPosition/);
 assert.match(code,/seatSurfaceWorldY/);
 assert.match(code,/survivalOutfitTint/);
 assert.doesNotMatch(code,/new THREE\.(BoxGeometry|SphereGeometry|CylinderGeometry)/);
 assert.doesNotMatch(code,/hair\.rotation|wind\*.*hair/i);
});
