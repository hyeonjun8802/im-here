import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {join} from 'node:path';
import {pose,SEAT,seatDrop,seatedWeight} from '../src/characterMotionPlanV190.js';
import {PIXAL3D_FORWARD_YAW,pixal3dFacingYaw} from '../src/pixal3dOrientation.js';
const root=process.cwd(),source=p=>fs.readFileSync(join(root,p),'utf8');
const glb='public/assets/models/afterday/afterday_bearded_survivor_v190.glb';
const blob=fs.readFileSync(join(root,glb));
const manifest=JSON.parse(blob.toString('utf8',20,20+blob.readUInt32LE(12)));
const names=manifest.nodes.map(x=>x.name??''),has=p=>names.some(n=>n.startsWith(p));
const requiredJoints=['RigRoot','Pelvis','Spine','Chest','Neck','Head','Shoulder_L','UpperArm_L','ForeArm_L','Hand_L','Shoulder_R','UpperArm_R','ForeArm_R','Hand_R','UpperLeg_L','LowerLeg_L','Foot_L','UpperLeg_R','LowerLeg_R','Foot_R'];
const requiredClips=['Idle','Walk','Run','Wave','Point','Radio'];
const accessorCount=index=>manifest.accessors[index].count;

test('v3.9 Pixal3D survivor is an embedded-texture skinned GLB 2.0',()=>{
 assert.equal(blob.toString('ascii',0,4),'glTF');assert.equal(blob.readUInt32LE(4),2);
 assert.equal(blob.readUInt32LE(8),blob.length);assert.equal(manifest.asset.version,'2.0');
 assert.ok(blob.length>2_000_000);assert.ok(manifest.images?.length>=2);
 assert.equal(manifest.skins?.length,1);assert.equal(manifest.skins[0].joints.length,20);
 const triangles=manifest.meshes.flatMap(m=>m.primitives).reduce((sum,p)=>sum+accessorCount(p.indices)/3,0);
 assert.ok(triangles>500_000,`full-detail topology expected, got ${triangles}`);
});
test('v3.9 has a complete humanoid hierarchy, separate hands/feet and integrated backpack anchors',()=>{
 for(const name of requiredJoints)assert.ok(names.includes(name),name);
 for(const name of ['Pixal3D_Humanoid_Survivor_Surface','Backpack_Main','Backpack_Handle','Backpack_Pouch_L','Backpack_Pouch_R'])assert.ok(has(name),name);
 assert.ok(manifest.meshes.length>=1);
});
test('six requested animation clips are embedded in the game GLB',()=>{
 const clips=manifest.animations.map(a=>a.name).sort();assert.deepEqual(clips,requiredClips.toSorted());
 for(const a of manifest.animations){assert.ok(a.channels.length>0,a.name);assert.ok(a.samplers.length>0,a.name);}
});
test('Pixal3D body uses UV, normals, skin weights and PBR materials',()=>{
 const primitives=manifest.meshes.flatMap(m=>m.primitives);
 assert.ok(primitives.some(p=>['POSITION','NORMAL','TEXCOORD_0','JOINTS_0','WEIGHTS_0'].every(a=>a in p.attributes)));
 assert.ok(manifest.materials.some(m=>m.pbrMetallicRoughness?.baseColorTexture));
});
test('Pixal3D source and previous SF3D/TripoSR rollback assets are retained',()=>{
 for(const file of ['afterday_survivor_triposr_v370.glb','sf3d_a_pose_candidate_v380.glb','sf3d_three_quarter_candidate_v380.glb','afterday_survivor_sf3d_v380_pre_pixal3d.glb'])assert.ok(fs.statSync(join(root,'public/assets/models/afterday/archive',file)).size>1_000_000,file);
 assert.ok(fs.statSync(join(root,'artifacts/pixal3d-v390/afterday_pixal3d_front_source_v390.glb')).size>50_000_000);
 assert.ok(fs.statSync(join(root,'public/assets/models/afterday/archive/afterday_survivor_pixal3d_v391_pre_topology_fix.glb')).size>40_000_000);
});
test('active adapter identifies Pixal3D MLX and exposes 20 bones and six clips',()=>{
 const adapter=source('src/beardedSurvivorV190.js');assert.match(adapter,/TencentARC Pixal3D/);assert.match(adapter,/20-bone humanoid/);
 assert.match(adapter,/setEmbeddedClip/);assert.match(adapter,/REQUIRED_CLIPS/);assert.match(adapter,/this\.nodes\.Hand_R/);assert.match(adapter,/this\.nodes\.Hand_L/);
});
test('existing game adapter and daily-life attachment points stay compatible',()=>{
 const adapter=source('src/beardedSurvivorV190.js');assert.match(adapter,/GLTFLoader/);assert.match(adapter,/for\(const obj of this\.legacy\)obj\.visible=false/);
 assert.match(adapter,/this\.nodes\.Chest\.add\(this\.guitar\)/);assert.match(adapter,/this\.palms\.R\.add\(this\.radio,this\.ration,this\.canteen\)/);
 assert.match(adapter,/this\.palms\.L\.add\(this\.bowl\)/);assert.match(adapter,/restRotations/);assert.doesNotMatch(adapter,/VRMLoaderPlugin|VRMUtils/);
});
test('sitting seats hips on cushion and keeps limbs compact',()=>{
 const p=pose({current:'sit',stage:'perform'},0);assert.equal(p.seat,1);assert.ok(p.L.thighX>1&&p.R.thighX>1);assert.ok(p.L.kneeX<-.6&&p.R.kneeX<-.6);assert.ok(p.L.footX<-.4&&p.R.footX<-.4);
 const hip=SEAT.survivorSpawnAboveRoof+SEAT.hipAboveFeet+seatDrop();assert.ok(Math.abs(hip-(SEAT.seatAboveRoof+SEAT.desiredClearance))<1e-7);
});
test('walking, eating, radio and guitar remain distinct usable actions',()=>{
 const walking=pose({current:'watch',stage:'approach'},.3),eat=pose({current:'eat',stage:'perform'},.3),radio=pose({current:'radio',stage:'perform'},.3),guitar=pose({current:'guitar',stage:'perform'},.3);
 assert.ok(walking.walking);assert.ok(eat.showBowl);assert.ok(radio.showRadio);assert.ok(guitar.showGuitar);assert.ok(eat.R.armX>.6&&eat.R.forearmX<-1&&radio.R.armX>1&&radio.R.forearmX<-1.3);assert.equal(seatedWeight({current:'sit',stage:'perform'}),1);
});
test('wave, point and stretch use visible forward/upward Pixal3D arm poses',()=>{
 const wave=pose({current:'wave',stage:'perform'},.6),point=pose({current:'point',stage:'perform'},.6),stretch=pose({current:'stretch',stage:'perform',stageTime:3,performDuration:16},.6);
 assert.ok(wave.R.armX>1.1&&wave.R.armZ>.3&&wave.R.forearmX<-1.2&&Math.abs(wave.R.handZ)>.01);assert.ok(point.R.armX>1.4);assert.ok(stretch.L.armX>1&&stretch.R.armX>1);
});
test('v3.9.2 corrects forward axis and rebuilds locomotion swing in parent space',()=>{
 assert.equal(PIXAL3D_FORWARD_YAW,Math.PI);
 assert.ok(Math.abs(pixal3dFacingYaw(0,1)-Math.PI)<1e-9);
 const adapter=source('src/beardedSurvivorV190.js');
 assert.match(adapter,/armDelta\.copy\(rest\)\.invert\(\)\.multiply\(arm\.quaternion\)/);
 assert.match(adapter,/setFromAxisAngle\(this\.sleepAxisX,swing\)/);
 assert.match(adapter,/arm\.quaternion\.copy\(this\.armSwing\)\.multiply\(this\.armBase\)/);
});
test('v3.9 four-direction and six animation deformation QA renders exist',()=>{
 for(const name of ['PIXAL3D_V390_FRONT.png','PIXAL3D_V390_QUARTER.png','PIXAL3D_V390_SIDE.png','PIXAL3D_V390_BACK.png',...requiredClips.map(x=>x+'.png')])assert.ok(fs.statSync(join(root,'docs/qa/v390',name)).size>200_000,name);
});
test('project retains one roof and original life/weather systems',()=>{
 const w=source('src/world.js');assert.match(w,/new BeardedSurvivorV190\(this\)/);assert.match(w,/this\.createWeather\(\)/);assert.match(w,/this\.createRoof\(\)/);assert.ok(source('character.html').includes('characterPreviewV190.js'));
});
