import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {spawnSync} from 'node:child_process';
import {WEATHER,WEATHER_KO,MAJOR_DISASTERS,majorDisasterTypeFor,defaults,advance,DAY_MS} from '../src/simulation.js';
import {visualTargets} from '../src/weatherDirector.js';
import {forecastPresentation} from '../src/disasterForecastV800.js';
import {describeWeatherEconomy} from '../src/weatherEconomy.js';
import {premiumDisasterBudget} from '../src/premiumDisasterVfxV810.js';

const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');

test('v8.1 disaster modules and integration files are syntax valid',()=>{
 for(const file of ['src/premiumDisasterVfxV810.js','src/weatherDirector.js','src/simulation.js','src/weatherEconomy.js','src/world.js','src/main.js']){
  const r=spawnSync(process.execPath,['--check',file],{encoding:'utf8'});
  assert.equal(r.status,0,r.stderr||r.stdout);
 }
});

test('dust and wildfire are authoritative weather and 24-hour forecast types',()=>{
 assert.ok(WEATHER.includes('dust'));assert.ok(WEATHER.includes('wildfire'));
 assert.equal(WEATHER_KO.dust,'황사');assert.equal(WEATHER_KO.wildfire,'산불');
 assert.ok(MAJOR_DISASTERS.includes('dust'));assert.ok(MAJOR_DISASTERS.includes('wildfire'));
 const seen=new Set(Array.from({length:80},(_,i)=>majorDisasterTypeFor(47283,i+1)));
 assert.ok(seen.has('dust'));assert.ok(seen.has('wildfire'));
});

test('forecast HUD exposes dust and wildfire across exact 24h/18h/12h/6h checkpoints',()=>{
 const now=1_800_000_000_000;
 const dust=forecastPresentation({weather:'dust',majorDisasterType:'wildfire',majorDisasterAt:now+24*3600000},now);
 assert.equal(dust.currentType,'dust');assert.equal(dust.futureType,'wildfire');assert.equal(dust.activeLeadHours,24);
 const fire=forecastPresentation({weather:'wildfire',majorDisasterType:'dust',majorDisasterAt:now+12*3600000},now);
 assert.equal(fire.currentType,'wildfire');assert.equal(fire.futureType,'dust');assert.equal(fire.activeLeadHours,12);
 const sprites=read('public/assets/ui/disaster_forecast_icons.svg');
 for(const type of ['dust','wildfire'])for(const stage of ['far','eve','current'])assert.match(sprites,new RegExp(`id="${type}-${stage}"`));
});

test('dust storm has real survival consequences without inventing new save schema',()=>{
 const now=1_800_000_000_000,s=defaults(now);
 s.weather='dust';s.pendingWeather='dust';s.nextWeatherAt=now+99*60000;s.facilities.shelter=45;
 const water=s.water,sick=s.sickness;
 advance(s,now+60000,false);
 assert.ok(s.water<water,'dust should increase hydration drain');
 assert.ok(s.sickness>sick,'dust should increase respiratory sickness');
 assert.equal(s.version,4);
});

test('wildfire raises heat stress and physically damages camp systems',()=>{
 const now=1_800_000_000_000,s=defaults(now);
 s.weather='wildfire';s.pendingWeather='wildfire';s.nextWeatherAt=now+99*60000;s.facilities.shelter=50;s.water=30;s.supply.water=0;
 const water=s.water,health=s.health,shelter=s.facilities.shelter,temperature=s.temperature;
 advance(s,now+60000,false);
 assert.ok(s.water<water);assert.ok(s.health<health);assert.ok(s.facilities.shelter<shelter);assert.ok(s.temperature>temperature);
 assert.match(describeWeatherEconomy(s),/산불 연기/);
});

test('visual director gives dust and wildfire distinct bounded physical blends',()=>{
 const d=visualTargets('dust'),f=visualTargets('wildfire');
 assert.equal(d.dust,1);assert.equal(d.wildfire,0);assert.ok(d.wind>.9&&d.mist<.6);
 assert.equal(f.wildfire,1);assert.ok(f.heat>.8&&f.mist>.8);assert.equal(f.rain,0);
});

test('premium disaster VFX use bounded mobile budgets and world-space GPU geometry',()=>{
 const mobile=premiumDisasterBudget(true),desktop=premiumDisasterBudget(false);
 assert.ok(mobile.dustSheets<desktop.dustSheets);
 assert.ok(mobile.wildfireFlames<desktop.wildfireFlames);
 assert.equal(desktop.shadowCastingFireLights,0);
 const src=read('src/premiumDisasterVfxV810.js');
 assert.match(src,/InstancedBufferGeometry/);
 assert.match(src,/SphereGeometry/);
 assert.match(src,/depthTest:true/);
 assert.match(src,/world-space dust storm sheets/);
 assert.match(src,/distant wildfire front/);
 assert.doesNotMatch(src,/document\.createElement|canvas|getContext/);
});

test('world owns new disaster VFX and disables legacy point-dust renderer',()=>{
 const src=read('src/world.js');
 assert.match(src,/PremiumDisasterVfxV810/);
 assert.match(src,/premiumDisasterVfx=new PremiumDisasterVfxV810/);
 assert.match(src,/premiumDisasterVfx\?\.update/);
 assert.match(src,/premiumDisasterVfx\?\.dispose/);
 assert.match(src,/this\.dust\.material\.opacity=0;this\.dust\.visible=false/);
});

test('HUD warnings and weather audio cover both new disasters',()=>{
 const main=read('src/main.js'),audio=read('src/weatherAudio.js');
 assert.match(main,/황사 경보/);assert.match(main,/산불 연기 접근/);
 assert.match(main,/dust:'29°C'/);assert.match(main,/wildfire:'43°C'/);
 assert.match(audio,/weather==='dust'/);assert.match(audio,/weather==='wildfire'/);
});
