import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const css=readFileSync(new URL('../src/hudAlignmentV1300.css',import.meta.url),'utf8');
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const orig=readFileSync(new URL('../src/commonUiAssetsV3.js',import.meta.url),'utf8');
test('responsive layer loads after approved atlas styles',()=>{
 const order=['commonUiAssetsV3.css','commonUiLayoutV31.css','hudAlignmentV1300.css','src/main.js'];
 for(let i=1;i<order.length;i++)assert.ok(html.indexOf(order[i-1])<html.indexOf(order[i]),order[i]);
 assert.match(html,/<small>주변 생존 장비<\/small>/);
 assert.match(orig,/bottom_action_bar_neutral/);
});
test('top status and weather icons align on both desktop and mobile',()=>{
 assert.match(css,/premium-hud__current-art\s*\{[\s\S]*?left:50%!important/);
 assert.match(css,/premium-hud__current-art\s*\{[\s\S]*?object-fit:contain!important/);
 assert.match(css,/survival-hud-stock>div\s*\{[\s\S]*?flex-direction:row!important/);
 assert.match(css,/@media\(max-width:720px\)/);
});
test('equipment text wraps with header and explore button separated',()=>{
 assert.match(css,/#hud \.survival-kit > small:first-child\s*\{[\s\S]*?position:absolute!important/);
 assert.match(css,/#hud #sleep-arrangement,[\s\S]*?#hud #companion-status\s*\{[\s\S]*?white-space:normal!important/);
 assert.ok(css.includes('padding:clamp(34px,10.8vw,46px) 14px clamp(34px,10vw,42px)!important'));
 assert.match(css,/min-height:0!important;height:auto!important;aspect-ratio:461 \/ 308!important/);
});
test('nine original sprite slots keep centered live controls',()=>{
 assert.match(css,/grid-template-columns:repeat\(9,minmax\(0,1fr\)\)/);
 assert.match(css,/actionbar:not\(\.v3-has-extra-actions\) > button/);
 assert.match(css,/object-fit:contain!important;object-position:center!important/);
 assert.doesNotMatch(css,/actionbar button::before\s*\{/);
 assert.match(css,/actionbar\.v3-has-extra-actions/);
 const source=[110,230,350,468,586,706,826,943,1062];
 for(const vw of [320,360,375,390,414,430,600,720,768,1024,1280,1920]){
  const barWidth=Math.min(1040,vw-(vw<=720?8:10));
  const left=barWidth*.045,right=barWidth*.023,pitch=(barWidth-left-right)/9;
  for(let i=0;i<9;i++){
   const cssCenter=left+(i+.5)*pitch;
   const artCenter=barWidth*source[i]/1148;
   assert.ok(Math.abs(cssCenter-artCenter)<3, 'center must match ORIGINAL sprite cell '+i+' at '+vw+'px; offset '+(cssCenter-artCenter));
  }
 }
});
test('clock is smaller and all gameplay actions remain accessible',()=>{
 assert.match(css,/font-size:clamp\(18px,1\.5vw,23px\)/);
 assert.match(css,/font-size:clamp\(15px,4vw,18px\)/);
 for(const id of ['clock','speed-toggle','survival-kit-action','drink','eat','repair','rest','medicine','explore','life-panel-toggle','weather-panel-toggle'])assert.ok(html.includes('id="'+id+'"'),id);
});

test('mobile header cannot revert to old collapsed 13px padding',()=>{
 const assetCss=readFileSync(new URL('../src/commonUiAssetsV3.css',import.meta.url),'utf8');
 assert.match(assetCss,/\.survival-kit:not\(:has\(\.survival-kit-controls button:not\(\[hidden\]\), \.survival-kit-action\)\)/);
 assert.match(css,/\.survival-kit:has\(> \.survival-kit-action\)\{[\s\S]*?padding-top:clamp\(34px,10\.8vw,46px\)!important/);
 assert.match(orig,/centeredIconFromAtlas/);
});

test('original extracted frame coordinates are explicit and mobile artwork controls correct glyph bounds',()=>{
 assert.match(css,/equipment_panel 461x308/);
 assert.match(css,/110,230,350,468,586,706,826,943,1062/);
 assert.match(css,/bottom:calc\(18\.83% - 14\.5px\)!important/);
 assert.match(orig,/icon_tools:\[27,16,48,51\]/);
 assert.match(orig,/icon_radio:\[20,14,45,43\]/);
});

test('iOS WebKit action rail does not grow to 400px from transferred minimum height',()=>{
 assert.match(css,/WebKit otherwise transfers min-height:60px through aspect-ratio/);
 assert.match(css,/height:auto!important;min-height:0!important;aspect-ratio:1148 \/ 172!important/);
 assert.match(css,/width:calc\(100vw - 8px\)!important;max-width:calc\(100vw - 8px\)!important/);
});

test('source frame proportions and icon ink centers are aligned in both PC and phone',()=>{
 assert.match(css,/aspect-ratio:461 \/ 308!important/);
 assert.match(css,/top:clamp\(18px,5\.45vw,24px\)!important/);
 assert.match(css,/survival-hud-stock\{left:63%!important;width:36\.5%!important\}/);
 assert.match(css,/transform:translate\(-50%,-50%\)!important/);
 assert.match(css,/max-height:calc\(100% - 8px\)!important/);
 assert.match(css,/width:clamp\(101px,28\.4vw,126px\)!important/);
});
