import test from 'node:test';
import assert from 'node:assert/strict';
import {statSync,readFileSync} from 'node:fs';
import {SPATIAL_LAYOUT,planDistantCity} from '../src/spatialLayout.js';
import {contractCitySlot} from '../src/cityContraction.js';
import {CITY_COMPOSITION} from '../src/cityComposition.js';
import {makeCityInfill} from '../src/cityInfillPlanV150.js';

const seeded=n=>{const x=Math.sin(n*127.1+46.4)*43758.5453;return x-Math.floor(x)};
test('city contracts toward center without violating single rooftop exclusion',()=>{
 const original=planDistantCity(false,seeded);
 const compact=original.map(contractCitySlot);
 assert.equal(compact.length,160);
 for(let i=0;i<compact.length;i++){
  assert.equal(compact[i].tier,original[i].tier);
  assert.ok(compact[i].radius<=original[i].radius);
  assert.ok(compact[i].radius>=CITY_COMPOSITION.visualCityClearRadius);
  assert.ok(compact[i].radius>SPATIAL_LAYOUT.heroRoofHalfWidth*2);
  assert.ok(Math.abs(Math.hypot(compact[i].x,compact[i].z)-compact[i].radius)<1e-6);
 }
 const a=makeCityInfill(false);
 assert.ok(a.length>=410);
 assert.ok(Math.min(...a.map(p=>Math.hypot(p.x,p.z)))>CITY_COMPOSITION.visualCityClearRadius);
 assert.ok(Math.max(...a.map(p=>Math.hypot(p.x,p.z)))<840);
});
test('world uses true ground-level depth-tested fog under intact hero roof',()=>{
 const s=readFileSync('src/groundMist.js','utf8');
 assert.match(s,/depthTest:true,depthWrite:false/);
 assert.match(s,/y:-4\.2/);
 assert.doesNotMatch(s,/renderOrder=\s*999/);
 assert.match(s,/fog:false/);
 const world=readFileSync('src/world.js','utf8');
 assert.match(world,/this\.groundMist\.update/);
 assert.match(world,/new CityReclamation/);
 assert.match(world,/\.map\(contractCitySlot\)/);
});
test('aged real facades and instanced greenery are both packaged',()=>{
 for(let i=0;i<4;i++)assert.ok(statSync(`public/assets/materials/city/facade_reclaimed_${i}.jpg`).size>30000);
 assert.ok(statSync('public/assets/materials/city/ivy_reclaimed.png').size>10000);
 assert.ok(statSync('public/assets/materials/city/ground_fog_noise.png').size>10000);
 const src=readFileSync('src/cityReclamation.js','utf8');
 assert.match(src,/new THREE\.InstancedMesh/);
 assert.match(src,/alphaTest:\.38/);
 assert.match(src,/facade/);
});
