import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {defaults,sanitize,applyAction} from '../src/simulation.js';
import {resolveScavengeChoice,requestRadioContact} from '../src/scavengeDirector.js';
import {COMPANION_BALANCE,applyCompanionMinute} from '../src/supportCompanion.js';
import {REPAIR_PARTS_RESERVE,awardRepairParts} from '../src/repairPartsBalanceV95.js';

const now=Date.UTC(2026,10,15,10);
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
function quest(stock,seed=42){
 const s=defaults(now);
 s.supply.parts=stock;s.scavenge.seed=seed;
 s.scavenge.pending={id:'scavenge:test',day:1,title:'test',description:'test',target:'cache'};
 return s;
}

test('12 parts are a reward ceiling, not an inventory wipe or save format change',()=>{
 assert.equal(REPAIR_PARTS_RESERVE,12);
 const s=defaults(now);
 assert.equal(awardRepairParts(s,20),10,'new day begins with 2 parts');
 assert.equal(s.supply.parts,12);
 assert.equal(awardRepairParts(s,3),0,'no surplus acquisition');
 assert.equal(awardRepairParts(s,-1),0);
 s.supply.parts=11;
 assert.equal(awardRepairParts(s,4),1);
 assert.equal(s.supply.parts,12);
 s.supply.parts=81;
 assert.equal(awardRepairParts(s,12),0);
 assert.equal(s.supply.parts,81,'historical stock must never be deleted');
 const saved=sanitize(structuredClone(s),now);
 assert.equal(saved.supply.parts,81,'reload keeps previously earned parts');
});

test('emergency search still supplies food/water, but parts rise by no more than 2 and never exceed 12',()=>{
 for(const stock of [0,2,10,11,12,81]){
  const s=defaults(now);
  s.supply.parts=stock;s.supply.food=0;
  const beforeMedicine=s.supply.medicine;
  const r=applyAction(s,'explore',now);
  assert.equal(r.good,true,'emergency should still work at parts='+stock);
  assert.ok(s.supply.food>0,'food is still supplied');
  assert.ok(s.supply.parts>=stock,'no existing parts removed');
  assert.ok(s.supply.parts-stock<=2,'max 2 new parts');
  assert.ok(s.supply.parts<=Math.max(stock,12));
  assert.ok(s.supply.medicine-beforeMedicine===0||s.supply.medicine-beforeMedicine===1,
   'existing medicine rule unchanged');
 }
});

test('full repair stock prevents wasteful salvage without consuming the pending expedition',()=>{
 for(const stock of [12,81]){
  const s=quest(stock);
  const prev=JSON.stringify(s.scavenge.pending);
  const r=resolveScavengeChoice(s,'salvage',{day:1});
  assert.equal(r.good,false);
  assert.match(r.msg,/부품 비축이 충분/);
  assert.equal(JSON.stringify(s.scavenge.pending),prev);
  assert.equal(s.scavenge.expeditionCount,0);
  assert.equal(s.supply.parts,stock);
  assert.equal(s.scavenge.lastResolvedDay,0);
 }
 const ui=read('src/eventBoard.js');
 assert.match(ui,/btn.disabled=\(decision==='scout'/);
 assert.match(ui,/decision==='salvage'&&\(state\?\.supply\?\.parts\?\?0\)>=REPAIR_PARTS_RESERVE/);
 assert.match(ui,/부품 비축 충분/);
});

test('salvage found scrap gives 1–2 parts, clipped to stock room; random full-stock scrap becomes food',()=>{
 let salvageCount=0,alternateCount=0;
 for(let seed=1;seed<=180;seed++){
  const a=quest(10,seed);
  const r=resolveScavengeChoice(a,'salvage',{day:1});
  assert.equal(r.good,true);
  if(r.outcome==='supplies'){
   salvageCount++;
   assert.ok(a.supply.parts>=11&&a.supply.parts<=12);
   assert.match(r.msg,/부품 \+[12]/);
  }else assert.equal(a.supply.parts,10,'unsuccessful salvage grants no parts');
  const b=quest(81,seed),beforeFood=b.supply.food;
  const g=resolveScavengeChoice(b,'go',{day:1});
  if(g.outcome==='supplies'&&g.msg.includes('부품 비축이 충분해')){
   alternateCount++;
   assert.equal(b.supply.parts,81);
   assert.equal(b.supply.food,beforeFood+1);
  }
 }
 assert.ok(salvageCount>=30,'successful salvage is still meaningful when stocks are low');
 assert.ok(alternateCount>=2,'full-stock spare parts can become useful food');
});

test('radio helicopter and companion part sources are also capped, without altering medical drops',()=>{
 let found=0;
 for(let seed=1;seed<=5000&&found<2;seed++){
  const s=defaults(now);
  s.kit.radio=true;s.scavenge.seed=seed;s.supply.parts=81;
  const r=requestRadioContact(s,1);
  if(r.kind==='drop'&&r.msg.includes('수리 부품이 충분해')){
   assert.equal(s.supply.parts,81);
   assert.equal(s.supply.food,5);
   found++;
  }
 }
 assert.ok(found>0,'a full-stock radio supply drop is safely handled');
 assert.equal(COMPANION_BALANCE.salvageCap,12);
 const c=defaults(now);
 c.companion.present=true;c.companion.health=78;
 c.supply.parts=12;c.supply.food=20;c.supply.water=20;
 for(let i=0;i<2881;i++)applyCompanionMinute(c,4,'cloud');
 assert.equal(c.supply.parts,12,'passive salvage cannot inflate the reserve');
});

test('all repair consumers retain their original part costs and medicine supply is not rebalanced',()=>{
 const code=read('src/simulation.js');
 const scavenge=read('src/scavengeDirector.js');
 const companion=read('src/supportCompanion.js');
 assert.match(code,/s.supply.parts-=2;/);
 assert.match(code,/if\(s.supply.parts<1\)return out\(false,'물자 고정용/);
 assert.match(code,/if\(r>\.65\)s.supply.medicine\+\+/);
 assert.match(scavenge,/s.supply.medicine\+=2;msg='구조 헬기에서 응급 치료제 2개/);
 assert.match(companion,/s.supply.medicine=Math.min\(999,s.supply.medicine\+1\)/);
 assert.match(read('src/explorationMapV78.js'),/s.supply.parts-=4;tower.reservedParts=4/);
 assert.doesNotMatch(read('src/repairPartsBalanceV95.js'),/medicine|food|water/);
});
