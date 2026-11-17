import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const js=read('src/premiumEquipmentHudV1600.js');
const css=read('src/moreMenuCommonV118.css');
const html=read('index.html');
const main=read('src/main.js');

test('More popup uses the same dark-bronze Black Map button resource without cropped corners',()=>{
 assert.match(css,/ui-v111\/button_secondary\.webp/);
 assert.match(css,/border-image-slice:17 21 17 21 fill/);
 assert.match(css,/border-image-width:8px 10px 8px 10px/);
 assert.match(css,/border-image:none!important/);
 assert.doesNotMatch(css,/wide_panel_02|small_button_01|linear-gradient|blur\(/);
 assert.match(html,/commonUiAssetsV3\.css/);
 assert.ok(html.indexOf('moreMenuCommonV118.css')>html.indexOf('hudUsabilityV82.css'));
 assert.ok(html.indexOf('moreMenuCommonV118.css')>html.indexOf('explorationHubV115.css'));
});
test('native centered modal replaces floating placement calculations',()=>{
 const modal=read('src/moreMenuModalV120.css');
 assert.match(js,/const modal=root\.createElement\('dialog'\)/);
 assert.match(js,/modal\.id='equipment-more-dialog'/);
 assert.match(js,/modal\.append\(actions\)/);
 assert.match(js,/modal\.showModal\(\)/);
 assert.doesNotMatch(js,/updatePopoverSpace|--afterday-more-menu-bottom/);
 assert.match(modal,/position:fixed!important/);
 assert.match(modal,/inset:0!important/);
 assert.match(modal,/margin:auto!important/);
 assert.match(modal,/grid-template-columns:repeat\(2,minmax\(0,1fr\)\)!important/);
 assert.match(modal,/env\(safe-area-inset-bottom\)/);
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
 assert.match(css,/height:44px!important;min-height:44px!important;max-height:44px!important/);
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
 assert.match(js,/modal\.addEventListener\('cancel'/);
 assert.match(js,/modal\.addEventListener\('click'/);
});
test('design-only fix does not alter simulation, survival UI frame or local save',()=>{
 assert.doesNotMatch(css,/#(?:disaster-forecast|world|exploration-map)|\.actionbar\s*\{/);
 assert.doesNotMatch(js,/localStorage|sessionStorage|applyAction|resolveScavengeChoice|save\(/);
 assert.match(html,/id="exploration-hub-toggle"/);
 assert.match(html,/id="functions-toggle"/);
});

test('compact popup never paints a huge bright atlas frame or clips button bottoms',()=>{
 assert.match(css,/background:#151d20!important/);
 assert.match(css,/border:1px solid rgba\(149,116,75,\.82\)!important/);
 assert.match(css,/border-image-source:url\('\/assets\/exploration\/ui-v111\/button_secondary\.webp'\)/);
 assert.match(css,/border-image-repeat:stretch!important/);
 assert.match(css,/min-height:47px!important/);
 assert.match(css,/height:44px!important;min-height:44px!important/);
});

test('top-layer More menu darkens the game and closes on backdrop or Escape',()=>{
 const css=read('src/moreMenuModalV120.css');
 assert.match(css,/#equipment-more-dialog::backdrop/);
 assert.match(css,/background:rgba\(3,7,10,\.73\)!important/);
 assert.match(css,/backdrop-filter:none!important/);
 assert.match(css,/#equipment-more-dialog:not\(\[open\]\)/);
 assert.match(js,/if\(modal\.open\)modal\.close\(\)/);
 assert.match(js,/event\.target===modal/);
 assert.match(js,/event\.preventDefault\(\);close\(\);moreButton\?\.focus/);
 assert.match(js,/menuClose\.focus\?\.\(\{preventScroll:true\}\)/);
 assert.match(js,/modal\.contains\(event\.target\)/);
 assert.ok(html.indexOf('moreMenuModalV120.css')>html.indexOf('moreMenuCommonV118.css'));
});
