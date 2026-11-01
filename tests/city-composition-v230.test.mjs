import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {pathToFileURL} from 'node:url';
import {CITY_COMPOSITION} from '../src/cityComposition.js';
import {SPATIAL_LAYOUT,planDistantCity} from '../src/spatialLayout.js';
import {contractCitySlot} from '../src/cityContraction.js';
import {makeCityInfill} from '../src/cityInfillPlanV150.js';
const rand=n=>{const v=Math.sin(n*127.1+46.4)*43758.5453;return v-Math.floor(v);};

function planned(mobile){
 const main=planDistantCity(mobile,rand).map(contractCitySlot);
 return {main,small:makeCityInfill(mobile,main)};
}

test('every real city building is physically BELOW the player roof; no exceptions in any tier',()=>{
 for(const mobile of [false,true]){
  const {main,small}=planned(mobile),buildings=[...main,...small];
  assert.ok(buildings.length>(mobile?320:395));
  for(const b of buildings){
   assert.ok(b.height>0);
   assert.ok(CITY_COMPOSITION.groundY+b.height<=CITY_COMPOSITION.roofCeilingY+1e-6,
     `${b.id} background roof top ${CITY_COMPOSITION.groundY+b.height}`);
   assert.ok(CITY_COMPOSITION.roofCeilingY<CITY_COMPOSITION.vegetationCeilingY);
   assert.ok(CITY_COMPOSITION.vegetationCeilingY<CITY_COMPOSITION.heroRoofY);
  }
 }
});

test('main and infill cities remain dense and concentric, with unobstructed playable roof',()=>{
 for(const mobile of [false,true]){
  const {main,small}=planned(mobile);
  assert.equal(main.length,mobile?88:160);
  const outer=Math.max(...[...main,...small].map(b=>Math.hypot(b.x,b.z)));
  assert.ok(outer<352,`city ring too distant: ${outer}`);
  for(const b of main){
   const r=Math.hypot(b.x,b.z);
   assert.ok(r>=CITY_COMPOSITION.visualCityClearRadius && r<=352);
   assert.ok(r-Math.hypot(b.width,b.width*.82)/2>CITY_COMPOSITION.visualCityClearRadius);
  }
  for(const b of small){
   const r=Math.hypot(b.x,b.z);
   assert.ok(r-Math.hypot(b.width,b.depth)/2>=CITY_COMPOSITION.visualCityClearRadius);
  }
  assert.deepEqual(planned(mobile),planned(mobile),'positions must not change with reload');
 }
});

test('background city cannot pop-in tall pointy GLBs and street fog does not cross the camp',()=>{
 const world=fs.readFileSync('src/world.js','utf8');
 const atmosphere=fs.readFileSync('src/cityAtmosphere.js','utf8');
 const ground=fs.readFileSync('src/groundMist.js','utf8');
 assert.doesNotMatch(world,/this\.assets\.instance\(token,height/);
 assert.match(world,/createFracturedTowerGeometry/);
 assert.match(atmosphere,/INFILL_LAYERS\[tier\]/);
 assert.match(atmosphere,/level\+hash\(i\+91\)\*8/);
 const fogHeights=[...ground.matchAll(/\{y:(-?\d+(?:\.\d+)?),alpha:/g)].map(x=>Number(x[1]));
 assert.ok(fogHeights.length>=6);
 assert.ok(Math.max(...fogHeights)<=CITY_COMPOSITION.upperMistY+1e-9);
});

test('roofline is broad and almost level, not sawtoothed skyscraper spikes',async()=>{
 const three=pathToFileURL('dist/vendor/three/build/three.module.js').href;
 const code=fs.readFileSync('src/ruinedBuildingGeometry.js','utf8').replace("from 'three'",`from '${three}'`);
 const {createFracturedTowerGeometry,fracturedRoofHeightAt}=await import('data:text/javascript,'+encodeURIComponent(code));
 for(let i=0;i<4;i++){
  const fractions=[[-.5,-.5],[.5,-.5],[.5,.5],[-.5,.5]].map(([x,z])=>fracturedRoofHeightAt(i,x,z));
  assert.ok(Math.min(...fractions)>=.94);
  assert.ok(Math.max(...fractions)-Math.min(...fractions)<=.061);
  const geo=createFracturedTowerGeometry(i);
  assert.equal(geo.groups.length,5);
  geo.dispose();
 }
});
