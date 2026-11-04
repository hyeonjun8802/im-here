import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {spawnSync} from 'node:child_process';

const street=fs.readFileSync(new URL('../src/premiumStreetV640.js',import.meta.url),'utf8');
const world=fs.readFileSync(new URL('../src/world.js',import.meta.url),'utf8');
const apocalypse=fs.readFileSync(new URL('../src/ApocalypseSetDressingV201.js',import.meta.url),'utf8');

test('v6.4 premium street module is syntax-valid and wired to the live world',()=>{
  for(const file of ['src/premiumStreetV640.js','src/world.js']){
    const r=spawnSync(process.execPath,['--check',file],{encoding:'utf8'});
    assert.equal(r.status,0,r.stderr||r.stdout);
  }
  assert.match(world,/PremiumStreetV640/);
  assert.match(world,/this\.premiumStreet=new PremiumStreetV640\(this\)/);
  assert.match(world,/this\.premiumStreet\?\.update\(dt,vw,night\)/);
  assert.match(world,/this\.premiumStreet\?\.dispose\(\)/);
});

test('street pass contains real 3D road damage, wrecks, civic hardware and rubble',()=>{
  assert.match(street,/fractured asphalt road plates/);
  assert.match(street,/true road crack silhouettes/);
  assert.match(street,/storm drains/);
  assert.match(street,/manhole covers/);
  assert.match(street,/wrecked vehicle bodies/);
  assert.match(street,/damaged rubber wheels/);
  assert.match(street,/torn vehicle doors/);
  assert.match(street,/bent streetlight poles/);
  assert.match(street,/concrete barricades/);
  assert.match(street,/mixed concrete and brick rubble/);
  assert.match(street,/low street dust and suspended debris/);
});

test('street pass preserves survival state and uses mobile detail budgets',()=>{
  assert.match(street,/world\.isMobile/);
  assert.match(street,/mobile\?18:32/);
  assert.match(street,/mobile\?180:340/);
  assert.doesNotMatch(street,/SAVE_KEY|localStorage|game\.food|game\.water|game\.health|gameDay\s*=|tornadoDamagedIds\s*=/);
});
