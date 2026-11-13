import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {defaults,sanitize,applyAction,applyDisasterStructureDamage,emergencyExploreAvailability,DAY_MS} from '../src/simulation.js';
import {offerDailyScavenge} from '../src/scavengeDirector.js';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const start=Date.UTC(2026,10,13);

test('emergency supplies are offered only during actual shortage, without false badges',()=>{
 const s=defaults(start);
 assert.equal(emergencyExploreAvailability(s,start).ready,false);
 s.supply.water=1;
 let status=emergencyExploreAvailability(s,start);
 assert.equal(status.ready,true);
 assert.match(status.reason,/긴급 보급 가능/);
 assert.equal(applyAction(s,'explore',start).good,true);
 status=emergencyExploreAvailability(s,start+3600000);
 assert.equal(status.ready,false);
 assert.match(status.reason,/19시간/);
 assert.equal(applyAction(s,'explore',start+3600000).good,false);
 s.supply.water=1; // Still short on supplies after the cooldown.
 status=emergencyExploreAvailability(s,start+20*3600000);
 assert.equal(status.ready,true);
});
test('weather blocks unsafe emergency run, but normal pending expedition remains intact',()=>{
 const s=defaults(start);
 s.weather='tornado';s.supply.food=0;
 const offer=offerDailyScavenge(s,1);
 assert.ok(offer);
 assert.equal(emergencyExploreAvailability(s,start).ready,false);
 assert.match(emergencyExploreAvailability(s,start).reason,/재난/);
 assert.equal(applyAction(s,'explore',start).good,false);
 assert.equal(s.scavenge.pending.id,offer.id);
 assert.equal(applyAction(s,'scavenge_stay',start).good,true);
 assert.equal(s.scavenge.pending,null);
});
test('alert choice is dismissible but no implicit item grant or opportunity removal',()=>{
 const script=read('src/eventBoard.js'),main=read('src/main.js'),style=read('src/eventBoard.css');
 assert.match(script,/deferChoice\(\)\{/);
 assert.match(script,/return this\.dismiss\(true\)/);
 assert.match(script,/close\.hidden=false/);
 assert.match(script,/나중에 선택/);
 assert.doesNotMatch(script,/shown=this\.openPendingExpedition\(state\)\|\|shown/);
 assert.doesNotMatch(script,/shown=this\.openPendingCompanion\(state\)\|\|shown/);
 assert.match(style,/\.afterday-board\.is-choice \.afterday-board-close\{\s*display:grid!important/);
 assert.match(main,/supplyButton\.disabled=dead\|\|\(!open&&!emergency\.ready\)/);
 assert.match(main,/supplyButton\.dataset\.supplyKind=open\?/);
 assert.match(main,/supplyButton\.dataset\.supplyReady=String\(supplyAvailable\)/);
});

test('disaster-destroyed equipment stays a recoverable expedition objective after deferral',()=>{
 const s=defaults(start);
 s.weather='wildfire';s.weatherEpisode=3;s.kit.seeds=true;
 s.facilities.storage=64;
 const hit=applyDisasterStructureDamage(s,'wildfire',4);
 assert.equal(hit.lostItem,'seeds');
 assert.equal(s.kit.seeds,false);
 assert.equal(s.scavenge.recoveryTarget,'seeds');
 assert.equal(s.scavenge.pending.target,'seeds');
 // The player can stay safe today, without losing all future chances.
 assert.equal(applyAction(s,'scavenge_stay',start+3*DAY_MS).good,true);
 assert.equal(s.scavenge.pending,null);
 for(const day of [5,6,7]){
  const restored=sanitize(JSON.parse(JSON.stringify(s)),start+(day-1)*DAY_MS);
  assert.equal(restored.scavenge.recoveryTarget,'seeds');
  const pending=offerDailyScavenge(s,day);
  assert.ok(pending,'next-day recovery offer must not be randomized away');
  assert.equal(pending.target,'seeds');
  assert.equal(s.kit.seeds,false,'a new offer does not grant equipment');
  assert.equal(offerDailyScavenge(s,day),null,'same day cannot be farmed');
  assert.equal(applyAction(s,'scavenge_stay',start+(day-1)*DAY_MS).good,true);
 }
 s.kit.seeds=true;
 offerDailyScavenge(s,8);
 assert.equal(s.scavenge.recoveryTarget,null,'already restored gear never blocks normal daily discovery');
});
test('a postponed expedition persists for manual reopening instead of showing on every HUD tick',async()=>{
 globalThis.document={baseURI:'http://localhost/'};
 const {AfterdayEventBoard}=await import('../src/eventBoard.js');
 const s=defaults(start);
 const offer=offerDailyScavenge(s,1);
 s.noticeSeenIds=[offer.id];
 let autoOpenCount=0;
 const fake={
  lastLog:s.events.at(-1),lastLogSerial:s.eventSerial,
  lastWeather:s.weather,lastWeatherEpisode:s.weatherEpisode,
  lastTornadoEncounter:s.tornadoEncounter,lastRaider:false,lastLowFood:false,
  activeKey:null,choiceLocked:false,
  showOnce:()=>{autoOpenCount++;return false;},
  openPendingExpedition:()=>{throw Error('deferred offer must not reopen automatically');}
 };
 AfterdayEventBoard.prototype.sync.call(fake,s);
 AfterdayEventBoard.prototype.sync.call(fake,s);
 assert.equal(autoOpenCount,2);
 assert.equal(s.scavenge.pending.id,offer.id);
 const defer={dismiss:(force)=>force};
 assert.equal(AfterdayEventBoard.prototype.deferChoice.call(defer),true);
});
