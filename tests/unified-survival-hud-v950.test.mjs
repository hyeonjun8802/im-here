import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {forecastPresentation} from '../src/disasterForecastV800.js';
import {defaults,sanitize} from '../src/simulation.js';
const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('v9.5 authored vector resources are actual separate production-ready assets',()=>{
 const paths=['forecast_hud_frame_v950.svg','hud_gauge_track_v950.svg','hud_approach_cursor_v950.svg','hud_meter_fill_v950.svg'];
 for(const filename of paths){
   const src=read('public/assets/ui/'+filename);
   assert.match(src,/<svg xmlns="http:\/\/www.w3.org\/2000\/svg"/);
   assert.match(src,/<\/svg>/);
 }
 const src=read('public/assets/ui/forecast_hud_frame_v950.svg');
 assert.match(src,/One continuous riveted frame/);
 assert.match(src,/Center medallion retains existing circle/);
 assert.match(src,/Right forecast rail/);
});
test('HUD includes live three vital bars and 2x2 inventory but no external AFTERDAY logo',()=>{
 const html=read('index.html');
 assert.match(html,/hud_compact_desktop_ref_v1006\.png/);
 for(const id of ['hud-health-val','hud-food-val','hud-water-val','hud-stock-food','hud-stock-water','hud-stock-medicine','hud-stock-parts','days','speed-toggle']){
  assert.match(html,new RegExp('id="'+id+'"'));
 }
 assert.equal((html.match(/class="survival-hud-stat"/g)||[]).length,3);
 assert.equal((html.match(/class="survival-hud-stock"/g)||[]).length,1);
 assert.doesNotMatch(html,/<strong>AFTER<span>DAY<\/span><\/strong>/);
 const css=read('src/style.css');
 assert.match(css,/grid-template-columns:1fr 1fr/);
 assert.match(css,/#survivor-status-panel\{display:none!important\}/);
 assert.match(css,/top:calc\(min\(10\.95vw,151px\)/);
});
test('live profile values and quantities use state without affecting persistent simulation',()=>{
 const main=read('src/main.js');
 assert.match(main,/\['health',state\.health\]/);
 assert.match(main,/\['food',state\.food\]/);
 assert.match(main,/\['water',state\.water\]/);
 assert.match(main,/Object\.entries\(state\.supply\)/);
 const now=1_800_000_000_000;
 const before=defaults(now);const saved=JSON.parse(JSON.stringify(before));
 const after=sanitize(saved,now);
 assert.equal(after.health,before.health);
 assert.deepEqual(after.supply,before.supply);
});
test('one fixed-size disaster emblem moves strictly left toward centered current weather',()=>{
 const t=1_800_000_000_000;
 const at=h=>forecastPresentation({weather:'clear',majorDisasterType:'dust',majorDisasterAt:t+h*3600000},t);
 const p=[24,18,12,6,1].map(at);
 for(let i=1;i<p.length;i++){
  assert.ok(p[i].x<p[i-1].x);
  assert.equal(p[i].scale,p[0].scale);
  assert.equal(p[i].opacity,p[0].opacity);
 }
 assert.equal(p[0].scale,1);
 const src=read('src/disasterForecastV800.js');
 assert.match(src,/this\.future\.set\(p\.futureType,'current',p\.visible\)/);
 assert.match(src,/--forecast-x/);
 const css=read('src/style.css');
 assert.match(css,/\.disaster-forecast__future\{\s*left:var\(--forecast-x\)/);
 assert.match(css,/transition:left \.7s linear/);
});
