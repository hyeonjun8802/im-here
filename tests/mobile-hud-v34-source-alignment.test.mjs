import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const atlas=JSON.parse(read('public/assets/ui/apocalypse-v3/spritesheet.json'));
const js=read('src/commonUiAssetsV3.js');
const css=read('src/commonUiLayoutV31.css');

test('only the fifth preselected source tile is restored, sixth is untouched',()=>{
 const bar=atlas.frames.bottom_action_bar_full;
 assert.deepEqual([bar.w,bar.h],[1148,172]);
 assert.match(js,/sourceBar\.x\+407,sourceBar\.y\+29,118,128/);
 assert.match(js,/527,29,118,128/);
 assert.doesNotMatch(js,/sixthSlot/);
 assert.match(js,/--afterday-v3-bottom_action_bar_neutral/);
});

test('mobile selection cannot create an overlay extending above approved source bar',()=>{
 assert.match(css,/v3\.4 source-aligned phone finish/);
 assert.match(css,/\.actionbar\{\s*isolation:isolate!important;\s*overflow:hidden!important;/);
 assert.match(css,/\.actionbar:not\(\.v3-has-extra-actions\) #explore::before,[\s\S]*?content:none!important;\s*display:none!important;/);
 assert.match(css,/\.actionbar:not\(\.v3-has-extra-actions\) #explore,[\s\S]*?box-shadow:none!important;/);
 assert.match(css,/grid-template-columns:repeat\(9,minmax\(0,1fr\)\)/);
});

test('equipment panel has separate text band under header and a full-width radio control',()=>{
 assert.match(css,/\.survival-kit > small\{[\s\S]*?padding-left:4px!important;/);
 assert.match(css,/#inventory-items\{\s*margin-top:7px!important;/);
 assert.match(css,/\.survival-kit-controls > button:not\(\[hidden\]\)\{\s*width:100%!important;/);
 assert.match(css,/\.survival-kit-action\{\s*bottom:6%!important;/);
 assert.match(css,/safe-area-inset-bottom/);
});
