import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {spawnSync} from 'node:child_process';

const city=fs.readFileSync(new URL('../src/premiumCinematicCityV650.js',import.meta.url),'utf8');
const world=fs.readFileSync(new URL('../src/world.js',import.meta.url),'utf8');
const post=fs.readFileSync(new URL('../src/cinematicPostV130.js',import.meta.url),'utf8');
const horizon=fs.readFileSync(new URL('../src/HorizonWorldExpansionV210.js',import.meta.url),'utf8');

test('v6.5 cinematic city-depth module is syntax-valid and integrated',()=>{
  for(const file of ['src/premiumCinematicCityV650.js','src/cinematicPostV130.js','src/HorizonWorldExpansionV210.js','src/world.js']){
    const r=spawnSync(process.execPath,['--check',file],{encoding:'utf8'});
    assert.equal(r.status,0,r.stderr||r.stdout);
  }
  assert.match(world,/PremiumCinematicCityV650/);
  assert.match(world,/this\.premiumCinematicCity=new PremiumCinematicCityV650\(this\)/);
  assert.match(world,/premiumCinematicCity\?\.update\(dt,vw,night,twilight\)/);
  assert.match(world,/premiumCinematicCity\?\.dispose\(\)/);
});

test('v6.5 creates layered atmosphere and motivated light hierarchy',()=>{
  assert.match(city,/volumetric city-canyon depth veils/);
  assert.match(city,/layered industrial smoke plumes/);
  assert.match(city,/sparse amber emergency windows/);
  assert.match(city,/distant emergency fire glow pockets/);
  assert.match(city,/DirectionalLight\('#86a3b8'/);
  assert.match(city,/world\.distantCityPlan/);
  assert.doesNotMatch(city,/SAVE_KEY|localStorage|game\.food|game\.water|game\.health|gameDay\s*=/);
});

test('desktop premium post stack adds restrained SSAO and preserves clarity pipeline',()=>{
  assert.match(post,/SSAOPass/);
  assert.match(post,/kernelRadius=8/);
  assert.match(post,/minDistance=\.0025/);
  assert.match(post,/maxDistance=\.115/);
  assert.match(post,/FXAAShader/);
  assert.match(post,/UnrealBloomPass/);
});

test('far skyline facade detail is materially higher resolution and filtered',()=>{
  assert.match(horizon,/c\.width=192;c\.height=384/);
  assert.match(horizon,/anisotropy=8/);
  assert.match(horizon,/LinearMipmapLinearFilter/);
  assert.match(horizon,/MeshPhysicalMaterial/);
});


test('smoke GLSL declares the night uniform used in its vertex shader',()=>{
 assert.match(city,/uniform float uTime,uWind,uStorm,uPixelRatio,uNight;/);
 assert.match(city,/vHeat=aHeat\*\(1\.0-travel\)\*\(\.6\+\.4\*uNight\);/);
});
