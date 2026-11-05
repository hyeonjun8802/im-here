import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {spawnSync} from 'node:child_process';
import {defaults,advance,DAY_MS,MAJOR_DISASTER_LEAD_MS} from '../src/simulation.js';
import {forecastPresentation,FORECAST_CHECKPOINT_HOURS} from '../src/disasterForecastV800.js';

const root=new URL('../',import.meta.url);
const read=p=>fs.readFileSync(new URL(p,root),'utf8');

test('v8.0 disaster forecast module and simulation are syntax-valid',()=>{
  for(const file of ['src/disasterForecastV800.js','src/simulation.js','src/main.js']){
    const r=spawnSync(process.execPath,['--check',file],{encoding:'utf8'});
    assert.equal(r.status,0,r.stderr||r.stdout);
  }
});

test('forecast checkpoints are exactly current <- 6h <- 12h <- 18h <- 24h',()=>{
  const now=1_800_000_000_000;
  assert.deepEqual(FORECAST_CHECKPOINT_HOURS,[6,12,18,24]);
  const at=h=>forecastPresentation({weather:'clear',majorDisasterType:'tornado',majorDisasterAt:now+h*3600000},now);
  assert.equal(at(30).activeLeadHours,24);
  assert.equal(at(24).activeLeadHours,24);
  assert.equal(at(18).activeLeadHours,18);
  assert.equal(at(12).activeLeadHours,12);
  assert.equal(at(6).activeLeadHours,6);
  assert.equal(at(0).activeLeadHours,0);
  assert.ok(at(6).activeX<at(12).activeX);
  assert.ok(at(12).activeX<at(18).activeX);
  assert.ok(at(18).activeX<at(24).activeX);
});

test('active severe weather occupies the central current-disaster medallion',()=>{
  const now=1_800_000_000_000;
  for(const weather of ['rain','storm','tornado','heat','cold','dust','wildfire']){
    const p=forecastPresentation({weather,majorDisasterType:'rain',majorDisasterAt:now+MAJOR_DISASTER_LEAD_MS},now);
    assert.equal(p.currentType,weather);
  }
  assert.equal(forecastPresentation({weather:'clear',majorDisasterType:'storm',majorDisasterAt:now+DAY_MS},now).currentType,'clear');
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
  const clear=read('public/assets/ui/disasters/clear-current.svg');
  assert.match(clear,/clear weather/);
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


test('final 24 hours step left at six-hour boundaries',()=>{
  const now=1_800_000_000_000;
  const lead=h=>forecastPresentation({weather:'clear',majorDisasterType:'wildfire',majorDisasterAt:now+h*3600000},now);
  assert.equal(lead(23.9).activeLeadHours,24);
  assert.equal(lead(17.9).activeLeadHours,18);
  assert.equal(lead(11.9).activeLeadHours,12);
  assert.equal(lead(5.9).activeLeadHours,6);
  assert.equal(lead(.01).activeLeadHours,6);
});


test('clear default is present but deliberately lower emphasis than disasters',()=>{
  const css=read('src/style.css');
  const src=read('src/disasterForecastV800.js');
  assert.match(src,/clear:'clear'/);
  assert.match(src,/\(type==='clear'\|\|type==='cloud'\)\?\['current'\]/);
  assert.match(css,/data-current-disaster="clear"/);
  assert.match(css,/opacity:\.62/);
  assert.match(css,/animation:none!important/);
});
