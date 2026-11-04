import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {spawnSync} from 'node:child_process';

const asset=fs.readFileSync(new URL('../src/premiumAssetFinishV620.js',import.meta.url),'utf8');
const world=fs.readFileSync(new URL('../src/world.js',import.meta.url),'utf8');
const post=fs.readFileSync(new URL('../src/cinematicPostV130.js',import.meta.url),'utf8');

test('v6.2 premium asset pass is syntax-valid and integrated in the real world',()=>{
  for(const file of ['src/premiumAssetFinishV620.js','src/cinematicPostV130.js']){
    const r=spawnSync(process.execPath,['--check',file],{encoding:'utf8'});
    assert.equal(r.status,0,r.stderr||r.stdout);
  }
  assert.match(world,/PremiumAssetFinishV620/);
  assert.match(world,/this\.premiumAssetFinish=new PremiumAssetFinishV620\(this\)/);
  assert.match(world,/this\.premiumAssetFinish\?\.update\(dt,vw,night\)/);
  assert.match(world,/this\.premiumAssetFinish\?\.dispose\(\)/);
});

test('premium object pass upgrades geometry and materials without changing simulation/save logic',()=>{
  assert.match(asset,/RoundedBoxGeometry/);
  assert.match(asset,/makePremiumCrate/);
  assert.match(asset,/makeBatteryBank/);
  assert.match(asset,/makeToolCase/);
  assert.match(asset,/makeFuelCan/);
  assert.match(asset,/makeCableReel/);
  assert.match(asset,/PointLight/);
  assert.match(asset,/shadow\.mapSize\.set\(4096,4096\)/);
  assert.doesNotMatch(asset,/SAVE_KEY|food\s*=|water\s*=|health\s*=|gameDay|tornadoDamageCount\s*=/);
});

test('desktop post pipeline keeps DPR clarity and filmic highlight protection',()=>{
  assert.match(post,/setPixelRatio\(world\.renderer\.getPixelRatio\(\)\)/);
  assert.match(post,/uClarity/);
  assert.match(post,/uTexel/);
  assert.match(post,/c-blur/);
  assert.match(post,/uRolloff/);
  assert.match(post,/FXAAShader/);
});
