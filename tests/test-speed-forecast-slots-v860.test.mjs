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

test('both middle forecast sockets are intentionally visible, not ghosted blank',()=>{
  const css=read('src/style.css');
  const src=read('src/disasterForecastV800.js');
  assert.match(css,/trail-near\{[\s\S]*?opacity:calc\(\.48 \+ var\(--forecast-approach\)\*\.14\)/);
  assert.match(css,/trail-mid\{[\s\S]*?opacity:\.44/);
  assert.match(css,/trail-far\{[\s\S]*?opacity:calc\(\.34 - var\(--forecast-approach\)\*\.10\)/);
  assert.match(src,/const stages=\['eve','far','far'\]/);
});

test('moving forecast remains stronger than the guide sockets',()=>{
  const css=read('src/style.css');
  assert.match(css,/\.disaster-forecast__future\{[\s\S]*?z-index:8/);
  assert.match(css,/\.disaster-forecast__forecast-trail\{[\s\S]*?z-index:3/);
});
