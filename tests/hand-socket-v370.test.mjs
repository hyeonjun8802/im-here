import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const readSource=name=>fs.readFileSync(new URL('../src/'+name,import.meta.url),'utf8');
const src=readSource('beardedSurvivorV190.js'),sockets=readSource('handAnchors.js');
const bytes=fs.readFileSync(new URL('../public/assets/models/afterday/afterday_bearded_survivor_v190.glb',import.meta.url));
const n=bytes.readUInt32LE(12),glb=JSON.parse(bytes.subarray(20,20+n).toString('utf8')),names=glb.nodes.map(n=>n.name||'');

test('v380: dedicated forearm and hand bones replace estimated upper-arm wrists',()=>{
 for(const name of ['ForeArm_L','Hand_L','ForeArm_R','Hand_R'])assert.ok(names.includes(name),name);
 assert.match(sockets,/y:\.13/);assert.match(sockets,/quaternion\.copy\(bone\.quaternion\)\.invert\(\)/);
 assert.match(src,/makePalmSocket\(this\.nodes\.Hand_L/);assert.match(src,/makePalmSocket\(this\.nodes\.Hand_R/);assert.doesNotMatch(src,/makePalmSocket\(this\.nodes\.UpperArm/);
});
test('v380: handheld props stay attached to real left/right palm sockets',()=>{
 assert.match(src,/this\.palms\.R\.add\(this\.radio,this\.ration,this\.canteen\)/);assert.match(src,/this\.palms\.L\.add\(this\.bowl\)/);assert.match(src,/this\.nodes\.Chest\.add\(this\.guitar\)/);
});
test('v380: procedural daily-life motion also bends the new forearm joints',()=>{
 assert.match(src,/ForeArm_/);assert.match(src,/p\[s\]\.forearmX/);assert.match(src,/this\.alignProps\(p,life\)/);
});
test('v380: requested radio animation is embedded and selectable',()=>{
 assert.ok(glb.animations.some(a=>a.name==='Radio'));assert.match(src,/this\.mixer\.clipAction\(clip\)/);assert.match(src,/this\.embeddedClip=name/);
});
