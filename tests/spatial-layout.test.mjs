import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {SPATIAL_LAYOUT,planDistantCity,outsideHeroClearZone} from '../src/spatialLayout.js';
import {stormTrackPoint,selectVariedStormBuildings} from '../src/nearTornadoVfx.js';
const seeded=n=>{const x=Math.sin(n*127.1+46.4)*43758.5453;return x-Math.floor(x)};
const src=fs.readFileSync('src/world.js','utf8');
test('one and only one inhabited rooftop is the game center',()=>{
  assert.equal(SPATIAL_LAYOUT.heroRoofCount,1);
  assert.equal(SPATIAL_LAYOUT.heroRoofHalfWidth,23);
  assert.ok(SPATIAL_LAYOUT.clearZoneRadius>SPATIAL_LAYOUT.heroRoofHalfWidth*5);
});
test('all desktop 3D background buildings are beyond empty buffer zone',()=>{
  const buildings=planDistantCity(false,seeded);
  assert.equal(buildings.length,SPATIAL_LAYOUT.desktopCityBuildings);
  for(const b of buildings){
    const r=Math.hypot(b.x,b.z);
    assert.ok(r>=SPATIAL_LAYOUT.cityMinRadius-1e-9,`distance ${r}`);
    assert.ok(r<=SPATIAL_LAYOUT.cityMaxRadius+1e-9,`distance ${r}`);
    assert.ok(outsideHeroClearZone(b.x,b.z));
  }
});
test('mobile distance and density retain single rooftop composition',()=>{
  const buildings=planDistantCity(true,seeded);
  assert.equal(buildings.length,SPATIAL_LAYOUT.mobileCityBuildings);
  assert.ok(buildings.every(b=>outsideHeroClearZone(b.x,b.z)));
});
test('roads and abandoned cars are far behind the hero tower',()=>{
  assert.ok(SPATIAL_LAYOUT.distantRoadOffset>=SPATIAL_LAYOUT.distantVehicleMinRadius);
  assert.match(src,/SPATIAL_LAYOUT\.distantRoadOffset/);
  assert.doesNotMatch(src,/r=43\+RAND/);
  assert.doesNotMatch(src,/\[84,-23\.45,0\]/);
});
test('nearby rooftop buildings never created by a second scene function',()=>{
  assert.match(src,/this\.distantCityPlan=settleContractedCity\(planDistantCity\(this\.isMobile,RAND\)/);
  assert.match(src,/this\.heroTower=new THREE\.Group/);
  assert.match(src,/this\.roof=new THREE\.Group/);
  assert.ok(!/createNeighborRoof|createAdjacentRoof|roofVillage/.test(src));
});
test('weather disasters do not bring tornado into the empty buffer',()=>{
  assert.ok(SPATIAL_LAYOUT.tornadoMinDistance>SPATIAL_LAYOUT.clearZoneRadius);
  const slots=[-36,0,36].map((dx,i)=>({id:'safe-'+i,tier:'mid',x:200+dx,z:-220,height:31}));
  const track=selectVariedStormBuildings(slots,{seed:123});
  assert.equal(track.length,3);
  for(const slot of track){
    const [x,,z]=stormTrackPoint(slot);
    assert.ok(Math.hypot(x,z)>SPATIAL_LAYOUT.clearZoneRadius,'tornado must remain outside rooftop buffer');
  }
});
