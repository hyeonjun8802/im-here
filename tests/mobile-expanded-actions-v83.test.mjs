import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {
 TOUCH_MAIN_ACTIONS,TOUCH_URGENT_ACTIONS,canForwardTouchAction
} from '../src/mobileExpandedActionsV83.js';
import {completeHudGlyph} from '../src/hudActionGlyphsV1400.js';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const html=read('index.html');
const css=read('src/mobileExpandedActionsV83.css');
const js=read('src/mobileExpandedActionsV83.js');
const main=read('src/main.js');
const bar=html.match(/<nav class="actionbar">([\s\S]*?)<\/nav>/)?.[1];

test('mobile action sheet is outside the single nine-slot bottom navigation',()=>{
 assert.ok(bar);
 assert.match(html,/<\/nav><button id="touch-actions-toggle"/);
 assert.doesNotMatch(bar,/id="touch-actions-toggle"|id="touch-actions-panel"/);
 const actionButtons=[...bar.matchAll(/<button[^>]+id="([^"]+)"[^>]*>/g)]
  .filter(x=>!x[0].includes(' hidden')).map(x=>x[1]);
 assert.deepEqual(actionButtons,[
  'drink','eat','repair','rest','medicine','explore','life-panel-toggle','functions-toggle'
 ]);
 assert.equal(actionButtons.length+1,9,'same passive tank-repair slot');
 assert.equal((html.match(/id="touch-actions-toggle"/g)||[]).length,1);
 assert.equal((html.match(/id="touch-actions-panel"/g)||[]).length,1);
 assert.match(html,/src\/mobileExpandedActionsV83\.css/);
 assert.ok(html.indexOf('hudUsabilityV82.css')<html.indexOf('mobileExpandedActionsV83.css'));
});

test('every enlarged proxy corresponds to a real primary or emergency action',()=>{
 const authored=new Set([...bar.matchAll(/id="([^"]+)"/g)].map(x=>x[1]));
 const urgentSource=new Set(['take-cover','secure-supplies','collect-water']);
 for(const [id,label] of [...TOUCH_MAIN_ACTIONS,...TOUCH_URGENT_ACTIONS]){
  assert.ok(authored.has(id),id+' missing source');
  assert.ok(label.length>=2);
  assert.match(completeHudGlyph(id),/^data:image\/svg\+xml/);
 }
 assert.deepEqual(TOUCH_URGENT_ACTIONS.map(x=>x[0]),[...urgentSource]);
 assert.equal(new Set([...TOUCH_MAIN_ACTIONS,...TOUCH_URGENT_ACTIONS].map(x=>x[0])).size,12);
 assert.match(main,/import \{installMobileExpandedActions\} from '\.\/mobileExpandedActionsV83\.js'/);
 assert.match(main,/bindEvents\(\);installMobileExpandedActions\(\);renderHUD\(\)/);
});

test('hidden, locked, disabled or detached source buttons can never be activated',()=>{
 const fake=(opts={})=>({
  isConnected:opts.isConnected??true,
  hidden:opts.hidden??false,
  disabled:opts.disabled??false,
  getAttribute:key=>key==='aria-disabled'?(opts.ariaDisabled??null):null
 });
 assert.equal(canForwardTouchAction(fake()),true);
 assert.equal(canForwardTouchAction(fake({hidden:true})),false);
 assert.equal(canForwardTouchAction(fake({disabled:true})),false);
 assert.equal(canForwardTouchAction(fake({isConnected:false})),false);
 assert.equal(canForwardTouchAction(fake({ariaDisabled:'true'})),false);
 assert.equal(canForwardTouchAction(null),false);
 assert.match(js,/if\(!canForwardTouchAction\(original\)\)return;/);
 assert.match(js,/original\.click\(\)/,'must forward to existing click handler');
 assert.doesNotMatch(js,/applyAction|state\.supply|state\.health|setItem\(/);
});

test('sheet prioritizes real urgent actions and stays synced with availability',()=>{
 assert.match(js,/TOUCH_URGENT_ACTIONS\.forEach/);
 assert.match(js,/TOUCH_MAIN_ACTIONS\.forEach/);
 assert.match(js,/urgentGroup\.hidden=urgentCount===0/);
 assert.match(js,/button\.hidden=!available/);
 assert.match(js,/new MutationObserver\(/);
 assert.match(js,/attributeFilter:\['hidden','disabled','aria-disabled'\]/);
 assert.match(js,/afterday:common-ui-ready/);
 assert.match(css,/\.afterday-touch-actions__action\.is-urgent/);
 assert.match(css,/\[hidden\]\{display:none!important\}/);
});

test('mobile opener and sheet are accessible and preserve the approved metal artwork',()=>{
 assert.match(html,/id="touch-actions-toggle"[^>]*aria-controls="touch-actions-panel" aria-expanded="false"/);
 assert.match(html,/id="touch-actions-panel"[^>]*role="dialog" aria-modal="true"/);
 assert.match(html,/id="touch-actions-close"[^>]*aria-label="큰 버튼 조작 닫기"/);
 assert.match(js,/event\.key==='Escape'/);
 assert.match(js,/event\.key==='Tab'/);
 assert.match(js,/close\(false\);\s*original\.click\(\)/);
 assert.match(js,/window\.innerWidth>720/);
 assert.match(css,/@media\(max-width:720px\)/);
 assert.match(css,/grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/);
 assert.match(css,/min-height:80px!important/);
 assert.match(css,/height:44px!important/);
 assert.match(css,/env\(safe-area-inset-bottom\)/);
 assert.match(css,/@media\(max-width:720px\) and \(max-height:480px\)/);
 assert.doesNotMatch(css,/\.actionbar\s*\{|bottom_action_bar_neutral|square_slot_01/);
});
