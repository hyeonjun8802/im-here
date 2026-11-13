import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {defaults,sanitize,advance,applyAction,DAY_MS} from '../src/simulation.js';
import {applyCompanionAutoRepair,companionBuffView} from '../src/supportCompanion.js';

const start=Date.UTC(2026,10,14,0,0,0);
const setup=()=>{
  const s=defaults(start);
  s.companion.present=true;
  s.companion.health=78;
  s.companion.arrivedDay=1;
  s.supply.parts=4;s.supply.food=7;s.supply.water=7;
  s.facilities={tank:75,shelter:76,storage:85};
  return s;
};

test('critical tank is repaired once for the exact existing 2-part +38 repair economy',()=>{
 const s=setup(),messages=[];
 s.supply.parts=2;s.facilities.tank=30;
 const out=applyCompanionAutoRepair(s,2,'clear',{addLog:t=>messages.push(t)});
 assert.deepEqual(out,{target:'tank',points:38,partsUsed:2,day:2});
 assert.equal(s.facilities.tank,68);
 assert.equal(s.supply.parts,0);
 assert.equal(s.companion.lastAutoRepairDay,2);
 assert.match(messages.join(' '),/물탱크 내구도 \+38%p/);
 assert.equal(applyCompanionAutoRepair(s,2,'cloud'),null,'never repair twice in one GAME day');
 assert.equal(s.facilities.tank,68);
 assert.match(companionBuffView(s,2).label,/물탱크 자동수리 \+38%p/);
 assert.match(companionBuffView(s,2).description,/수리/);
 const loaded=sanitize(JSON.parse(JSON.stringify(s)),start+DAY_MS);
 assert.equal(applyCompanionAutoRepair(loaded,2,'clear'),null,'reload cannot repay the same day');
 assert.equal(loaded.supply.parts,0);
 assert.equal(loaded.facilities.tank,68);
});

test('urgent shelter/storage repairs work with only two parts; routine leaves reserve',()=>{
 const s=setup();s.supply.parts=2;s.facilities.shelter=35;
 const result=applyCompanionAutoRepair(s,2,'cloud');
 assert.equal(result.target,'shelter');
 assert.equal(s.facilities.shelter,62);
 assert.equal(s.supply.parts,0);
 const storage=setup();storage.supply.parts=2;storage.facilities.storage=19;
 assert.equal(applyCompanionAutoRepair(storage,2,'clear').target,'storage');
 assert.equal(storage.facilities.storage,46);
 const normal=setup();normal.supply.parts=2;
 assert.equal(applyCompanionAutoRepair(normal,2,'clear'),null,'two emergency parts are reserved if no critical damage');
 assert.equal(normal.supply.parts,2);
 assert.equal(normal.facilities.tank,75);
 normal.supply.parts=4;
 assert.equal(applyCompanionAutoRepair(normal,2,'clear').target,'tank','weakest damaged facility first');
 assert.equal(normal.supply.parts,2,'keep two parts in storage');
 assert.equal(normal.facilities.tank,100,'durability is capped');
 assert.equal(normal.companion.lastAutoRepairPoints,25);
 assert.match(companionBuffView(normal,2).label,/자동수리 \+25%p/);
});

test('no repairs without healthy helper, enough parts, safe weather or real damage',()=>{
 const s=setup();s.facilities.tank=20;
 for(const weather of ['rain','storm','tornado','wildfire','dust','cold','heat']){
   assert.equal(applyCompanionAutoRepair(s,2,weather),null,weather);
 }
 assert.equal(s.supply.parts,4);
 s.companion.health=20;
 assert.equal(applyCompanionAutoRepair(s,2,'cloud'),null);
 s.companion.health=80;s.companion.present=false;
 assert.equal(applyCompanionAutoRepair(s,2,'clear'),null);
 s.companion.present=true;s.supply.parts=1;
 assert.equal(applyCompanionAutoRepair(s,2,'clear'),null);
 assert.equal(s.facilities.tank,20);
 s.supply.parts=10;s.facilities.tank=95;s.facilities.shelter=90;s.facilities.storage=98;
 assert.equal(applyCompanionAutoRepair(s,2,'clear'),null,'do not spend resources on strong facilities');
 assert.equal(s.supply.parts,10);
});

test('real simulation repairs only while playing, before the installed purifier runs',()=>{
 const online=setup();
 online.kit.purifier=true;
 online.supply.parts=2;online.facilities.tank=30;
 online.food=90;online.water=90;
 online.lastTickAt=start+DAY_MS;
 online.nextWeatherAt=start+3*DAY_MS;
 online.majorDisasterAt=start+3*DAY_MS; // Isolate maintenance from scheduled roof damage.
 const offline=sanitize(JSON.parse(JSON.stringify(online)),start+DAY_MS+60000);
 // Restoring a save clamps no relevant values, so test each tick in isolation.
 advance(offline,start+DAY_MS+60000,true);
 assert.equal(offline.facilities.tank,30);
 assert.equal(offline.supply.parts,2);
 advance(online,start+DAY_MS+60000,false);
 assert.equal(online.facilities.tank,68);
 assert.equal(online.supply.parts,0);
 assert.equal(online.companion.lastAutoRepairDay,2);
 assert.match(online.events.join(' '),/동료 자동수리/);
 advance(online,start+DAY_MS+120000,false);
 assert.equal(online.companion.lastAutoRepairDay,2);
 assert.equal(online.facilities.tank,68);
});

test('old saves have no phantom repairs, and the player can still repair manually',()=>{
 const s=setup();delete s.companion.lastAutoRepairDay;delete s.companion.lastAutoRepairTarget;
 const restored=sanitize(s,start);
 assert.equal(restored.companion.lastAutoRepairDay,0);
 assert.equal(restored.companion.lastAutoRepairTarget,null);
 const independent=setup();independent.companion.present=false;
 independent.supply.parts=2;independent.facilities.tank=20;
 assert.equal(applyAction(independent,'repair_tank',start).good,true);
 assert.equal(independent.supply.parts,0);
 assert.equal(independent.facilities.tank,58);
 const source=readFileSync(new URL('../src/simulation.js',import.meta.url),'utf8');
 assert.match(source,/if\(!offline\)applyCompanionAutoRepair\(s,gameDay,e,/);
 assert.match(source,/if\(action==='repair_tank'\)/);
 assert.match(source,/if\(action==='repair'\)/);
});
