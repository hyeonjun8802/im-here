import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {selectVariedStormBuildings, NearTornadoVfx} from '../src/nearTornadoVfx.js';
import {defaults, sanitize, recordTornadoDamage} from '../src/simulation.js';

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
    assert.ok(sites[0].x<sites[1].x&&sites[1].x<sites[2].x);
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
