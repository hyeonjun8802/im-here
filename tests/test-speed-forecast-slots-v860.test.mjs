import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {GameClock,GAME_CLOCK_RATE,GAME_SPEEDS} from '../src/gameClock.js';

const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');

test('v8.6 test speeds include 8x and 16x in the exact cycle',()=>{
  assert.deepEqual(GAME_SPEEDS,[1,2,4,8,16]);
  const c=new GameClock(1_000_000);
  assert.deepEqual([c.cycleSpeed(),c.cycleSpeed(),c.cycleSpeed(),c.cycleSpeed(),c.cycleSpeed()],[2,4,8,16,1]);
});

test('16x advances foreground game time at the expected test rate',()=>{
  const start=1_000_000,c=new GameClock(start);
  c.setSpeed(16);
  for(let i=1;i<=100;i++)c.tick(start+i*20,true);
  assert.equal(c.virtualNow,start+2000*GAME_CLOCK_RATE*16);
});

test('speed HUD advertises the 8x and 16x test intervals',()=>{
  const main=read('src/main.js');
  assert.match(main,/8× 30분/);
  assert.match(main,/16× 15분 \(테스트\)/);
});

test('forecast keeps four empty frame checkpoints but renders only one moving icon',()=>{
  const css=read('src/style.css');
  const html=read('index.html');
  const src=read('src/disasterForecastV800.js');
  assert.match(css,/\.disaster-forecast__future\{[\s\S]*?z-index:8/);
  assert.equal((html.match(/class="disaster-forecast__future"/g)||[]).length,1);
  assert.doesNotMatch(html,/disaster-forecast__trail-icon/);
  assert.match(src,/movingForecastX/);
  assert.match(src,/hoursLeft>0&&hoursLeft<=24/);
});

test('forecast icon grows and brightens toward current without duplicating itself',()=>{
  const src=read('src/disasterForecastV800.js');
  assert.match(src,/scale=\.88\+\.18\*proximity/);
  assert.match(src,/opacity=\.72\+\.28\*proximity/);
  assert.match(src,/stage=hoursLeft<=12\?'eve':'far'/);
});
