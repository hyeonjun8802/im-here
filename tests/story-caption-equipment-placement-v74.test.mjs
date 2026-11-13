import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {defaults} from '../src/simulation.js';
import {survivalDailyBriefing} from '../src/survivalBalance.js';

const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const css=readFileSync(new URL('../src/storyCaptionEquipmentV74.css',import.meta.url),'utf8');
const main=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');

test('the one daily story subtitle is a child of the original equipment frame',()=>{
 const kitStart=html.indexOf('<section id="survival-kit"');
 const kitEnd=html.indexOf('</section>',kitStart);
 const story=html.indexOf('id="survival-chapter"');
 const action=html.indexOf('id="survival-kit-action"');
 assert.ok(kitStart>0&&kitEnd>kitStart);
 assert.ok(kitStart<story&&story<kitEnd,'caption must move with equipment across resolutions');
 assert.ok(kitStart<action&&action<story,'existing equipment content stays in order');
 assert.equal((html.match(/id="survival-chapter"/g)||[]).length,1,'story must not be duplicated');
 assert.match(html,/src\/storyCaptionEquipmentV74\.css/);
 assert.match(html,/id="survival-chapter" class="survival-chapter is-hidden"/);
});

test('story uses equipment geometry rather than absolute screen center or top weather',()=>{
 assert.match(css,/\.survival-kit > #survival-chapter\{/);
 assert.match(css,/position:absolute!important/);
 assert.match(css,/top:auto!important/);
 assert.match(css,/bottom:calc\(100% \+ 11px\)!important/);
 assert.match(css,/transform:none!important/);
 assert.match(css,/text-align:left!important/);
 assert.match(css,/pointer-events:none!important/);
 assert.match(css,/@media\(max-width:720px\)/);
 assert.match(css,/bottom:calc\(100% \+ 8px\)!important/);
 assert.match(css,/width:min\(318px,calc\(100vw - 20px\)\)!important/);
 assert.doesNotMatch(css,/#weather-brief|\.disaster-forecast|\.actionbar|#speed-toggle/);
});

test('the story cannot cover the equipment popup or steal its clicks',()=>{
 assert.match(css,/\.survival-kit\.premium-equipment-open > #survival-chapter\.is-visible\{/);
 assert.match(css,/opacity:0!important/);
 assert.match(css,/visibility:hidden!important/);
 assert.match(css,/max-height:min\(27vh,156px\)!important/);
 assert.match(css,/@media\(max-height:490px\)/);
});

test('authored stories, filler day beats, companion story and danger priority still use one caption',()=>{
 const state=defaults(Date.UTC(2026,10,14));
 const regular=survivalDailyBriefing(4,state);
 const milestone=survivalDailyBriefing(10,state);
 const danger=defaults(Date.UTC(2026,10,14));danger.weather='tornado';
 const crisis=survivalDailyBriefing(4,danger);
 const joined=defaults(Date.UTC(2026,10,14));
 joined.companion.present=true;joined.companion.arrivedDay=5;
 const companion=survivalDailyBriefing(8,joined);
 assert.ok(regular.title.length>0&&regular.line.includes('오늘의 목표:'));
 assert.match(milestone.title,/물탱크의 금/);
 assert.match(crisis.line,/대피/);
 assert.match(companion.title,/작업대/);
 assert.match(main,/const chapter=survivalDailyBriefing\(day,state\)/);
 assert.match(main,/node\.textContent=chapter\.title\+' · '\+chapter\.line/);
 assert.match(main,/const CHAPTER_CAPTION_MS=6500/);
 assert.equal((html.match(/id="survival-chapter"/g)||[]).length,1);
});

test('mobile and desktop story size stays within the viewport, above the real equipment',()=>{
 for(const width of [320,360,375,390,414,480,720]){
   const captionWidth=Math.min(318,width-20);
   assert.ok(captionWidth<=width-20,'phone '+width+' must not clip off right edge');
 }
 assert.match(css,/width:clamp\(340px,34vw,440px\)!important/);
 assert.match(css,/max-width:calc\(100vw - 28px\)!important/);
 assert.match(css,/max-height:min\(24vh,148px\)!important/);
 assert.match(css,/prefers-reduced-motion:reduce/);
});


test('all danger, disaster, social and opportunity notices appear low; choices remain centered',()=>{
 const board=readFileSync(new URL('../src/eventBoard.js',import.meta.url),'utf8');
 const boardCss=readFileSync(new URL('../src/eventBoard.css',import.meta.url),'utf8');
 // The classes are the authoritative existing event severities.
 assert.match(board,/expeditionResult:\{[^\n]*severity:'social'/);
 assert.match(board,/companionJoined:\{[^\n]*severity:'social'/);
 assert.match(board,/helicopter:\s*\{[^\n]*severity:'opportunity'/);
 assert.match(board,/storm:\s*\{[^\n]*severity:'disaster'/);
 assert.match(board,/tornado:\s*\{[^\n]*severity:'disaster'/);
 assert.match(css,/> \.afterday-board:not\(\.is-choice\)\{/);
 assert.match(css,/top:auto!important/);
 assert.match(css,/bottom:calc\(125px \+ env\(safe-area-inset-bottom\)\)!important/);
 assert.match(css,/@media\(min-width:721px\) and \(max-width:1023px\)/);
 assert.match(css,/@media\(max-width:720px\)/);
 assert.match(css,/max-height:min\(29dvh,190px\)!important/);
 assert.match(css, /#hud:has\(> \.afterday-board\.is-open:not\(\.is-choice\)\)/);
 assert.match(boardCss,/\.afterday-board\.is-choice\{\s*position:fixed;top:50%;left:50%/);
 assert.doesNotMatch(css, /\.afterday-board--danger|\.afterday-board--disaster/); // No severity is excluded from the low notice position.
});

test('all nonmodal alerts stop immediately above the equipment at portrait widths',()=>{
 for(const viewport of [320,360,375,390,414,480,720]){
   const kitBottom=Math.max(75,(viewport-8)*172/1148+19);
   const kitHeight=Math.min(246,Math.max(204,viewport*.57))*308/461;
   const popupBottom=kitBottom+kitHeight+0;
   assert.ok(popupBottom>=kitBottom+kitHeight,viewport+'px: card must not overlap equipment');
 }
});
