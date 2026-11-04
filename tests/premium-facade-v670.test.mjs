import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {spawnSync} from 'node:child_process';

const facade=fs.readFileSync(new URL('../src/premiumFacadeDensityV670.js',import.meta.url),'utf8');
const world=fs.readFileSync(new URL('../src/world.js',import.meta.url),'utf8');

test('v6.7 facade density module is syntax-valid and integrated into existing city holders',()=>{
  for(const file of ['src/premiumFacadeDensityV670.js','src/world.js']){
    const r=spawnSync(process.execPath,['--check',file],{encoding:'utf8'});
    assert.equal(r.status,0,r.stderr||r.stdout);
  }
  assert.match(world,/PremiumFacadeDensityV670/);
  assert.match(world,/this\.premiumFacadeDensity=new PremiumFacadeDensityV670\(this\)/);
  assert.match(world,/premiumFacadeDensity\?\.update\(dt,vw,night\)/);
  assert.match(world,/premiumFacadeDensity\?\.dispose\(\)/);
  assert.match(facade,/host\.add\(detail\)/);
});

test('v6.7 adds premium facade micro-architecture rather than more plain tower boxes',()=>{
  assert.match(facade,/addFireEscape/);
  assert.match(facade,/addHVAC/);
  assert.match(facade,/addServicePipes/);
  assert.match(facade,/addUtilityBoxes/);
  assert.match(facade,/addBrokenSigns/);
  assert.match(facade,/addBalconyAndRails/);
  assert.match(facade,/addGrime/);
  assert.match(facade,/fan recesses/);
  assert.match(facade,/fire-escape structure/);
});

test('v6.7 merges facade layers to bound draw calls and keeps mobile budgets',()=>{
  assert.match(facade,/mergeGeometries/);
  assert.match(facade,/mergeLayer/);
  assert.match(facade,/this\.mobile\?Math\.min\(5,mid\.length\):Math\.min\(12,mid\.length\)/);
  assert.match(facade,/mobile\?3:5/);
  assert.match(facade,/mobile\?2:3/);
});

test('v6.7 remains visual-only and cannot change survival economy or persistent collapse state',()=>{
  assert.doesNotMatch(facade,/SAVE_KEY|localStorage|game\.health|game\.food|game\.water|game\.supply|ambientCollapseIds\s*=|tornadoDamagedIds\s*=/);
  assert.match(facade,/weather\.wet/);
  assert.match(facade,/weather\.storm/);
});
