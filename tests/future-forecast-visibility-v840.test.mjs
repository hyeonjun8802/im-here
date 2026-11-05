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

test('seven-day forecast remains visibly sized and opaque at the far-right socket',()=>{
  const now=1_800_000_000_000;
  const far=forecastPresentation({weather:'clear',majorDisasterType:'rain',majorDisasterAt:now+7*DAY_MS},now);
  const near=forecastPresentation({weather:'clear',majorDisasterType:'rain',majorDisasterAt:now+DAY_MS/24},now);
  assert.equal(far.futureType,'rain');
  assert.ok(far.scale>=.82);
  assert.ok(far.opacity>=.78);
  assert.ok(far.focus>=.28);
  assert.ok(near.scale>far.scale);
  assert.ok(near.opacity>=far.opacity);
  assert.ok(near.x<far.x);
});

test('future forecast layer is explicitly above the decorative frame',()=>{
  const css=read('src/style.css');
  assert.match(css,/\.disaster-forecast__frame\{[\s\S]*?z-index:1/);
  assert.match(css,/\.disaster-forecast__future\{[\s\S]*?z-index:8/);
  assert.match(css,/\.disaster-forecast__future\{[\s\S]*?width:12\.9%/);
  assert.match(css,/brightness\(calc\(\.96 \+ var\(--forecast-focus\)\*\.18\)\)/);
});

test('three right-side forecast sockets receive non-interactive disaster trail medallions',()=>{
  const html=read('index.html');
  const src=read('src/disasterForecastV800.js');
  const css=read('src/style.css');
  assert.match(html,/disaster-forecast__forecast-trail/);
  assert.match(html,/trail-near/);
  assert.match(html,/trail-mid/);
  assert.match(html,/trail-far/);
  assert.match(src,/querySelectorAll\('\.disaster-forecast__trail-icon'\)/);
  assert.match(src,/iconSrc\(trailKey,index===0\?'eve':'far'\)/);
  assert.match(css,/trail-near\{left:60%/);
  assert.match(css,/trail-mid\{left:75\.08%/);
  assert.match(css,/trail-far\{left:88\.42%/);
});

test('forecast visibility patch remains HUD-only and does not alter simulation state',()=>{
  const src=read('src/disasterForecastV800.js');
  assert.doesNotMatch(src,/localStorage|SAVE_KEY|health\s*=|water\s*=|food\s*=|facilities\s*=/);
});
