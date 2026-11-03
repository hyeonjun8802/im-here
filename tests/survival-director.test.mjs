import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {defaults,sanitize,advance,applyAction,getDay,DAY_MS,
  beginTornadoEncounter,resolveTornadoRoofImpact} from '../src/simulation.js';
import {chooseTornadoApproach,SURVIVAL_BALANCE,survivalChapter} from '../src/survivalBalance.js';

const start=Date.UTC(2026,10,4,0,0);

test('early days protect against direct tornadoes; later episodes can be near or direct',()=>{
  assert.equal(chooseTornadoApproach(55,1),'distant');
  const modes=new Set();
  for(let i=1;i<=200;i++)modes.add(chooseTornadoApproach(i,10));
  assert.deepEqual(modes,new Set(['distant','near','direct']));
  assert.match(survivalChapter(30).title,/서른/);
});

test('tornado direct impact loses health and food ONCE; ruins are independent',()=>{
 const s=defaults(start);
 s.weather='tornado';
 beginTornadoEncounter(s,start+3*DAY_MS);
 s.tornadoApproach='direct';
 const before={health:s.health,food:s.supply.food,water:s.supply.water};
 const outcome=resolveTornadoRoofImpact(s,start+3*DAY_MS+14000);
 assert.equal(outcome.applied,true);
 assert.ok(s.health<before.health,'hero health must decrease');
 assert.ok(s.supply.food<before.food,'real food inventory must decrease');
 assert.ok(s.supply.water<=before.water);
 assert.equal(resolveTornadoRoofImpact(s,start+3*DAY_MS+15000).applied,false,'same storm must not charge twice');
 const reloaded=sanitize(JSON.parse(JSON.stringify(s)),start+3*DAY_MS+16000);
 assert.equal(resolveTornadoRoofImpact(reloaded,start+3*DAY_MS+17000).applied,false,'reload must not duplicate loss');
});

test('take-cover prevents most injury; secure-supplies prevents most food losses',()=>{
 const a=defaults(start),b=defaults(start);
 for(const s of [a,b]){
   s.weather='tornado';s.supply.food=10;s.supply.water=10;
   beginTornadoEncounter(s,start+3*DAY_MS);s.tornadoApproach='direct';
 }
 const secure=applyAction(b,'secure_supplies',start+3*DAY_MS+1000);
 const cover=applyAction(b,'take_cover',start+3*DAY_MS+1100);
 assert.equal(secure.good,true);assert.equal(cover.good,true);
 const unprotected=resolveTornadoRoofImpact(a,start+3*DAY_MS+14000);
 const protectedHit=resolveTornadoRoofImpact(b,start+3*DAY_MS+14000);
 assert.ok(protectedHit.healthLoss<unprotected.healthLoss);
 assert.ok(protectedHit.foodLoss<unprotected.foodLoss);
 assert.equal(applyAction(b,'take_cover',start+3*DAY_MS+16000).good,false);
});

test('weather preview cannot consume survival resources; previous ruins are never reset',()=>{
 const s=defaults(start);
 s.tornadoDamagedIds=['near-001'];s.tornadoDamageCount=1;
 s.weather='clear';
 beginTornadoEncounter(s,start+3*DAY_MS,{preview:true});s.tornadoApproach='direct';
 const before=JSON.stringify({food:s.supply.food,health:s.health});
 assert.equal(resolveTornadoRoofImpact(s,start+3*DAY_MS+14000).applied,false);
 assert.equal(JSON.stringify({food:s.supply.food,health:s.health}),before);
 assert.deepEqual(s.tornadoDamagedIds,['near-001']);
});

test('exploration is an emergency response, not spam farming',()=>{
 const s=defaults(start);s.supply.food=0;
 assert.equal(applyAction(s,'explore',start).good,true);
 assert.equal(applyAction(s,'explore',start+60000).good,false);
 assert.equal(applyAction(s,'rest',start).good,true);
 assert.equal(applyAction(s,'rest',start+60000).good,false);
 s.weather='rain';
 assert.equal(applyAction(s,'collect_water',start).good,true);
 assert.equal(applyAction(s,'collect_water',start+60000).good,false);
});

