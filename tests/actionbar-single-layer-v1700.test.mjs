import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=name=>readFileSync(new URL('../src/'+name,import.meta.url),'utf8');
const layout=read('commonUiLayoutV31.css');
const assets=read('commonUiAssetsV3.css');
const alignment=read('hudAlignmentV1300.css');
const js=read('commonUiAssetsV3.js');
test('source actionbar artwork is the only metal layer, buttons cannot paint second slots',()=>{
 assert.match(layout,/background-image:var\(--afterday-v3-bottom_action_bar_neutral/);
 assert.match(layout,/grid-template-columns:repeat\(9,minmax\(0,1fr\)\)/);
 assert.doesNotMatch(layout,/background(?:-image)?:var\(--afterday-v3-square_slot_(?:01|selected)\)/);
 assert.doesNotMatch(assets,/button#explore::before,[\s\S]*?filter:drop-shadow\(0 0 4px #ff9b31\)/);
 assert.match(alignment,/v17 single-layer bottom navigation/);
 assert.match(alignment,/\.actionbar > button::before,[\s\S]*?\.actionbar > \.afterday-v3-standby-slot::after\{\s*content:none!important/);
 assert.match(alignment,/\.actionbar > button,[\s\S]*?\.actionbar > \.afterday-v3-standby-slot\{\s*background:none!important/);
 assert.match(alignment,/> button:focus-visible\{\s*outline:2px solid #eac493!important/);
});
test('live source nine-cell frame and functional accessible glyphs are retained',()=>{
 assert.match(js,/bottom_action_bar_neutral/);
 assert.match(js,/frameCount:48/);
 assert.match(js,/completeHudGlyph\(id\)/);
 assert.match(js,/button.setAttribute\('aria-label',button.textContent.trim\(\)\)/);
 assert.match(js,/new MutationObserver\(syncSlots\)/);
});
