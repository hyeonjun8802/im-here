import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {spawnSync} from 'node:child_process';

const micro=fs.readFileSync(new URL('../src/premiumMicroSurfaceV730.js',import.meta.url),'utf8');
const world=fs.readFileSync(new URL('../src/world.js',import.meta.url),'utf8');

test('v7.3 PBR micro-surface module is syntax-valid and integrated',()=>{
  for(const file of ['src/premiumMicroSurfaceV730.js','src/world.js']){
    const r=spawnSync(process.execPath,['--check',file],{encoding:'utf8'});
    assert.equal(r.status,0,r.stderr||r.stdout);
  }
  assert.match(world,/PremiumMicroSurfaceV730/);
  assert.match(world,/this\.premiumMicroSurface=new PremiumMicroSurfaceV730\(this\)/);
  assert.match(world,/premiumMicroSurface\?\.update\(dt\)/);
  assert.match(world,/premiumMicroSurface\?\.dispose\(\)/);
});

test('v7.3 generates deterministic concrete asphalt and metal PBR detail',()=>{
  assert.match(micro,/makeTextureSet\(size,731,'concrete'\)/);
  assert.match(micro,/makeTextureSet\(size,1731,'asphalt'\)/);
  assert.match(micro,/makeTextureSet\(size,2731,'metal'\)/);
  assert.match(micro,/DataTexture/);
  assert.match(micro,/normalMap=set\.normal/);
  assert.match(micro,/roughnessMap=set\.roughness/);
  assert.match(micro,/TangentSpaceNormalMap/);
});

test('v7.3 never overwrites authored PBR maps or transparent atmospheric materials',()=>{
  assert.match(micro,/material\.normalMap\|\|material\.roughnessMap/);
  assert.match(micro,/authored material wins/);
  assert.match(micro,/material\.transparent&&material\.opacity<\.94/);
  assert.match(micro,/glass\|window\|lamp\|light\|emissive/);
});

test('v7.3 periodically discovers new procedural collapse materials and remains visual-only',()=>{
  assert.match(micro,/if\(this\.elapsed<3\.5\)return/);
  assert.match(micro,/this\.applyNew\(\)/);
  assert.match(micro,/mobile\?128:256/);
  assert.doesNotMatch(micro,/SAVE_KEY|localStorage|game\.health\s*=|game\.food\s*=|game\.water\s*=|ambientCollapseIds\s*=|tornadoDamagedIds\s*=/);
});
