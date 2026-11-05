import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {spawnSync} from 'node:child_process';
import {currentWeatherProgress,forecastPresentation} from '../src/disasterForecastV800.js';

const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');

test('v8.3 weather progress code is syntax-valid',()=>{
  for(const file of ['src/disasterForecastV800.js','src/main.js']){
    const r=spawnSync(process.execPath,['--check',file],{encoding:'utf8'});
    assert.equal(r.status,0,r.stderr||r.stdout);
  }
});

test('current weather ring maps interval start/middle/end to 0/50/100 percent',()=>{
  const start=1_800_000_000_000,end=start+20*60_000;
  assert.equal(currentWeatherProgress({weatherSinceAt:start,nextWeatherAt:end},start),0);
  assert.equal(currentWeatherProgress({weatherSinceAt:start,nextWeatherAt:end},start+10*60_000),.5);
  assert.equal(currentWeatherProgress({weatherSinceAt:start,nextWeatherAt:end},end),1);
  assert.equal(currentWeatherProgress({weatherSinceAt:start,nextWeatherAt:end},end+999999),1);
  assert.equal(currentWeatherProgress({weatherSinceAt:end,nextWeatherAt:start},start),0);
});

test('cloudy weather has a quiet current medallion instead of an empty center',()=>{
  const now=1_800_000_000_000;
  const p=forecastPresentation({weather:'cloud',majorDisasterType:'storm',majorDisasterAt:now+1000},now);
  assert.equal(p.currentType,'cloud');
  assert.match(read('public/assets/ui/disasters/cloud-current.svg'),/cloudy weather/);
});

test('progress overlay is a real SVG arc with orange gradient glow and neutral baked frame',()=>{
  const html=read('index.html');
  const css=read('src/style.css');
  const frame=read('public/assets/ui/disaster_forecast_frame.svg');
  assert.match(html,/disaster-forecast__weather-progress/);
  assert.match(html,/forecastWeatherProgressGradient/);
  assert.match(html,/disaster-forecast__weather-halo/);
  assert.match(html,/disaster-forecast__weather-arc/);
  assert.match(css,/--weather-progress-offset/);
  assert.match(css,/stroke-dashoffset:var\(--weather-progress-offset\)/);
  assert.match(css,/forecastProgressPressure 2\.8s/);
  assert.match(frame,/M514 58A126 126 0 0 1 574 142/);
  assert.doesNotMatch(frame,/M514 58A126 126 0 0 1 574 142"[^>]*stroke="url\(#amber\)"/);
});

test('ring progress updates every frame while ordinary HUD stays throttled',()=>{
  const main=read('src/main.js');
  assert.match(main,/disasterForecast\.syncProgress\(state,gameNow\);/);
  assert.match(main,/if\(t-lastHUD>700\)\{renderHUD\(\);lastHUD=t\}/);
});

test('clear and cloud progress rings remain intentionally low-emphasis',()=>{
  const css=read('src/style.css');
  assert.match(css,/data-current-disaster="clear"/);
  assert.match(css,/data-current-disaster="cloud"/);
  assert.match(css,/data-weather-ring="quiet"/);
  assert.match(css,/opacity:\.28/);
});
