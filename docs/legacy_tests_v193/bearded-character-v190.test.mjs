import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {pose,seatedWeight,SEAT,seatDrop} from '../src/characterMotionPlanV190.js';
import {join} from 'node:path';
const ROOT=process.cwd();
const read=n=>fs.readFileSync(join(ROOT,n),'utf8');
const GLB='public/assets/models/afterday/afterday_bearded_survivor_v190.glb';
function glbManifest(){
 const data=fs.readFileSync(join(ROOT,GLB));
 assert.equal(data.toString('ascii',0,4),'glTF','Real binary GLB, not flat PNG');
 assert.equal(data.readUInt32LE(4),2);
 assert.equal(data.readUInt32LE(8),data.length);
 const len=data.readUInt32LE(12);
 return JSON.parse(data.toString('utf8',20,20+len));
}
test('Original bearded 3D model is bundled and GLB 2.0 geometry is valid',()=>{
 const j=glbManifest();assert.equal(j.asset.version,'2.0');
 assert.ok(j.meshes.length>=50,'Missing modeled facial, clothing and body geometry');
 assert.ok(j.materials.length>=15,'Missing differentiated materials');
 assert.ok(j.accessors.length>0);
});
test('All articulated independent pivot nodes exist in exported real GLB',()=>{
 const names=new Set(glbManifest().nodes.map(n=>n.name));
 for(const n of ['RigRoot','Torso','Head','UpperArm_L','UpperArm_R','UpperLeg_L','UpperLeg_R','Knee_L','Knee_R'])assert.ok(names.has(n),n);
});
test('World uses original bearded survivor, not discontinued young VRM',()=>{
 const w=read('src/world.js'),newSrc=read('src/beardedSurvivorV190.js');
 assert.match(w,/new BeardedSurvivorV190\(this\)/);
 assert.doesNotMatch(w,/new OfficialVRMAvatarV170\(this\)|new ReferenceSurvivorV160\(this\)/);
 assert.match(newSrc,/for\(const obj of this\.legacy\)obj\.visible=false/);
 assert.match(newSrc,/GLTFLoader/);assert.doesNotMatch(newSrc,/VRMLoaderPlugin|VRMUtils|hair wind/);
 assert.match(newSrc,/this\.nodes\.Torso\.add\(this\.guitar\)/);
 assert.match(newSrc,/this\.nodes\.UpperArm_R\.add\(this\.radio\)/);
 assert.match(newSrc,/this\.nodes\.UpperArm_L\.add\(this\.bowl\)/);
 assert.equal(JSON.parse(read('package.json')).dependencies['@pixiv/three-vrm'],undefined);
});
test('Chair has same physical scale as short-limbed actor',()=>{
 const f=read('src/survivorLife.js');assert.equal(SEAT.chairScale,.76);
 assert.equal((f.match(/scale\.setScalar\(\.76\)/g)||[]).length,2);
 assert.ok(SEAT.seatAboveRoof>.78&&SEAT.seatAboveRoof<.90);
});
test('Pelvis is lowered onto cushion instead of hovering one meter above it',()=>{
 assert.ok(seatDrop()<-.3&&seatDrop()>-.55);
 const p=pose({current:'sit',stage:'perform',stageTime:5},0);
 const pelvis=SEAT.survivorSpawnAboveRoof+SEAT.hipAboveFeet+p.rootY;
 assert.ok(Math.abs(pelvis-(SEAT.seatAboveRoof+SEAT.desiredClearance))<1e-8);
});
test('Sit/stand transitions interpolate gradually and stay in bounds',()=>{
 let last=-1;
 for(let t=0;t<=.65;t+=.05){const w=seatedWeight({current:'sit',stage:'enter',stageTime:t});assert.ok(w>=last&&w<=1);last=w;}
 assert.equal(seatedWeight({current:'sit',stage:'perform'}),1);
 assert.equal(seatedWeight({current:'sit',stage:'exit',stageTime:.95}),0);
 assert.equal(seatedWeight({current:'radio',stage:'perform'}),0);
});
test('Seated legs bend knees and the body does not lean into the backrest',()=>{
 const s=pose({current:'sit',stage:'perform'},0);
 assert.ok(s.L.thighX<-.8&&s.L.kneeX>.6&&s.R.kneeX>.6);
 assert.ok(Math.abs(s.torsoX)<.15);
});
test('Walking, eating, guitar and radio have distinct authored joint poses',()=>{
 const walk=pose({stage:'approach',current:'watch'},.35),
  eat=pose({stage:'perform',current:'eat'},.35),
  guitar=pose({stage:'perform',current:'guitar'},.35),
  radio=pose({stage:'perform',current:'radio'},.35);
 assert.equal(walk.walking,true);assert.equal(eat.showBowl,true);
 assert.equal(guitar.showGuitar,true);assert.equal(radio.showRadio,true);
 assert.ok(radio.R.armX < guitar.R.armX);assert.ok(eat.L.armX < walk.L.armX);
});
test('Independent real Three.js model viewer is available',()=>{
 assert.match(read('character.html'),/characterPreviewV190\.js/);
 assert.match(read('src/characterPreviewV190.js'),/WebGLRenderer|OrbitControls/);
 assert.match(read('src/characterPreviewV190.js'),/new BeardedSurvivorV190/);
});
