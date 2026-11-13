import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {defaults,sanitize,advance,applyDisasterStructureDamage,DISASTER_STRUCTURE_DAMAGE,beginTornadoEncounter,resolveTornadoRoofImpact,applyAction,DAY_MS} from '../src/simulation.js';
import {ITEM_IDS,offerDailyScavenge} from '../src/scavengeDirector.js';
const started=Date.UTC(2026,10,13,0);
test('each disaster has a bounded, non-zero shelter/tank/storage impact once per weather episode',()=>{
 for(const [weather,amounts] of Object.entries(DISASTER_STRUCTURE_DAMAGE)){
   const s=defaults(started);
   s.weather=weather;s.weatherEpisode=8;
   s.facilities={shelter:95,storage:95,tank:95};
   const first=applyDisasterStructureDamage(s,weather,2);
   assert.equal(first.applied,true,weather);
   assert.equal(first.lostItem,null,'healthy camp keeps its equipment');
   for(const [key,amount] of Object.entries(amounts)){
     assert.ok(amount>0,weather+':'+key);
     assert.equal(s.facilities[key],95-amount);
   }
   const after=JSON.stringify(s.facilities);
   assert.equal(applyDisasterStructureDamage(s,weather,2).applied,false,weather);
   assert.equal(JSON.stringify(s.facilities),after,'no double hit on re-render');
   const saved=sanitize(JSON.parse(JSON.stringify(s)),started);
   assert.equal(applyDisasterStructureDamage(saved,weather,2).applied,false,'must persist per-episode hit');
 }
});
test('damaged gear disappears exactly once and is queued for real reacquisition',()=>{
 const s=defaults(started);
 s.weather='wildfire';s.weatherEpisode=3;
 s.kit.seeds=true;s.kit.tent=true;s.facilities={shelter:80,tank:80,storage:55};
 const hit=applyDisasterStructureDamage(s,'wildfire',4);
 assert.equal(hit.lostItem,'seeds');
 assert.equal(s.kit.seeds,false);
 assert.equal(s.kit.tent,true);
 assert.equal(s.scavenge.pending.target,'seeds');
 assert.equal(s.scavenge.pending.day,4);
 assert.equal(s.scavenge.lastOfferedDay,4);
 const again=applyDisasterStructureDamage(s,'wildfire',4);
 assert.equal(again.applied,false);
 assert.equal(s.kit.tent,true);
 const restored=sanitize(JSON.parse(JSON.stringify(s)),started+1000);
 assert.equal(restored.kit.seeds,false);
 assert.equal(restored.scavenge.pending.target,'seeds');
 assert.equal(restored.equipmentLossEpisode,3);
 // Failed expedition cannot manufacture a missing item.
 const choice=applyAction(restored,'scavenge_stay',started+1000);
 assert.equal(choice.good,true);
 assert.equal(restored.kit.seeds,false);
 // Next game day can offer a new expedition for still-missing equipment.
 restored.scavenge.lastOfferedDay=4;
 const next=offerDailyScavenge(restored,5,{force:true});
 assert.ok(ITEM_IDS.includes(next.target));
 assert.equal(restored.kit.seeds,false);
 // Every missing item, including destroyed ones, is eligible for subsequent
 // genuine expedition loot; an item must never respawn automatically.
 restored.scavenge.pending=null;
 for(const id of ITEM_IDS)restored.kit[id]=id!=='seeds';
 restored.scavenge.lastOfferedDay=5;
 const seedOnly=offerDailyScavenge(restored,6,{force:true});
 assert.equal(seedOnly.target,'seeds');
});
test('offline weather and preview tornado cannot remove inventory',()=>{
 const s=defaults(started);
 s.weather='storm';s.weatherEpisode=7;s.kit.tent=true;
 s.facilities.shelter=10;
 const damage=applyDisasterStructureDamage(s,'storm',2,{offline:true});
 assert.equal(damage.applied,true);assert.equal(s.kit.tent,true);
 const t=defaults(started);t.weather='tornado';t.kit.tent=true;
 beginTornadoEncounter(t,started,{preview:true});
 assert.equal(resolveTornadoRoofImpact(t,started).applied,false);
 assert.equal(t.kit.tent,true);
});
test('real near/direct tornado can destroy exposed kit, repeated impact cannot',()=>{
 const s=defaults(started);s.weather='tornado';s.weatherEpisode=5;
 s.tornadoEncounter=12;s.tornadoEncounterActive=true;s.tornadoApproach='direct';
 s.kit.tent=true;s.facilities.shelter=65;
 const first=resolveTornadoRoofImpact(s,started);
 assert.equal(first.applied,true);
 assert.equal(s.kit.tent,false);
 assert.equal(s.scavenge.pending?.target,'tent');
 const second=resolveTornadoRoofImpact(s,started);
 assert.equal(second.applied,false);
 assert.equal(s.equipmentLossEpisode,5);
});
test('real disaster simulation preserves gameplay and preview separation',()=>{
 const s=defaults(started);
 s.nextWeatherAt=started+60000;s.pendingWeather='storm';s.majorDisasterAt=started+9*DAY_MS;
 const before={...s.facilities};
 advance(s,started+60000);
 if(s.weather==='storm')assert.ok(s.facilities.tank<before.tank);
 assert.equal(s.version,4);
 const css=readFileSync(new URL('../src/hudAlignmentV1300.css',import.meta.url),'utf8');
 const bottom=css.slice(css.indexOf('/* v24 | phone equipment pane:'));
 assert.match(bottom,/@media\(max-width:720px\)/);
 assert.match(bottom,/\.survival-kit:has\(> \.survival-kit-action\)/);
 assert.match(bottom,/transform:scale\(\.52\)!important/);
 assert.match(bottom,/transform-origin:bottom left!important/);
 const main=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
 assert.match(main,/kitVisualKey!==lastKitVisualKey/);
 assert.match(main,/world\.syncSurvivalInventory\(state\)/);
 for(const id of ITEM_IDS)assert.ok(s.kit.hasOwnProperty(id));
});
