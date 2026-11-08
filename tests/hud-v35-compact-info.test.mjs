import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const html=read('index.html');
const css=read('src/commonUiLayoutV31.css');
const main=read('src/main.js');
const clock=read('src/gameClock.js');

test('live survival information moves to left text region, speed stays on right',()=>{
 const left=html.indexOf('<div class="survival-quick-info"');
 const right=html.indexOf('<div class="top-right">',left);
 assert.ok(left>0&&right>left,'compact info precedes weather-side speed button');
 for(const id of ['survival-day-chip','clock','weather-brief']){
   const needle='id="'+id+'"';
   assert.equal(html.split(needle).length-1,1,'exactly one live '+id);
   assert.ok(html.indexOf(needle)>left&&html.indexOf(needle)<right,id+' is on left');
 }
 assert.ok(html.indexOf('id="speed-toggle"')>right);
 assert.equal(html.split('id="speed-toggle"').length-1,1);
 assert.doesNotMatch(html,/▶ 1×|⏩ 1×/);
});
test('speed button retains the original click/clock wiring, but renders only multiplier',()=>{
 assert.match(main,/speedButton\.textContent=\x60\$\{gameClock\.speed\}×\x60;/);
 assert.match(main,/speedButton\.addEventListener\('click'/);
 assert.match(main,/gameClock\.cycleSpeed\(\)/);
 assert.match(clock,/GAME_SPEEDS=Object\.freeze\(\[1,2,4,8,16,32,50\]\)/);
 assert.doesNotMatch(main,/speedButton\.textContent=gameClock\.speed===1/);
});
test('one compact design targets both desktop and phone without changing HUD artwork',()=>{
 assert.match(css,/v3\.5 compact survival metadata/);
 assert.match(css,/\.survival-quick-info\{/);
 assert.match(css,/\.survival-quick-info #survival-day-chip::before\{/);
 assert.match(css,/#speed-toggle\{[\s\S]*?width:54px!important/);
 assert.match(css,/#speed-toggle\{[\s\S]*?background-image:none!important/);
 assert.match(css,/@media\(max-width:720px\)\{/);
 assert.match(css,/width:min\(186px,46vw\)!important/);
 assert.match(css,/width:min\(292px,32vw\)!important/);
 assert.match(html,/id="disaster-forecast"/);
 assert.match(html,/id="survival-kit-action"/);
});
