import test from 'node:test';
import assert from 'node:assert/strict';
import {defaults,sanitize,advance} from '../src/simulation.js';
import {selectStormBuilding,selectStormBuildings,stormTrackPoint} from '../src/nearTornadoVfx.js';
import {visualTargets,integrateWeather} from '../src/weatherDirector.js';

const sceneSlots=[
  {id:'near-a',tier:'near',x:56,z:52,height:32},
  {id:'mid-left',tier:'mid',x:-124,z:-106,height:33},
  {id:'mid-a',tier:'mid',x:-91,z:-96,height:31},
  {id:'mid-right',tier:'mid',x:-58,z:-101,height:30},
  {id:'mid-b',tier:'mid',x:116,z:-2,height:36},
  {id:'far-a',tier:'far',x:-95,z:-94,height:35}
];

test('vortex selects three separate real buildings in left-to-right order',()=>{
  assert.equal(selectStormBuilding(sceneSlots).id,'mid-a');
  const picked=selectStormBuildings(sceneSlots);
  assert.deepEqual(picked.map(s=>s.id),['mid-left','mid-a','mid-right']);
  for(const slot of picked){
    const [x,y,z]=stormTrackPoint(slot);
    assert.ok(Math.hypot(x,z)>=100,'storm ground contact must remain outside the roof');
    assert.equal(y,-23.4);
  }
  assert.deepEqual(selectStormBuildings([]),[]);
});

test('real tornado damages up to three buildings, one per elapsed minute',()=>{
  const n=Date.UTC(2026,10,3,10,0,0);
  const state=defaults(n);state.weather='tornado';
  for(let minute=1;minute<=4;minute++){
    advance(state,n+minute*60000);
    assert.equal(state.tornadoDamageCount,Math.min(minute,3));
  }
  assert.equal(state.tornadoCityDamaged,true);
  assert.equal(state.events.filter(s=>s.includes('폐허 건물')).length,3);
  const restored=sanitize(JSON.parse(JSON.stringify(state)),n+240000);
  assert.equal(restored.tornadoDamageCount,3);
  assert.equal(restored.tornadoCityDamaged,true);
});

test('weather preview changes visuals but never alters the saved damage count',()=>{
  const n=Date.UTC(2026,10,3,10,0,0);
  const state=defaults(n);
  const preview=integrateWeather(visualTargets('clear'),'tornado',1,4.7);
  assert.ok(preview.tornado>0);
  assert.equal(state.weather,'clear');
  assert.equal(state.tornadoDamageCount,0);
  assert.equal(state.tornadoCityDamaged,false);
});

test('old save with previous single-building flag retains one collapsed building',()=>{
  const n=Date.UTC(2026,10,3);
  const old=defaults(n);old.tornadoCityDamaged=true;delete old.tornadoDamageCount;
  const migrated=sanitize(old,n);
  assert.equal(migrated.tornadoDamageCount,1);
  assert.equal(migrated.tornadoCityDamaged,true);
});

test('corrupt damage values are clamped without changing save version',()=>{
  const n=Date.UTC(2026,10,3);
  const s=defaults(n);s.tornadoDamageCount=999;
  assert.equal(sanitize(s,n).tornadoDamageCount,3);
  s.tornadoDamageCount=-50;s.tornadoCityDamaged=false;
  assert.equal(sanitize(s,n).tornadoDamageCount,0);
  assert.equal(sanitize(s,n).version,4);
});
