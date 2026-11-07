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
test('forecast event moves continuously from +24h LEFT to current RIGHT',()=>{
 const t=[24,18,12,6,3,0].map(premiumForecastX);
 for(let i=1;i<t.length;i++)assert.ok(t[i]>t[i-1]);
 assert.ok(Math.abs(premiumForecastX(6)-58.3333333333)<.01);
 assert.ok(Math.abs(premiumForecastX(0)-91.6666666667)<.01);
});
test('animation frame sync does not repaint full DOM',()=>{
 const src=text('src/premiumHudV1000.js');
 assert.match(src,/syncProgress=\(state,now\)=>/);
 assert.doesNotMatch(src,/syncProgress:draw/);
 assert.doesNotMatch(src,/localStorage\.|state\.weather\s*=/);
});
