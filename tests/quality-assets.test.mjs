import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {join} from 'node:path';
const root=process.cwd();
const world=readFileSync(join(root,'src/world.js'),'utf8');
const effects=readFileSync(join(root,'src/advancedWeather.js'),'utf8');
const props=readFileSync(join(root,'src/premiumProps.js'),'utf8');
test('four material types use albedo normal and roughness',()=>{
 for(const m of ['roof_concrete','tarp_canvas','galvanized_rust','reclaimed_wood']){
  for(const suffix of ['albedo.jpg','normal.jpg','roughness.png']){
   const p=join(root,'public/assets/materials/advanced',`${m}_${suffix}`);
   assert.ok(existsSync(p),p);
   assert.ok(readFileSync(p).length>9000,p);
  }
 }
 assert.match(world,/loadCinematicRoof\(roofmat\)/);
 assert.match(world,/loadPBR\(tarpmat,'tarp_canvas'/);
});
test('weather is 3D rendered and not slides or one-frame background swaps',()=>{
 for(const token of ['InstancedMesh','this.splash','this.streams','this.snow','this.clouds','this.debris','this.bolt','this.farFlash'])assert.ok(effects.includes(token),token);
 assert.match(world,/this\.advancedWeather\.update\(dt,vw,night,storm\)/);
});
test('premium details enhance original shelter and tank without building a second roof',()=>{
 assert.match(props,/const tent=world\.shelter/);
 assert.match(props,/const tank=world\.tank/);
 assert.match(props,/const store=world\.storage/);
 assert.doesNotMatch(props,/addBuilding\(/);
 assert.doesNotMatch(props,/building-[\w]+\.glb/);
 assert.match(world,/upgradeCampFacilities\(this\)/);
});
test('single rooftop rules and simulation date routines remain unchanged',()=>{
 const layout=readFileSync(join(root,'src/spatialLayout.js'),'utf8');
 assert.match(layout,/heroRoofCount:\s*1/);
 const simulation=readFileSync(join(root,'src/simulation.js'),'utf8');
 assert.match(simulation,/Asia\/Seoul/);
});
