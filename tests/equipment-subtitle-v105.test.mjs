import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const source=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const css=source('src/hudUsabilityV82.css');
const menu=source('src/premiumEquipmentHudV1600.js');
const main=source('src/main.js');
const html=source('index.html');

test('equipment is rendered as a small bottom-left text caption, never a framed image',()=>{
 assert.match(css,/v105 \| Survival inventory as three unobtrusive bottom-left subtitles/);
 assert.match(css,/\.survival-kit:has\(> \.survival-kit-action\)\s*\{/);
 assert.match(css,/aspect-ratio:auto!important/);
 assert.match(css,/background:none!important;background-image:none!important/);
 assert.match(css,/border:0!important;border-radius:0!important/);
 assert.match(css,/display:inline!important/);
 assert.match(css,/#sleep-arrangement::after\s*\{\s*content:" \/ "!important/);
 assert.match(css,/@media\(max-width:720px\)/);
 assert.match(css,/font-size:10px!important/);
 assert.match(css,/font-size:9px!important/);
});
test('redundant equipment feature button stays hidden while original ninth slot opens the real menu',()=>{
 assert.match(menu,/toggle\.hidden=true; \/\/ Only the existing ninth actionbar slot/);
 assert.doesNotMatch(menu,/toggle\.textContent='기능 '/);
 assert.match(css,/\.survival-kit > \.premium-equipment-disclosure/);
 assert.match(css,/display:none!important;visibility:hidden!important/);
 assert.match(main,/functionsButton\.addEventListener\('click',\(\)=>equipmentDisclosure\.click\(\)\)/);
 assert.match(html,/id="functions-toggle"/);
 assert.match(html,/id="exploration-open"/);
 assert.match(menu,/new MutationObserver\(sync\)/);
});
test('owned equipment stays computed from authoritative live inventory, not static preview copy',()=>{
 assert.match(main,/const owned=ITEM_IDS\.filter\(id=>state\.kit\?\.\[id\]\)/);
 assert.match(main,/owned\.map\(id=>kitLabels\[id\]\|\|ITEM_INFO\[id\]\.label\)\.join\(' · '\)/);
 assert.doesNotMatch(main,/'보유 '\+owned\.length\+'종 · '/);
 assert.match(main,/inventoryNode\.title=owned\.length/);
});
