import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const js=read('src/premiumEquipmentHudV1600.js');
const css=read('src/moreMenuCommonV118.css');
const html=read('index.html');
const main=read('src/main.js');

test('the More popup reuses original v3 metal-frame and bronze-button atlas, not new gradients',()=>{
 assert.match(css,/border-image-source:var\(--afterday-v3-wide_panel_02,none\)/);
 assert.match(css,/border-image-slice:36 39 35 39 fill/);
 assert.match(css,/border-image-source:var\(--afterday-v3-small_button_01,none\)/);
 assert.match(css,/border-image-slice:29 29 29 29 fill/);
 assert.doesNotMatch(css,/linear-gradient|blur\(/);
 assert.match(html,/commonUiAssetsV3\.css/);
 assert.ok(html.indexOf('moreMenuCommonV118.css')>html.indexOf('hudUsabilityV82.css'));
 assert.ok(html.indexOf('moreMenuCommonV118.css')>html.indexOf('explorationHubV115.css'));
});
test('mobile menu is a compact two-column popup anchored over ninth HUD control',()=>{
 assert.match(js,/const moreButton=root\.querySelector\('#functions-toggle'\)/);
 assert.match(js,/const trigger=moreButton\?\.getBoundingClientRect\(\)/);
 assert.match(js,/window\.innerHeight-trigger\.top\+9/);
 assert.match(js,/window\.innerWidth-trigger\.right/);
 assert.match(js,/--afterday-more-menu-bottom/);
 assert.match(js,/--afterday-more-menu-right/);
 assert.match(css,/position:fixed!important/);
 assert.match(css,/grid-template-columns:repeat\(2,minmax\(0,1fr\)\)!important/);
 assert.match(css,/max-height:min\(42dvh,var\(--afterday-equipment-menu-space,42dvh\)\)/);
 assert.match(css,/env\(safe-area-inset-bottom\)/);
});
test('more screen has semantic title, explicit close button and touch-safe controls',()=>{
 assert.match(js,/actions\.setAttribute\('role','region'\)/);
 assert.match(js,/actions\.setAttribute\('aria-labelledby','equipment-actions-title'\)/);
 assert.match(js,/menuHeading\.id='equipment-actions-title'/);
 assert.match(js,/menuClose\.id='equipment-actions-close'/);
 assert.match(js,/menuClose\.setAttribute\('aria-label','더보기 메뉴 닫기'\)/);
 assert.match(js,/menuClose\.addEventListener\('click'/);
 assert.match(css,/min-height:47px!important/);
 assert.match(css,/#equipment-actions-close\{/);
 assert.match(css,/width:44px!important/);
 assert.match(css,/button:focus-visible/);
});
test('previous four actions keep their live IDs, handlers and hidden dynamic actions',()=>{
 for(const id of ['more-life-open','more-camera-open','more-audio-open','weather-panel-toggle','companion-toggle','radio-contact'])
  assert.ok(html.includes('id="'+id+'"'),id);
 for(const id of ['more-life-open','more-camera-open','more-audio-open','weather-panel-toggle','radio-contact'])
  assert.match(main,new RegExp("'#"+id+"'"));
 assert.match(js,/if\(!compactActionNames\[button\.id\]\)continue/);
 assert.match(js,/const active=\[\.\.\.actions\.querySelectorAll\('button'\)\]\.filter\(b=>!b\.hidden&&b!==menuClose\)/);
 assert.match(js,/new MutationObserver\(sync\)\.observe\(actions,/);
 assert.match(css,/#equipment-actions-menu > button\[hidden\]/);
});
test('opening, second tap, outside tap and Escape retain existing behavior',()=>{
 assert.match(js,/kit\.classList\.toggle\('premium-equipment-open'\)/);
 assert.match(js,/!kit\.contains\(event\.target\)&&!moreButton\?\.contains\(event\.target\)/);
 assert.match(js,/event\.key==='Escape'/);
 assert.match(js,/actions\.addEventListener\('click'/);
 assert.match(main,/functionsButton\.addEventListener\('click',\(\)=>equipmentDisclosure\.click\(\)\)/);
 assert.match(js,/window\.visualViewport\?\.addEventListener\('resize'/);
});
test('design-only fix does not alter simulation, survival UI frame or local save',()=>{
 assert.doesNotMatch(css,/#(?:disaster-forecast|world|exploration-map)|\.actionbar\s*\{/);
 assert.doesNotMatch(js,/localStorage|sessionStorage|applyAction|resolveScavengeChoice|save\(/);
 assert.match(html,/id="exploration-hub-toggle"/);
 assert.match(html,/id="functions-toggle"/);
});
