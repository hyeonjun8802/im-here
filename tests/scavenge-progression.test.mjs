import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {defaults,sanitize,advance,applyAction,getDay,DAY_MS} from '../src/simulation.js';
import {ITEM_IDS,hasItem,makeScavengeDirector,offerDailyScavenge,
  applyAcquiredItemMinute,resolveScavengeChoice,hash32} from '../src/scavengeDirector.js';
import {applyWeatherEconomyMinute} from '../src/weatherEconomy.js';

const now=Date.UTC(2026,10,4,2,0);
function withExpedition(day=1,seed=1){
 const s=defaults(now);s.scavenge.seed=seed;
 const offer=offerDailyScavenge(s,day,{force:true});
 assert.ok(offer);
 return {s,offer};
}
function findExpedition(outcome,desiredItem=null){
 for(let i=1;i<50000;i++){
   const {s,offer}=withExpedition(1,i);
   const result=applyAction(s,'scavenge_go',now);
   if(result.outcome===outcome&&(!desiredItem||result.item===desiredItem))
     return {s,offer,result,seed:i};
 }
 throw Error('no random seed found for '+outcome);
}

test('a new survivor starts with no equipment and concrete-floor sleeping conditions',()=>{
 const s=defaults(now);
 assert.deepEqual(ITEM_IDS.filter(id=>hasItem(s,id)),[]);
 assert.equal(s.supply.medicine,0);
 assert.equal(s.supply.food,3);
 assert.equal(s.supply.water,4);
 assert.equal(s.itemSystemVersion,1);
 assert.equal(applyAction(s,'radio_contact',now).good,false,'radio does not exist yet');
 const before=s.health;
 s.weather='cold';
 applyAction(s,'rest',now);
 assert.ok(s.sickness>0,'without a tent the concrete winter rest risks sickness');
 assert.ok(s.health>=before);
});

test('legacy saves keep all previously visible permanent rooftop equipment',()=>{
 const old=defaults(now);
 delete old.itemSystemVersion;delete old.kit;delete old.scavenge;
 old.tornadoDamagedIds=['near-roof-222'];old.supply.food=8;
 const s=sanitize(JSON.parse(JSON.stringify(old)),now+60000);
 assert.deepEqual(ITEM_IDS.filter(id=>hasItem(s,id)),ITEM_IDS);
 assert.deepEqual(s.tornadoDamagedIds,['near-roof-222']);
 assert.equal(s.supply.food,8);
});

test('day one always offers a choice, never auto-loots, and supports a safe skip',()=>{
 const s=defaults(now),stock=JSON.stringify(s.supply);
 const offer=offerDailyScavenge(s,1);
 assert.ok(offer);assert.equal(offer.day,1);
 assert.ok(ITEM_IDS.includes(offer.target));
 assert.equal(JSON.stringify(s.supply),stock);
 assert.deepEqual(ITEM_IDS.filter(id=>s.kit[id]),[]);
 const declined=applyAction(s,'scavenge_stay',now);
 assert.equal(declined.good,true);assert.equal(declined.outcome,'safe');
 assert.deepEqual(ITEM_IDS.filter(id=>s.kit[id]),[]);
 assert.equal(JSON.stringify(s.supply),stock);
 assert.equal(applyAction(s,'scavenge_go',now).good,false,'no reroll after declining');
 assert.equal(offerDailyScavenge(s,1,{force:true}),null,'one chance per game day');
});

test('all four core items are individually discoverable with a seeded chance',()=>{
 for(const id of ITEM_IDS){
  const {s,result}=findExpedition('item',id);
  assert.equal(result.item,id);assert.equal(s.kit[id],true);
  assert.equal(ITEM_IDS.filter(k=>s.kit[k]).length,1,'one item per expedition');
  const copy=sanitize(JSON.parse(JSON.stringify(s)),now+1000);
  assert.equal(copy.kit[id],true);
  assert.equal(copy.scavenge.pending,null,'outcome is final across reload');
  assert.equal(applyAction(copy,'scavenge_go',now+2000).good,false);
 }
});

test('risky exploration can injure, infect or return empty handed instead of an item',()=>{
 for(const kind of ['injury','sickness','empty']){
  const {s,result}=findExpedition(kind);
  assert.equal(result.outcome,kind);
  assert.equal(ITEM_IDS.filter(k=>s.kit[k]).length,0);
  if(kind==='injury')assert.ok(s.health<88);
  if(kind==='sickness')assert.ok(s.sickness>0);
  assert.equal(s.scavenge.pending,null);
 }
});

test('scavenging chance varies by date and remains deterministic under reload',()=>{
 const s=defaults(now),a=[];
 for(let day=1;day<=30;day++){
  const x=offerDailyScavenge(s,day);
  if(x){a.push(x.id);applyAction(s,'scavenge_stay',now+(day-1)*DAY_MS);}
 }
 assert.equal(a[0].startsWith('scavenge:1:'),true);
 assert.ok(a.length>4&&a.length<31);
 const d=defaults(now);d.scavenge.seed=s.scavenge.seed;
 const b=[];
 for(let day=1;day<=30;day++){
  const x=offerDailyScavenge(d,day);
  if(x){b.push(x.id);applyAction(d,'scavenge_stay',now+(day-1)*DAY_MS);}
 }
 assert.deepEqual(a,b);
});

