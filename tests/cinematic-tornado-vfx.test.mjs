import * as THREE from 'three';
import {planDistantCity} from '../src/spatialLayout.js';
import {contractCitySlot,settleContractedCity} from '../src/cityContraction.js';
import {CityArchitecture} from '../src/cityArchitecture.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {defaults,sanitize,advance,recordTornadoDamage} from '../src/simulation.js';
import {selectStormBuilding,selectStormBuildings,stormTrackPoint,NearTornadoVfx} from '../src/nearTornadoVfx.js';
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

test('preview visual weather does not affect gameplay until a tower actually collapses',()=>{
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

test('actual 3D city plan supports a visible sweep through three distinct towers',()=>{
  const rand=n=>{const q=Math.sin(n*127.1+46.4)*43758.5453;return q-Math.floor(q)};
  for(const mobile of [false,true]){
    const lots=settleContractedCity(planDistantCity(mobile,rand).map(contractCitySlot));
    const selected=selectStormBuildings(lots);
    assert.equal(selected.length,3,'three real lots should be available on both device layouts');
    assert.equal(new Set(selected.map(x=>x.id)).size,3);
    assert.ok(selected[2].x-selected[0].x>14,'storm moves laterally across real streets');
    assert.ok(selected.every(x=>Math.hypot(...stormTrackPoint(x).filter((_,i)=>i!==1))>=100));
  }
});

test('upper-story balconies vanish only while a building is damaged',()=>{
  const scene=new THREE.Scene();
  const lot={id:'mid-demo',tier:'mid',x:-91,z:-96,height:31,width:14,rotation:0};
  const facade=new CityArchitecture(scene,[lot],[],false);
  const byType=facade.upperDetailsByBuilding.get(lot.id);
  assert.ok(byType && Object.keys(byType).length>0);
  const [kind,indices]=Object.entries(byType)[0];
  const mesh=facade.meshByType[kind],idx=indices[0];
  const before=new THREE.Matrix4(),collapsed=new THREE.Matrix4(),restored=new THREE.Matrix4();
  mesh.getMatrixAt(idx,before);
  facade.setBuildingDamaged(lot.id,true);
  mesh.getMatrixAt(idx,collapsed);
  assert.ok(Math.abs(collapsed.determinant())<1e-7,'upper fixture should be hidden');
  facade.setBuildingDamaged(lot.id,false);
  mesh.getMatrixAt(idx,restored);
  assert.deepEqual(restored.elements,before.elements,'preview restoration must be exact');
  for(const item of facade.meshes){item.geometry.dispose();item.material.dispose();}
});

test('a preview tornado impact is permanently recorded, never restored by clear weather',()=>{
  const n=Date.UTC(2026,10,3,10,0,0);
  const state=defaults(n);
  const damaged=[];
  const makeWorld=()=>{
    const scene=new THREE.Scene();
    const cityBuildings=new Map();
    for(const slot of sceneSlots){
      const group=new THREE.Group();
      group.position.set(slot.x,-23.5,slot.z);
      scene.add(group);
      cityBuildings.set(slot.id,group);
    }
    return {scene,isMobile:false,distantCityPlan:sceneSlots,cityBuildings,
      cityArchitecture:{setBuildingDamaged(id,flag){damaged.push({id,flag});}}};
  };
  const original=new NearTornadoVfx(makeWorld());
  let callbacks=0;
  const commit=count=>{callbacks+=1;recordTornadoDamage(state,count,'preview');};
  original.exposure=11.4;
  original.updateDestruction(.05,true,0,true,commit);
  assert.equal(state.tornadoDamageCount,2);
  assert.equal(callbacks,1);
  const sites=original.impacts;
  assert.ok(sites[0].progress>0 && sites[1].progress>0);
  // Returning to clear weather must finish the collapse, not reverse it.
  original.exposure=0;
  original.updateDestruction(.05,false,state.tornadoDamageCount,false,commit);
  assert.equal(callbacks,1);
  for(const site of sites.slice(0,2)){
    assert.equal(site.progress,1);
    assert.equal(site.host.visible,false);
    assert.equal(site.ruined.visible,true);
  }
  original.dispose();
  const reloaded=sanitize(JSON.parse(JSON.stringify(state)),n+1000);
  assert.equal(reloaded.tornadoDamageCount,2);
  const reopened=new NearTornadoVfx(makeWorld());
  reopened.updateDestruction(.05,false,reloaded.tornadoDamageCount,false);
  for(const site of reopened.impacts.slice(0,2)){
    assert.equal(site.progress,1);
    assert.equal(site.host.visible,false);
    assert.equal(site.ruined.visible,true);
  }
  assert.ok(damaged.some(e=>e.flag));
  reopened.dispose();
});

test('saved tornado impacts are monotonic and duplicate callbacks do not duplicate damage logs',()=>{
  const state=defaults(Date.UTC(2026,10,3));
  assert.equal(recordTornadoDamage(state,1,'preview'),true);
  assert.equal(recordTornadoDamage(state,1,'preview'),false);
  assert.equal(recordTornadoDamage(state,0,'preview'),false);
  assert.equal(recordTornadoDamage(state,3,'preview'),true);
  assert.equal(recordTornadoDamage(state,2,'preview'),false);
  assert.equal(state.tornadoDamageCount,3);
  assert.equal(state.tornadoCityDamaged,true);
  assert.equal(state.events.filter(e=>e.includes('복구되지 않는다')).length,2);
});
