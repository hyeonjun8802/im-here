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

test('equipment popover adapts to the real available vertical space and offers full-height rows',()=>{
 assert.match(equipment,/const updatePopoverSpace=\(\)=>/);
 assert.match(equipment,/kit\.getBoundingClientRect\(\)\.top/);
 assert.match(equipment,/forecast\?\.getBoundingClientRect\(\)\.bottom/);
 assert.match(equipment,/actions\.style\.setProperty\('--afterday-equipment-menu-space'/);
 assert.match(equipment,/if\(isOpen\)updatePopoverSpace\(\)/);
 assert.match(css,/max-height:min\(40dvh,var\(--afterday-equipment-menu-space,40dvh\)\)!important/);
 assert.match(css,/\.survival-kit\.premium-equipment-open > \.survival-kit-controls > button:not\(\[hidden\]\)/);
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
