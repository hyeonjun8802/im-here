import test from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'node:fs';
const {readFileSync}=fs;
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
test('unused v12 raster skin has been removed; only active original 48-frame atlas is served',()=>{
 const {existsSync}=fs;
 for(const n of ['actionbar_frame.webp','warning_frame.webp','inventory_frame.webp'])
  assert.equal(existsSync(new URL('../public/assets/ui/apocalypse-common-v3/'+n,import.meta.url)),false,n);
 const webp=read('public/assets/ui/apocalypse-v3/spritesheet.webp');
 assert.equal(webp.toString('ascii',0,4),'RIFF');
});
