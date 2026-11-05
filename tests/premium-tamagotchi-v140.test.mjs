import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {PREMIUM_TAMAGOTCHI_VERSION,resolveSurvivorExpression,premiumSceneBudget,calcPostGrade} from '../src/presentationPlanV140.js';
const root=path.resolve(import.meta.dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');

test('premium visual layer has a clear semver and preserves the sole survivor rooftop',()=>{
 assert.equal(PREMIUM_TAMAGOTCHI_VERSION,'1.4.0');
 for(const mobile of [false,true]){
  const x=premiumSceneBudget(mobile);assert.equal(x.habitableRooftops,1);
  assert.equal(x.worldPositionUnchanged,true);
  assert.equal(x.legacySimulationUntouched,true);
  assert.equal(x.backdropPhotoReplacement,false);
  assert.ok(x.contactDecalCount>=9&&x.contactDecalCount<=15);
 }
});
test('guitar and quiet sitting are emotionally positive, unlike storm danger',()=>{
 const guitar=resolveSurvivorExpression({activity:'guitar'});
 const storm=resolveSurvivorExpression({weather:'tornado',activity:'guitar'});
 assert.ok(guitar.joy>0);assert.ok(guitar.mouthSmile>0);
 assert.equal(storm.joy,0);assert.ok(storm.stress>guitar.stress);
 assert.ok(storm.breathRate>guitar.breathRate);
});
test('fatigue, dehydration and poor health produce facial exhaustion, not random expressions',()=>{
 const healthy=resolveSurvivorExpression();const sick=resolveSurvivorExpression({health:15,water:9,food:11});
 assert.ok(sick.stress>healthy.stress);assert.ok(sick.eyeOpen<healthy.eyeOpen);
 assert.ok(sick.mouthSmile<healthy.mouthSmile);
});
test('cold can produce breath but there is no cold-breath effect during violent storm',()=>{
 assert.equal(resolveSurvivorExpression({weather:'cold'}).showBreath,true);
 assert.equal(resolveSurvivorExpression({weather:'storm'}).showBreath,false);
});
test('expression values remain bounded under unexpected input',()=>{
 const r=resolveSurvivorExpression({health:-200,food:-100,water:999,temperature:-200});
 assert.ok(r.stress<=1&&r.stress>=0);
 assert.ok(r.eyeOpen>=.76);
});
test('cinematic post look emphasizes lightning/after-rain highlights modestly',()=>{
 const clear=calcPostGrade({}),rain=calcPostGrade({wetness:1,storm:1,night:1});
 assert.ok(rain.bloomStrength>clear.bloomStrength);
 assert.ok(rain.bloomStrength<.5);
 assert.ok(rain.filmGrain<.01);
 assert.ok(rain.vignette<.15);
});
test('facial micro-rig is actual child of original 3D survivor and updates from survival state',()=>{
 const s=read('src/performerV140.js');
 for(const p of [/this\.head\.add\(this\.root\)/,/resolveSurvivorExpression\(/,/SphereGeometry/,/TubeGeometry/,/this\.lowerLip/,/this\.brows/,/this\.breath/,/this\.flaps/,/weather/])assert.match(s,p);
 assert.doesNotMatch(s,/new THREE\.Sprite\(/);
});
test('world-space contact shadows and real lanterns respond to existing weather',()=>{
 const s=read('src/premiumStageV140.js');
 for(const p of [/PlaneGeometry/,/radialAlphaTexture\(/,/PointLight/,/survivorShadow\.position\.x/,/weather\?\.wind/,/this\.steam/])assert.match(s,p);
});
test('postprocessor grades actual 3D render and can still disable on mobile',()=>{
 const s=read('src/cinematicPostV130.js');
 assert.match(s,/new ShaderPass\(/);
 assert.match(s,/calcPostGrade\(/);
 assert.match(s,/if\(world\.isMobile\)return/);
 assert.match(s,/this\.active=!!this\.composer&&!low/);
});
test('user-selected behavior auto-cinematography is optional and interruptible by touch',()=>{
 const w=read('src/world.js'),main=read('src/main.js'),html=read('index.html');
 assert.match(w,/this\.cameraTransition=target/);
 assert.match(w,/this\.cameraTransition=null;el\.setPointerCapture/);
 assert.match(w,/this\.cityLookHeight/);
 assert.match(main,/autoLifeCamera/);
 assert.match(html,/id="life-camera-toggle"/);
});
test('current deterministic date, weather and spatial city planners match approved source checksums',()=>{
 const list={
 // Simulation source is intentionally versioned separately for four-real-hour days;
 // behavior and migration are tested in simulation.test.mjs and game-speed-overlay.test.mjs.
 'src/solar.js':'68b7bd176efca52b8ac0d483507d7e9bcd43229a8c8fdd76408f5cf166aa75ad',
 'src/spatialLayout.js':'157bcbc1f606f34d2f3800994c5179c63347e26021e08459b566cd5bb4754c61',
 'src/weatherDirector.js':'ebb57d8f5c6f60a64c67a750be54a79aa492dee29646e1bd88f1ab88da95bf1e',
 'src/lifePlan.js':'d0f0928d7f19cde7576fcc26d8a96e7a83316f73fca3102a7a83c5698dbaead0'
 };
 // Regression checks currently approved simulation and planner checksums; tamagotchi visual
 // changes must not accelerate, fake, or recalculate actual game days.
 for(const [file,checksum] of Object.entries(list))assert.equal(createHash('sha256').update(read(file)).digest('hex'),checksum,file);
});
