import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {defaults,sanitize,advance,applyAction,DAY_MS,getDay} from '../src/simulation.js';
import {
  newCompanion,sanitizeCompanion,offerCompanionRescue,resolveCompanionRescue,
  applyCompanionMinute,companionProductionFactor,COMPANION_BALANCE
} from '../src/supportCompanion.js';
import {applyAcquiredItemMinute} from '../src/scavengeDirector.js';

const start=Date.UTC(2026,10,4,0,0);
function invite(){
 const s=defaults(start);
 s.kit.radio=true;
 s.scavenge.radioNewsId=3;
 s.scavenge.radioNewsDay=4;
 s.scavenge.radioNewsType='contact';
 const pending=offerCompanionRescue(s,4);
 assert.ok(pending);
 return s;
}
test('radio contact is a request, not an automatic NPC or free resource drop',()=>{
 const s=invite();
 assert.equal(s.companion.present,false);
 assert.equal(s.companion.pending.radioNewsId,3);
 assert.equal(offerCompanionRescue(s,4),null);
 assert.equal(s.supply.food,3);
 assert.equal(s.supply.water,4);
 const saved=sanitize(JSON.parse(JSON.stringify(s)),start+2*DAY_MS);
 assert.deepEqual(saved.companion.pending,s.companion.pending);
 assert.equal(saved.companion.present,false);
});
test('declining preserves scarce food water and does not re-present a saved contact',()=>{
 const s=invite(),food=s.supply.food,water=s.supply.water;
 const result=applyAction(s,'companion_decline',start+3*DAY_MS);
 assert.equal(result.good,true);
 assert.equal(result.outcome,'declined');
 assert.equal(s.companion.pending,null);
 assert.equal(s.companion.present,false);
 assert.equal(s.supply.food,food);assert.equal(s.supply.water,water);
 assert.equal(applyAction(s,'companion_invite',start+3*DAY_MS+1).good,false);
 assert.equal(offerCompanionRescue(s,4),null);
 s.scavenge.radioNewsId=4;
 assert.ok(offerCompanionRescue(s,5),'a genuinely new radio contact may try again');
});
test('inviting adds exactly one persisted non-playable helper',()=>{
 const s=invite();
 const result=applyAction(s,'companion_invite',start+3*DAY_MS);
 assert.equal(result.good,true);assert.equal(result.outcome,'joined');
 assert.equal(s.companion.present,true);
 assert.equal(s.companion.health,78);
 assert.equal(s.companion.arrivedDay,4);
 assert.equal(s.companion.pending,null);
 assert.equal(companionProductionFactor(s),1.3);
 assert.equal(applyAction(s,'companion_invite',start+3*DAY_MS+3).good,false);
 const reloaded=sanitize(JSON.parse(JSON.stringify(s)),start+3*DAY_MS+5);
 assert.equal(reloaded.companion.present,true);
 assert.equal(reloaded.companion.pending,null);
 assert.equal(reloaded.companion.health,78);
 assert.equal(offerCompanionRescue(reloaded,5),null,'only one helper on the rooftop');
});
test('companion consumes one food and one water per GAME day, no per-frame double charge',()=>{
 const s=invite();
 applyAction(s,'companion_invite',start+3*DAY_MS);
 s.supply.food=8;s.supply.water=8;
 for(let n=0;n<1439;n++)applyCompanionMinute(s,5,'cloud');
 assert.equal(s.supply.food,8);assert.equal(s.supply.water,8);
 applyCompanionMinute(s,5,'cloud');
 assert.equal(s.supply.food,7);assert.equal(s.supply.water,7);
 const restored=sanitize(JSON.parse(JSON.stringify(s)),start+4*DAY_MS);
 applyCompanionMinute(restored,5,'cloud');
 assert.equal(restored.supply.food,7);assert.equal(restored.supply.water,7);
 assert.equal(COMPANION_BALANCE.foodMinutes,1440);
});
test('a skilled companion accelerates filtered water and crops, not unowned items',()=>{
 const base=defaults(start),helped=defaults(start);
 for(const s of [base,helped]){
  s.kit.purifier=true;s.kit.seeds=true;s.supply.food=0;s.supply.water=0;
  s.facilities.tank=90;s.facilities.storage=90;
 }
 helped.companion.present=true;helped.companion.health=78;
 for(let i=0;i<190;i++){
  applyAcquiredItemMinute(base,1,'cloud');
  applyAcquiredItemMinute(helped,1,'cloud');
 }
 assert.equal(base.supply.water,0);
 assert.equal(helped.supply.water,1);
 for(let i=190;i<1500;i++){
  applyAcquiredItemMinute(base,1,'cloud');
  applyAcquiredItemMinute(helped,1,'cloud');
 }
 assert.equal(base.supply.food,0,'baseline garden has not yet matured');
 assert.ok(helped.supply.food>=2,'companion labor accelerates crops');
 assert.ok(helped.supply.water<=2,'companion must not bypass purifier daily limit');
});
test('daily helper salvage is slow and bounded; severe scarcity can end companionship',()=>{
 const s=invite();
 applyAction(s,'companion_invite',start+3*DAY_MS);
 s.supply.parts=0;s.supply.food=20;s.supply.water=20;
 let gathered=0;
 for(let i=0;i<2880;i++)gathered+=applyCompanionMinute(s,4,'cloud').partsFound;
 assert.equal(gathered,1);assert.equal(s.supply.parts,1);
 s.supply.food=0;s.supply.water=0;
 for(let i=0;i<10000&&s.companion.present;i++)applyCompanionMinute(s,6,'storm');
 assert.equal(s.companion.present,false);
 assert.equal(s.companion.lost,true);
 assert.equal(s.companion.pending,null);
});
test('malformed old and new companion saves are sanitized without changing world ruins',()=>{
 const s=defaults(start);
 s.tornadoDamagedIds=['far-003'];
 delete s.companion;
 const old=sanitize(JSON.parse(JSON.stringify(s)),start+1000);
 assert.equal(old.companion.present,false);
 assert.deepEqual(old.tornadoDamagedIds,['far-003']);
 const raw={present:true,pending:{id:'fake',day:7,radioNewsId:7},health:250,foodMinutes:-90,waterMinutes:Infinity,salvageMinutes:'x'};
 const fixed=sanitizeCompanion(raw);
 assert.equal(fixed.present,true);assert.equal(fixed.pending,null);
 assert.equal(fixed.health,100);
 assert.equal(fixed.foodMinutes,0);
});
test('visual arrival and one-time radio-choice UI integrate without a second controllable protagonist',()=>{
 const board=readFileSync(new URL('../src/eventBoard.js',import.meta.url),'utf8');
 const main=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
 const world=readFileSync(new URL('../src/world.js',import.meta.url),'utf8');
 const fx=readFileSync(new URL('../src/supportSurvivorVfx.js',import.meta.url),'utf8');
 const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
 assert.match(board,/onCompanionChoice\('invite'\)/);
 assert.match(board,/openPendingCompanion\(state\)/);
 assert.match(main,/companion_toggle|companion-toggle/);
 assert.match(world,/this\.supportSurvivor\?\.sync\(game\)/);
 assert.match(fx,/cloneRig\(avatar\.model\)/);
 assert.match(fx,/this\.group\.visible=this\.present/);
 assert.match(html,/id="companion-status"/);
});

test('real radio-contact action creates a one-time invitation, not an automatic recruit',()=>{
 let selected=null;
 for(let seed=1;seed<=200;seed++){
  const s=defaults(start);
  s.kit.radio=true;s.scavenge.seed=seed;
  const result=applyAction(s,'radio_contact',start+DAY_MS);
  if(result.kind==='contact'){selected=s;break;}
 }
 assert.ok(selected,'some seeds must yield a live contact');
 assert.equal(selected.companion.present,false);
 assert.ok(selected.companion.pending);
 assert.equal(selected.companion.pending.radioNewsId,selected.scavenge.radioNewsId);
 assert.equal(applyAction(selected,'radio_contact',start+DAY_MS+1000).good,false,'radio contact is daily gated');
 assert.ok(selected.noticeSeenIds.length===0,'the UI owns the notification and audio, not the simulation tick');
});
