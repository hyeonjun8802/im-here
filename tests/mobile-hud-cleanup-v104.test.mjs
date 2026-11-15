import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync,readFileSync} from 'node:fs';

const root=new URL('../',import.meta.url);
const read=path=>readFileSync(new URL(path,root),'utf8');
const html=read('index.html');
const main=read('src/main.js');
const css=read('src/hudUsabilityV82.css');
const bar=html.match(/<nav class="actionbar">([\s\S]*?)<\/nav>/)?.[1];

test('retired enlarged mobile controls are removed from shipping source, styles and tests',()=>{
 for(const path of [
  'src/mobileExpandedActionsV83.js',
  'src/mobileExpandedActionsV83.css',
  'tests/mobile-expanded-actions-v83.test.mjs'
 ])assert.equal(existsSync(new URL(path,root)),false,path);
 for(const source of [html,main])assert.doesNotMatch(source,/touch-actions|mobileExpandedActionsV83|installMobileExpandedActions|크게 조작/);
});
test('existing nine-slot actions remain intact after removing duplicated control sheet',()=>{
 assert.ok(bar);
 const buttons=[...bar.matchAll(/<button[^>]+id="([^"]+)"[^>]*>/g)]
  .filter(x=>!x[0].includes(' hidden')).map(x=>x[1]);
 assert.deepEqual(buttons,['drink','eat','repair','rest','medicine','explore','life-panel-toggle','functions-toggle']);
 assert.match(main,/bindEvents\(\);renderHUD\(\)/);
});
test('phone uses legible equipment frame and a single adjacent touch-safe top control row',()=>{
 assert.match(css,/v104 \| iPhone\/mobile HUD debugging/);
 assert.match(css,/flex-direction:row!important/);
 assert.match(css,/width:140px!important/);
 assert.match(css,/transform:none!important;transform-origin:bottom left!important/);
 assert.match(css,/aspect-ratio:461 \/ 308!important/);
 assert.match(css,/max-width:calc\(100vw - 20px\)!important/);
 assert.match(css,/min-width:44px!important;max-width:44px!important/);
 assert.doesNotMatch(css,/\.actionbar\s*\{/);
});
