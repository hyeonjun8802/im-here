import test from 'node:test';import assert from 'node:assert/strict';
import {solarPositionForSeoul} from '../src/solar.js';
const t=(y,m,d,h)=>Date.UTC(y,m-1,d,h-9);
test('Seoul dawn and midday respond to actual day of year',()=>{
 const summer=solarPositionForSeoul(t(2026,6,21,12));
 const winter=solarPositionForSeoul(t(2026,12,21,12));
 assert.ok(summer.sunUp && winter.sunUp);
 assert.ok(summer.altitude>winter.altitude+.5);
});
test('Seoul 04:00 is night and 12:00 is day; day changes without preview',()=>{
 assert.ok(solarPositionForSeoul(t(2026,10,31,4)).altitude<0);
 assert.ok(solarPositionForSeoul(t(2026,10,31,12)).altitude>0);
});
test('hour preview changes light but does not change timestamp or date',()=>{
 const utc=t(2026,10,31,18);
 const dawn=solarPositionForSeoul(utc,6),noon=solarPositionForSeoul(utc,12);
 assert.ok(noon.altitude>dawn.altitude);
 assert.equal(dawn.ordinal,noon.ordinal);
});
