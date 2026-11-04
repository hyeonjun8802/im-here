import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {spawnSync} from 'node:child_process';

const landmark=fs.readFileSync(new URL('../src/premiumLandmarkRuinsV690.js',import.meta.url),'utf8');
const world=fs.readFileSync(new URL('../src/world.js',import.meta.url),'utf8');

test('v6.9 landmark ruin module is syntax-valid and integrated',()=>{
  for(const file of ['src/premiumLandmarkRuinsV690.js','src/world.js']){
    const r=spawnSync(process.execPath,['--check',file],{encoding:'utf8'});
    assert.equal(r.status,0,r.stderr||r.stdout);
  }
  assert.match(world,/PremiumLandmarkRuinsV690/);
  assert.match(world,/this\.premiumLandmarkRuins=new PremiumLandmarkRuinsV690\(this\)/);
  assert.match(world,/premiumLandmarkRuins\?\.update\(dt,vw,night,game\)/);
  assert.match(world,/premiumLandmarkRuins\?\.dispose\(\)/);
});

test('v6.9 replaces repeated mid-rise boxes with three distinct ruin archetypes',()=>{
  assert.match(landmark,/officeCarcass/);
  assert.match(landmark,/splitApartment/);
  assert.match(landmark,/civicShell/);
  assert.match(landmark,/landmark office carcass/);
  assert.match(landmark,/landmark split apartment ruin/);
  assert.match(landmark,/landmark civic industrial shell/);
  assert.match(landmark,/for\(const c of previous\)c\.visible=false/);
});

test('v6.9 landmark geometry contains premium structural depth',()=>{
  assert.match(landmark,/exposed floor plates/);
  assert.match(landmark,/dark elevator core/);
  assert.match(landmark,/torn steel and rebar/);
  assert.match(landmark,/deep central rupture/);
  assert.match(landmark,/balcony rails/);
  assert.match(landmark,/blown-out atrium/);
  assert.match(landmark,/rooftop plant steel/);
  assert.match(landmark,/broken maintenance frame/);
  assert.match(landmark,/mergeGeometries/);
});

test('v6.9 never resurrects persistently destroyed landmark hosts',()=>{
  assert.match(landmark,/ambientCollapseIds/);
  assert.match(landmark,/tornadoDamagedIds/);
  assert.match(landmark,/if\(blocked\.has\(e\.slot\.id\)\)e\.landmark\.visible=false/);
  assert.doesNotMatch(landmark,/SAVE_KEY|localStorage|game\.health\s*=|game\.food\s*=|game\.water\s*=/);
});


test('v6.9 concreteDark geometry buckets are initialized before every push',()=>{
  const declarations=[...landmark.matchAll(/const s=\\{([^}]+)\\};/g)].map(m=>m[1]);
  assert.equal(declarations.length,3,'expected three landmark geometry bucket declarations');
  for(const declaration of declarations){
    assert.match(declaration,/concreteDark:\\[\\]/,'every landmark archetype must initialize concreteDark');
  }
  assert.doesNotMatch(landmark,/merge\\(s\\.dark,mat\\.concreteDark/,'dark material geometry must not read from the interior bucket');
  assert.match(landmark,/merge\\(s\\.concreteDark,mat\\.concreteDark,/);
});
