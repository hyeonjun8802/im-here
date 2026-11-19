import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {defaults,sanitize,advance,applyAction,DAY_MS} from '../src/simulation.js';
import {planAutoSurvivalAction} from '../src/autoSurvivalV73.js';
import {WEATHER_WATER_CAPACITY,WEATHER_RAIN_DAILY_LIMIT} from '../src/weatherEconomy.js';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const start=Date.UTC(2026,10,19,0,0);

test('rain has no manual action in DOM, urgent tray, AUTO or survival controller',()=>{
 assert.doesNotMatch(read('index.html'),/id="collect-water"/);
 assert.doesNotMatch(read('src/main.js'),/\$\('#collect-water'\)/);
 assert.doesNotMatch(read('src/commonUiAssetsV3.js'),/'collect-water'/);
 assert.doesNotMatch(read('src/autoSurvivalV73.js'),/collect_water/);
 assert.doesNotMatch(read('src/simulation.js'),/if\(action==='collect_water'\)/);
 assert.match(read('src/commonUiAssetsV3.js'),/const emergencyIds=\['take-cover','secure-supplies'\]/);
 assert.match(read('index.html'),/id="functions-toggle"/);
 assert.match(read('index.html'),/id="exploration-hub-toggle"/);
});

test('automatic rain collection is bounded and survives an old manual cooldown field',()=>{
 const s=defaults(start);
 s.kit.purifier=true;s.facilities.tank=90;
 s.weather='rain';s.nextWeatherAt=start+DAY_MS;s.pendingWeather='rain';
 s.supply.water=0;s.collectWaterCooldownAt=start+DAY_MS;
 const initialParts=s.supply.parts;
 advance(s,start+24*60000);
 assert.equal(s.supply.water,1);
 assert.equal(s.supply.parts,initialParts);
 const restored=sanitize(JSON.parse(JSON.stringify(s)),start+24*60000);
 advance(restored,start+180*60000);
 assert.equal(restored.supply.water,WEATHER_RAIN_DAILY_LIMIT);
 assert.equal(restored.supply.parts,initialParts);
 assert.ok(restored.supply.water<=WEATHER_WATER_CAPACITY);
 assert.notEqual(planAutoSurvivalAction(restored,start+180*60000),'collect_water');
});

test('retired collect_water action gives no free resource and does not use repair parts',()=>{
 const s=defaults(start);
 s.weather='storm';s.kit.purifier=false;s.supply.water=2;s.supply.parts=3;
 const oldCooldown=s.collectWaterCooldownAt;
 assert.equal(applyAction(s,'collect_water',start).good,false);
 assert.equal(s.supply.water,2);
 assert.equal(s.supply.parts,3);
 assert.equal(s.collectWaterCooldownAt,oldCooldown);
});
