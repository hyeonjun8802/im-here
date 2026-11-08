import test from 'node:test';
import assert from 'node:assert/strict';
import {statSync,readFileSync} from 'node:fs';
import * as THREE from '../public/vendor/three/build/three.module.js';
import {planDistantCity} from '../src/spatialLayout.js';
import {contractCitySlot,settleContractedCity} from '../src/cityContraction.js';
import {makeCityInfill} from '../src/cityInfillPlanV150.js';
import {CITY_COMPOSITION} from '../src/cityComposition.js';
const random=n=>{let x=Math.sin(n*127.1+46.4)*43758.5453;return x-Math.floor(x)};
const planned=mobile=>{
 const primary=settleContractedCity(planDistantCity(mobile,random).map(contractCitySlot));
 return [...primary,...makeCityInfill(mobile,primary)];
};
test('v2.5 skyline occupies near world-space around hero, never just a distant random wall',()=>{
 for(const mobile of [false,true]){
  const blocks=planned(mobile),radii=blocks.map(b=>Math.hypot(b.x,b.z));
  assert.ok(blocks.length>(mobile?310:390));
  assert.ok(Math.min(...radii)>=32,'nearby buildings must not intersect the roof');
  assert.ok(Math.min(...radii)<40,'the first buildings should flank the playable rooftop');
  assert.ok(Math.max(...radii)<281);
  assert.ok(blocks.filter(b=>Math.hypot(b.x,b.z)<100).length>=(mobile?65:65),'foreground has too few buildings');
  const heights=blocks.map(x=>x.height);
  assert.ok(Math.max(...heights)-Math.min(...heights)>22,'no identical-height cuboid city');
  assert.ok(blocks.some(b=>CITY_COMPOSITION.groundY+b.height>9),'taller blocks remain visible above ground haze');
  assert.ok(blocks.some(b=>CITY_COMPOSITION.groundY+b.height < -7),'shorter blocks provide varying skyline');
  for(const b of blocks){
   const r=Math.hypot(b.x,b.z),half=Math.hypot(b.width,b.depth||b.width*.82)*.5;
   assert.ok(r-half>CITY_COMPOSITION.visualCityClearRadius);
   assert.ok(CITY_COMPOSITION.groundY+b.height<CITY_COMPOSITION.heroRoofY);
  }
  assert.deepEqual(blocks,planned(mobile));
 }
});
test('v2.5 every background footprint remains separate from neighboring buildings',()=>{
 for(const mobile of [false,true]){
  const b=planned(mobile);
  for(let i=0;i<b.length;i++)for(let j=i+1;j<b.length;j++){
   const a=b[i],c=b[j];
   const dist=Math.hypot(a.x-c.x,a.z-c.z);
   const gap=(Math.max(a.width,a.depth||a.width*.82)+Math.max(c.width,c.depth||c.width*.82))*.48+1.5;
   assert.ok(dist>=gap-1e-4,`collision: ${a.id} and ${c.id}`);
  }
 }
});
test('v2.5 actual game perspective camera projects nearby buildings at readable dimensions',()=>{
 const width=1536,height=940,camera=new THREE.PerspectiveCamera(46,width/height,.15,1650);
 const target=new THREE.Vector3(0,19.3,0),yaw=.78,pitch=1.29,radius=79;
 camera.position.set(Math.sin(yaw)*Math.sin(pitch)*radius,target.y+Math.cos(pitch)*radius,Math.cos(yaw)*Math.sin(pitch)*radius);
 camera.lookAt(target);camera.updateMatrixWorld(true);
 const counts={near:[],mid:[],far:[]};
 for(const b of planned(false)){
  const r=Math.hypot(b.x,b.z),k=r<128?'near':r<193?'mid':'far';
  const bottom=new THREE.Vector3(b.x,CITY_COMPOSITION.groundY,b.z).project(camera);
  const top=new THREE.Vector3(b.x,CITY_COMPOSITION.groundY+b.height,b.z).project(camera);
  if(top.z>=1||top.z<=-1||Math.abs(top.x)>=.96||Math.abs(top.y)>=.96)continue;
  counts[k].push(Math.abs(bottom.y-top.y)*height/2);
 }
 const med=a=>a.sort((x,y)=>x-y)[Math.floor(a.length/2)];
 assert.ok(counts.near.length>=12);
 assert.ok(med(counts.near)>155,'near city stays too tiny in game camera');
 assert.ok(counts.mid.length>=12);
 assert.ok(med(counts.mid)>95);
 assert.ok(counts.far.length>=12);
});
test('v2.5 facade atlases and extra physical building modules are genuinely shipped',()=>{
 const code=readFileSync('src/cityArchitecture.js','utf8');
 for(const part of ['bands','balconies','rails','drains','fans','parapets','pilasters','roofBoxes'])assert.match(code,new RegExp(part));
 for(let i=0;i<4;i++)assert.ok(statSync(`public/assets/materials/city/facade_premium_${i}.jpg`).size>200_000);
 const mist=readFileSync('src/groundMist.js','utf8');
 assert.match(mist,/y:-21,alpha:\.99/);
 assert.match(mist,/y:-4\.2,alpha:\.19/);
});
