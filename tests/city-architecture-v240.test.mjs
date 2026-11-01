import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {pathToFileURL} from 'node:url';
import {CITY_COMPOSITION} from '../src/cityComposition.js';
import {makeCityInfill} from '../src/cityInfillPlanV150.js';
import {planDistantCity,SPATIAL_LAYOUT} from '../src/spatialLayout.js';
import {contractCitySlot} from '../src/cityContraction.js';

const rand=n=>{let x=Math.sin(n*127.1+46.4)*43758.5453;return x-Math.floor(x)};
const slots=mobile=>{const primary=planDistantCity(mobile,rand).map(contractCitySlot);return {primary,small:makeCityInfill(mobile,primary)};};

test('premium density: 360-degree built city is much closer while player roof exclusion remains',()=>{
 for(const mobile of [false,true]){
  const {primary,small}=slots(mobile),all=[...primary,...small];
  assert.ok(all.length>= (mobile?320:395),`city count ${all.length}`);
  const sectors=new Array(12).fill(0),ranges=new Array(3).fill(0);
  for(const b of all){
   const r=Math.hypot(b.x,b.z);
   const half=Math.hypot(b.width,b.depth??b.width*.82)*.5;
   assert.ok(r-half>=CITY_COMPOSITION.visualCityClearRadius,`${b.id} enters roof safety zone`);
   assert.ok(r<352,`${b.id} too far: ${r}`);
   assert.ok(CITY_COMPOSITION.groundY+b.height<CITY_COMPOSITION.heroRoofY,`${b.id} too high`);
   const angle=(Math.atan2(b.z,b.x)+Math.PI*2)%(Math.PI*2);
   sectors[Math.floor(angle*12/(Math.PI*2))]++;
   ranges[r<154?0:r<240?1:2]++;
  }
  assert.ok(Math.min(...sectors) >= (mobile?12:20),'gaps in skyline sectors');
  assert.ok(ranges.every(v=>v>(mobile?35:50)),`empty ring ${ranges}`);
  assert.deepEqual(slots(mobile),slots(mobile),'city must be reproducible');
 }
});

test('premium facade actually has correctly-proportioned windows, not 20 compressed storeys',()=>{
 for(let i=0;i<4;i++){
  const filename=`public/assets/materials/city/facade_premium_${i}.jpg`;
  assert.ok(fs.statSync(filename).size>90_000);
 }
 for(const file of ['src/world.js','src/cityInfillV150.js']){
  assert.match(fs.readFileSync(file,'utf8'),/facade_premium_/);
 }
});

test('true instanced balconies/rails/drains/window equipment and parapets render below rooftop',async()=>{
 const three=pathToFileURL('dist/vendor/three/build/three.module.js').href;
 const geoCode=fs.readFileSync('src/ruinedBuildingGeometry.js','utf8').replace("from 'three'",`from '${three}'`);
 const geoURL='data:text/javascript,'+encodeURIComponent(geoCode).replaceAll("'",'%27');
 const composition=pathToFileURL('src/cityComposition.js').href;
 const architecture=fs.readFileSync('src/cityArchitecture.js','utf8')
   .replace("from 'three'",`from '${three}'`)
   .replace("from './cityComposition.js'",`from '${composition}'`)
   .replace("from './ruinedBuildingGeometry.js'",`from '${geoURL}'`);
 const {CityArchitecture}=await import('data:text/javascript,'+encodeURIComponent(architecture));
 const THREE=await import(three);
 for(const mobile of [false,true]){
  const scene=new THREE.Scene(),{primary,small}=slots(mobile);
  const architecture=new CityArchitecture(scene,primary,small,mobile);
  assert.equal(architecture.stats.buildings,primary.length+small.length);
  assert.ok(architecture.stats.drawCalls<=10);
  for(const name of ['bands','balconies','rails','uprights','drains','vents','fans','parapets','pilasters','roofBoxes']){
   assert.ok(architecture.stats.instances[name]>0,`${name} missing`);
  }
  const matrix=new THREE.Matrix4(),position=new THREE.Vector3(),rotation=new THREE.Quaternion(),scale=new THREE.Vector3();
  let top=-Infinity;
  for(const mesh of architecture.meshes){
   assert.ok(mesh.isInstancedMesh&&mesh.count>0);
   for(let i=0;i<mesh.count;i++){
    mesh.getMatrixAt(i,matrix);matrix.decompose(position,rotation,scale);
    top=Math.max(top,position.y+scale.y*.5);
   }
  }
  assert.ok(top<CITY_COMPOSITION.heroRoofY,`architecture crossed player's roof at ${top}`);
 }
});
