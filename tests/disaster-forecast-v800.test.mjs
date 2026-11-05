import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {spawnSync} from 'node:child_process';
import {defaults,advance,DAY_MS,MAJOR_DISASTER_LEAD_MS} from '../src/simulation.js';
import {forecastPresentation} from '../src/disasterForecastV800.js';

const root=new URL('../',import.meta.url);
const read=p=>fs.readFileSync(new URL(p,root),'utf8');

test('v8.0 disaster forecast module and simulation are syntax-valid',()=>{
  for(const file of ['src/disasterForecastV800.js','src/simulation.js','src/main.js']){
    const r=spawnSync(process.execPath,['--check',file],{encoding:'utf8'});
    assert.equal(r.status,0,r.stderr||r.stdout);
  }
});

test('seven-day disaster marker glides from far right to eve socket without bouncing',()=>{
  const now=1_800_000_000_000;
  const far=forecastPresentation({weather:'clear',majorDisasterType:'tornado',majorDisasterAt:now+7*DAY_MS},now);
  const mid=forecastPresentation({weather:'clear',majorDisasterType:'tornado',majorDisasterAt:now+4*DAY_MS},now);
  const eve=forecastPresentation({weather:'clear',majorDisasterType:'tornado',majorDisasterAt:now+DAY_MS},now);
  assert.equal(far.stage,'far');
  assert.equal(eve.stage,'eve');
  assert.ok(far.x>mid.x&&mid.x>eve.x);
  assert.ok(Math.abs(far.x-88.4)<.01);
  assert.ok(eve.x<54&&eve.x>50.2,'eve icon should be immediately beside the current-disaster socket');
  assert.ok(far.scale<mid.scale&&mid.scale<eve.scale);
});

test('active severe weather occupies the central current-disaster medallion',()=>{
  const now=1_800_000_000_000;
  for(const weather of ['rain','storm','tornado','heat','cold','dust','wildfire']){
    const p=forecastPresentation({weather,majorDisasterType:'rain',majorDisasterAt:now+MAJOR_DISASTER_LEAD_MS},now);
    assert.equal(p.currentType,weather);
  }
  assert.equal(forecastPresentation({weather:'clear',majorDisasterType:'storm',majorDisasterAt:now+DAY_MS},now).currentType,null);
});

test('scheduled major disaster enters the existing authoritative weather path',()=>{
  const now=1_800_000_000_000;
  const s=defaults(now);
  const serial=s.majorDisasterSerial;
  s.majorDisasterType='storm';
  s.majorDisasterAt=now+60_000;
  s.nextWeatherAt=now+60*60_000;
  s.pendingWeather='clear';
  advance(s,now+60_000,false);
  assert.equal(s.weather,'storm');
  assert.equal(s.majorDisasterAppliedSerial,serial);
  assert.equal(s.majorDisasterSerial,serial+1);
  assert.equal(s.majorDisasterAt,now+60_000+MAJOR_DISASTER_LEAD_MS);
  assert.ok(['rain','storm','tornado','heat','cold','dust','wildfire'].includes(s.majorDisasterType));
});

test('premium frame and every three-stage forecast resource are present',()=>{
  const frame=read('public/assets/ui/disaster_forecast_frame.svg');
  const html=read('index.html');
  assert.match(frame,/AFTERDAY disaster forecast frame/);
  assert.match(html,/disaster_forecast_frame\.svg/);
  assert.match(html,/<img class="disaster-forecast__icon-layer/);
  assert.doesNotMatch(html,/<use>/);
  for(const type of ['storm','rain','cold','heat','tornado','dust','wildfire']){
    for(const stage of ['far','eve','current']){
      const icon=read(`public/assets/ui/disasters/${type}-${stage}.svg`);
      assert.match(icon,/viewBox="0 0 120 120"/);
    }
  }
});

test('forecast motion is restrained and respects reduced-motion preferences',()=>{
  const css=read('src/style.css');
  const start=css.indexOf('AFTERDAY v8.2');
  const block=css.slice(start);
  assert.ok(start>=0);
  assert.match(block,/cubic-bezier\(\.22,\.61,\.36,1\)/);
  assert.match(block,/forecastEmberBreath 6\.8s/);
  assert.match(block,/prefers-reduced-motion:reduce/);
  assert.doesNotMatch(block,/spring|elastic/i);
  assert.match(block,/width:min\(390px,30vw\)/);
});


test('v8.2 forecast icon keeps approaching during the final day',()=>{
  const now=1_800_000_000_000;
  const day=forecastPresentation({weather:'clear',majorDisasterType:'wildfire',majorDisasterAt:now+DAY_MS},now);
  const sixHours=forecastPresentation({weather:'clear',majorDisasterType:'wildfire',majorDisasterAt:now+DAY_MS/4},now);
  const nearImpact=forecastPresentation({weather:'clear',majorDisasterType:'wildfire',majorDisasterAt:now+DAY_MS/24},now);
  assert.equal(day.stage,'eve');assert.equal(sixHours.stage,'eve');assert.equal(nearImpact.stage,'eve');
  assert.ok(day.x>sixHours.x&&sixHours.x>nearImpact.x);
  assert.ok(nearImpact.x<50.5);
  assert.ok(day.scale<sixHours.scale&&sixHours.scale<nearImpact.scale);
});