test('neglecting food and water ends survival within approximately five active days',()=>{
 const s=defaults(start);
 for(let hour=1;hour<=6*24&&s.survivalStatus==='alive';hour++)advance(s,start+hour*3600000,false);
 assert.equal(s.survivalStatus,'dead');
 assert.ok(getDay(s.startedAt,s.diedAt)<=6);
 assert.equal(applyAction(s,'drink').good,false,'a dead survivor cannot be revived by a UI click');
});

test('planned daily resupply, collecting rain and recovery can support long-term survival',()=>{
 const s=defaults(start);
 for(let hour=1;hour<=30*24&&s.survivalStatus==='alive';hour++){
   const now=start+hour*3600000;
   advance(s,now,false);
   if(s.survivalStatus==='dead')break;
   if(s.weather==='rain'||s.weather==='storm')applyAction(s,'collect_water',now);
   // Prepared survivors deliberately repair the water filter before rainfall,
   // rather than relying only on the generic "repair weakest facility" action.
   if(s.facilities.tank<70&&s.supply.parts>=2)applyAction(s,'repair_tank',now);
   if(s.supply.food<3||s.supply.water<4||s.health<38||s.facilities.shelter<38||s.facilities.tank<40)
     applyAction(s,'explore',now);
   if(s.health<95)applyAction(s,'rest',now);
   if(s.health<55&&s.supply.medicine>0)applyAction(s,'medicine',now);
   if(s.facilities.shelter<65&&s.supply.parts>=2)applyAction(s,'repair',now);
 }
 assert.equal(s.survivalStatus,'alive',`30 day survival: died DAY ${getDay(s.startedAt,s.diedAt||s.lastTickAt)}, health=${s.health}, inventory=${JSON.stringify(s.supply)}, facilities=${JSON.stringify(s.facilities)}, weather=${s.weather}`);
 assert.ok(getDay(s.startedAt,s.lastTickAt)>=30);
});

test('one scenario notification per persisted episode even when its logs change',async()=>{
 globalThis.document={baseURI:'http://localhost/'};
 const {AfterdayEventBoard}=await import('../src/eventBoard.js');
 const s=defaults(start);
 s.weather='tornado';s.weatherEpisode=4;s.tornadoEncounter=10;s.tornadoEncounterActive=true;
 s.tornadoApproach='near';s.events=['토네이도 경보: 접근'];s.eventSerial=11;
 const opened=[];
 const fake={
  lastLog:'고요한 오후',lastLogSerial:0,lastWeather:'clear',lastWeatherEpisode:3,
  lastTornadoEncounter:9,lastRaider:false,lastLowFood:false,activeKey:null,
  show:(key)=>{opened.push(key);return true;},onNotice:()=>{},
  showOnce(state,key,id,options){return AfterdayEventBoard.prototype.showOnce.call(this,state,key,id,options);}
 };
 const sync=()=>AfterdayEventBoard.prototype.sync.call(fake,s);
 sync();assert.deepEqual(opened,['tornadoNear']);
 s.events=['토네이도 경보: 접근 반복'];s.eventSerial++;
 sync();sync();
 assert.equal(opened.length,1);
 s.tornadoEncounter=11;s.weatherEpisode=5;
 sync();assert.equal(opened.length,2);
 assert.deepEqual(s.noticeSeenIds,['tornado:10','tornado:11']);
});

test('near/direct storm path is wired to a single persistent roof-pass callback',()=>{
 const fx=readFileSync(new URL('../src/nearTornadoVfx.js',import.meta.url),'utf8');
 const world=readFileSync(new URL('../src/world.js',import.meta.url),'utf8');
 assert.match(fx,/approach==='direct'\?18:56/);
 assert.match(fx,/this\.roofPassReported=true/);
 assert.match(world,/onTornadoClosePass/);
});
