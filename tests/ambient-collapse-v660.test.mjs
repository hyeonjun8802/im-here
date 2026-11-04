import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {spawnSync} from 'node:child_process';
import {defaults,sanitize} from '../src/simulation.js';

const ambient=fs.readFileSync(new URL('../src/ambientCityCollapseV660.js',import.meta.url),'utf8');
const world=fs.readFileSync(new URL('../src/world.js',import.meta.url),'utf8');
const main=fs.readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
const sim=fs.readFileSync(new URL('../src/simulation.js',import.meta.url),'utf8');

test('v6.6 autonomous collapse module is syntax-valid and wired into the real world',()=>{
  for(const file of ['src/ambientCityCollapseV660.js','src/world.js','src/main.js','src/simulation.js']){
    const r=spawnSync(process.execPath,['--check',file],{encoding:'utf8'});
    assert.equal(r.status,0,r.stderr||r.stdout);
  }
  assert.match(world,/AmbientCityCollapseV660/);
  assert.match(world,/this\.ambientCityCollapse=new AmbientCityCollapseV660\(this\)/);
  assert.match(world,/ambientCityCollapse\?\.update\(dt,now,game,vw\)/);
  assert.match(world,/ambientCityCollapse\?\.dispose\(\)/);
});

test('ambient collapse persistence is monotonic and survives sanitize/reload',()=>{
  const now=1_900_000_000_000;
  const fresh=defaults(now);
  assert.deepEqual(fresh.ambientCollapseIds,[]);
  assert.equal(fresh.ambientCollapseSerial,0);
  assert.equal(fresh.nextAmbientCollapseAt,now+18*60000);

  const saved={...fresh,
    ambientCollapseIds:['city-a','city-b','city-a'],
    ambientCollapseSerial:1,
    nextAmbientCollapseAt:now+77*60000
  };
  const clean=sanitize(saved,now);
  assert.deepEqual(clean.ambientCollapseIds,['city-a','city-b']);
  assert.equal(clean.ambientCollapseSerial,2);
  assert.equal(clean.nextAmbientCollapseAt,now+77*60000);
});

test('autonomous collapse changes skyline geometry and leaves physical aftermath',()=>{
  assert.match(ambient,/persistent partial-collapse replacement/);
  assert.match(ambient,/lower structural stump/);
  assert.match(ambient,/open vertical structural cavity/);
  assert.match(ambient,/exposed broken floor slab/);
  assert.match(ambient,/exposed rebar/);
  assert.match(ambient,/falling facade chunk/);
  assert.match(ambient,/permanent rubble/);
  assert.match(ambient,/autonomous collapse dust plume/);
  assert.match(ambient,/Three-stage failure/);
  assert.match(ambient,/t>=\.58/);
  assert.match(ambient,/mergeStaticRoot/);
  assert.match(ambient,/merged settled falling debris/);
  assert.match(ambient,/MAX_AMBIENT_COLLAPSES=18/);
});

test('autonomous collapse remains background-only and does not touch survival economy',()=>{
  assert.match(ambient,/tier==='mid'\|\|s\.tier==='far'/);
  assert.match(ambient,/game\.tornadoEncounterActive/);
  assert.match(world,/ambientCollapseIds\|\|\[\]/);
  assert.doesNotMatch(ambient,/game\.health\s*=|game\.food\s*=|game\.water\s*=|game\.supply\.|game\.facilities\./);
  assert.doesNotMatch(sim,/ambientCollapseIds.*health|ambientCollapseIds.*food|ambientCollapseIds.*water/);
});

test('main persists every automatic collapse without adding audio side effects',()=>{
  assert.match(main,/onAmbientCollapseStateChange=\(\)=>save\(\)/);
  assert.match(main,/onAmbientCollapse=\(id,serial\)=>/);
  assert.match(main,/붕괴 흔적은 그대로 남는다/);
  assert.doesNotMatch(main,/onAmbientCollapse[\s\S]{0,300}(Audio|playSound|weatherAudio)/);
});

test('v7.0.1 collapse lifecycle clamps weather and detaches hidden originals',()=>{
  assert.match(ambient,/const clamp01=v=>/);
  assert.match(ambient,/for\(const child of previous\)host\.remove\(child\)/);
  assert.match(ambient,/for\(const child of c\.previous\)c\.host\.remove\(child\)/);
  assert.match(ambient,/this\.roots\.push\(c\.falling\)/);
  assert.match(ambient,/c\.dust\?\.parent\?\.remove\(c\.dust\)/);
});
