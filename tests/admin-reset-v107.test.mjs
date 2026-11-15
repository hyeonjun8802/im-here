import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {SAVE_KEY,getDay} from '../src/simulation.js';
import {persistFreshRestart} from '../src/restartSession.js';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const html=read('index.html');
const main=read('src/main.js');
const css=read('src/autoSurvivalV73.css');

test('ADMIN offers one explicit, labelled and visibly distinct fresh-game reset',()=>{
 const panel=html.slice(html.indexOf('<aside id="admin-panel"'),html.indexOf('</aside>',html.indexOf('<aside id="admin-panel"')));
 assert.match(panel,/id="admin-save"/);
 assert.match(panel,/id="admin-reset" class="afterday-admin-reset"/);
 assert.match(panel,/생존 기록 초기화 · DAY 1/);
 assert.equal((html.match(/id="admin-reset"/g)||[]).length,1);
 assert.match(css,/#hud #admin-panel \.afterday-admin-reset\{/);
 assert.match(css,/background:rgba\(103,37,33,\.48\)/);
 assert.match(css,/min-height:44px/);
});

test('ADMIN reset uses existing confirmed restart rather than a competing save path',()=>{
 const adminBridge="$('#admin-reset').addEventListener('click',()=>$('#restart-game').click())";
 assert.ok(main.includes(adminBridge));
 const start=main.indexOf("$('#restart-game').addEventListener('click',()=>{");
 const end=main.indexOf("$('#admin-reset').addEventListener",start);
 assert.ok(start>=0&&end>start);
 const restart=main.slice(start,end);
 assert.match(restart,/window\.confirm\('현재 생존 기록을 초기화하고 DAY 001부터 다시 시작하시겠습니까\?'\)/);
 assert.match(restart,/if\(!window\.confirm\([^)]+\)\)return/);
 assert.match(restart,/restartInProgress=true/);
 assert.match(restart,/persistFreshRestart\(localStorage,Date\.now\(\)\)/);
 assert.match(restart,/void deviceCloud\.save\(fresh\)/);
 assert.match(restart,/window\.location\.reload\(\)/);
 const bridge=main.slice(end,main.indexOf("$('#life-panel-toggle')",end));
 assert.doesNotMatch(bridge,/localStorage|deviceCloud|persistFreshRestart|window\.location\.reload/);
});

test('fresh restart resets day and previous progress under the existing save key',()=>{
 const now=1_800_000_000_000;
 const map=new Map([[SAVE_KEY,JSON.stringify({startedAt:now-80*86400000,health:1,survivalStatus:'alive',kit:{tent:true},supply:{food:99}})]]);
 const storage={
  getItem(key){return map.get(key)||null},
  setItem(key,value){map.set(key,value)}
 };
 const newState=persistFreshRestart(storage,now);
 assert.equal(getDay(newState.startedAt,now),1);
 assert.equal(newState.survivalStatus,'alive');
 assert.equal(newState.diedAt,0);
 assert.equal(newState.gameClockOffsetMs,0);
 assert.equal(JSON.parse(storage.getItem(SAVE_KEY)).startedAt,now);
});
