import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {spawnSync} from 'node:child_process';
import {SAVE_KEY,getDay} from '../src/simulation.js';
import {createFreshRestartState,persistFreshRestart} from '../src/restartSession.js';

const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');

test('v9.0 restart helper and main are syntax-valid',()=>{
  for(const file of ['src/restartSession.js','src/main.js']){
    const r=spawnSync(process.execPath,['--check',file],{encoding:'utf8'});
    assert.equal(r.status,0,r.stderr||r.stdout);
  }
});

test('fresh restart state is alive on DAY 001 with death fields cleared',()=>{
  const now=1_800_000_000_000;
  const s=createFreshRestartState(now);
  assert.equal(s.survivalStatus,'alive');
  assert.equal(s.diedAt,0);
  assert.equal(s.deathCause,'');
  assert.equal(s.startedAt,now);
  assert.equal(s.lastTickAt,now);
  assert.equal(getDay(s.startedAt,now),1);
  assert.equal(s.gameClockOffsetMs,0);
  assert.equal(s.gameClockSavedRealAtMs,now);
  assert.equal(s.clockSchema,3);
});

test('fresh restart is persisted atomically under the authoritative save key',()=>{
  const now=1_800_000_000_000;
  const map=new Map([[SAVE_KEY,JSON.stringify({survivalStatus:'dead',diedAt:123})]]);
  const storage={
    setItem(k,v){map.set(k,v)},
    getItem(k){return map.get(k)??null}
  };
  const fresh=persistFreshRestart(storage,now);
  const saved=JSON.parse(storage.getItem(SAVE_KEY));
  assert.equal(fresh.survivalStatus,'alive');
  assert.equal(saved.survivalStatus,'alive');
  assert.equal(saved.diedAt,0);
  assert.equal(saved.startedAt,now);
});

test('main blocks every pagehide/autosave write once restart begins',()=>{
  const src=read('src/main.js');
  assert.match(src,/let restartInProgress=false/);
  assert.match(src,/const save=\(\)=>\{\s*if\(restartInProgress\)return true;/);
  assert.match(src,/restartInProgress=true;[\s\S]*persistFreshRestart\(localStorage,Date\.now\(\)\);[\s\S]*window\.location\.reload\(\)/);
  assert.match(src,/window\.addEventListener\('pagehide',save\)/);
});

test('restart never relies on removeItem followed by reload as the normal path',()=>{
  const src=read('src/main.js');
  const handler=src.slice(src.indexOf("$('#restart-game').addEventListener"),src.indexOf("$('#life-panel-toggle')"));
  assert.match(handler,/persistFreshRestart/);
  assert.doesNotMatch(handler,/localStorage\.removeItem\(SAVE_KEY\);window\.location\.reload/);
});
