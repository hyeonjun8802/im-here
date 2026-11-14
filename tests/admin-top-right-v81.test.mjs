import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const html=read('index.html');
const main=read('src/main.js');
const css=read('src/autoSurvivalV73.css');

test('ADMIN lives directly below speed and AUTO in the existing top-right control rail',()=>{
 const rail=html.match(/<div class="top-right">([\s\S]*?)<div id="weather-effect"/)?.[1];
 assert.ok(rail,'top-right rail must exist');
 assert.match(rail,/<button id="speed-toggle"/);
 assert.match(rail,/<button id="auto-toggle"/);
 assert.match(rail,/<button id="admin-toggle"/);
 assert.ok(rail.indexOf('id="speed-toggle"')<rail.indexOf('id="auto-toggle"'));
 assert.ok(rail.indexOf('id="auto-toggle"')<rail.indexOf('id="admin-toggle"'));
 assert.equal((html.match(/id="admin-toggle"/g)||[]).length,1);
 assert.equal((html.match(/id="admin-panel"/g)||[]).length,1);
 assert.match(rail,/aria-controls="admin-panel" aria-expanded="false"/);
 assert.match(html,/id="admin-panel"[^>]*class="afterday-admin-panel hidden"/);
});

test('ADMIN is a non-privileged QA panel that reuses real buttons and local save',()=>{
 for(const id of ['weather-panel-toggle','life-panel-toggle','exploration-open','functions-toggle']){
  assert.match(html,new RegExp('data-admin-target="'+id+'"'));
 }
 assert.match(main,/const adminButton=\$\('#admin-toggle'\)/);
 assert.match(main,/adminPanel\.classList\.remove\('hidden'\)/);
 assert.match(main,/adminPanel\.classList\.add\('hidden'\)/);
 assert.match(main,/document\.getElementById\(button\.dataset\.adminTarget\)/);
 assert.match(main,/adminFeedback\.textContent=save\(\)/);
 assert.match(main,/event\.key==='Escape'/);
 assert.match(main,/window\.addEventListener\('resize'/);
});

test('ADMIN preserves original bottom actionbar, covers narrow phones and keyboard focus',()=>{
 const bar=html.match(/<nav class="actionbar">([\s\S]*?)<\/nav>/)?.[1];
 assert.ok(bar);
 assert.doesNotMatch(bar,/admin-toggle/);
 assert.match(bar,/id="functions-toggle"/);
 assert.match(css,/#admin-toggle/);
 assert.match(css,/#admin-panel/);
 assert.match(css,/@media\(max-width:720px\)/);
 assert.match(css,/max-height:calc\(100dvh - 20px\)/);
 assert.match(css,/:focus-visible/);
});
