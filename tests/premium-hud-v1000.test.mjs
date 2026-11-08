import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,statSync} from 'node:fs';
import {premiumForecastX} from '../src/premiumHudV1000.js';
const read=p=>readFileSync(new URL('../'+p,import.meta.url));
const text=p=>read(p).toString('utf8');
const pngSize=p=>{
 const d=read(p);assert.equal(d.subarray(0,8).toString('hex'),'89504e470d0a1a0a');
 return [d.readUInt32BE(16),d.readUInt32BE(20)];
};
test('exact responsive, single-piece approved frame assets are present',()=>{
 assert.deepEqual(pngSize('public/assets/ui/afterday-premium-v1000/desktop/compact_complete_hud_frame.png'),[1700,190]);
 assert.deepEqual(pngSize('public/assets/ui/afterday-premium-v1000/mobile/compact_complete_hud_frame.png'),[1000,210]);
});
test('all 9 current game weather and optional meteor medallions/forecast icons exist',()=>{
 for(const w of ['clear','cloud','rain','storm','tornado','heat','cold','dust','wildfire','meteor']){
  for(const type of ['medallion_art','forecast_icon']){
   const p=`public/assets/ui/afterday-premium-v1000/weather/${w}_${type}.png`;
   assert.ok(statSync(new URL('../'+p,import.meta.url)).size>6000,p);
  }
 }
});
test('all existing survivor and inventory symbols exist',()=>{
 for(const name of ['health','hunger','water','food','medicine','parts','people']){
  const p=`public/assets/ui/afterday-premium-v1000/vitals/${name}.png`;
  assert.ok(statSync(new URL('../'+p,import.meta.url)).size>2000,p);
 }
});
test('one HUD engine is used; original simulation and state references preserved',()=>{
 const main=text('src/main.js');
 assert.match(main,/import \{installPremiumHudV1000\} from '\.\/premiumHudV1000\.js'/);
 assert.match(main,/const disasterForecast=installPremiumHudV1000\(\$\('#disaster-forecast'\)\)/);
 assert.doesNotMatch(main,/new DisasterForecastHUD/);
 assert.match(main,/disasterForecast\.sync\(state,t\)/);
 assert.match(main,/disasterForecast\.syncProgress\(state,gameNow\)/);
 assert.match(text('index.html'),/premiumHudV1000\.css/);
});
test('forecast event moves continuously from +24h RIGHT to current LEFT',()=>{
 assert.match(text('src/premiumHudV1000.js'),/const HOURS=\[0,3,6,12,18,24\]/);
 const t=[24,18,12,6,3,0].map(premiumForecastX);
 for(let i=1;i<t.length;i++)assert.ok(t[i]<t[i-1]);
 assert.ok(Math.abs(premiumForecastX(24)-91.6666666667)<.01);
 assert.ok(Math.abs(premiumForecastX(6)-41.6666666667)<.01);
 assert.ok(Math.abs(premiumForecastX(0)-8.3333333333)<.01);
});
test('animation frame sync does not repaint full DOM',()=>{
 const src=text('src/premiumHudV1000.js');
 assert.match(src,/syncProgress=\(state,now\)=>/);
 assert.doesNotMatch(src,/syncProgress:draw/);
 assert.doesNotMatch(src,/localStorage\.|state\.weather\s*=/);
});

test('weather medallion is prominent; obsolete weather caption and i-button are removed',()=>{
 const src=text('src/premiumHudV1000.js');
 const css=text('src/premiumHudV1000.css');
 assert.doesNotMatch(src,/put\(root,'span','premium-hud__weather-name'\)/);
 assert.doesNotMatch(src,/put\(root,'button','premium-hud__info'\)/);
 assert.doesNotMatch(css,/\.premium-hud-v1000 \.premium-hud__weather-name\{/);
 assert.doesNotMatch(css,/\.premium-hud-v1000 \.premium-hud__info\{/);
 assert.match(css,/\.premium-hud-v1000 \.premium-hud__current-art\{top:9%;width:15\.1%;height:82%\}/);
});

test('approved artwork uses all four original image dimensions, compact variants active',()=>{
 const js=text('src/premiumHudV1000.js');
 const html=text('index.html');
 const css=text('src/premiumHudV1004.css');
 for(const file of ['hud_compact_desktop_ref_v1006.png','hud_compact_mobile_ref_v1006.png']){
  assert.ok(js.includes(file),file+' missing in active HUD');
  assert.ok(html.includes(file),file+' missing in initial fallback');
 }
 for(const [name,size] of [
  ['hud_compact_desktop_ref_v1006.png',[1700,190]],
  ['hud_compact_mobile_ref_v1006.png',[1000,210]],
  ['hud_full_a_ref_v1006.png',[1700,350]],
  ['hud_full_b_ref_v1006.png',[1700,380]],
 ]){
  const file='public/assets/ui/hud-reference-v1006/'+name;
  assert.deepEqual(pngSize(file),size);
  assert.equal(read(file)[25],6,'RGBA alpha required: '+file);
 }
 assert.match(css,/--approved-hud-aspect:1700 \/ 190/);
 assert.match(css,/--approved-hud-aspect:1000 \/ 210/);
 assert.match(css,/width:min\(1600px,calc\(100vw - 8px\)\)!important/);
 assert.match(css,/width:calc\(100vw - 4px\)!important/);
 assert.match(css,/transform:translateX\(-50%\)!important/);
 assert.match(html,/premiumHudV1004\.css/);
 assert.doesNotMatch(js,/hud_desktop_high_v1004\.png/);
});

test('v1007 moves mobile vital labels, bars and supply icons together without touching PC layout',()=>{
 const css=text('src/premiumHudV1004.css');
 const section=css.slice(css.indexOf('/* v1007 mobile-only alignment:'));
 assert.match(section,/@media\(max-width:720px\)/);
 assert.match(section,/\.disaster-forecast\.premium-hud-v1000 \.survival-hud-stats\{/);
 assert.match(section,/left:5\.4%!important/);
 assert.doesNotMatch(section,/\.survival-hud-stat-track\{/);
 assert.doesNotMatch(section,/\.survival-hud-stock\{/);
 assert.doesNotMatch(section,/@media\(min-width:721px\)/);
});
