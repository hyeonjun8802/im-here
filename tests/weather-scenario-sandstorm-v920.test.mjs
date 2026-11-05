import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {spawnSync} from 'node:child_process';
import {GameClock,GAME_CLOCK_RATE,GAME_DAY_REAL_MS} from '../src/gameClock.js';
import {defaults,advance,majorDisasterTypeFor,MAJOR_DISASTERS,DAY_MS,sanitize} from '../src/simulation.js';
import {chooseScenarioWeather,preludeWeather,weatherDurationMs,WEATHER_TRANSITIONS,DISASTER_ARCS} from '../src/weatherScenarioV920.js';
import {forecastPresentation} from '../src/disasterForecastV800.js';
import {premiumDisasterBudget} from '../src/premiumDisasterVfxV810.js';

const read=file=>fs.readFileSync(new URL('../'+file,import.meta.url),'utf8');

test('v9.2 simulation, clock and sandstorm shaders are JavaScript syntax valid',()=>{
 for(const file of ['src/weatherScenarioV920.js','src/simulation.js','src/gameClock.js','src/premiumDisasterVfxV810.js','src/main.js']){
  const r=spawnSync(process.execPath,['--check',file],{encoding:'utf8'});
  assert.equal(r.status,0,file+': '+r.stderr);
 }
});

test('a regular in-game day is exactly ten active real minutes, regardless of Seoul wall-clock midnight',()=>{
 assert.equal(GAME_DAY_REAL_MS,600000);
 assert.equal(GAME_CLOCK_RATE,144);
 const begin=Date.UTC(2026,10,5,12,59),clock=new GameClock(begin);
 for(let i=1;i<=600;i++)clock.tick(begin+i*1000,true);
 assert.equal(clock.virtualNow-begin,DAY_MS);
});

test('offline time cannot kill the survivor or silently fast-forward the ten-minute day',()=>{
 const begin=Date.UTC(2026,10,5,12),clock=new GameClock(begin);
 for(let i=1;i<=30;i++)clock.tick(begin+i*1000,true);
 const snapshot=clock.virtualNow,real=begin+30000;
 const offset=clock.offset(real),restored=new GameClock(real+24*3600000,offset,real);
 assert.equal(restored.virtualNow,snapshot);
 restored.tick(real+25*3600000,false);
 assert.equal(restored.virtualNow,snapshot);
});

test('every seven scheduled disasters contain all seven different types exactly once',()=>{
 for(const seed of [1,47283,73642,999999]){
  for(let start=1;start<=70;start+=7){
   const types=Array.from({length:7},(_,i)=>majorDisasterTypeFor(seed,start+i));
   assert.equal(new Set(types).size,7,seed+': '+start);
   assert.deepEqual(types.slice().sort(),MAJOR_DISASTERS.slice().sort());
  }
 }
});

test('first-week story follows one coherent weather catastrophe arc',()=>{
 assert.deepEqual(Array.from({length:7},(_,i)=>majorDisasterTypeFor(47283,i+1)),
  ['rain','storm','tornado','cold','heat','dust','wildfire']);
 assert.equal(DISASTER_ARCS.length,3);
});

test('weather transitions cannot jump directly between snow/cold and rainfall or heat',()=>{
 for(const current of ['cold','rain','storm','heat']){
  const options=WEATHER_TRANSITIONS[current];
  assert.ok(options.length);
  if(current==='cold'){assert.ok(!options.includes('rain')&&!options.includes('storm')&&!options.includes('heat'));}
  if(current==='heat'){assert.ok(!options.includes('cold')&&!options.includes('rain'));}
 }
 for(let i=0;i<100;i++){
  assert.notEqual(chooseScenarioWeather('cold',null,20,i/100),'rain');
  assert.notEqual(chooseScenarioWeather('cold',null,20,i/100),'storm');
 }
});

test('weather preludes give warnings with a credible buildup before impact',()=>{
 assert.equal(preludeWeather('rain',5),'cloud');
 assert.equal(preludeWeather('storm',5),'cloud');
 assert.equal(preludeWeather('storm',1),'rain');
 assert.equal(preludeWeather('tornado',1),'storm');
 assert.equal(preludeWeather('cold',2),'cloud');
 assert.equal(preludeWeather('wildfire',4),'heat');
 assert.equal(preludeWeather('dust',2),'heat');
 assert.equal(preludeWeather('dust',7),null);
});

test('weather persists hours rather than shuffling every 15–32 game minutes',()=>{
 for(const type of Object.keys(WEATHER_TRANSITIONS)){
  const low=weatherDurationMs(type,0),high=weatherDurationMs(type,.999);
  assert.ok(low>=39*60000,type);
  assert.ok(high<=6*3600000,type);
  assert.ok(high>=low,type);
 }
 const now=1_800_000_000_000,state=defaults(now);
 state.nextWeatherAt=now+60000;
 state.majorDisasterAt=now+DAY_MS;state.pendingWeather='cloud';
 advance(state,now+60000,false);
 const duration=state.nextWeatherAt-state.weatherSinceAt;
 assert.ok(duration>=60*60000);
});

test('a scheduled disaster takes precedence over normal transitions and resets the forecast',()=>{
 const now=1_800_000_000_000,state=defaults(now);
 state.majorDisasterType='dust';
 state.majorDisasterAt=now+60000;
 state.nextWeatherAt=now+99*60000;
 advance(state,now+60000,false);
 assert.equal(state.weather,'dust');
 assert.equal(state.majorDisasterAppliedSerial,1);
 assert.equal(state.majorDisasterSerial,2);
 assert.equal(state.majorDisasterAt,now+60000+DAY_MS);
 assert.equal(state.weatherSinceAt,now+60000);
});

test('ten-minute day keeps warning icon travelling along real game time',()=>{
 const start=1_800_000_000_000,clock=new GameClock(start),at=start+DAY_MS;
 const initial=forecastPresentation({weather:'clear',majorDisasterType:'dust',majorDisasterAt:at},clock.virtualNow);
 for(let i=1;i<=150;i++)clock.tick(start+i*1000,true);
 const later=forecastPresentation({weather:'clear',majorDisasterType:'dust',majorDisasterAt:at},clock.virtualNow);
 assert.ok(initial.visible&&later.visible);
 assert.equal(later.activeLeadHours,18);
 assert.ok(later.x<initial.x);
});

test('sandstorm draws explicit moving haboob fronts and low-altitude shear instead of opacity-only fog',()=>{
 const src=read('src/premiumDisasterVfxV810.js'),director=read('src/weatherDirector.js');
 const mobile=premiumDisasterBudget(true),desktop=premiumDisasterBudget(false);
 assert.equal(mobile.sandFronts,2);
 assert.ok(mobile.sandGrit<desktop.sandGrit);
 for(const needle of ['rolling haboob sand wall','sandstorm ground-shear grit','makeSandstormFronts','makeWindborneSand','depthTest:true','uWind','this.sandWalls','this.sandGrit'])assert.ok(src.includes(needle),needle);
 assert.match(director,/mist:\.43/);
 assert.doesNotMatch(src,/canvas|getContext|document\.createElement/);
});

test('legacy survivor, permanent ruins and disaster progress survive clock schema update',()=>{
 const start=1_800_000_000_000;
 const raw=defaults(start);raw.clockSchema=2;raw.tornadoDamagedIds=['ruin-3'];raw.supply.parts=7;
 const restored=sanitize(JSON.parse(JSON.stringify(raw)),start+60_000);
 assert.equal(restored.clockSchema,3);
 assert.deepEqual(restored.tornadoDamagedIds,['ruin-3']);
 assert.equal(restored.supply.parts,7);
});
