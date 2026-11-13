import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {defaults,applyAction,emergencyExploreAvailability} from '../src/simulation.js';
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
