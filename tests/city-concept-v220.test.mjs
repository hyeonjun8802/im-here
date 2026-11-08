import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {pathToFileURL} from 'node:url';
import {makeCityInfill} from '../src/cityInfillPlanV150.js';
import {planDistantCity,SPATIAL_LAYOUT} from '../src/spatialLayout.js';
import {contractCitySlot} from '../src/cityContraction.js';
import {CITY_COMPOSITION} from '../src/cityComposition.js';

const three=pathToFileURL('public/vendor/three/build/three.module.js').href;
const code=fs.readFileSync('src/ruinedBuildingGeometry.js','utf8').replace("from 'three'",`from '${three}'`);
const {createFracturedTowerGeometry,fracturedRoofHeightAt}=await import('data:text/javascript,'+encodeURIComponent(code));
const random=n=>{const p=Math.sin(n*127.1+46.4)*43758.5453;return p-Math.floor(p)};

test('real 3D fractured high-rise geometry has outward facing walls and a roof cap',()=>{
 for(let i=0;i<4;i++){
  const g=createFracturedTowerGeometry(i),pos=g.getAttribute('position'),normals=g.getAttribute('normal');
  assert.equal(pos.count,30);
  assert.deepEqual(g.groups.map(x=>x.materialIndex),[0,0,0,0,1]);
  assert.ok(normals.getZ(0)<-.1,'first outside-facing wall must not be culled');
  assert.ok(normals.getY(24)>.1,'fractured roof must face upwards');
  const heights=[...new Set([0,1,2,3].map(k=>fracturedRoofHeightAt(i,k===1||k===2?.5:-.5,k>=2?.5:-.5)))];
  assert.ok(heights.length>=3,'ragged roof silhouette cannot become a uniform box');
  g.dispose();
 }
});

test('more compact 3D city still protects the single playable roof',()=>{
 const original=planDistantCity(false,random),moved=original.map(contractCitySlot);
 assert.equal(SPATIAL_LAYOUT.heroRoofCount,1);
 assert.equal(moved.length,160);
 assert.ok(moved.every(x=>Math.hypot(x.x,x.z)>=CITY_COMPOSITION.visualCityClearRadius));
 assert.ok(moved.some((x,i)=>original[i].radius-x.radius>50));
 for(const mobile of [false,true]){
  const mobilePrimary=mobile?planDistantCity(true,random).map(contractCitySlot):moved;
  const blocks=makeCityInfill(mobile,mobilePrimary);
  assert.ok(blocks.length>=(mobile?230:235));
  assert.ok(blocks.every(x=>Math.hypot(x.x,x.z)-Math.hypot(x.width,x.depth)*.5>CITY_COMPOSITION.visualCityClearRadius));
 }
});

test('integrated nature reclaiming city uses bounded instancing, not a post-process overlay',()=>{
 const s=fs.readFileSync('src/cityReclamation.js','utf8');
 assert.match(s,/fracturedRoofHeightAt/);
 assert.match(s,/new THREE\.InstancedMesh/);
 for(const name of ['Rooted roof trees','Damaged tower facade','Broken steel frames','climbing ivy'])assert.ok(s.includes(name));
 const fog=fs.readFileSync('src/groundMist.js','utf8');
 assert.match(fog,/depthTest:true,depthWrite:false/);
 assert.match(fog,/mesh\.position\.y=layer\.y/);
 assert.match(fog,/noise/);
});
