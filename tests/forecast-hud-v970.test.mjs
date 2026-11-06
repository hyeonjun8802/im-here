import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {forecastPresentation} from '../src/disasterForecastV800.js';
const file=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');

test('v9.7 smartphone and tablet use a taller original industrial frame without stretching the current dial',()=>{
 const html=file('index.html');
 const asset=file('public/assets/ui/forecast_hud_mobile_v970.svg');
 const css=file('src/hud-refine-v970.css');
 assert.match(html,/source media="\(max-width:900px\)" srcset="\.\/assets\/ui\/forecast_hud_mobile_v970\.svg"/);
 assert.match(html,/href="\.\/src\/hud-refine-v970\.css"/);
 assert.match(asset,/viewBox="0 0 1000 520"/);
 assert.match(asset,/circle cx="500" cy="260"/);
 assert.match(css,/aspect-ratio:1000\/520/);
 assert.match(css,/\.survival-hud-stock\{/);
 assert.match(css,/\.disaster-forecast__future::after/);
 assert.match(css,/width:min\(560px,calc\(100vw - 10px\)\)/);
});
test('nine distinct high-detail weather assets share an exact optical canvas',()=>{
 const types=['clear','cloud','rain','storm','tornado','heat','cold','dust','wildfire'];
 const code=file('src/disasterForecastV800.js');
 assert.match(code,/ICON_ROOT='\/assets\/ui\/weather-premium-v970'/);
 for(const type of types){
  const asset=file('public/assets/ui/weather-premium-v970/'+type+'.svg');
  assert.match(asset,/viewBox="0 0 120 120"/);
  assert.match(asset,new RegExp(type+' high-fidelity survival weather'));
  assert.match(asset,/clipPath id="iconClip"/);
  assert.match(asset,/<\/svg>\s*$/);
  assert.ok(asset.length>2600,type+' should have more than placeholder SVG geometry');
 }
});
test('full 24-hour countdown has one fixed-size future hazard icon moving left but never over the current weather ring',()=>{
 const start=1800000000000;
 const location=h=>forecastPresentation({weather:'cloud',majorDisasterType:'rain',majorDisasterAt:start+h*3600000},start);
 const p=[24,18,12,6,3,1].map(location);
 assert.ok(Math.abs(p[0].x-88.6)<.05);
 assert.ok(p.at(-1).x>69.5);
 for(let i=0;i<p.length;i++){
  assert.equal(p[i].scale,1);
  assert.equal(p[i].opacity,1);
  assert.equal(p[i].visible,true);
  if(i>0)assert.ok(p[i].x<p[i-1].x);
 }
 const src=file('src/disasterForecastV800.js');
 assert.match(src,/this\.future\.set\(p\.futureType,'current',p\.visible\)/);
});
