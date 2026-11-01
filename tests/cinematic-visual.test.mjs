import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
const root=process.cwd();
const source=x=>fs.readFileSync(path.join(root,x),'utf8');
const world=source('src/world.js');
const art=source('src/cinematicStage.js');
const character=source('src/survivorArt.js');
const main=source('src/main.js');
const rootFiles=path.join(root,'public/assets/models/afterday');
test('bundled 3D GLB files contain valid GLB 2.0 headers and substantial geometry',()=>{
 for(const name of ['afterday_shelter_pbr.glb','afterday_water_tank_pbr.glb','afterday_storage_pbr.glb']){
  const data=fs.readFileSync(path.join(rootFiles,name));
  assert.equal(data.subarray(0,4).toString('ascii'),'glTF',name);
  assert.equal(data.readUInt32LE(4),2,name);
  assert.equal(data.readUInt32LE(8),data.length,name);
  assert.ok(data.length>100000,name);
 }
});
test('GLB models are loaded into actual 3D scene with safe fallback',()=>{
 assert.match(world,/async loadHeroAssets\(\)/);
 assert.match(world,/this\.scene\.add\(model\);old\.visible=false/);
 assert.match(world,/new THREE\.Box3\(\)\.setFromObject\(model\)/);
 assert.match(world,/afterday_shelter_pbr\.glb/);
 assert.match(world,/afterday_water_tank_pbr\.glb/);
 assert.match(world,/afterday_storage_pbr\.glb/);
 assert.match(main,/world\.heroAssetPromise/);
});
test('new materials replace artificial bright rooftop grid and flat blue puddles',()=>{
 const files=['roof_cinematic_albedo.jpg','roof_cinematic_normal.jpg','roof_cinematic_roughness.png','roof_wetmask.png','cloudbank_alpha.png'];
 for(const f of files)assert.ok(fs.statSync(path.join(root,'public/assets/materials/cinematic',f)).size>25000,f);
 assert.match(world,/loadCinematicRoof\(roofmat\)/);
 assert.doesNotMatch(world,/for\(let i=-4;i<=4;i\+\+\)\{\s*box\(this\.roof,\[\.1/);
 assert.match(art,/blobShape\(/);
 assert.match(art,/roof_wetmask\.png/);
 assert.match(world,/this\.puddles=\[\]/);
});
test('one cinematic angle can switch to overhead for actual user camera',()=>{
 assert.match(world,/this\.pitch=mobile\?1\.26:1\.29/);
 assert.match(world,/setCameraView\(view='cinematic'\)/);
 assert.match(source('index.html'),/reset-cinematic-camera/);
});
test('rain visual effects include warm campfire and cloth shelter, retain existing weather physics',()=>{
 assert.match(art,/fireAndSmoke\(\)/);
 assert.match(art,/this\.wetOverlay\.material\.opacity/);
 assert.match(art,/detailShelter\(\)/);
 assert.match(character,/survivorRainHood/);
 assert.match(world,/integrateWeather\(this\.visualWeather,preset,dt,4\.7\)/);
});
test('single rooftop and unchanged real-time simulation remain source truth',()=>{
 const layout=source('src/spatialLayout.js');
 const sim=source('src/simulation.js');
 assert.match(layout,/heroRoofCount:\s*1/);
 assert.match(sim,/Asia\/Seoul/);
 assert.doesNotMatch(art,/addBuilding\(/);
 assert.doesNotMatch(art,/new THREE\.BoxGeometry\(45/);
});
