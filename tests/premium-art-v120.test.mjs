import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
const read=p=>fs.readFileSync(p,'utf8');
const root='public/assets/materials/character/premium';
const pbrSets=['jacket_field','cargo_trousers','backpack_canvas','scarf_wool','aged_leather','boots_rubber','hair_fiber','weathered_skin','scuffed_metal'];
function jpgSize(file){
 const b=fs.readFileSync(file);assert.equal(b[0],0xff);assert.equal(b[1],0xd8);
 let off=2;while(off<b.length){if(b[off++]!==0xff)continue;const tag=b[off++];if(tag===0xd9||tag===0xda)break;if(tag===0xff)continue;const len=b.readUInt16BE(off);if([0xc0,0xc1,0xc2,0xc3,0xc5,0xc6,0xc7,0xc9].includes(tag)){return {width:b.readUInt16BE(off+5),height:b.readUInt16BE(off+3)};}off+=len;}
 throw new Error('Missing jpeg SOF: '+file);
}
test('nine distinct sets of original high-resolution PBR color / normal / roughness maps are bundled',()=>{
 for(const name of pbrSets){
  const files=['base','normal','rough'].map(s=>path.join(root,`${name}_${s}.jpg`));
  for(const f of files){assert.ok(fs.existsSync(f),f);assert.ok(fs.statSync(f).size>13000,f);assert.deepEqual(jpgSize(f),{width:768,height:768});}
  assert.notDeepEqual(fs.readFileSync(files[0]).subarray(0,500),fs.readFileSync(files[1]).subarray(0,500));
 }
});
test('survivor outfit materials apply normal and roughness in actual Three.js scene',()=>{
 const src=read('src/survivorArt.js');for(const n of pbrSets)assert.ok(src.includes(n),n);
 for(const t of [/\.normalMap=t/,/\.roughnessMap=t/,/SRGBColorSpace/,/applyPremiumCharacterDetail/])assert.match(src,t);
});
test('detail pass attaches mesh geometry to existing skeletal hierarchy, not static photo billboards',()=>{
 const s=read('src/premiumCharacterDetail.js');
 for(const k of ['survivorHead','survivorKnees','survivorElbows','survivorHands','survivorTorso','survivorPack','Torso','bootDetails','faceDetails','detailedBackpack','buildJacket'])assert.ok(s.includes(k),k);
 assert.match(s,/new THREE\.BufferGeometry/);assert.match(s,/new THREE\.TubeGeometry/);assert.match(s,/THREE\.DoubleSide/);
 assert.doesNotMatch(s,/SpriteMaterial|PlaneGeometry|CanvasTexture/);
});
test('micro details can be hidden at distant cinematic camera for mobile draw-call budget',()=>{
 const s=read('src/premiumCharacterDetail.js');assert.match(s,/premiumMicroDetails/);assert.match(s,/premiumMicroVisible/);assert.match(s,/world\.isMobile\?16:24/);
});
test('follow camera and detail camera let player see character material close-up',()=>{
 const world=read('src/world.js'),main=read('src/main.js'),html=read('index.html');
 assert.match(world,/view==='portrait'/);assert.match(world,/mobile\?5\.4:4\.45/);assert.match(world,/this\.cameraTransition=target/);
 assert.match(main,/portrait-survivor-camera/);assert.match(html,/id="portrait-survivor-camera"/);
});
test('life station material quality improves without changing action names or destinations',()=>{
 const s=read('src/survivorLife.js');
 for(const pattern of [/saggingCanvas/,/curvePipe/,/reclaimed_wood/,/tarp_canvas/,/galvanized_rust/,/lifeAction='guitar'/,/lifeAction='eat'/,/lifeAction='radio'/])assert.match(s,pattern);
 assert.match(s,/this\.spots=/);
});
test('underlying weather, survival and single roof unchanged',()=>{
 const s=read('src/world.js');assert.match(s,/createWeather\(\)/);assert.match(s,/this\.life=new SurvivorLife\(this\)/);assert.match(s,/SPATIAL_LAYOUT/);
 const sim=read('src/simulation.js');assert.match(sim,/Asia\/Seoul/);
});
test('new character material creation is reproducible without paid services',()=>{
 const s=read('scripts/create_survivor_pbr_v120.py');assert.match(s,/default_rng\(120231\)/);assert.match(s,/np\.gradient\(height\)/);assert.match(s,/Image\.fromarray/);assert.doesNotMatch(s,/requests\.|https:\/\//);
});
