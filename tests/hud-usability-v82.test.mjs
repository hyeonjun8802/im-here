import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const html=read('index.html');
const css=read('src/hudUsabilityV82.css');
const equipment=read('src/premiumEquipmentHudV1600.js');
const main=read('src/main.js');

test('mobile usability overrides load last without editing original nine-slot atlas',()=>{
 assert.match(html,/src\/hudUsabilityV82\.css/);
 assert.ok(html.indexOf('explorationMapPolishV79.css')<html.indexOf('hudUsabilityV82.css'));
 assert.match(css,/The source-painted nine-slot rail is intentionally not stretched/);
 assert.doesNotMatch(css,/\.actionbar\s*(?:\{|,)|bottom_action_bar_full|grid-template-columns/);
 const bar=html.match(/<nav class="actionbar">([\s\S]*?)<\/nav>/)?.[1];
 assert.ok(bar);
 assert.doesNotMatch(bar,/id="admin-toggle"/);
 assert.match(bar,/id="functions-toggle"/);
});

test('speed, AUTO and ADMIN have individually sized 44px touch boxes on phones',()=>{
 assert.match(css,/@media\(max-width:720px\) and \(pointer:coarse\)/);
 for(const id of ['speed-toggle','auto-toggle','admin-toggle'])assert.match(css,new RegExp('#'+id+'\\b'));
 assert.match(css,/height:44px!important/);
 assert.match(css,/min-height:44px!important/);
 assert.match(css,/max-height:44px!important/);
 assert.match(css,/width:48px!important/);
 assert.match(css,/@media\(max-height:460px\) and \(pointer:coarse\)/);
});

test('equipment More uses centered top-layer modal and preserves touch-safe actions',()=>{
 const modal=read('src/moreMenuModalV120.css');
 assert.match(equipment,/const modal=root\.createElement\('dialog'\)/);
 assert.match(equipment,/modal\.showModal\(\)/);
 assert.match(equipment,/modal\.append\(actions\)/);
 assert.match(equipment,/modal\.addEventListener\('cancel'/);
 assert.match(modal,/position:fixed!important/);
 assert.match(modal,/inset:0!important/);
 assert.match(modal,/#equipment-more-dialog::backdrop/);
 assert.match(modal,/max-height:min\(76dvh/);
 assert.match(modal,/min-height:54px!important/);
 assert.match(modal,/overflow-y:auto!important/);
 assert.match(css,/min-height:44px!important/);
});

test('ADMIN and equipment shortcuts dismiss conflicting popovers',()=>{
 assert.match(main,/const equipmentToggle=\$\('#equipment-actions-toggle'\)/);
 assert.match(main,/if\(equipmentToggle\?\.getAttribute\('aria-expanded'\)==='true'\)equipmentToggle\.click\(\)/);
 assert.match(main,/functionsButton\.addEventListener\('click',\(\)=>equipmentDisclosure\.click\(\)\)/);
 assert.match(main,/if\(equipmentDisclosure\.getAttribute\('aria-expanded'\)!=='true'\)/);
 assert.match(main,/\$\('#life-panel'\)\?\.classList\.add\('hidden'\)/);
 assert.match(main,/\$\('#weather-panel'\)\?\.classList\.add\('hidden'\)/);
 assert.match(css,/#admin-panel #admin-close\{/);
 assert.match(css,/min-width:44px!important/);
});

test('small weather and life popups are scrollable with safe-area clearance',()=>{
 assert.match(css,/#weather-panel:not\(\.hidden\)/);
 assert.match(css,/#life-panel:not\(\.hidden\)/);
 assert.match(css,/max-height:min\(58dvh,calc\(100dvh - 138px/);
 assert.match(css,/env\(safe-area-inset-bottom\)/);
 assert.match(css,/overflow-y:auto!important/);
 assert.match(css,/overscroll-behavior:contain/);
});
