import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {spawnSync} from 'node:child_process';

const night=fs.readFileSync(new URL('../src/premiumNightLightingV710.js',import.meta.url),'utf8');
const world=fs.readFileSync(new URL('../src/world.js',import.meta.url),'utf8');

test('v7.1 night-lighting module is syntax-valid and integrated',()=>{
  for(const file of ['src/premiumNightLightingV710.js','src/world.js']){
    const r=spawnSync(process.execPath,['--check',file],{encoding:'utf8'});
    assert.equal(r.status,0,r.stderr||r.stdout);
  }
  assert.match(world,/PremiumNightLightingV710/);
  assert.match(world,/this\.premiumNightLighting=new PremiumNightLightingV710\(this\)/);
  assert.match(world,/premiumNightLighting\?\.update\(dt,vw,night,twilight,lightningStrength,lunar,game\)/);
  assert.match(world,/premiumNightLighting\?\.dispose\(\)/);
});

test('v7.1 creates motivated lunar and sparse real local lighting',()=>{
  assert.match(night,/cool lunar directional fill/);
  assert.match(night,/sparse real city emergency light/);
  assert.match(night,/wet-ground emergency light pool/);
  assert.match(night,/world-space haze light beam/);
  assert.match(night,/restrained ruined-city floodlight/);
  assert.match(night,/SpotLight/);
  assert.match(night,/PointLight/);
});

test('v7.1 uses real lunar position and weather to shape night hierarchy',()=>{
  assert.match(night,/lunar\?\.altitude/);
  assert.match(night,/lunar\?\.azimuth/);
  assert.match(night,/weather\.cloud/);
  assert.match(night,/weather\.storm/);
  assert.match(night,/weather\.wet/);
  assert.match(night,/uFlash/);
  assert.match(night,/const outward=new THREE\.Vector2\(s\.x,s\.z\)/);
  assert.match(night,/const edge=\(s\.width\|\|11\)\*\.68\+3\.4/);
});

test('v7.1 local lights are bounded and non-shadow-casting',()=>{
  assert.match(night,/mobile\?2:4/);
  assert.match(night,/mobile\?1:2/);
  assert.match(night,/light\.castShadow=false/);
  assert.match(night,/spot\.castShadow=false/);
  assert.match(night,/ambientCollapseIds/);
  assert.match(night,/tornadoDamagedIds/);
  assert.match(night,/o\.pool\.visible=alive/);
  assert.match(night,/beam\.visible=alive&&strength>\.025/);
  assert.doesNotMatch(night,/SAVE_KEY|localStorage|game\.health\s*=|game\.food\s*=|game\.water\s*=/);
});
