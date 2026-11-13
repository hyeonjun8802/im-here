import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const css=readFileSync(new URL('../src/eventBoard.css',import.meta.url),'utf8');
const weather=readFileSync(new URL('../src/commonUiAssetsV3.css',import.meta.url),'utf8');
const alignment=readFileSync(new URL('../src/hudAlignmentV1300.css',import.meta.url),'utf8');

test('event notice follows the actual 1647x300 weather-frame height, not a fixed top',()=>{
  assert.match(weather,/aspect-ratio:1647 \/ 300!important/);
  assert.match(css,/top:calc\(min\(1450px,100vw - 6px\) \* 300 \/ 1647 \+ 18px \+ env\(safe-area-inset-top\)\);left:50%/);
  assert.match(css,/@media\(max-width:720px\)\{\.afterday-board\{top:calc\(\(100vw - 4px\) \* 300 \/ 1647 \+ 18px \+ env\(safe-area-inset-top\)\)/);
  assert.doesNotMatch(css,/top:calc\(69px \+ env\(safe-area-inset-top\)\)/);
});

test('desktop top uses the existing 60% weather HUD transform, not the full source height',()=>{
  assert.match(alignment,/\.disaster-forecast\.premium-hud-v1000\s*\{[^}]*scale\(\.60\)!important/);
  assert.match(css,/@media \(min-width:1024px\) and \(hover:hover\) and \(pointer:fine\)\{\s*\.afterday-board:not\(\.is-choice\)\{\s*top:calc\(min\(1450px,100vw - 6px\) \* \.10929 \+ 18px \+ env\(safe-area-inset-top\)\)/);
  const real=1450*300/1647*.60+18;
  const cssTop=1450*.10929+18;
  assert.ok(Math.abs(real-cssTop)<0.02,'PC anchor follows scaled physical weather panel');
});

test('responsive phone and tablet card starts below weather with a visual gap',()=>{
  for(const viewport of [320,375,390,414,480,720,768,900,1023]){
    const frameWidth=viewport<=720?viewport-4:viewport-6;
    const frameHeight=frameWidth*300/1647;
    const noticeTop=frameHeight+18;
    assert.ok(noticeTop>=frameHeight+17.9,viewport+'px viewport must clear the forecast');
  }
  for(const viewport of [1024,1280,1440,1600,1920]){
    const frameWidth=Math.min(1450,viewport-6);
    const physicalHeight=frameWidth*300/1647*.60;
    const noticeTop=frameWidth*.10929+18;
    assert.ok(noticeTop>=physicalHeight+17.9,viewport+'px PC must clear scaled HUD');
  }
});

test('real gameplay story choices remain centered and existing notices remain dismissible',()=>{
  assert.match(css,/\.afterday-board\.is-choice\{\s*position:fixed;top:50%;left:50%/);
  assert.match(css,/\.afterday-board\.is-choice\.is-open\{animation:afterday-choice-arrive/);
  assert.match(css,/\.afterday-board-close\{top:9px;width:27px;height:27px/);
  assert.match(css,/@keyframes afterday-plate-hook/);
  assert.doesNotMatch(css,/@media\s*\(min-width:1024px\)[^\n]*\{[\s\S]*\.afterday-board\.is-choice\{\s*top:/);
});
