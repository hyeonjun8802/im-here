import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {defaults,sanitize,applyAction} from '../src/simulation.js';
import {offerDailyScavenge,scavengeOdds,QUEST_DECISIONS,SCAVENGE_CHANCE} from '../src/scavengeDirector.js';
import {offerCompanionRescue,COMPANION_DECISIONS,COMPANION_EXCHANGE_ODDS} from '../src/supportCompanion.js';
const now=Date.UTC(2026,10,7);
const expedition=(seed=37,weather='clear')=>{
 const s=defaults(now);s.scavenge.seed=seed;s.weather=weather;
 assert.ok(offerDailyScavenge(s,1));return s;
};
const rescue=(seed=37,id=9)=>{
 const s=defaults(now);s.kit.radio=true;s.scavenge.seed=seed;s.scavenge.radioNewsId=id;
 assert.ok(offerCompanionRescue(s,2));return s;
};
test('four distinct expedition choices and three weather-adjusted risk tables',()=>{
 assert.deepEqual(QUEST_DECISIONS,['go','scout','salvage','stay']);
 assert.deepEqual(SCAVENGE_CHANCE,{day1:1,early:.72,mid:.60,late:.49});
 for(const decision of ['go','scout','salvage']){
  for(const w of ['clear','rain','storm','tornado','wildfire']){
   const p=scavengeOdds(decision,w);
   assert.ok(Math.abs(Object.values(p).reduce((sum,n)=>sum+n,0)-1)<1e-10,decision+w);
   assert.ok(Object.values(p).every(n=>n>=0&&n<=1),decision+w);
  }
 }
 assert.equal(scavengeOdds('go','clear').item,.48);
 assert.equal(scavengeOdds('go','storm').item,.36);
 assert.equal(scavengeOdds('scout','clear').item,.27);
 assert.equal(scavengeOdds('salvage','clear').supplies,.65);
});
test('the four expedition outcomes are final, persistent and do not grant free rerolls',()=>{
 const decisions=['go','scout','salvage','stay'];
 for(const decision of decisions){
  const s=expedition(97);
  const original=structuredClone(s);
  const result=applyAction(s,'scavenge_'+decision,now);
  assert.equal(result.good,true,decision);
  assert.equal(s.scavenge.pending,null);
  assert.equal(s.scavenge.lastResolvedDay,1);
  assert.equal(applyAction(s,'scavenge_'+decision,now).good,false);
  const copy=sanitize(structuredClone(s),now+100);
  assert.equal(copy.scavenge.pending,null);
  assert.equal(applyAction(copy,'scavenge_'+decision,now+200).good,false);
  if(decision==='stay'){
   assert.equal(result.outcome,'safe');
   assert.deepEqual(s.supply,original.supply);
  }
  if(decision==='scout')assert.equal(s.supply.water<=original.supply.water,true);
  if(decision==='salvage')assert.equal(result.item,null);
 }
});
test('unaffordable scout must not erase required quest',()=>{
 const s=expedition();s.supply.water=0;const id=s.scavenge.pending.id;
 const result=applyAction(s,'scavenge_scout',now);
 assert.equal(result.good,false);assert.equal(s.scavenge.pending.id,id);
 assert.equal(applyAction(s,'scavenge_stay',now).good,true);
});
test('all four companion answers are one shot, resource gated and saved',()=>{
 assert.deepEqual(COMPANION_DECISIONS,['invite','aid','trade','decline']);
 assert.deepEqual(COMPANION_EXCHANGE_ODDS,{aidParts:.45,tradeParts:.55,tradeMedicine:.20,tradeNothing:.25});
 for(const choice of COMPANION_DECISIONS){
  const s=rescue(197);
  const before=structuredClone(s.supply);
  const r=applyAction(s,'companion_'+choice,now);
  assert.equal(r.good,true,choice);
  assert.equal(s.companion.pending,null);
  assert.equal(applyAction(s,'companion_'+choice,now).good,false,choice);
  const restored=sanitize(structuredClone(s),now+100);
  assert.equal(restored.companion.pending,null);
  if(choice==='invite'){assert.equal(s.companion.present,true);assert.equal(s.supply.food,before.food)}
  if(choice==='aid')assert.equal(s.supply.water,before.water-1);
  if(choice==='trade')assert.equal(s.supply.food,before.food-1);
  if(choice==='decline')assert.deepEqual(s.supply,before);
 }
});
test('unaﬀordable aid and trade retain a recoverable, dismissible choice',()=>{
 for(const choice of ['aid','trade','invite']){
  const s=rescue();s.supply.food=0;s.supply.water=0;
  const pending=structuredClone(s.companion.pending);
  assert.equal(applyAction(s,'companion_'+choice,now).good,false);
  assert.deepEqual(s.companion.pending,pending);
  assert.equal(applyAction(s,'companion_decline',now).good,true);
 }
});
test('mandatory prompt has four options, dialog backdrop, no timeout, and reload recovery',()=>{
 const src=readFileSync(new URL('../src/eventBoard.js',import.meta.url),'utf8');
 const css=readFileSync(new URL('../src/eventBoard.css',import.meta.url),'utf8');
 const main=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
 for(const x of QUEST_DECISIONS)assert.match(src,new RegExp('afterday-board-expedition-'+x));
 for(const x of COMPANION_DECISIONS)assert.match(src,new RegExp('afterday-board-companion-'+x));
 assert.match(src,/choiceLocked=mandatory/);
 assert.match(src,/requiresChoice\(\)/);
 assert.match(src,/if\(!mandatory\)this\.timer=setTimeout/);
 assert.match(src,/if\(this\.choiceLocked&&!force\)return false/);
 assert.match(src,/openPendingExpedition\(state\)/);
 assert.match(src,/openPendingCompanion\(state\)/);
 assert.match(css,/\.afterday-quest-backdrop/);
 assert.match(main,/gameClock\.tick\(real,foreground&&!questPaused\)/);
 assert.match(main,/onExpeditionChoice:choice=>runSurvivalAction\('scavenge_'\+choice\)/);
});
