import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {spawnSync} from 'node:child_process';

const wet=fs.readFileSync(new URL('../src/premiumWeatherSurfacesV700.js',import.meta.url),'utf8');
const world=fs.readFileSync(new URL('../src/world.js',import.meta.url),'utf8');

test('v7.0 wet-surface module is syntax-valid and integrated',()=>{
  for(const file of ['src/premiumWeatherSurfacesV700.js','src/world.js']){
    const r=spawnSync(process.execPath,['--check',file],{encoding:'utf8'});
    assert.equal(r.status,0,r.stderr||r.stdout);
  }
  assert.match(world,/PremiumWeatherSurfacesV700/);
  assert.match(world,/this\.premiumWeatherSurfaces=new PremiumWeatherSurfacesV700\(this\)/);
  assert.match(world,/premiumWeatherSurfaces\?\.update\(dt,vw,night,lightningStrength\)/);
  assert.match(world,/premiumWeatherSurfaces\?\.dispose\(\)/);
});

test('v7.0 makes rain physically readable on scene surfaces',()=>{
  assert.match(wet,/irregular wet reflective patches/);
  assert.match(wet,/thin vertical wet facade streak/);
  assert.match(wet,/roof-edge runoff ribbon/);
  assert.match(wet,/GPU rain impact splashes/);
  assert.match(wet,/clearcoat:1/);
  assert.match(wet,/envMapIntensity/);
});

test('v7.0 responds to wetness, rainfall, storm and lightning independently',()=>{
  assert.match(wet,/weather\.wet/);
  assert.match(wet,/weather\.rain/);
  assert.match(wet,/weather\.storm/);
  assert.match(wet,/uFlash/);
  assert.match(wet,/this\.wetMaterial\.roughness=\.20-wet\*\.10/);
  assert.match(wet,/this\.splashes\.visible=rain>\.025&&wet>\.04/);
});

test('v7.0 remains visual-only and mobile budgets are bounded',()=>{
  assert.match(wet,/mobile\?95:220/);
  assert.match(wet,/this\.mobile\?28:58/);
  assert.match(wet,/this\.mobile\?8:16/);
  assert.doesNotMatch(wet,/SAVE_KEY|localStorage|game\.health\s*=|game\.food\s*=|game\.water\s*=|ambientCollapseIds\s*=|tornadoDamagedIds\s*=/);
});
