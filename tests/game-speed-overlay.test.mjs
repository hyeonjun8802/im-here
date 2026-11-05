import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {GameClock,GAME_SPEEDS,GAME_CLOCK_RATE,GAME_DAY_REAL_MS,clampGameSpeed} from '../src/gameClock.js';
import {defaults,sanitize,advance,getDay,migrateLegacyGameDay,DAY_MS} from '../src/simulation.js';

test('speed control cycles 1× → 2× → 4× → 8× → 16× → 32× → 50× → 1×',()=>{
 const c=new GameClock(1000000);
 assert.deepEqual(GAME_SPEEDS,[1,2,4,8,16,32,50]);
 assert.equal(c.cycleSpeed(),2);
 assert.equal(c.cycleSpeed(),4);
 assert.equal(c.cycleSpeed(),8);
 assert.equal(c.cycleSpeed(),16);
 assert.equal(c.cycleSpeed(),32);
 assert.equal(c.cycleSpeed(),50);
 assert.equal(c.cycleSpeed(),1);
 assert.equal(clampGameSpeed(7),1);
});

test('4× foreground acceleration stacks on 144× base; inactive time pauses',()=>{
 const c=new GameClock(1000000);
 c.setSpeed(4);
 for(let i=1;i<=100;i++)c.tick(1000000+i*20,true);
 assert.equal(c.virtualNow,1000000+2000*GAME_CLOCK_RATE*4);
 c.tick(1000000+2000+60000,false);
 assert.equal(c.virtualNow,1000000+2000*GAME_CLOCK_RATE*4);
 c.tick(1000000+2000+60020,true);
 assert.equal(c.virtualNow,1000000+2020*GAME_CLOCK_RATE*4);
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
 state.gameClockSavedRealAtMs=start+60000;
 state.clockSchema=3;
 const save=JSON.parse(JSON.stringify(state));
 const reopenedClock=new GameClock(start+65000,save.gameClockOffsetMs,save.gameClockSavedRealAtMs);
 const reopened=sanitize(save,reopenedClock.virtualNow);
 assert.equal(reopened.tornadoDamageCount,2);
 assert.equal(reopened.startedAt,start);
 assert.equal(reopened.gameClockOffsetMs,60000*GAME_CLOCK_RATE*4-60000);
 assert.equal(reopenedClock.virtualNow,start+60000*GAME_CLOCK_RATE*4);
});

test('existing saves without offset start at normal 1× speed',()=>{
 const now=Date.UTC(2026,10,3,13,0,0);
 const old=defaults(now);delete old.gameClockOffsetMs;delete old.clockSchema;delete old.gameClockSavedRealAtMs;
 const restored=sanitize(old,now);
 const clock=new GameClock(now,restored.gameClockOffsetMs);
 assert.equal(clock.speed,1);
 assert.equal(restored.gameClockOffsetMs,0);
 assert.equal(restored.clockSchema,1);
});

test('speed control, canvas tap and single new scenario audio remain wired',()=>{
 const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
 const main=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
 const event=readFileSync(new URL('../src/eventBoard.js',import.meta.url),'utf8');
 const styles=readFileSync(new URL('../src/style.css',import.meta.url),'utf8');
 assert.match(html,/id="speed-toggle"/);
 assert.match(styles,/#speed-toggle/);
 assert.match(main,/gameClock\.cycleSpeed\(\)/);
 assert.match(main,/gameClock\.virtualNow/);
 assert.match(main,/world\.update\(Math\.min\(\.12,realDt\*gameClock\.speed\),gameNow,state,realDt\)/); // Survival VFX uses game speed, event cinematics real time
 assert.match(main,/canvas\.addEventListener\('pointerup'/);
 assert.match(main,/if\(distance>10\)return;/);
 assert.match(main,/eventBoard\?\.dismiss\(\)/);
 assert.match(main,/\$\('#life-panel'\)\.classList\.add\('hidden'\)/);
 assert.match(main,/\$\('#weather-panel'\)\.classList\.add\('hidden'\)/);
 assert.equal((event.match(/new Audio\(/g)||[]).length,1);
 assert.match(event,/dragon-studio-notification-sound-372474\.mp3/);
 assert.doesNotMatch(event,/metal_board_clang|playSound\(|toggleMute\(|afterday-board-sound/);
 assert.equal(existsSync(new URL('../src/metalClangAudio.js',import.meta.url)),false);
});

test('ten minutes of active 1x play equals one complete game day',()=>{
 const start=Date.UTC(2026,10,4,12),clock=new GameClock(start);
 assert.equal(GAME_CLOCK_RATE,144);
 assert.equal(GAME_DAY_REAL_MS,10*60000);
 for(let i=1;i<=600;i++)clock.tick(start+i*1000,true);
 assert.equal(getDay(start,clock.virtualNow),2);
 assert.equal(clock.virtualNow-start,DAY_MS);
 for(let i=601;i<=1200;i++)clock.tick(start+i*1000,true);
 assert.equal(getDay(start,clock.virtualNow),3);
});

test('1× through 50× speed buttons multiply the ten-minute day in foreground',()=>{
 for(const speed of [1,2,4,8,16,32,50]){
   const clock=new GameClock(1000000);
   clock.setSpeed(speed);
   for(let i=1;i<=100;i++)clock.tick(1000000+i*100,true);
   assert.equal(clock.virtualNow,1000000+10000*GAME_CLOCK_RATE*speed);
 }
});

test('reopening after hours away resumes at exactly the saved virtual time',()=>{
 const t=Date.UTC(2026,10,4,12),c=new GameClock(t);
 for(let i=1;i<=60;i++)c.tick(t+i*1000,true);
 const savedAt=t+60000,offset=c.offset(savedAt);
 const reopened=new GameClock(t+4*3600000,offset,savedAt);
 assert.equal(reopened.virtualNow,c.virtualNow);
 assert.equal(getDay(t,reopened.virtualNow),1);
 assert.ok(offset>0);
});

test('legacy KST day migration preserves displayed DAY, ruins and supplies',()=>{
 const start=Date.UTC(2026,10,2,13),now=Date.UTC(2026,10,4,15,30);
 const old=defaults(start);
 delete old.clockSchema;
 old.tornadoDamagedIds=['tower-1'];
 old.supply.food=3;
 const restored=sanitize(JSON.parse(JSON.stringify(old)),now);
 const kst=9*3600000;
 const legacyDay=1+Math.floor((now+kst)/DAY_MS)-Math.floor((start+kst)/DAY_MS);
 assert.equal(restored.clockSchema,1);
 assert.equal(migrateLegacyGameDay(restored,now),true);
 assert.equal(getDay(restored.startedAt,now),legacyDay);
 assert.equal(restored.supply.food,3);
 assert.deepEqual(restored.tornadoDamagedIds,['tower-1']);
 assert.equal(migrateLegacyGameDay(restored,now),false,'migration must be idempotent');
 assert.equal(getDay(restored.startedAt,now+23.5*3600000),legacyDay+1);
});
