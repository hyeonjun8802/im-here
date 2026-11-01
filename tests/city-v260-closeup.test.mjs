import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../dist/vendor/three/build/three.module.js';
import {planDistantCity} from '../src/spatialLayout.js';
import {contractCitySlot,settleContractedCity} from '../src/cityContraction.js';
import {makeCityInfill} from '../src/cityInfillPlanV150.js';
import {CITY_COMPOSITION} from '../src/cityComposition.js';

const rand=n=>{const x=Math.sin(n*127.1+46.4)*43758.5453;return x-Math.floor(x)};
const city=mobile=>{const main=settleContractedCity(planDistantCity(mobile,rand).map(contractCitySlot));return [...main,...makeCityInfill(mobile,main)]};

test('v2.6 close-up: buildings fill the near rooftop ring while keeping its only play area clear',()=>{
 for(const mobile of [false,true]){
  const lots=city(mobile),radii=lots.map(b=>Math.hypot(b.x,b.z));
  assert.ok(lots.length>= (mobile?340:400),`urban density decreased: ${lots.length}`);
  assert.ok(Math.min(...radii)<70,'no foreground buildings next to the hero rooftop');
  assert.ok(Math.max(...radii)<280,'background city is still too distant');
  assert.ok(lots.filter(b=>Math.hypot(b.x,b.z)<125).length >= (mobile?75:70),'not enough immediate foreground facades');
  for(const lot of lots){
   const half=Math.hypot(lot.width,lot.depth||lot.width*.82)*.5;
   assert.ok(Math.hypot(lot.x,lot.z)-half>CITY_COMPOSITION.visualCityClearRadius,`${lot.id} intersects hero safety zone`);
   assert.ok(CITY_COMPOSITION.groundY+lot.height<=CITY_COMPOSITION.roofCeilingY+1e-8,'roof silhouette above hero');
  }
  assert.deepEqual(lots,city(mobile),'city positions must stay deterministic on reload');
 }
});

test('v2.6 close-up: opening camera sees many nearby buildings with distinct heights',()=>{
 const width=1536,height=940,camera=new THREE.PerspectiveCamera(46,width/height,.15,1650);
 const target=new THREE.Vector3(0,19.3,0),yaw=.78,pitch=1.29,r=79;
 camera.position.set(Math.sin(yaw)*Math.sin(pitch)*r,target.y+Math.cos(pitch)*r,Math.cos(yaw)*Math.sin(pitch)*r);
 camera.lookAt(target);camera.updateMatrixWorld(true);
 let visible=0,close=0, readable=0;
 for(const lot of city(false)){
  const yTop=CITY_COMPOSITION.groundY+lot.height;
  const top=new THREE.Vector3(lot.x,yTop,lot.z).project(camera);
  if(!(top.z>-1&&top.z<1&&Math.abs(top.x)<.98&&Math.abs(top.y)<.98))continue;
  visible++;
  if(Math.hypot(lot.x,lot.z)<190)close++;
  const bottom=new THREE.Vector3(lot.x,CITY_COMPOSITION.groundY,lot.z).project(camera);
  if(Math.abs(bottom.y-top.y)*height/2>110)readable++;
 }
 assert.ok(visible>=110,`only ${visible} visible building centers`);
 assert.ok(close>=50,`only ${close} nearby building centers`);
 assert.ok(readable>=55,`only ${readable} readable-height building facades`);
});
