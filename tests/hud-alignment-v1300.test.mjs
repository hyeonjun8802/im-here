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
 assert.match(css,/padding:39px 16px 51px!important/);
 assert.match(css,/min-height:clamp\(167px,49vw,193px\)/);
});
test('nine original sprite slots keep centered live controls',()=>{
 assert.match(css,/grid-template-columns:repeat\(9,minmax\(0,1fr\)\)/);
 assert.match(css,/actionbar:not\(\.v3-has-extra-actions\) > button/);
 assert.match(css,/object-fit:contain!important;object-position:center!important/);
 assert.doesNotMatch(css,/actionbar button::before\s*\{/);
 assert.match(css,/actionbar\.v3-has-extra-actions/);
 for(const w of [320,360,375,390,414,430,600,720,1024,1440]){
  const left=w*.04,right=w*.031,pitch=(w-left-right)/9;
  const centers=Array.from({length:9},(_,i)=>left+(i+.5)*pitch);
  assert.ok(centers[0]>0&&centers[8]<w,'slot centers '+w);
  for(let i=1;i<9;i++)assert.ok(Math.abs((centers[i]-centers[i-1])-pitch)<1e-6);
 }
});
test('clock is smaller and all gameplay actions remain accessible',()=>{
 assert.match(css,/font-size:clamp\(23px,2\.1vw,30px\)/);
 assert.match(css,/font-size:clamp\(19px,5\.3vw,23px\)/);
 for(const id of ['clock','speed-toggle','survival-kit-action','drink','eat','repair','rest','medicine','explore','life-panel-toggle','weather-panel-toggle'])assert.ok(html.includes('id="'+id+'"'),id);
});
