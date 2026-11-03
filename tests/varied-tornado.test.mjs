import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {selectVariedStormBuildings, NearTornadoVfx} from '../src/nearTornadoVfx.js';
import {defaults, sanitize, recordTornadoDamage} from '../src/simulation.js';
import {planDistantCity,SPATIAL_LAYOUT} from '../src/spatialLayout.js';
import {contractCitySlot,settleContractedCity} from '../src/cityContraction.js';
import {readFileSync} from 'node:fs';

const city=[...[
  [-210,-160], [210,-150], [-160,220], [220,220]
].flatMap(([x,z],group)=>[-36,0,36].map((dx,i)=>({
  id:`district-${group}-${i}`,tier:'mid',x:x+dx,z,height:32,width:16,rotation:0
})))];

function fakeWorld(){
  const scene=new THREE.Scene();
  const cityBuildings=new Map();
  for(const slot of city){
    const mesh=new THREE.Group();mesh.position.set(slot.x,-23.5,slot.z);
    scene.add(mesh);cityBuildings.set(slot.id,mesh);
  }
  return {scene,isMobile:true,distantCityPlan:city,cityBuildings,
    cityArchitecture:{setBuildingDamaged(){}}};
}

test('different tornado encounters visit different real neighborhoods and never cross the camp',()=>{
  const encountered=new Set();
  let previous=null;
  for(let i=1;i<=12;i++){
    const sites=selectVariedStormBuildings(city,{seed:i*7919,previousCenterId:previous});
    assert.equal(sites.length,3);
    assert.equal(new Set(sites.map(s=>s.id)).size,3);
    assert.ok(sites.every(s=>Math.hypot(s.x,s.z)>=100));
    const mid=sites[1];
    assert.ok(Math.hypot(sites[0].x-mid.x,sites[0].z-mid.z)<142);
    assert.ok(Math.hypot(sites[2].x-mid.x,sites[2].z-mid.z)<142);
    assert.notEqual(sites[1].id,previous,'previous center must not be chosen twice in succession');
    encountered.add(sites[1].id);
    previous=sites[1].id;
  }
  assert.ok(encountered.size>=3,'the tornado should visit multiple districts');
});

test('destroyed buildings survive later tornado encounters and saved reloads',()=>{
  const saved=defaults(Date.UTC(2026,10,4));
  const first=selectVariedStormBuildings(city,{seed:33});
  assert.equal(recordTornadoDamage(saved,first.map(s=>s.id)),true);
  const next=selectVariedStormBuildings(city,{
    seed:99,previousCenterId:first[1].id,damagedIds:saved.tornadoDamagedIds
  });
  assert.ok(next.every(s=>!saved.tornadoDamagedIds.includes(s.id)));
  assert.equal(recordTornadoDamage(saved,next.map(s=>s.id)),true);
  assert.equal(saved.tornadoDamageCount,6);
  assert.equal(recordTornadoDamage(saved,[first[0].id]),false);
  const loaded=sanitize(JSON.parse(JSON.stringify(saved)),Date.UTC(2026,10,4,0,1));
  assert.equal(loaded.tornadoDamageCount,6);
  assert.equal(new Set(loaded.tornadoDamagedIds).size,6);
});

test('all damaged buildings remain collapsed even if an undamaged one sorts first',()=>{
  const world=fakeWorld();
  const fx=new NearTornadoVfx(world);
  const first=city.slice(0,3).map(s=>s.id);
  const later=city.slice(3,6).map(s=>s.id);
  fx.setStormSites(first);
  fx.updateDestruction(.05,false,0,false,()=>{},[first[1],first[2]]);
  assert.equal(fx.damageSites.get(first[0]).ruined.visible,false);
  assert.equal(fx.damageSites.get(first[1]).ruined.visible,true);
  assert.equal(fx.damageSites.get(first[2]).ruined.visible,true);
  fx.setStormSites(later);
  fx.updateDestruction(.05,false,0,false,()=>{},[first[1],first[2],later[0]]);
  for(const id of [first[1],first[2],later[0]]){
    assert.equal(fx.damageSites.get(id).host.visible,false);
    assert.equal(fx.damageSites.get(id).ruined.visible,true);
  }
  fx.dispose();
});


test('real contracted desktop and mobile city produce multiple RANDOM tornado origins (no fixed fallback)',()=>{
  const seeded=n=>{const v=Math.sin(n*127.1+46.4)*43758.5453;return v-Math.floor(v);};
  for(const mobile of [false,true]){
    const lots=settleContractedCity(planDistantCity(mobile,seeded).map(contractCitySlot));
    // This was the regression: near/mid lots shrink inside radius 150, so the
    // previous near/mid-only filter always returned the SAME fixed path.
    assert.equal(lots.filter(s=>['near','mid'].includes(s.tier)&&
      Math.hypot(s.x,s.z)>=SPATIAL_LAYOUT.clearZoneRadius+10).length,0);
    const starts=new Set(),centers=new Set(),quadrants=new Set();
    let previous=null;
    for(let n=1;n<=24;n++){
      const track=selectVariedStormBuildings(lots,{seed:n*7129+mobile*41,previousCenterId:previous});
      assert.equal(track.length,3,'must select a three-building track in the real city');
      assert.equal(new Set(track.map(s=>s.id)).size,3);
      for(const s of track){
        assert.ok(lots.some(l=>l.id===s.id),'every storm target is a real building');
        assert.ok(Math.hypot(s.x,s.z)>=SPATIAL_LAYOUT.clearZoneRadius+16,'ground path stays out of the survivor camp');
      }
      assert.notEqual(track[1].id,previous,'neighboring storms cannot reuse the same center');
      starts.add(track[0].id);
      centers.add(track[1].id);
      quadrants.add(`${Math.sign(track[1].x)}:${Math.sign(track[1].z)}`);
      previous=track[1].id;
    }
    assert.ok(starts.size>=6,`different initial positions on ${mobile?'mobile':'desktop'}: ${starts.size}`);
    assert.ok(centers.size>=6,'multiple distinct neighborhoods must be visited');
    assert.ok(quadrants.size>=3,'tornadoes must come from different compass directions');
  }
});

test('new release rejects stale fixed-spawn locations while keeping permanent ruin IDs',()=>{
  const world=readFileSync(new URL('../src/world.js',import.meta.url),'utf8');
  assert.match(world,/tornadoSpawnVersion!==2/);
  assert.match(world,/game\\.tornadoCurrentSites=\\[\\]/);
  assert.match(world,/Math\\.floor\\(Math\\.random\\(\\)\\*0x7fffffff\\)/);
  assert.match(world,/game\\.tornadoDamagedIds/);
});
