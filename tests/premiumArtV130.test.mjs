import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {generateV130ArtPlan} from '../src/premiumArtPlanV130.js';
const root=path.resolve(import.meta.dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');

test('one inhabitable rooftop stays fixed in all quality tiers',()=>{
 for(const mobile of [true,false]){
   const p=generateV130ArtPlan(mobile);
   assert.equal(p.primaryRoofCount,1);
   assert.equal(p.heroRoofHalfWidth,23);
   assert.equal(p.timeAndSurvivalLogicTouched,false);
   assert.equal(p.directImageBillboards,0);
 }
});
test('desktop leaves and shrubs are larger while mobile scene budgets are bounded',()=>{
 const d=generateV130ArtPlan(),m=generateV130ArtPlan(true);
 assert.ok(d.foliageInstances>m.foliageInstances);
 assert.ok(d.rooftopShrubClusters>m.rooftopShrubClusters);
 assert.ok(d.grimeFragments>m.grimeFragments);
 assert.ok(d.foliageInstances<=2400);
 assert.ok(m.foliageInstances<=1000);
});
test('detail is actual instanced 3D geometry, not a screen texture sprite',()=>{
 const src=read('src/premiumEnvironmentV130.js');
 assert.match(src,/THREE\.InstancedMesh/);
 assert.match(src,/THREE\.TubeGeometry/);
 assert.match(src,/leafGeometry\(/);
 assert.doesNotMatch(src,/new THREE\.Sprite\(/);
});
test('rain gutter response follows existing shared weather values',()=>{
 const src=read('src/premiumEnvironmentV130.js');
 assert.match(src,/weather\.rain/);
 assert.match(src,/weather\.wet/);
 assert.match(src,/drop\.visible=rain>/);
});
test('wearable meshes are attached to animated rig joints',()=>{
 const src=read('src/survivorFinishingV130.js');
 assert.match(src,/torso\.add\(root\)/);
 assert.match(src,/head\.add\(hood\)/);
 assert.match(src,/world\.survivorHands/);
 assert.match(src,/windTail\.rotation/);
});
test('postprocessing is disabled on mobile and can be disabled in low quality',()=>{
 const src=read('src/cinematicPostV130.js');
 assert.match(src,/if\(world\.isMobile\)return/);
 assert.match(src,/this\.active=!!this\.composer&&!low/);
 assert.match(src,/UnrealBloomPass/);
});
test('world integrates v1.3 finishing without replacing simulation or city planning',()=>{
 const src=read('src/world.js');
 assert.match(src,/new PremiumEnvironmentV130\(this\)/);
 assert.match(src,/upgradeSurvivorFinishingV130\(this\)/);
 assert.match(src,/this\.premiumEnvironment\?\.update/);
 assert.match(src,/this\.cinematicPost\.render\(\)/);
 assert.match(src,/planDistantCity/);
 assert.match(src,/this\.life\.update/);
});
test('current approved simulation, weather, layout and activity source checksums',()=>{
 const original={
  'src/simulation.js':'4cb656db0d2562c66a8d433998702755a15b25ce5cd6d1f6ad6226f7d83b447b',
  'src/solar.js':'68b7bd176efca52b8ac0d483507d7e9bcd43229a8c8fdd76408f5cf166aa75ad',
  'src/spatialLayout.js':'157bcbc1f606f34d2f3800994c5179c63347e26021e08459b566cd5bb4754c61',
  'src/weatherDirector.js':'25224234f37a4b67307a3e610dd23639e765428ae7e018c20bd4eeb9ec322323',
  'src/lifePlan.js':'d0f0928d7f19cde7576fcc26d8a96e7a83316f73fca3102a7a83c5698dbaead0'
 };
 for(const [file,expected] of Object.entries(original)){
   assert.equal(createHash('sha256').update(read(file)).digest('hex'),expected,file);
 }
});
