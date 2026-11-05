import test from 'node:test';
import assert from 'node:assert/strict';
import {VISUAL_WEATHER,WEATHER_KEYS,integrateWeather,determineWeatherPhase,visualTargets} from '../src/weatherDirector.js';
test('all original weather modes support finite bounded visual channels',()=>{
 for(const [name,v] of Object.entries(VISUAL_WEATHER)){
  assert.equal(WEATHER_KEYS.length,11);
  for(const key of WEATHER_KEYS){assert.equal(typeof v[key],'number',`${name}:${key}`);assert.ok(v[key]>=0&&v[key]<=1,`${name}:${key}`);}
 }
});
test('time-based blending never switches to full rain in one frame',()=>{
 const start=visualTargets('clear');const next=integrateWeather(start,'storm',1/60);
 assert.ok(next.rain>0&&next.rain<.03);assert.ok(next.cloud>start.cloud);
});
test('long-running transitions converge to target state without day-clock changes',()=>{
 let w=visualTargets('clear');for(let i=0;i<2400;i++)w=integrateWeather(w,'rain',1/60);
 assert.ok(Math.abs(w.rain-.85)<.002);assert.ok(Math.abs(w.wet-.94)<.002);
});
test('visual interpolation is independent of frame batch size',()=>{
 let a=visualTargets('clear');for(let i=0;i<60;i++)a=integrateWeather(a,'storm',1/60);
 const b=integrateWeather(visualTargets('clear'),'storm',1);
 for(const k of WEATHER_KEYS)assert.ok(Math.abs(a[k]-b[k])<1e-9,`${k}`);
});
test('weather recovery retains wet surfaces after rain stops, then dries',()=>{
 const start=visualTargets('storm'),next=integrateWeather(start,'clear',.2);
 assert.ok(next.wet>.95);assert.ok(next.rain>.94);
 let w=start;for(let i=0;i<40;i++)w=integrateWeather(w,'clear',1);
 assert.ok(w.wet<.052);assert.ok(w.rain<.002);
});
test('tornado remains a distant event and storm-specific particle effect',()=>{
 assert.equal(visualTargets('tornado').tornado,1);
 assert.equal(visualTargets('storm').tornado,0);
 assert.equal(determineWeatherPhase(visualTargets('tornado')),'impact');
});
test('unknown visual weather gracefully falls back to clear without changing game state',()=>{
 assert.equal(visualTargets('unknown'),VISUAL_WEATHER.clear);
});
