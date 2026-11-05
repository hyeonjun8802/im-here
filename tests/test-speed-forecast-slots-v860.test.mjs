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

test('all four forecast checkpoints are visible and staged',()=>{
  const css=read('src/style.css');
  const src=read('src/disasterForecastV800.js');
  for(const slot of ['slot-6h','slot-12h','slot-18h','slot-24h'])assert.match(css,new RegExp(slot));
  assert.match(css,/slot-6h\.is-visible\{opacity:\.62\}/);
  assert.match(css,/slot-12h\.is-visible\{opacity:\.52\}/);
  assert.match(css,/slot-18h\.is-visible\{opacity:\.43\}/);
  assert.match(css,/slot-24h\.is-visible\{opacity:\.35\}/);
  assert.match(src,/const stages=\['eve','eve','far','far'\]/);
});

test('active checkpoint is emphasized without a duplicate free-moving future layer',()=>{
  const css=read('src/style.css');
  const html=read('index.html');
  assert.match(css,/\.disaster-forecast__trail-icon\.is-active/);
  assert.doesNotMatch(html,/class="disaster-forecast__future"/);
  assert.match(css,/--forecast-active-x/);
});
