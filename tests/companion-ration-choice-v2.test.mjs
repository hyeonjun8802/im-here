import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {defaults,sanitize,advance,applyAction,DAY_MS} from '../src/simulation.js';
import {
  sanitizeCompanion,offerCompanionRationChoice,resolveCompanionRationChoice,
  applyCompanionRationAftermath,companionProductionFactor,companionBuffView,companionStoryBeat
} from '../src/supportCompanion.js';
import {survivalDailyBriefing} from '../src/survivalBalance.js';

const t0=Date.UTC(2026,10,14);
function savedCompanion(){
 const s=defaults(t0);
 s.companion.present=true;
 s.companion.arrivedDay=5;
 s.companion.health=65;
 s.supply.food=6;s.supply.water=6;s.supply.parts=0;
 s.kit.purifier=true;s.kit.seeds=true;
 s.facilities.tank=90;s.facilities.storage=90;
 return s;
}

test('ration dilemma is offered only once, three game days after rescue',()=>{
 const s=savedCompanion();
 assert.equal(offerCompanionRationChoice(s,7),null);
 const p=offerCompanionRationChoice(s,8);
 assert.deepEqual(p,{day:8,id:'companion:rations:5'});
 assert.equal(offerCompanionRationChoice(s,8),null,'re-renders cannot reoffer');
 const restored=sanitize(JSON.parse(JSON.stringify(s)),t0+7*DAY_MS);
 assert.deepEqual(restored.companion.rationPending,p,'pending choice survives restart');
 const old=sanitizeCompanion({present:true,arrivedDay:5,health:70});
 assert.equal(old.rationPending,null,'old saves remain compatible');
 assert.equal(old.rationDecision,'none');
});

test('the live minute loop offers a single non-automatic decision',()=>{
 const s=savedCompanion();
 s.lastTickAt=t0+7*DAY_MS;
 advance(s,t0+7*DAY_MS+60000,false);
 assert.ok(s.companion.rationPending);
 assert.match(s.events.join(' '),/물자 분배/);
 advance(s,t0+7*DAY_MS+120000,false);
 assert.equal(s.events.filter(e=>e.includes('물자 분배')).length,1);
 const other=savedCompanion();other.lastTickAt=t0+7*DAY_MS;
 advance(other,t0+7*DAY_MS+60000,true);
 assert.equal(other.companion.rationPending,null,'offline simulation never demands an on-screen choice');
});

test('sharing has exactly one real cost and delayed safe-weather payoff',()=>{
 const s=savedCompanion();
 offerCompanionRationChoice(s,8);
 const now=t0+7*DAY_MS;
 const result=applyAction(s,'companion_rations_share',now);
 assert.equal(result.good,true);assert.equal(result.outcome,'share');
 assert.equal(s.supply.food,5);assert.equal(s.supply.water,5);
 assert.equal(s.companion.health,77);
 assert.equal(s.companion.rationPending,null);
 assert.equal(applyAction(s,'companion_rations_share',now+1).good,false);
 assert.equal(applyCompanionRationAftermath(s,10,'cloud'),0,'future payoff cannot be claimed early');
 assert.equal(applyCompanionRationAftermath(s,11,'storm'),0,'unsafe weather delays salvage');
 assert.equal(applyCompanionRationAftermath(s,11,'cloud'),1);
 assert.equal(s.supply.parts,1);
 assert.equal(s.companion.obtainedParts,1);
 assert.equal(applyCompanionRationAftermath(s,12,'cloud'),0,'no repeat payout');
 const restored=sanitize(JSON.parse(JSON.stringify(s)),t0+11*DAY_MS);
 assert.equal(applyCompanionRationAftermath(restored,13,'cloud'),0,'save/load cannot duplicate delayed reward');
 assert.equal(restored.supply.parts,1);
});

test('low supplies keep the share choice pending rather than charge into debt',()=>{
 const s=savedCompanion();
 offerCompanionRationChoice(s,8);
 s.supply.food=0;
 const pending=structuredClone(s.companion.rationPending);
 const result=applyAction(s,'companion_rations_share',t0+7*DAY_MS);
 assert.equal(result.good,false);
 assert.deepEqual(s.companion.rationPending,pending);
 assert.equal(s.supply.food,0);
 assert.equal(s.companion.rationDecision,'none');
});

test('conserving keeps stores but slows +30% teamwork to +10% for three days',()=>{
 const s=savedCompanion();
 offerCompanionRationChoice(s,8);
 const r=applyAction(s,'companion_rations_conserve',t0+7*DAY_MS);
 assert.equal(r.good,true);
 assert.equal(s.supply.food,6);assert.equal(s.supply.water,6);
 assert.equal(s.companion.health,49);
 assert.equal(s.companion.strainedUntilDay,11);
 for(const day of [8,9,10]){
   assert.equal(companionProductionFactor(s,day),1.1);
   assert.equal(companionBuffView(s,day).state,'strained');
   assert.match(companionBuffView(s,day).label,/\+10%/);
 }
 assert.equal(companionProductionFactor(s,11),1.3);
 assert.match(companionBuffView(s,11).label,/\+30%/);
 assert.equal(applyCompanionRationAftermath(s,11,'clear'),0,'no payoff without sharing');
 assert.match(companionStoryBeat(s,12).title,/식사의 거리/);
 assert.match(survivalDailyBriefing(12,s).line,/그날은 이해/);
});

test('future reward is bounded by storage cap and companion must remain alive',()=>{
 const s=savedCompanion();
 offerCompanionRationChoice(s,8);applyAction(s,'companion_rations_share',t0+7*DAY_MS);
 s.supply.parts=14;
 assert.equal(applyCompanionRationAftermath(s,11,'clear'),0);
 assert.equal(s.companion.rationAftermathDone,false);
 s.supply.parts=13;s.companion.present=false;
 assert.equal(applyCompanionRationAftermath(s,11,'clear'),0);
 s.companion.present=true;
 assert.equal(applyCompanionRationAftermath(s,11,'clear'),1);
 assert.equal(s.supply.parts,14);
});

test('the existing equipment menu reopens the choice; the modal can be deferred',()=>{
 const eventBoard=readFileSync(new URL('../src/eventBoard.js',import.meta.url),'utf8');
 const main=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
 assert.match(eventBoard,/companionRations:\{/);
 assert.match(eventBoard,/openPendingCompanion\(state\)/);
 assert.match(eventBoard,/state\?\.companion\?\.rationPending/);
 assert.match(eventBoard,/onCompanionRationChoice\('share'\)/);
 assert.match(eventBoard,/onCompanionRationChoice\('conserve'\)/);
 assert.match(eventBoard,/key==='expedition'\|\|key==='companionInvite'\|\|key==='companionRations'/);
 assert.match(eventBoard,/companionRations',rations\.id,\{silent:true\}/);
 assert.match(main,/\['companion_rations_share','companion_rations_conserve'\]\.includes\(action\)/);
 assert.match(main,/onCompanionRationChoice:choice=>runSurvivalAction\('companion_rations_'\+choice\)/);
 assert.match(main,/companion-buff-strained/);
});
