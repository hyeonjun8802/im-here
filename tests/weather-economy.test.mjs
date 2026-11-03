import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {defaults,sanitize,advance,applyAction,DAY_MS} from '../src/simulation.js';
import {WEATHER_WATER_CAPACITY,WEATHER_RAIN_DAILY_LIMIT,
  defaultWeatherEconomy,applyWeatherEconomyMinute,describeWeatherEconomy} from '../src/weatherEconomy.js';

const start=Date.UTC(2026,10,4,0,0);
const tick=(s,weather,minutes,day=1)=>{s.weather=weather;for(let i=0;i<minutes;i++)applyWeatherEconomyMinute(s,weather,day)};

test('rain automatically fills the filtered drinking water tank without clicking',()=>{
 const s=defaults(start);s.supply.water=3;
 tick(s,'rain',24);
 assert.equal(s.supply.water,4);
 assert.ok(s.weatherEconomy.waterHarvestProgress>0);
 assert.match(describeWeatherEconomy(s),/자동 정수/);
});

test('rain and thunderstorms have a bounded daily yield and a tank capacity',()=>{
 const s=defaults(start);s.supply.water=0;
 tick(s,'storm',300);
 assert.equal(s.supply.water,WEATHER_RAIN_DAILY_LIMIT);
 tick(s,'rain',600);
 assert.equal(s.supply.water,WEATHER_RAIN_DAILY_LIMIT,'daily cap prevents infinite water');
 tick(s,'rain',1000,2);
 assert.equal(s.supply.water,WEATHER_RAIN_DAILY_LIMIT*2,'new game day resets yield cap');
 const full=defaults(start);full.supply.water=WEATHER_WATER_CAPACITY;
 tick(full,'storm',1000);
 assert.equal(full.supply.water,WEATHER_WATER_CAPACITY,'overfilled tank never gains water');
});

test('broken tank cannot harvest rain until repaired; moderately damaged tank harvests slower',()=>{
 const broken=defaults(start),damaged=defaults(start),healthy=defaults(start);
 for(const s of [broken,damaged,healthy])s.supply.water=0;
 broken.facilities.tank=18;damaged.facilities.tank=50;
 tick(broken,'rain',90);tick(damaged,'rain',40);tick(healthy,'rain',40);
 assert.equal(broken.supply.water,0);
 assert.ok(damaged.supply.water<healthy.supply.water);
 assert.match(describeWeatherEconomy(broken),/정수 불가/);
 assert.equal(applyAction(broken,'collect_water',start).good,false);
 // Repair takes parts and makes the rain filter functional again.
 assert.equal(applyAction(broken,'repair',start).good,true);
 assert.ok(broken.facilities.tank>=40);
 tick(broken,'rain',60);
 assert.ok(broken.supply.water>0);
});

test('heat evaporates stored clean water, more rapidly when tank is damaged',()=>{
 const intact=defaults(start),damaged=defaults(start),cloudy=defaults(start);
 for(const s of [intact,damaged,cloudy])s.supply.water=12;
 damaged.facilities.tank=45;
 tick(intact,'heat',50);tick(damaged,'heat',50);tick(cloudy,'cloud',50);
 assert.ok(intact.supply.water<12,'even an intact old tank loses stored water');
 assert.ok(damaged.supply.water<intact.supply.water,'cracked tank loses water faster in extreme heat');
 assert.equal(cloudy.supply.water,12);
 assert.match(describeWeatherEconomy(intact),/자동 증발/);
});

test('hot weather can spoil exposed food; safe storage and cold weather protect it',()=>{
 const exposed=defaults(start),secure=defaults(start),cold=defaults(start);
 for(const s of [exposed,secure,cold]){s.supply.food=8;s.facilities.storage=15;}
 secure.facilities.storage=90;
 tick(exposed,'heat',180);tick(secure,'heat',180);tick(cold,'cold',180);
 assert.ok(exposed.supply.food<8,'unprotected food must spoil during a heatwave');
 assert.equal(secure.supply.food,8,'sealed food keeps in heat');
 assert.equal(cold.supply.food,8,'cold weather preserves food');
});

