import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {forecastPresentation} from '../src/disasterForecastV800.js';
const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');

test('nine unique premium meteorological illustrations share an optically aligned 120x120 canvas',()=>{
 const types=['clear','cloud','rain','storm','tornado','heat','cold','dust','wildfire'];
 for(const type of types){
  const svg=read('public/assets/ui/weather-premium/'+type+'.svg');
  assert.match(svg,/viewBox="0 0 120 120"/,type);
  assert.match(svg,/clipPath id="round"/,type);
  assert.match(svg,new RegExp(type+' premium weather illustration'),type);
  assert.ok(svg.length>2000,type);
  assert.match(svg,/<\/svg>\s*$/,type);
 }
 const source=read('src/disasterForecastV800.js');
 assert.match(source,/ICON_ROOT='\/assets\/ui\/weather-premium-v970'/);
 assert.match(source,/function iconSrc\(type,stage\)\{return \x60\$\{ICON_ROOT\}\/\$\{type\}\.svg\x60;\}/);
});
test('mobile gets dedicated tall artwork, desktop retains original metal frame',()=>{
 const html=read('index.html');
 const svg=read('public/assets/ui/forecast_hud_mobile_v960.svg');
 const css=read('src/style.css');
 assert.match(html,/source media="\(max-width:900px\)" srcset="\.\/assets\/ui\/forecast_hud_mobile_v970\.svg"/);
 assert.match(html,/forecast_hud_frame_v950\.svg/);
 assert.match(svg,/viewBox="0 0 1000 440"/);
 assert.match(svg,/circle cx="500" cy="218"/);
 assert.match(css,/aspect-ratio:1000\/440/);
 assert.match(css,/\.disaster-forecast__current\{\s*left:50%;top:49\.5%;width:21\.8%/);
 assert.match(css,/\.topbar \.top-right\{\s*top:calc\(45vw \+ 14px/);
 assert.match(css,/\.survival-hud-stock\{[\s\S]*?grid-template-columns:1fr 1fr/);
});
test('same-sized premium weather icon passes from +24 to 0 hours without crossing the present-weather circle',()=>{
 const now=1800000000000;
 const state=h=>({weather:'cloud',majorDisasterType:'dust',majorDisasterAt:now+h*3600000});
 const steps=[24,18,12,6,1].map(h=>forecastPresentation(state(h),now));
 for(let i=1;i<steps.length;i++){
  assert.ok(steps[i-1].x>steps[i].x);
  assert.equal(steps[i].scale,1);
  assert.equal(steps[i].opacity,1);
 }
 assert.ok(steps.at(-1).x>=68.9); // Center disk's right edge + image radius stays clear.
});
