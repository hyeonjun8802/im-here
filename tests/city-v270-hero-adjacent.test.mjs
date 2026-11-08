import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../public/vendor/three/build/three.module.js';
import {planDistantCity} from '../src/spatialLayout.js';
import {contractCitySlot,settleContractedCity} from '../src/cityContraction.js';
import {makeCityInfill} from '../src/cityInfillPlanV150.js';
import {CITY_COMPOSITION,clearsHeroRoof} from '../src/cityComposition.js';

const rand=n=>{const x=Math.sin(n*127.1+46.4)*43758.5453;return x-Math.floor(x)};
const city=mobile=>{
 const primary=settleContractedCity(planDistantCity(mobile,rand).map(contractCitySlot));
 const infill=makeCityInfill(mobile,primary);
 return {primary,infill,all:[...primary,...infill]};
};
const extent=b=>b.depth??b.width*.82;
const streetGap=(a,b)=>(Math.max(a.width,extent(a))+Math.max(b.width,extent(b)))*.48+1.5;

test('v2.7 playable-roof neighbors form physical 3D building rows on all four sides',()=>{
 for(const mobile of [false,true]){
  const {primary,infill,all}=city(mobile);
  assert.equal(primary.length,mobile?88:160);
  assert.ok(all.length>=(mobile?380:450),`insufficient dense blocks: ${all.length}`);
  const around=all.filter(b=>Math.hypot(b.x,b.z)<46);
  assert.ok(around.length>=10,`only ${around.length} buildings beside playable roof`);
  const sides=[0,0,0,0];
  for(const b of infill.filter(b=>b.id.startsWith('hero-adjacent-'))){
   const side=Number(b.id.split('-')[2]);sides[side]++;
  }
  assert.ok(sides.every(n=>n>=1),`no hero-perimeter city on a side: ${sides}`);
  const closest=Math.min(...all.map(b=>Math.hypot(b.x,b.z)));
  assert.ok(closest>33&&closest<39,`hero buildings too distant: ${closest}`);
  for(const b of all){
   assert.ok(clearsHeroRoof(b.x,b.z,b.width,extent(b),b.rotation||0),`${b.id} intersects the playable rooftop`);
   assert.ok(Math.hypot(b.x,b.z)-Math.hypot(b.width,extent(b))*.5>CITY_COMPOSITION.visualCityClearRadius,`${b.id} crosses radial exclusion`);
   assert.ok(CITY_COMPOSITION.groundY+b.height<=CITY_COMPOSITION.roofCeilingY,`${b.id} exceeds roof ceiling`);
  }
  for(let i=0;i<all.length;i++)for(let j=i+1;j<all.length;j++){
   const a=all[i],b=all[j];
   assert.ok(Math.hypot(a.x-b.x,a.z-b.z)>=streetGap(a,b)-1e-6,`${a.id} collides with ${b.id}`);
  }
  assert.deepEqual(city(mobile),city(mobile),'reload must not shuffle the city');
 }
});

test('v2.7 camera sees a denser close horizon without making the buildings taller',()=>{
 const {all}=city(false);
 const cam=new THREE.PerspectiveCamera(46,1536/940,.15,1650);
 const yaw=.78,pitch=1.29,r=79,target=new THREE.Vector3(0,19.3,0);
 cam.position.set(Math.sin(yaw)*Math.sin(pitch)*r,target.y+Math.cos(pitch)*r,Math.cos(yaw)*Math.sin(pitch)*r);
 cam.lookAt(target);cam.updateMatrixWorld(true);
 let count=0,near=0,close=0;
 for(const b of all){
  const depth=extent(b),cos=Math.cos(b.rotation||0),sin=Math.sin(b.rotation||0);
  const corners=[];
  for(const x of [-b.width*.5,b.width*.5])for(const z of [-depth*.5,depth*.5])for(const y of [CITY_COMPOSITION.groundY,CITY_COMPOSITION.groundY+b.height]){
   corners.push(new THREE.Vector3(b.x+x*cos+z*sin,y,b.z-x*sin+z*cos).project(cam));
  }
  if(!corners.some(p=>p.z>-1&&p.z<1) ||
   Math.max(...corners.map(p=>p.x))<-1||Math.min(...corners.map(p=>p.x))>1 ||
   Math.max(...corners.map(p=>p.y))<-1||Math.min(...corners.map(p=>p.y))>1)continue;
  count++;
  if(Math.hypot(b.x,b.z)<100)near++;
  if(Math.hypot(b.x,b.z)<190)close++;
 }
 assert.ok(count>=160,`only ${count} building centers appear in camera`);
 assert.ok(near>=16,`only ${near} immediate city building centers appear`);
 assert.ok(close>=95,`only ${close} close/medium buildings appear`);
});
