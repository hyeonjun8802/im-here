import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {spawnSync} from 'node:child_process';
import {DAY_MS} from '../src/simulation.js';
import {forecastPresentation} from '../src/disasterForecastV800.js';

const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');

test('v8.4 forecast visibility code is syntax-valid',()=>{
  for(const file of ['src/disasterForecastV800.js','src/main.js']){
    const r=spawnSync(process.execPath,['--check',file],{encoding:'utf8'});
    assert.equal(r.status,0,r.stderr||r.stdout);
  }
});

test('24h and 6h forecast checkpoints map to outer and inner sockets',()=>{
  const now=1_800_000_000_000;
  const outer=forecastPresentation({weather:'clear',majorDisasterType:'rain',majorDisasterAt:now+24*3600000},now);
  const inner=forecastPresentation({weather:'clear',majorDisasterType:'rain',majorDisasterAt:now+6*3600000},now);
  assert.equal(outer.futureType,'rain');
  assert.equal(outer.activeLeadHours,24);
  assert.equal(inner.activeLeadHours,6);
  assert.ok(inner.activeX<outer.activeX);
});

test('four right-side forecast sockets are explicitly present above the decorative frame',()=>{
  const html=read('index.html');
  const css=read('src/style.css');
  const frame=read('public/assets/ui/disaster_forecast_frame.svg');
  for(const slot of ['slot-6h','slot-12h','slot-18h','slot-24h'])assert.match(html,new RegExp(slot));
  assert.match(css,/slot-6h\{left:57\.5%/);
  assert.match(css,/slot-12h\{left:69\.17%/);
  assert.match(css,/slot-18h\{left:79\.17%/);
  assert.match(css,/slot-24h\{left:88\.33%/);
  assert.match(css,/\.disaster-forecast__forecast-trail\{[\s\S]*?z-index:4/);
  assert.match(frame,/cx="690"/);assert.match(frame,/cx="830"/);assert.match(frame,/cx="950"/);assert.match(frame,/cx="1060"/);
});

test('forecast resources use eve art near current and far art for 18h/24h',()=>{
  const src=read('src/disasterForecastV800.js');
  assert.match(src,/const stages=\['eve','eve','far','far'\]/);
  assert.match(src,/const leadHours=\[6,12,18,24\]/);
  assert.match(src,/is-active/);
});

test('forecast visibility patch remains HUD-only and does not alter simulation state',()=>{
  const src=read('src/disasterForecastV800.js');
  assert.doesNotMatch(src,/localStorage|SAVE_KEY|health\s*=|water\s*=|food\s*=|facilities\s*=/);
});
