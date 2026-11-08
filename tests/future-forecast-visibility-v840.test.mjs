import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {spawnSync} from 'node:child_process';
import {DAY_MS} from '../src/simulation.js';
import {forecastPresentation} from './fixtures/disasterForecastV800.js';

const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');

test('v8.4 forecast visibility code is syntax-valid',()=>{
  for(const file of ['tests/fixtures/disasterForecastV800.js','src/main.js']){
    const r=spawnSync(process.execPath,['--check',file],{encoding:'utf8'});
    assert.equal(r.status,0,r.stderr||r.stdout);
  }
});

test('24h and 6h forecast checkpoints map one moving icon from outer to inner socket',()=>{
  const now=1_800_000_000_000;
  const outer=forecastPresentation({weather:'clear',majorDisasterType:'rain',majorDisasterAt:now+24*3600000},now);
  const inner=forecastPresentation({weather:'clear',majorDisasterType:'rain',majorDisasterAt:now+6*3600000},now);
  assert.equal(outer.futureType,'rain');
  assert.equal(outer.activeLeadHours,24);
  assert.equal(inner.activeLeadHours,6);
  assert.ok(inner.x<outer.x);
});

test('only one future emblem remains and no circular forecast sockets are rendered',()=>{
  const html=read('index.html');
  const css=read('src/style.css');
  const frame=read('public/assets/ui/forecast_hud_frame_v950.svg');
  assert.equal((html.match(/class="disaster-forecast__future"/g)||[]).length,1);
  assert.doesNotMatch(html,/slot-6h|slot-12h|slot-18h|slot-24h/);
  assert.match(css,/\.disaster-forecast__bar-fill/);
  assert.match(css,/\.disaster-forecast__future/);
  assert.match(frame,/Right forecast rail/);
  assert.match(frame,/rect x="994" y="170"/);
  assert.doesNotMatch(frame,/cx="690"|cx="830"|cx="950"|cx="1060"/);
});

test('single forecast resource crossfades from far to eve before entering current',()=>{
  const src=read('tests/fixtures/disasterForecastV800.js');
  assert.match(src,/const stage=hoursLeft<=12\?'eve':'far'/);
  assert.match(src,/this\.future\.set\(p\.futureType,'current',p\.visible\)/);
  assert.match(src,/movingForecastX/);
});

test('forecast visibility patch remains HUD-only and does not alter simulation state',()=>{
  const src=read('tests/fixtures/disasterForecastV800.js');
  assert.doesNotMatch(src,/localStorage|SAVE_KEY|health\s*=|water\s*=|food\s*=|facilities\s*=/);
});
