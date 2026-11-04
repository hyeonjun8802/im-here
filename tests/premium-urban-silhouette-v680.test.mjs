import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {spawnSync} from 'node:child_process';

const city=fs.readFileSync(new URL('../src/premiumUrbanSilhouetteV680.js',import.meta.url),'utf8');
const world=fs.readFileSync(new URL('../src/world.js',import.meta.url),'utf8');

test('v6.8 urban silhouette module is syntax-valid and integrated',()=>{
  for(const file of ['src/premiumUrbanSilhouetteV680.js','src/world.js']){
    const r=spawnSync(process.execPath,['--check',file],{encoding:'utf8'});
    assert.equal(r.status,0,r.stderr||r.stdout);
  }
  assert.match(world,/PremiumUrbanSilhouetteV680/);
  assert.match(world,/this\.premiumUrbanSilhouette=new PremiumUrbanSilhouetteV680\(this\)/);
  assert.match(world,/premiumUrbanSilhouette\?\.update\(dt,vw,night,game\)/);
  assert.match(world,/premiumUrbanSilhouette\?\.dispose\(\)/);
});

test('v6.8 adds large-scale rooftop silhouette and connective infrastructure',()=>{
  assert.match(city,/addTrussTower/);
  assert.match(city,/addBillboardCage/);
  assert.match(city,/addMaintenanceGantry/);
  assert.match(city,/addBrokenRoofScaffold/);
  assert.match(city,/addInsulators/);
  assert.match(city,/sagging utility cable/);
  assert.match(city,/TubeGeometry/);
  assert.match(city,/skyline infrastructure/);
});

test('v6.8 prevents floating cables after persistent building destruction',()=>{
  assert.match(city,/ambientCollapseIds/);
  assert.match(city,/tornadoDamagedIds/);
  assert.match(city,/span\.visible=!blocked\.has\(span\.userData\.a\)&&!blocked\.has\(span\.userData\.b\)/);
  assert.match(city,/userData=\{a:a\.id,b:b\.id,distance\}/);
});

test('v6.8 controls draw calls and mobile budgets',()=>{
  assert.match(city,/mergeGeometries/);
  assert.match(city,/mobile\?5:10/);
  assert.match(city,/this\.mobile\?Math\.min\(5,mid\.length\):Math\.min\(14,mid\.length\)/);
  assert.doesNotMatch(city,/SAVE_KEY|localStorage|game\.health\s*=|game\.food\s*=|game\.water\s*=|game\.supply\./);
});
