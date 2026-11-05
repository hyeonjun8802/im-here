import test from 'node:test';import assert from 'node:assert/strict';import {defaults,sanitize,advance,getDay,applyAction,localHour,DAY_MS} from '../src/simulation.js';
test('days use real elapsed days and boundary',()=>{const x=Date.UTC(2028,1,28,15);assert.equal(getDay(x,x),1);assert.equal(getDay(x,x+DAY_MS-1),1);assert.equal(getDay(x,x+DAY_MS),2);assert.equal(getDay(x,x+2*DAY_MS),3)});
test('negative clock tampering does not decrement',()=>{const n=Date.UTC(2026,9,31),s=defaults(n);advance(s,n-1000);assert.equal(s.lastTickAt,n);assert.equal(getDay(n,n-100000),1)});
test('offline cap prevents huge resource drain',()=>{const n=Date.UTC(2026,9,31),s=defaults(n);advance(s,n+100*DAY_MS,true);assert(s.health>=0);assert(s.food>=0);assert(s.water>=0);assert(s.facilities.shelter>=0)});
test('weather deterministic',()=>{const n=Date.UTC(2026,9,31),a=defaults(n),b=defaults(n);advance(a,n+DAY_MS);advance(b,n+DAY_MS);assert.equal(a.weather,b.weather);assert.equal(a.weatherSeed,b.weatherSeed)});
test('drinking consumes inventory',()=>{const s=defaults(123);const o=s.supply.water;assert(applyAction(s,'drink').good);assert.equal(s.supply.water,o-1)});
test('explore gated',()=>{const s=defaults(123);assert.equal(applyAction(s,'explore').good,false);s.supply.food=0;assert.equal(applyAction(s,'explore').good,true)});
test('sanitize clamps',()=>{const n=12345678,s=defaults(n);s.health=500;s.supply.water=-3;const z=sanitize(s,n);assert.equal(z.health,100);assert.equal(z.supply.water,0)});
test('KST hour valid',()=>{const n=Date.UTC(2026,9,31,0,0,0);assert.equal(localHour(n),9)});

test('DAY increments after 24 in-game hours, not at a partial KST midnight',()=>{const start=Date.UTC(2026,9,31,14,58),atSeoulMidnight=Date.UTC(2026,9,31,15,0);assert.equal(getDay(start,atSeoulMidnight),1);assert.equal(getDay(start,start+DAY_MS-1),1);assert.equal(getDay(start,start+DAY_MS),2)});

test('minute chunks and one large advance have equivalent outcomes',()=>{const n=Date.UTC(2026,9,31),a=defaults(n),b=defaults(n);advance(a,n+3600000,true);for(let t=60000;t<=3600000;t+=60000)advance(b,n+t);for(const k of ['food','water','health','temperature','weather','pendingWeather','weatherSeed'])assert.equal(a[k],b[k]);assert.deepEqual(a.supply,b.supply);assert.deepEqual(a.facilities,b.facilities)});
test('weather change schedule does not depend on render FPS',()=>{const n=Date.UTC(2026,9,31),a=defaults(n),b=defaults(n);advance(a,n+3*3600000);for(let t=10000;t<=3*3600000;t+=10000)advance(b,n+t);assert.equal(a.weather,b.weather);assert.equal(a.weatherSeed,b.weatherSeed)});


test('legacy seven-day forecast is migrated into the 24-hour window without delaying due events',()=>{
  const now=1_800_000_000_000;
  const future=defaults(now);
  delete future.weatherScheduleVersion; // truly old save; v9.3 saves preserve a multi-day forecast
  future.majorDisasterAt=now+7*DAY_MS;
  const migrated=sanitize(future,now);
  assert.equal(migrated.majorDisasterAt,now+24*60*60*1000);

  const due=defaults(now);
  due.majorDisasterAt=now-60_000;
  const kept=sanitize(due,now);
  assert.equal(kept.majorDisasterAt,now-60_000);
});
