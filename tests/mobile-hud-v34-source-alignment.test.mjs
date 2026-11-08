import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const atlas=JSON.parse(read('public/assets/ui/apocalypse-v3/spritesheet.json'));
const js=read('src/commonUiAssetsV3.js');
const css=read('src/commonUiLayoutV31.css');

test('sixth metal slot uses original neutral source pixels, not baked orange selected border',()=>{
 const sourceBar=atlas.frames.bottom_action_bar_full;
 assert.equal(sourceBar.w,1148);
 assert.equal(sourceBar.h,172);
 const sixth={sourceX:399,targetX:637,width:124,height:sourceBar.h};
 for(const key of ['sourceX','targetX','width','height'])assert.ok(sixth[key]>=0,key);
 assert.ok(sixth.targetX+sixth.width<=sourceBar.w);
 assert.ok(sixth.sourceX+sixth.width<=sourceBar.w);
 assert.ok(sixth.targetX>=sourceBar.w*5/9-3);
 assert.ok(sixth.targetX<sourceBar.w*6/9);
 assert.match(js,/sixthSlot=\{sourceX:399,targetX:637,width:124,height:sourceBar\.h\}/);
 assert.match(js,/barCtx\.drawImage\(\s*image,sourceBar\.x\+sixthSlot\.sourceX,sourceBar\.y,[\s\S]*?sixthSlot\.targetX,0,sixthSlot\.width,sixthSlot\.height/);
 assert.match(js,/--afterday-v3-bottom_action_bar_neutral/);
});

test('mobile selection cannot create an overlay extending above approved source bar',()=>{
 assert.match(css,/v3\.4 source-aligned phone finish/);
 assert.match(css,/\.actionbar\{\s*isolation:isolate!important;\s*overflow:hidden!important;/);
 assert.match(css,/\.actionbar:not\(\.v3-has-extra-actions\) #explore::before,[\s\S]*?content:none!important;\s*display:none!important;/);
 assert.match(css,/\.actionbar:not\(\.v3-has-extra-actions\) #explore,[\s\S]*?box-shadow:inset 0 0 0 1px rgba\(232,165,92,\.22\)!important;/);
 assert.match(css,/grid-template-columns:repeat\(9,minmax\(0,1fr\)\)/);
});

test('equipment panel has separate text band under header and a full-width radio control',()=>{
 assert.match(css,/\.survival-kit > small\{[\s\S]*?padding-left:4px!important;/);
 assert.match(css,/#inventory-items\{\s*margin-top:7px!important;/);
 assert.match(css,/\.survival-kit-controls > button:not\(\[hidden\]\)\{\s*width:100%!important;/);
 assert.match(css,/\.survival-kit-action\{\s*bottom:6%!important;/);
 assert.match(css,/safe-area-inset-bottom/);
});
