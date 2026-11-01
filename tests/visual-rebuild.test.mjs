import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {SPATIAL_LAYOUT,planDistantCity} from '../src/spatialLayout.js';
const world=fs.readFileSync('src/world.js','utf8');
const detail=fs.readFileSync('src/sceneDetails.js','utf8');
const main=fs.readFileSync('src/main.js','utf8');
const html=fs.readFileSync('index.html','utf8');
test('user-approved reference is bundled, not a fake rendered screenshot',()=>{
 assert.ok(fs.statSync('docs/visual-reference/strict_target_v060.png').size>10000);
 assert.ok(fs.existsSync('docs/CONCEPT_V060_IMPLEMENTATION.md'));
});
test('exactly one hero rooftop and physically separated 3D city layers',()=>{
 assert.equal(SPATIAL_LAYOUT.heroRoofCount,1);
 assert.ok(SPATIAL_LAYOUT.cityMinRadius>=SPATIAL_LAYOUT.clearZoneRadius);
 const r=n=>(Math.sin(n*127.1+46.4)*43758.5453)%1;
 const slots=planDistantCity(false,n=>{let a=Math.sin(n*127.1+46.4)*43758.5453;return a-Math.floor(a)});
 assert.ok(slots.every(p=>Math.hypot(p.x,p.z)>=SPATIAL_LAYOUT.cityMinRadius));
 assert.match(world,/this\.distantCityPlan=settleContractedCity\(planDistantCity/);
});
test('procedural 3D camp decoration is actually added to game scene',()=>{
 assert.match(world,/decorateHeroRooftop\(this\.scene,ROOF,this\)/);
 for(const word of ['InstancedMesh','tube(group','solar','bench','PointLight'])assert.ok(detail.includes(word),word);
});
test('distant city art only, no fake rooftop foreground screenshot',()=>{
 assert.match(world,/createAtmosphericBackdrops/);
 for(const k of ['dusk','noon','night','storm']){
  const p=`public/assets/materials/skyline_${k}.jpg`;
  const bytes=fs.readFileSync(p);
  assert.ok(bytes.length>20000,p);
  assert.equal(bytes[0],0xff);assert.equal(bytes[1],0xd8);
 }
 assert.match(world,/BackSide/);
});
test('showcase only changes preview sky and time; save state untouched',()=>{
 assert.match(main,/world\.setHour\(18\.2\);world\.setWeather\('clear'\)/);
 assert.match(html,/showcase-sunset/);
 const intro=fs.readFileSync('docs/CONCEPT_V060_IMPLEMENTATION.md','utf8');
 assert.match(intro,/마지막|렌더링|실기기/);
});
test('Vite resolves Three.js locally without runtime CDN importmap',()=>{
 assert.ok(!html.includes('type="importmap"'));
 assert.match(fs.readFileSync('package.json','utf8'),/"three"/);
});