test('without the purifier rain produces NO potable water automatically',()=>{
 const s=defaults(now);s.weather='rain';s.supply.water=0;
 for(let i=0;i<100;i++)applyWeatherEconomyMinute(s,'rain',1);
 assert.equal(s.supply.water,0);
 s.kit.purifier=true;
 for(let i=0;i<100;i++)applyWeatherEconomyMinute(s,'rain',1);
 assert.ok(s.supply.water>0);
});

test('acquired purifier produces a capped number of bottles per game day, even in clouds',()=>{
 const s=defaults(now);s.kit.purifier=true;s.facilities.tank=90;s.supply.water=0;
 for(let i=0;i<1500;i++)applyAcquiredItemMinute(s,1,'cloud');
 assert.equal(s.supply.water,2);
 for(let i=0;i<480;i++)applyAcquiredItemMinute(s,2,'cloud');
 assert.equal(s.supply.water,4,'a new day replenishes the small safe production quota');
 s.facilities.tank=20;
 for(let i=0;i<480;i++)applyAcquiredItemMinute(s,3,'cloud');
 assert.equal(s.supply.water,4,'a broken purifier cannot produce clean water');
});

test('seeds grow real food over time instead of granting instant food inventory',()=>{
 const s=defaults(now);s.kit.seeds=true;s.supply.food=1;
 applyAcquiredItemMinute(s,1,'rain');
 assert.equal(s.supply.food,1);
 for(let i=0;i<2000;i++)applyAcquiredItemMinute(s,1,'cloud');
 assert.equal(s.supply.food,3,'garden eventually creates two meals');
 const copy=sanitize(JSON.parse(JSON.stringify(s)),now+1000);
 assert.equal(copy.scavenge.farmMinutes,s.scavenge.farmMinutes);
});

test('radio can contact an outside survivor or bring a rescue helicopter drop, once per day',()=>{
 const outcomes=new Set();
 for(let seed=1;seed<=500;seed++){
  const s=defaults(now);s.kit.radio=true;s.scavenge.seed=seed;
  const report=applyAction(s,'radio_contact',now+3*DAY_MS);
  assert.equal(report.good,true);
  outcomes.add(report.kind);
  assert.equal(applyAction(s,'radio_contact',now+3*DAY_MS+1).good,false);
  const saved=sanitize(JSON.parse(JSON.stringify(s)),now+3*DAY_MS+1);
  assert.equal(applyAction(saved,'radio_contact',now+3*DAY_MS+2).good,false);
  if(outcomes.size===3)break;
 }
 assert.deepEqual(outcomes,new Set(['drop','contact','silence']));
});

test('world models and choices are gated by items, not present from day one',()=>{
 const world=readFileSync(new URL('../src/world.js',import.meta.url),'utf8');
 const life=readFileSync(new URL('../src/survivorLife.js',import.meta.url),'utf8');
 const main=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
 const board=readFileSync(new URL('../src/eventBoard.js',import.meta.url),'utf8');
 const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
 assert.match(world,/this\.shelter\.visible=Boolean\(kit\.tent\)/);
 assert.match(world,/this\.shelterAsset\.visible=Boolean\(kit\.tent\)/);
 assert.match(world,/this\.life\.comms\.visible=Boolean\(kit\.radio\)/);
 assert.match(world,/this\.botany\.cropLeafMesh\.visible=Boolean\(kit\.seeds\)/);
 assert.match(life,/w\.activeKit\?\.tent\?1\.18:\.14/);
 assert.match(main,/offerDailyScavenge\(state,getDay/);
 assert.match(board,/openPendingExpedition/);
 assert.match(board,/onExpeditionChoice\('go'\)/);
 assert.match(html,/id="expedition-toggle"/);
});

test('at least one genuinely fresh, risk-taking survivor can reach DAY 30 with earned equipment',()=>{
 let survivors=0;const endings=[];
 for(let seed=7001;seed<=7012;seed++){
  const state=defaults(now);state.scavenge.seed=seed;
  for(let hour=0;hour<=30*24&&state.survivalStatus==='alive';hour++){
   const time=now+hour*3600000;
   if(hour)advance(state,time,false);
   if(state.survivalStatus==='dead')break;
   const day=getDay(state.startedAt,time);
   offerDailyScavenge(state,day);
   if(state.scavenge.pending)applyAction(state,'scavenge_go',time);
   if((state.weather==='rain'||state.weather==='storm')&&state.supply.water<13)
     applyAction(state,'collect_water',time);
   if(state.facilities.tank<65&&state.supply.parts>=2)
     applyAction(state,'repair_tank',time);
   if((state.supply.food<4||state.supply.water<4||state.health<42||
       state.facilities.shelter<38||state.facilities.tank<40))
     applyAction(state,'explore',time);
   if(state.health<95)applyAction(state,'rest',time);
   if(state.health<65&&state.supply.medicine>0)applyAction(state,'medicine',time);
   if(state.facilities.shelter<60&&state.supply.parts>=2)applyAction(state,'repair',time);
   if(state.kit.radio)applyAction(state,'radio_contact',time);
  }
  const finish=getDay(state.startedAt,state.survivalStatus==='dead'?state.diedAt:state.lastTickAt);
  endings.push({seed,day:finish,owned:ITEM_IDS.filter(k=>state.kit[k]),health:state.health});
  if(state.survivalStatus==='alive'&&finish>=30)survivors++;
 }
 assert.ok(survivors>=1,'At least one risk-managing fresh survivor must reach day 30: '+JSON.stringify(endings));
});
