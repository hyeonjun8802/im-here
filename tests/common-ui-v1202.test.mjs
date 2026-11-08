import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url));
const html=read('index.html').toString();
const css=read('src/commonUiAssetsV3.css').toString();
const js=read('src/commonUiAssetsV3.js').toString();

test('v12.2 exploration action and real status text survive common UI merge',()=>{
 assert.match(html,/id="survival-kit-action"/);
 assert.match(html,/explore\?\.click\(\)/);
 assert.match(html,/id="survival-day-chip"/);
 assert.match(html,/id="speed-toggle"/);
 assert.match(html,/id="warning"/);
 assert.match(css,/\.survival-kit-action/);
 assert.match(css,/--afterday-v3-equipment_action_button/);
 assert.match(js,/equipment_action_button/);
});
test('production loads one original atlas based theme, not stacked temporary skins',()=>{
 assert.match(html,/commonUiAssetsV3\.css/);
 assert.doesNotMatch(html,/commonUiV1200\.css/);
 assert.doesNotMatch(html,/commonUiV1201\.css/);
 assert.doesNotMatch(html,/commonUiV1202\.css/);
 assert.match(js,/top_hud_full/);
 assert.match(js,/bottom_action_bar_full/);
 assert.match(js,/equipment_panel/);
 assert.match(js,/center_warning_banner/);
});
test('legacy three extracted resource files are still preserved as history',()=>{
 for(const n of ['actionbar_frame.webp','warning_frame.webp','inventory_frame.webp']){
  const b=read('public/assets/ui/apocalypse-common-v3/'+n);
  assert.equal(b.toString('ascii',0,4),'RIFF');
 }
});
