import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {SPATIAL_LAYOUT,planDistantCity,depthFogOpacity,depthAtmosphere} from '../src/spatialLayout.js';
import {VISUAL_WEATHER,integrateWeather} from '../src/weatherDirector.js';
const seeded=n=>{const x=Math.sin(n*127.1+46.4)*43758.5453;return x-Math.floor(x)};
const code=path=>fs.readFileSync(path,'utf8');

test('city has distinct real XYZ coordinates in near mid far tiers, without connected roof',()=>{
 const plan=planDistantCity(false,seeded);
 assert.equal(plan.length,160);
 const counts={near:0,mid:0,far:0};
 for(const s of plan){
  counts[s.tier]++;
  assert.ok(s.radius>=SPATIAL_LAYOUT[s.tier].min,s.id);
  assert.ok(s.radius<=SPATIAL_LAYOUT[s.tier].max,s.id);
  assert.ok(Math.hypot(s.x,s.z)>SPATIAL_LAYOUT.clearZoneRadius,s.id);
  assert.ok(s.height>0);
 }
 assert.deepEqual(counts,{near:28,mid:52,far:80});
 assert.ok(SPATIAL_LAYOUT.maxCameraRadius<SPATIAL_LAYOUT.near.min);
});
test('city has no two same positions and preserves deterministic skyline weather to weather',()=>{
 const a=planDistantCity(false,seeded),b=planDistantCity(false,seeded);
 assert.deepEqual(a,b);
 assert.equal(new Set(a.map(p=>`${p.x.toFixed(5)},${p.z.toFixed(5)}`)).size,a.length);
 assert.ok(a.some(p=>p.radius<210) && a.some(p=>p.radius>740));
});
test('far buildings become fog silhouettes and nearer buildings retain partial details',()=>{
 for(const mist of [0,.25,.66,.85,1]){
  const n=depthFogOpacity(200,mist),m=depthFogOpacity(420,mist),f=depthFogOpacity(740,mist);
  assert.ok(0<n && n<m && m<f && f<1);
 }
 assert.ok(depthFogOpacity(740,.85)>.96);
 assert.ok(depthFogOpacity(200,.85)<.30);
});
test('weather changes fog density but never city plan positions',()=>{
 assert.ok(depthAtmosphere(VISUAL_WEATHER.storm.mist,0).fogDensity>depthAtmosphere(VISUAL_WEATHER.clear.mist,0).fogDensity);
 const orig=planDistantCity(true,seeded);
 let w=VISUAL_WEATHER.clear;
 for(let i=0;i<100;i++)w=integrateWeather(w,'storm',.016);
 assert.deepEqual(orig,planDistantCity(true,seeded));
 assert.equal(orig.length,88);
});
test('fixed 3D city while separate sky-only weather backgrounds transition',()=>{
 const w=code('src/world.js');
 assert.match(w,/this\.skyWeatherLayers/);
 assert.match(w,/for\(const slot of this\.distantCityPlan\)/);
 assert.match(w,/this\.cityAtmosphere\.update/);
 assert.match(w,/materialLoader\.load\(base\+'\.jpg'/);
 assert.doesNotMatch(w,/this\.skylineLayers\s*=\s*\{/);
 for(const weather of ['dusk','noon','storm','night']){
  assert.ok(fs.statSync(`public/assets/materials/sky_only/sky_${weather}.jpg`).size>30000);
 }
});
test('fog banks have 3D depth and actual world positions, not a full-screen fog overlay',()=>{
 const a=code('src/cityAtmosphere.js');
 assert.match(a,/cloud\.position\.set/);
 assert.match(a,/cloud\.rotation\.x=-Math\.PI\/2/);
 assert.match(a,/depthWrite:false/);
 assert.match(a,/depthTest:true/);
});
test('wet glints and snow are three dimensional surfaces driven by weather values',()=>{
 const a=code('src/cinematicStage.js');
 assert.match(a,/buildReflectiveWetSurfaces\(\)/);
 assert.match(a,/uWet\.value=w\.wet/);
 assert.match(a,/buildSnowAccumulation\(\)/);
 assert.match(a,/new THREE\.InstancedMesh\(geo,material,n\)/);
 assert.match(a,/this\.snowCover\.material\.opacity/);
});
test('same author-approved survival mechanics, date and weather preview remain separate',()=>{
 const main=code('src/main.js'),sim=code('src/simulation.js');
 assert.match(main,/world\.setHour\(18\.2\);world\.setWeather\('clear'\)/);
 assert.match(sim,/Asia\/Seoul/);
 assert.equal(SPATIAL_LAYOUT.heroRoofCount,1);
});
