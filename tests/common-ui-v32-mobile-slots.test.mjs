import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const css=['commonUiLayoutV31.css','hudAlignmentV1300.css'].map(name=>readFileSync(new URL('../src/'+name,import.meta.url),'utf8')).join('\n');
const assetJs=readFileSync(new URL('../src/commonUiAssetsV3.js',import.meta.url),'utf8');
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');

test('bottom bar uses the original nine-slot sheet without nine extra metal borders',()=>{
  assert.match(css,/grid-template-columns:repeat\(9,minmax\(0,1fr\)\)/);
  assert.match(css,/--afterday-v3-bottom_action_bar_neutral/);
  assert.match(css,/actionbar button::before,[\s\S]*?afterday-v3-standby-slot::before\s*\{\s*content:none!important;\s*display:none!important;/);
  assert.match(css,/actionbar button#explore::before,[\s\S]*?actionbar button\.needs-attention::before\s*\{[\s\S]*?square_slot_selected/);
});

test('compact mobile icon-only cells remain centered, text remains in DOM for accessibility',()=>{
  assert.match(css,/v3\.2 mobile action rail/);
  assert.match(css,/@media\(max-width:720px\)\s*\{[\s\S]*?actionbar > button,[\s\S]*?actionbar > \.afterday-v3-standby-slot\s*\{\s*font-size:0!important;[\s\S]*?justify-content:center!important;/);
  assert.match(css,/actionbar button:not\(\[data-v3-sprite\]\) > span\s*\{[\s\S]*?place-items:center!important;/);
  assert.match(css,/actionbar \.afterday-v3-standby-slot > span\s*\{\s*display:none!important;/);
  assert.match(assetJs,/reserveText\.textContent='물탱크 수리'/);
  for(const id of ['drink','eat','repair','rest','medicine','explore','life-panel-toggle','weather-panel-toggle']) {
    assert.match(html,new RegExp('id="'+id+'"'));
  }
});

test('all visible actions remain interactive; nine-slot standby has no pointer handlers',()=>{
  assert.match(css,/\.afterday-v3-standby-slot\{[\s\S]*?pointer-events:none/);
  assert.match(assetJs,/new MutationObserver\(syncSlots\)/);
  assert.match(assetJs,/visible>9/);
});
