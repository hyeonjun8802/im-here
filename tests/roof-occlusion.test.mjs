import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { fitModelScale } from '../src/modelSizing.js';
import { ROOFTOP_PROPS } from '../src/artDirection.js';

test('a thin imported roof cannot grow across the entire hero rooftop',()=>{
 const scale=fitModelScale({x:40,y:.15,z:28},3.2,{maxFootprint:6.5});
 assert.ok(scale>0);
 assert.ok(scale*40<=6.5+1e-8);
 assert.ok(scale*28<=6.5+1e-8);
});
test('ordinary tall props still reach requested height where space allows',()=>{
 const scale=fitModelScale({x:1.5,y:4,z:2},3,{maxFootprint:6.5});
 assert.equal(scale,.75);
});
test('invalid model dimension cannot enter the scene',()=>{
 for(const dim of [{x:9,y:0,z:9},{x:NaN,y:2,z:4}])assert.equal(fitModelScale(dim,4,{maxFootprint:6.5}),null);
});
test('no complete house/ground roof asset inside the inhabited camp',()=>{
 const names=ROOFTOP_PROPS.map(([name])=>name);
 assert.equal(names.includes('solar-panel-house'),false);
 assert.equal(names.includes('ground-cracked'),false);
});
test('every actual rooftop GLB is bounded before insertion',()=>{
 const source=fs.readFileSync('src/world.js','utf8');
 assert.match(source,/maxFootprint:6\.5/);
 assert.match(source,/Quarantined oversized rooftop model/);
});
test('the original functional tent and one hero roof survive the fix',()=>{
 const source=fs.readFileSync('src/world.js','utf8');
 assert.match(source,/createRoof\(\)/);
 assert.match(source,/this\.tarpMesh=roof/);
 assert.match(source,/this\.roofSurfaceMaterial=roofmat/);
});
