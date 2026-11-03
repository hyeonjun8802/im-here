import test from 'node:test';
import assert from 'node:assert/strict';
// Browser entry is tested by text-level review; event classifier is portable and UI tests require DOM.
import {defaults,applyAction,advance,sanitize,DAY_MS} from '../src/simulation.js';

test('existing saves adopt raider fields',()=>{
 const s=defaults(Date.UTC(2026,10,3));delete s.raiderAlert;delete s.raiderCooldownAt;
 const z=sanitize(s,Date.UTC(2026,10,3));assert.equal(z.raiderAlert,false);assert.equal(z.raiderCooldownAt,0);
});
test('a storage lock prevents imminent theft without combat',()=>{
 const s=defaults(Date.UTC(2026,10,3));s.raiderAlert=true;s.raiderUntilAt=s.lastTickAt+60000;
 const food=s.supply.food,parts=s.supply.parts;
 const r=applyAction(s,'secure_storage',s.lastTickAt);
 assert.equal(r.good,true);assert.equal(s.raiderAlert,false);assert.equal(s.supply.parts,parts-1);
 advance(s,s.lastTickAt+4*60000);assert.equal(s.supply.food,food);
});
test('storage lock is unavailable without a raid',()=>{
 const s=defaults(Date.UTC(2026,10,3));assert.equal(applyAction(s,'secure_storage').good,false);
});
test('offline raider resolution never steals food',()=>{
 const n=Date.UTC(2026,10,3),s=defaults(n);s.raiderAlert=true;s.raiderUntilAt=n+60000;
 const food=s.supply.food;advance(s,n+3*60000,true);assert.equal(s.supply.food,food);
});
