import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {GameClock,GAME_SPEEDS,clampGameSpeed} from '../src/gameClock.js';
import {defaults,sanitize,advance} from '../src/simulation.js';

test('speed control cycles 1× → 2× → 4× → 1×',()=>{
 const c=new GameClock(1000000);
 assert.deepEqual(GAME_SPEEDS,[1,2,4]);
 assert.equal(c.cycleSpeed(),2);
 assert.equal(c.cycleSpeed(),4);
 assert.equal(c.cycleSpeed(),1);
 assert.equal(clampGameSpeed(7),1);
});

test('game time advances at 4× in active frames, but background time stays 1×',()=>{
 const c=new GameClock(1000000);
 c.setSpeed(4);
 for(let i=1;i<=100;i++)c.tick(1000000+i*20,true);
 assert.equal(c.virtualNow,1000000+8000);
 c.tick(1000000+2000+60000,false);
 assert.equal(c.virtualNow,1000000+8000+60000);
 c.tick(1000000+2000+60020,true);
 assert.equal(c.virtualNow,1000000+8000+60000+80);
});

test('speed offset persists across reload without resetting saved damage',()=>{
 const start=Date.UTC(2026,10,3,13,0,0);
 const c=new GameClock(start);
 c.setSpeed(4);
 for(let i=1;i<=3000;i++)c.tick(start+i*20);
 const state=defaults(start);
 const gameNow=c.virtualNow;
 advance(state,gameNow,true);
 state.tornadoDamageCount=2;state.tornadoCityDamaged=true;
 state.gameClockOffsetMs=c.offset(start+60000);
 const save=JSON.parse(JSON.stringify(state));
 const reopenedClock=new GameClock(start+65000,save.gameClockOffsetMs);
 const reopened=sanitize(save,reopenedClock.virtualNow);
 assert.equal(reopened.tornadoDamageCount,2);
 assert.equal(reopened.startedAt,start);
 assert.equal(reopened.gameClockOffsetMs,180000);
 assert.equal(reopenedClock.virtualNow,start+65000+180000);
});

test('existing saves without offset start at normal 1× speed',()=>{
 const now=Date.UTC(2026,10,3,13,0,0);
 const old=defaults(now);delete old.gameClockOffsetMs;
 const restored=sanitize(old,now);
 const clock=new GameClock(now,restored.gameClockOffsetMs);
 assert.equal(clock.speed,1);
 assert.equal(restored.gameClockOffsetMs,0);
});

test('speed button and canvas-tap close are wired; alert audio is absent',()=>{
 const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
 const main=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
 const event=readFileSync(new URL('../src/eventBoard.js',import.meta.url),'utf8');
 const styles=readFileSync(new URL('../src/style.css',import.meta.url),'utf8');
 assert.match(html,/id="speed-toggle"/);
 assert.match(styles,/#speed-toggle/);
 assert.match(main,/gameClock\.cycleSpeed\(\)/);
 assert.match(main,/gameClock\.virtualNow/);
 assert.match(main,/world\.update\(Math\.min\(\.12,realDt\*gameClock\.speed\),gameNow,state\)/);
 assert.match(main,/canvas\.addEventListener\('pointerup'/);
 assert.match(main,/if\(distance>10\)return;/);
 assert.match(main,/eventBoard\?\.dismiss\(\)/);
 assert.match(main,/\$\('#life-panel'\)\.classList\.add\('hidden'\)/);
 assert.match(main,/\$\('#weather-panel'\)\.classList\.add\('hidden'\)/);
 assert.doesNotMatch(event,/new Audio\(|playSound\(|toggleMute\(|afterday-board-sound/);
 assert.equal(existsSync(new URL('../src/metalClangAudio.js',import.meta.url)),false);
});
