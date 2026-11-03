import test from 'node:test';
import assert from 'node:assert/strict';
import {defaults,sanitize,advance} from '../src/simulation.js';
import {selectStormBuilding} from '../src/nearTornadoVfx.js';
import {visualTargets,integrateWeather} from '../src/weatherDirector.js';

test('cinematic vortex selects a real mid-distance ruin; not the inhabited rooftop',()=>{
  const slots=[
    {id:'near-a',tier:'near',x:56,z:52,height:32},
    {id:'mid-a',tier:'mid',x:-91,z:-96,height:31},
    {id:'mid-b',tier:'mid',x:116,z:-2,height:36},
    {id:'far-a',tier:'far',x:-95,z:-94,height:35}
  ];
  const selected=selectStormBuilding(slots);
  assert.equal(selected.id,'mid-a');
  assert.equal(selectStormBuilding([]),null);
});

test('real tornado collapses one skyline building and persists in save data',()=>{
  const n=Date.UTC(2026,10,3,10,0,0);
  const state=defaults(n);
  state.weather='tornado';
  advance(state,n+60000);
  assert.equal(state.tornadoCityDamaged,true);
  assert.equal(state.events.filter(x=>x.includes('건물')).length,1);
  advance(state,n+120000);
  assert.equal(state.events.filter(x=>x.includes('건물')).length,1);
  const restored=sanitize(JSON.parse(JSON.stringify(state)),n+120000);
  assert.equal(restored.tornadoCityDamaged,true);
});

test('weather visual preview has no saved building collapse side effect',()=>{
  const n=Date.UTC(2026,10,3,10,0,0);
  const state=defaults(n);
  let visual=visualTargets('clear');
  visual=integrateWeather(visual,'tornado',1,4.7);
  assert.ok(visual.tornado>0);
  assert.equal(state.weather,'clear');
  assert.equal(state.tornadoCityDamaged,false);
});

test('existing saves safely migrate the new city damage flag',()=>{
  const n=Date.UTC(2026,10,3);
  const state=defaults(n);
  delete state.tornadoCityDamaged;
  assert.equal(sanitize(state,n).tornadoCityDamaged,false);
});
