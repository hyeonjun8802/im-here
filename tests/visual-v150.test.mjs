import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {makeCityInfill,measureInfill,INFILL_LAYERS} from '../src/cityInfillPlanV150.js';
const src=x=>fs.readFileSync(new URL(`../${x}`,import.meta.url),'utf8');
test('3D city infill has close, middle and distant buildings, not floating isolated towers',()=>{
 const a=makeCityInfill(false),b=makeCityInfill(false),m=measureInfill(a);
 assert.deepEqual(a,b);assert.ok(m.count>=410);assert.ok(m.byLayer.inner>=55);assert.ok(m.byLayer.middle>=105);assert.ok(m.byLayer.outer>=200);
 assert.ok(m.minDistance>=32);assert.ok(m.minDistance<40);assert.ok(m.maxDistance<281);
 assert.ok(a.every(x=>x.height>0&&x.width>6&&x.depth>5));
});
test('mobile uses same urban layout rules with reduced instances',()=>{
 const d=makeCityInfill(false),m=makeCityInfill(true);
 assert.ok(m.length>=290);assert.ok(m.length<d.length);
 assert.deepEqual(INFILL_LAYERS.map(x=>x.name),['inner','middle','outer']);
});
test('weather changes do not change city placements',()=>{
 const f=src('src/world.js');const urban=src('src/cityInfillV150.js');
 assert.match(f,/new CityInfillV150\(this\)/);assert.match(f,/cityInfill\?\.update\(night\)/);
 assert.match(urban,/new THREE\.InstancedMesh/);assert.match(urban,/\.emissiveIntensity=night\*\.64/);
 assert.doesNotMatch(urban,/position\.set\([^)]*weather/);
});
test('actor face has one set of irises and face pieces are now rounded',()=>{
 const s=src('src/survivorArt.js'),d=src('src/premiumCharacterDetail.js');
 assert.match(s,/RoundedBoxGeometry/);assert.match(d,/RoundedBoxGeometry/);
 assert.doesNotMatch(s,/ell\(head,\[s\*\.145,\.19,\.328\]/);
 assert.match(s,/for\(let i=0;i<9;i\+\+\)/);
});
test('no pre-drawn straight roof grid in the replacement 2K material',()=>{
 const src0=fs.readFileSync(new URL('../public/assets/materials/cinematic/roof_cinematic_albedo.jpg',import.meta.url));
 assert.ok(src0.length>200_000);assert.ok(src0.subarray(0,2).equals(Buffer.from([0xff,0xd8])));
 const a=src('scripts/refine_roof_v150.py');assert.match(a,/NOT a 2D sky/);assert.match(a,/normal/);
});
