import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {spawnSync} from 'node:child_process';
import {defaults,advance,DAY_MS,MAJOR_DISASTER_LEAD_MS} from '../src/simulation.js';
import {disasterGapMsAfter} from '../src/weatherScenarioV920.js';
import {forecastPresentation,FORECAST_CHECKPOINT_HOURS} from '../src/disasterForecastV800.js';

const root=new URL('../',import.meta.url);
const read=p=>fs.readFileSync(new URL(p,root),'utf8');

test('v8.0 disaster forecast module and simulation are syntax-valid',()=>{
  for(const file of ['src/disasterForecastV800.js','src/simulation.js','src/main.js']){
    const r=spawnSync(process.execPath,['--check',file],{encoding:'utf8'});
    assert.equal(r.status,0,r.stderr||r.stdout);
  }
});

test('forecast uses one icon that approaches current through 24h 18h 12h 6h checkpoints',()=>{
  const now=1_800_000_000_000;
  assert.deepEqual(FORECAST_CHECKPOINT_HOURS,[6,12,18,24]);
  const at=h=>forecastPresentation({weather:'clear',majorDisasterType:'tornado',majorDisasterAt:now+h*3600000},now);
  assert.equal(at(30).visible,false);
  assert.equal(at(24).visible,true);
  assert.equal(at(24).activeLeadHours,24);
  assert.equal(at(18).activeLeadHours,18);
  assert.equal(at(12).activeLeadHours,12);
  assert.equal(at(6).activeLeadHours,6);
  assert.equal(at(0).visible,false);
  assert.ok(at(6).x<at(12).x);
  assert.ok(at(12).x<at(18).x);
  assert.ok(at(18).x<at(24).x);
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
  assert.equal(s.majorDisasterAt,now+60_000+disasterGapMsAfter(serial));
  assert.ok(['rain','storm','tornado','heat','cold','dust','wildfire'].includes(s.majorDisasterType));
});

test('premium frame and every three-stage forecast resource are present',()=>{
  const frame=read('public/assets/ui/forecast_hud_desktop_v980.svg');
  const html=read('index.html');
  assert.match(frame,/AFTERDAY desktop Frostpunk-inspired/);
  assert.match(html,/forecast_hud_desktop_v980\.svg/);
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


test('final 24 hours move continuously left and swap far/eve artwork by urgency',()=>{
  const now=1_800_000_000_000;
  const lead=h=>forecastPresentation({weather:'clear',majorDisasterType:'wildfire',majorDisasterAt:now+h*3600000},now);
  const h24=lead(24),h21=lead(21),h18=lead(18),h12=lead(12),h6=lead(6),h1=lead(1);
  assert.equal(h24.stage,'far');
  assert.equal(h18.stage,'far');
  assert.equal(h12.stage,'eve');
  assert.equal(h6.stage,'eve');
  assert.ok(h24.x>h21.x&&h21.x>h18.x);
  assert.ok(h18.x>h12.x&&h12.x>h6.x&&h6.x>h1.x);
  assert.equal(h24.scale,h6.scale);
  assert.equal(h24.opacity,h6.opacity);
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


test('v8.9 major-disaster lead is exactly 24 in-game hours',()=>{
  assert.equal(MAJOR_DISASTER_LEAD_MS,24*60*60*1000);
  const now=1_800_000_000_000;
  const state=defaults(now);
  assert.equal(state.majorDisasterAt-now,24*60*60*1000);
});

test('v8.9 forecast icon is visible immediately for a fresh game',()=>{
  const now=1_800_000_000_000;
  const state=defaults(now);
  const p=forecastPresentation(state,now);
  assert.equal(p.visible,true);
  assert.equal(p.activeLeadHours,24);
  assert.ok(Math.abs(p.x-90.40)<.05);
});
