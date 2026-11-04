import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {spawnSync} from 'node:child_process';

const aftermath=fs.readFileSync(new URL('../src/premiumCollapseAftermathV720.js',import.meta.url),'utf8');
const world=fs.readFileSync(new URL('../src/world.js',import.meta.url),'utf8');

test('v7.2 persistent aftermath module is syntax-valid and integrated',()=>{
  for(const file of ['src/premiumCollapseAftermathV720.js','src/world.js']){
    const r=spawnSync(process.execPath,['--check',file],{encoding:'utf8'});
    assert.equal(r.status,0,r.stderr||r.stdout);
  }
  assert.match(world,/PremiumCollapseAftermathV720/);
  assert.match(world,/this\.premiumCollapseAftermath=new PremiumCollapseAftermathV720\(this\)/);
  assert.match(world,/premiumCollapseAftermath\?\.update\(dt,vw,night,game\)/);
  assert.match(world,/premiumCollapseAftermath\?\.dispose\(\)/);
});

test('v7.2 rebuilds visual aftermath from all persisted destruction IDs',()=>{
  assert.match(aftermath,/ambientCollapseIds/);
  assert.match(aftermath,/tornadoDamagedIds/);
  assert.match(aftermath,/new Set/);
  assert.match(aftermath,/distantCityPlan/);
  assert.match(aftermath,/sig===this\.signature/);
});

test('v7.2 adds premium persistent rubble, steel, scars, lines and lingering dust',()=>{
  assert.match(aftermath,/merged collapse rubble apron/);
  assert.match(aftermath,/merged exposed aftermath steel/);
  assert.match(aftermath,/merged dangling service lines/);
  assert.match(aftermath,/merged torn facade panels/);
  assert.match(aftermath,/persistent impact-ground scars/);
  assert.match(aftermath,/single-batch lingering collapse dust/);
  assert.match(aftermath,/CatmullRomCurve3/);
  assert.match(aftermath,/TubeGeometry/);
});

test('v7.2 batches long-session damage and remains visual-only',()=>{
  assert.match(aftermath,/mergeGeometries/);
  assert.match(aftermath,/InstancedMesh/);
  assert.match(aftermath,/Points/);
  assert.match(aftermath,/mobile\?9:17/);
  assert.match(aftermath,/mobile\?12:28/);
  assert.doesNotMatch(aftermath,/SAVE_KEY|localStorage|game\.health\s*=|game\.food\s*=|game\.water\s*=|ambientCollapseIds\s*=|tornadoDamagedIds\s*=/);
});
