import test from 'node:test';
import assert from 'node:assert/strict';
import {defaults,applyAction,sanitize,DAY_MS} from '../src/simulation.js';
import {offerCompanionRescue} from '../src/supportCompanion.js';

const start=Date.UTC(2026,10,4,0,0);

test('a declined radio rescue never emits a second companion/survivor alarm for the same contact',async()=>{
 globalThis.document={baseURI:'http://localhost/'};
 const {AfterdayEventBoard}=await import('../src/eventBoard.js');
 const s=defaults(start);
 s.kit.radio=true;
 s.scavenge.radioNewsId=17;s.scavenge.radioNewsDay=3;s.scavenge.radioNewsType='contact';
 offerCompanionRescue(s,3);
 assert.equal(s.companion.lastContactId,17);
 const opened=[];
 const fake={
   lastLog:s.events.at(-1),lastLogSerial:s.eventSerial,
   lastWeather:s.weather,lastWeatherEpisode:s.weatherEpisode,
   lastTornadoEncounter:s.tornadoEncounter,
   lastRaider:false,lastLowFood:false,
   activeKey:null,onNotice:()=>{},
   show:(key)=>{opened.push(key);return true;},
   showOnce(state,key,id,options){return AfterdayEventBoard.prototype.showOnce.call(this,state,key,id,options);}
 };
 const sync=()=>AfterdayEventBoard.prototype.sync.call(fake,s);
 sync();assert.deepEqual(opened,['companionInvite']);
 assert.deepEqual(s.noticeSeenIds,['companion:17']);
 assert.equal(applyAction(s,'companion_decline',start+2*DAY_MS).good,true);
 sync();sync();
 assert.deepEqual(opened,['companionInvite'],'no duplicate survivorCall audio after declining');
 assert.deepEqual(s.noticeSeenIds,['companion:17']);
 const restored=sanitize(JSON.parse(JSON.stringify(s)),start+2*DAY_MS);
 const afterReload={
   ...fake,lastLog:restored.events.at(-1),lastLogSerial:restored.eventSerial,
   show:(key)=>{opened.push(key);return true;}
 };
 AfterdayEventBoard.prototype.sync.call(afterReload,restored);
 assert.deepEqual(opened,['companionInvite'],'reloading cannot replay the rescue');
});

test('accepting a rescue cannot manufacture a companion with zero food or clean water',()=>{
 const s=defaults(start);s.kit.radio=true;
 s.scavenge.radioNewsId=8;s.scavenge.radioNewsType='contact';
 offerCompanionRescue(s,4);
 const savedInvite=structuredClone(s.companion.pending);
 s.supply.food=0;s.supply.water=1;
 const noFood=applyAction(s,'companion_invite',start+3*DAY_MS);
 assert.equal(noFood.good,false);
 assert.match(noFood.msg,/식량 1개와 식수 1개/);
 assert.deepEqual(s.companion.pending,savedInvite,'offer remains pending if no food');
 assert.equal(s.companion.present,false);
 s.supply.food=1;s.supply.water=0;
 assert.equal(applyAction(s,'companion_invite',start+3*DAY_MS).good,false);
 assert.deepEqual(s.companion.pending,savedInvite,'offer remains pending if no water');
 s.supply.water=1;
 assert.equal(applyAction(s,'companion_invite',start+3*DAY_MS).good,true);
 assert.equal(s.companion.present,true);
 assert.equal(s.companion.pending,null);
 assert.equal(applyAction(s,'companion_invite',start+3*DAY_MS+1).good,false);
});

test('after a genuine subsequent contact, only the next contact receives its own one-time notice',async()=>{
 globalThis.document={baseURI:'http://localhost/'};
 const {AfterdayEventBoard}=await import('../src/eventBoard.js');
 const s=defaults(start);s.kit.radio=true;s.scavenge.radioNewsId=1;s.scavenge.radioNewsDay=2;s.scavenge.radioNewsType='contact';
 offerCompanionRescue(s,2);
 assert.equal(applyAction(s,'companion_invite',start+DAY_MS).good,true);
 s.scavenge.radioNewsId=2;s.scavenge.radioNewsDay=3;s.scavenge.radioNewsType='contact';
 const opened=[];
 const fake={
  lastLog:s.events.at(-1),lastLogSerial:s.eventSerial,lastWeather:s.weather,lastWeatherEpisode:s.weatherEpisode,
  lastTornadoEncounter:s.tornadoEncounter,lastRaider:false,lastLowFood:false,activeKey:null,
  show(key){opened.push(key);return true;},onNotice:()=>{},
  showOnce(state,key,id,options){return AfterdayEventBoard.prototype.showOnce.call(this,state,key,id,options);}
 };
 AfterdayEventBoard.prototype.sync.call(fake,s);
 AfterdayEventBoard.prototype.sync.call(fake,s);
 assert.deepEqual(opened,['survivorCall']);
 assert.ok(s.noticeSeenIds.includes('radio:2:3'));
 assert.ok(!s.noticeSeenIds.includes('radio:1:2'));
});

test('UI keeps a resource-starved companion request open until it is resolved',async()=>{
 // A failed accept must never close the in-game choice panel.
 // The handler applies the state transition, then checks action success.
 const fs=await import('node:fs/promises');
 const main=await fs.readFile(new URL('../src/main.js',import.meta.url),'utf8');
 assert.match(main,/action\.startsWith\('companion_'\)&&result\.good/);
});
