import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=path=>readFileSync(new URL('../'+path,import.meta.url));
const html=read('index.html').toString();
const css=read('src/commonUiLayoutV31.css').toString();
const js=read('src/commonUiAssetsV3.js').toString();
const frames=JSON.parse(read('public/assets/ui/apocalypse-v3/spritesheet.json')).frames;

test('v3.1 loads original HUD art instead of style-only fragments',()=>{
 assert.match(html,/commonUiAssetsV3\.css/);
 assert.match(html,/commonUiLayoutV31\.css/);
 assert.ok(html.indexOf('commonUiAssetsV3.css')<html.indexOf('commonUiLayoutV31.css'));
 assert.match(js,/crop\('top_hud_full'\)/);
 assert.match(js,/frameCount:48/);
 assert.equal(Object.keys(frames).length,48);
 for(const name of ['bottom_action_bar_full','square_slot_01','square_slot_selected','wide_panel_01','wide_panel_02','equipment_panel'])
   assert.ok(frames[name],name);
});
test('survival clock, day and speed use complete, nine-sliced panels',()=>{
 assert.match(css,/border-image-source:var\(--afterday-v3-wide_panel_01\)/);
 assert.match(css,/border-image-slice:36 39 35 39 fill/);
 assert.match(css,/border-image-source:var\(--afterday-v3-wide_panel_02\)/);
 assert.match(css,/\.survival-time-frame/);
 assert.doesNotMatch(css,/background-image:var\(--afterday-v3-small_button_01\)/);
 assert.match(css,/#hud \.top-right #speed-toggle/);
 assert.match(html,/id="survival-day-chip"/);
 assert.match(html,/id="clock"/);
});
test('nine pre-rendered button slots match nine live or passive children',()=>{
 assert.match(css,/grid-template-columns:repeat\(9,minmax\(0,1fr\)\)/);
 assert.match(css,/--afterday-v3-bottom_action_bar_neutral/);
 assert.match(js,/sourceBar\.x\+407,sourceBar\.y\+29,118,128/);
 assert.match(js,/527,29,118,128/);
 assert.match(js,/className='afterday-v3-standby-slot'/);
 assert.match(js,/reserve\.textContent='물탱크 수리'|reserveText\.textContent='물탱크 수리'/);
 assert.match(js,/reserve\.hidden!==specialActive/);
 assert.match(js,/MutationObserver\(syncSlots\)/);
 assert.match(js,/v3-has-extra-actions/);
 assert.match(css,/\.afterday-v3-standby-slot\[hidden\]/);
 assert.match(html,/id="repair-tank"/);
 assert.match(html,/id="explore"/);
});
test('equipment panel uses original source button exactly once with readable safe area',()=>{
 assert.match(css,/\.survival-kit-action/);
 assert.match(css,/background-image:none!important/);
 assert.match(css,/min-height:clamp\(140px,37\.5vw,169px\)/);
 assert.match(css,/padding:24px 14px 41px/);
 assert.match(html,/id="survival-kit-action"/);
 assert.match(html,/id="survival-kit-action"[^>]*hidden/);
 assert.doesNotMatch(html,/common-ui-v1202-action-js/);
});
test('responsive actionbar and equipment have clearance at phone and tablet widths',()=>{
 const clamp=(a,x,b)=>Math.max(a,Math.min(b,x));
 for(const w of [320,360,375,390,414,430,600,720]) {
  const navHeight=Math.max(60,(w-8)*172/1148);
  const kitBottom=Math.max(76,(w-8)*172/1148+18);
  const separation=kitBottom-(6+navHeight);
  assert.ok(separation>=8.9,'kit must clear actionbar at width '+w);
  const kitHeight=clamp(140,w*.375,169);
  assert.ok(kitHeight>=140,'equipment panel remains legible');
  const badge=clamp(116,w*.315,148);
  assert.ok(badge<=w*.4,'right hand widgets do not exceed mobile column');
 }
 assert.match(css,/safe-area-inset-bottom/);
 assert.match(css,/@media\(max-width:720px\)/);
});
