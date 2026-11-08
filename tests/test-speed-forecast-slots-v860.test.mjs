import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {GameClock,GAME_CLOCK_RATE,GAME_SPEEDS} from '../src/gameClock.js';
import {forecastPresentation} from './fixtures/disasterForecastV800.js';

const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');

test('v9.1 test speeds include 32x and 50x in the exact cycle',()=>{
  assert.deepEqual(GAME_SPEEDS,[1,2,4,8,16,32,50]);
  const c=new GameClock(1_000_000);
  assert.deepEqual([c.cycleSpeed(),c.cycleSpeed(),c.cycleSpeed(),c.cycleSpeed(),c.cycleSpeed(),c.cycleSpeed(),c.cycleSpeed()],[2,4,8,16,32,50,1]);
});

test('50x advances foreground game time at the expected test rate',()=>{
  const start=1_000_000,c=new GameClock(start);
  c.setSpeed(50);
  for(let i=1;i<=100;i++)c.tick(start+i*20,true);
  assert.equal(c.virtualNow,start+2000*GAME_CLOCK_RATE*50);
});

test('speed HUD advertises the 32x and 50x test intervals',()=>{
  const main=read('src/main.js');
  assert.match(main,/32× 18\.75초/);
  assert.match(main,/50× 12초 \(테스트\)/);
});

test('forecast keeps four empty frame checkpoints but renders only one moving icon',()=>{
  const css=read('src/style.css');
  const html=read('index.html');
  const src=read('tests/fixtures/disasterForecastV800.js');
  assert.match(css,/\.disaster-forecast__future\{[\s\S]*?z-index:8/);
  assert.equal((html.match(/class="disaster-forecast__future"/g)||[]).length,1);
  assert.doesNotMatch(html,/disaster-forecast__trail-icon/);
  assert.match(src,/movingForecastX/);
  assert.match(src,/hoursLeft>0&&hoursLeft<=24/);
});

test('forecast icon stays the same size while traveling left toward the central dial',()=>{
  const src=read('tests/fixtures/disasterForecastV800.js');
  assert.match(src,/const scale=1;/);
  assert.match(src,/const opacity=1;/);
  assert.match(src,/this\.future\.set\(p\.futureType,'current',p\.visible\)/);
  assert.match(src,/movingForecastX/);
});


test('50x moves a 24h disaster forecast to the 18h checkpoint in three real seconds',()=>{
  const realStart=1_800_000_000_000;
  const clock=new GameClock(realStart);
  clock.setSpeed(50);
  const disasterAt=clock.virtualNow+24*60*60*1000;
  const initial=forecastPresentation({weather:'clear',majorDisasterType:'storm',majorDisasterAt:disasterAt},clock.virtualNow);
  assert.equal(initial.activeLeadHours,24);

  for(let i=1;i<=30;i++)clock.tick(realStart+i*100,true);
  const moved=forecastPresentation({weather:'clear',majorDisasterType:'storm',majorDisasterAt:disasterAt},clock.virtualNow);
  assert.equal(moved.activeLeadHours,18);
  assert.ok(moved.x<initial.x);
  assert.ok(Math.abs((disasterAt-clock.virtualNow)-18*60*60*1000)<1000);
});
