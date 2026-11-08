import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const css=readFileSync(new URL('../src/hudAlignmentV1300.css',import.meta.url),'utf8');
const js=readFileSync(new URL('../src/premiumEquipmentHudV1600.js',import.meta.url),'utf8');
const main=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
test('premium kit keeps original single button and moves optional functionality into disclosure',()=>{
 assert.match(js,/kit\.insertBefore\(toggle,actions\)/);
 assert.match(js,/MutationObserver\(sync\)/);
 assert.match(js,/aria-expanded/);
 assert.match(js,/premium-equipment-open/);
 assert.match(css,/premium-equipment-open > \.survival-kit-controls\{display:flex!important/);
 assert.match(css,/survival-kit > \.survival-kit-action\{[\s\S]*?top:81\.17%!important/);
 assert.match(css,/\.survival-kit > \.survival-kit-controls\{[\s\S]*?display:none!important/);
});
test('game inventory preserves owned equipment but prioritizes readable short labels',()=>{
 assert.match(main,/kitLabels=\{tent:'텐트',purifier:'정수기',seeds:'재배 씨앗',radio:'무전기'\}/);
 assert.match(main,/inventoryNode\.title=owned\.length/);
 assert.match(main,/installPremiumEquipmentHudV1600\(\)/);
 assert.match(css,/-webkit-line-clamp:2!important/);
});
