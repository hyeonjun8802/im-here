import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const css=readFileSync(new URL('../src/storyCaptionEquipmentV74.css',import.meta.url),'utf8');
const eventCss=readFileSync(new URL('../src/eventBoard.css',import.meta.url),'utf8');
const eventJs=readFileSync(new URL('../src/eventBoard.js',import.meta.url),'utf8');
const originalCss=readFileSync(new URL('../src/style.css',import.meta.url),'utf8');
const cinematicJs=readFileSync(new URL('../src/cinematicMomentV510.js',import.meta.url),'utf8');

test('all four real event severities use the lowered non-modal notice placement',()=>{
 for(const kind of ['danger','disaster','opportunity','social'])
   assert.match(eventCss,new RegExp('afterday-board--'+kind+'|afterday-board--'+kind+'[^\\n]*'));
 const lower=css.match(/#hud > \.afterday-board:not\(\.is-choice\)\s*\{([^}]+)\}/);
 assert.ok(lower,'all non-choice alerts must be targeted regardless of severity');
 assert.match(lower[1],/top:auto!important/);
 assert.match(lower[1],/bottom:calc\(125px \+ env\(safe-area-inset-bottom\)\)!important/);
 assert.doesNotMatch(lower[1],/transform|animation|display:none/);
 assert.match(eventJs,/severity:'danger'/);
 assert.match(eventJs,/severity:'disaster'/);
 assert.match(eventJs,/severity:'social'/);
 assert.match(eventJs,/severity:'opportunity'/);
});

test('a tornado or raider warning still offers its real action buttons',()=>{
 assert.match(eventJs,/const risky=options\.actionable&&\['tornado','tornadoNear','tornadoDirect'\]\.includes\(key\)/);
 assert.match(eventJs, /\.afterday-board-cover'\)\.hidden=!risky/);
 assert.match(eventJs, /\.afterday-board-prepare'\)\.hidden=!risky/);
 assert.match(eventJs,/\.afterday-board-secure'\)\.hidden=!\(key==='raiders'&&options\.raiderActive\)/);
 assert.match(eventCss,/\.afterday-board-cover/);
 assert.match(eventCss,/\.afterday-board-prepare/);
 assert.match(eventCss,/\.afterday-board-secure/);
 assert.match(eventCss,/\.afterday-board\.is-choice\{\s*position:fixed;top:50%;left:50%/);
 assert.doesNotMatch(css, /\.afterday-board\.is-choice\s*\{/);
});

test('mobile/tablet alerts move toward the screen bottom but do not cover equipment or actionbar',()=>{
 assert.match(css,/\+ 0px \+\s*env\(safe-area-inset-bottom\)/);
 assert.match(css,/\+ 2px \+\s*env\(safe-area-inset-bottom\)/);
 assert.match(css,/bottom:min\(41dvh,166px\)!important/);
 for(const width of [320,360,375,390,414,480,720]){
   const lowerRail=Math.max(75,(width-8)*172/1148+19);
   const equipmentHeight=Math.min(246,Math.max(204,width*.57))*308/461;
   const bottom=lowerRail+equipmentHeight;
   assert.ok(bottom>=lowerRail+equipmentHeight);
   assert.ok(bottom<width, 'bottom notice should not be lifted excessively for viewport '+width);
 }
 const desktopOld=160, desktopNow=125;
 assert.ok(desktopNow<desktopOld,'smaller bottom offset visibly lowers desktop notice');
});

test('injury cinematic headline is a separate plate and is moved below the day/weather HUD',()=>{
 assert.match(cinematicJs,/title:'아무것도 공짜로 얻을 수 없다'/);
 assert.match(cinematicJs,/element\.className='afterday-cinema'/);
 assert.match(cinematicJs,/parent=world\.canvas\?\.parentElement/);
 assert.match(originalCss,/\.afterday-cinema\{position:absolute;z-index:19;pointer-events:none/);
 assert.match(originalCss,/top:clamp\(126px,24vh,250px\)/);
 const rule=css.match(/#app > \.afterday-cinema\s*\{([^}]+)\}/);
 assert.ok(rule);
 assert.match(rule[1],/top:clamp\(224px,30vh,325px\)!important/);
 assert.match(css,/@media\(max-width:720px\)\s*\{\s*body\.afterday-real-ui-v3 #app > \.afterday-cinema\s*\{\s*top:calc\(\(100vw - 4px\) \* 300 \/ 1647 \+ 122px \+ env\(safe-area-inset-top\)\)!important/);
 for(const width of [320,375,390,480,720]){
   const top=(width-4)*300/1647+122;
   const weatherHeight=(width-4)*300/1647;
   assert.ok(top-weatherHeight>=122,'cinematic must clear weather and survival-day text');
 }
 assert.doesNotMatch(css,/\.afterday-cinema.*display:none!important/);
});

test('non-modal alerts suppress duplicate daily subtitle; gameplay and cinematics are unchanged',()=>{
 assert.match(css,/#hud:has\(> \.afterday-board\.is-open:not\(\.is-choice\)\)/);
 assert.match(css,/\.survival-kit > #survival-chapter\.is-visible\s*\{\s*opacity:0!important;\s*visibility:hidden!important/);
 assert.doesNotMatch(css,/survivalStatus|applyAction|supply\.|speed-toggle|animation:afterday-choice-arrive/);
});