test('one cold spell can freeze water in a cracked tank, never repeat on each frame',()=>{
 const s=defaults(start);s.weatherEpisode=9;s.supply.water=6;s.facilities.tank=25;
 tick(s,'cold',1);
 assert.equal(s.supply.water,5);
 tick(s,'cold',1);
 assert.equal(s.supply.water,5,'cold damage is once per weather episode');
 s.weatherEpisode=10;
 tick(s,'cold',1);
 assert.equal(s.supply.water,4,'new cold episode can be risky');
});

test('auto rain collection is deterministic with minute tick batching and persists across reloads',()=>{
 const a=defaults(start),b=defaults(start);
 for(const s of [a,b]){
   s.weather='rain';s.nextWeatherAt=start+4*DAY_MS;s.pendingWeather='rain';s.supply.water=0;
 }
 advance(a,start+110*60000);
 for(let t=60000;t<=110*60000;t+=60000)advance(b,start+t);
 assert.equal(a.supply.water,b.supply.water);
 assert.deepEqual(a.weatherEconomy,b.weatherEconomy);
 const restored=sanitize(JSON.parse(JSON.stringify(a)),start+110*60000);
 assert.deepEqual(restored.weatherEconomy,a.weatherEconomy);
 advance(restored,start+120*60000);
 advance(a,start+120*60000);
 assert.equal(restored.supply.water,a.supply.water);
 assert.deepEqual(restored.weatherEconomy,a.weatherEconomy);
});

test('manual rain filtering is additional but cannot bypass tank capacity',()=>{
 const s=defaults(start);s.weather='rain';s.supply.water=WEATHER_WATER_CAPACITY-1;
 const action=applyAction(s,'collect_water',start);
 assert.equal(action.good,true);
 assert.equal(s.supply.water,WEATHER_WATER_CAPACITY);
 assert.equal(applyAction(s,'collect_water',start+1).good,false);
});

test('automatic gains and losses never go negative or exceed capacity',()=>{
 const s=defaults(start);s.supply.water=0;s.supply.food=0;s.facilities.tank=20;
 for(let i=0;i<1000;i++)applyWeatherEconomyMinute(s,i%2?'heat':'storm',1+Math.floor(i/1440));
 assert.equal(s.supply.water,0);
 assert.equal(s.supply.food,0);
 assert.ok(s.weatherEconomy.waterEvaporationProgress<1);
 const high=defaults(start);high.supply.water=15;
 tick(high,'storm',800);
 assert.ok(high.supply.water<=WEATHER_WATER_CAPACITY);
});

test('preview weather is separate from actual resource-changing weather, and HUD exposes effects',()=>{
 const sim=readFileSync(new URL('../src/simulation.js',import.meta.url),'utf8');
 const world=readFileSync(new URL('../src/world.js',import.meta.url),'utf8');
 const main=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
 const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
 assert.match(sim,/applyWeatherEconomyMinute\(s,e,getDay\(s\.startedAt,tickTime\)\)/);
 assert.match(world,/this\.previewWeather\|\|game\.weather/);
 assert.match(main,/describeWeatherEconomy\(state\)/);
 assert.match(html,/id="weather-effect"/);
});

test('player can prioritize the water filter repair instead of repairing the weakest other facility',()=>{
 const s=defaults(start);
 s.facilities.tank=70;s.facilities.storage=22;s.supply.parts=4;
 const response=applyAction(s,'repair_tank',start);
 assert.equal(response.good,true);
 assert.equal(s.facilities.tank,100,'water tank receives the full targeted repair');
 assert.equal(s.facilities.storage,22,'storage is untouched');
 assert.equal(s.supply.parts,2);
 assert.equal(applyAction(s,'repair_tank',start+1).good,false,'repair is not free at full integrity');
});
test('critical tank failure grants an emergency exploration reason for new repair parts',()=>{
 const s=defaults(start);
 s.supply.food=9;s.supply.water=10;s.health=80;
 s.facilities.shelter=90;s.facilities.tank=30;s.supply.parts=0;
 assert.equal(applyAction(s,'explore',start).good,true);
 const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
 assert.match(html,/id="repair-tank"/);
});
