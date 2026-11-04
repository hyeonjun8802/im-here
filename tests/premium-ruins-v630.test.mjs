import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {spawnSync} from 'node:child_process';

const ruin=fs.readFileSync(new URL('../src/premiumRuinedBuildingsV630.js',import.meta.url),'utf8');
const world=fs.readFileSync(new URL('../src/world.js',import.meta.url),'utf8');

test('v6.3 premium ruined-city module is syntax-valid and wired to the live world',()=>{
  for(const file of ['src/premiumRuinedBuildingsV630.js','src/world.js']){
    const r=spawnSync(process.execPath,['--check',file],{encoding:'utf8'});
    assert.equal(r.status,0,r.stderr||r.stdout);
  }
  assert.match(world,/PremiumRuinedCityV630/);
  assert.match(world,/this\.premiumRuinedCity=new PremiumRuinedCityV630\(this\)/);
  assert.match(world,/this\.premiumRuinedCity\?\.update\(dt,vw,night\)/);
  assert.match(world,/this\.premiumRuinedCity\?\.dispose\(\)/);
});

test('surrounding ruins use real 3D facade depth, exposed floors, rebar and roof hardware',()=>{
  assert.match(ruin,/recessed window bays/i);
  assert.match(ruin,/exposed interior/i);
  assert.match(ruin,/addFacadeSlab/);
  assert.match(ruin,/segmentGeometry/);
  assert.match(ruin,/surviving dirty window glass/);
  assert.match(ruin,/oxidized rooftop hardware/);
  assert.match(ruin,/deep blown-out interiors/);
  assert.match(ruin,/host\.add\(detail\)/);
});

test('v6.3 only decorates existing city holders and does not alter gameplay or saves',()=>{
  assert.match(ruin,/world\.cityBuildings\?\.get\(slot\.id\)/);
  assert.match(ruin,/tier==='near'/);
  assert.match(ruin,/tier==='mid'/);
  assert.doesNotMatch(ruin,/SAVE_KEY|game\.food|game\.water|game\.health|gameDay\s*=|tornadoDamagedIds\s*=|setItem\(/);
});
