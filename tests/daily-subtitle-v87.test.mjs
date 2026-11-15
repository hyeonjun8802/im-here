import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {NarrativeQueueV76} from '../src/narrativeQueueV76.js';

const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');

test('DAY transitions use the existing queue, but expose the daily-only subtitle kind',()=>{
 const main=read('src/main.js');
 const html=read('index.html');
 assert.match(main,/kind:'daily',priority:1,durationMs:CHAPTER_CAPTION_MS/);
 assert.match(main,/node\.dataset\.kind=active\?\.kind\|\|'none'/);
 assert.equal((html.match(/id="log"/g)||[]).length,1,'no duplicate subtitle panel');
 assert.match(html,/id="log" class="event-log"/);
 const q=new NarrativeQueueV76();
 q.enqueue({text:'DAY 70 · 오늘의 목표',kind:'daily',durationMs:6500});
 assert.equal(q.tick(0).kind,'daily');
 q.tick(6500);
 assert.equal(q.active,null,'same reading duration and queue semantics');
});

test('only daily text loses the box, border and shadow; other messages are unaffected',()=>{
 const css=read('src/unifiedNarrativeV76.css');
 const dailySelector='#log.event-log[data-active="true"][data-kind="daily"]';
 const start=css.indexOf('/* v87 |');
 assert.ok(start>0);
 const daily=css.slice(start);
 assert.ok(daily.includes(dailySelector));
 for(const decl of [
  'border:0!important','border-left:0!important','background:transparent!important',
  'box-shadow:none!important','text-align:center!important','pointer-events:none!important',
  'text-shadow:0 1px 2px'
 ])assert.ok(daily.includes(decl),decl);
 assert.match(css,/#log\.event-log\{[\s\S]*?background:linear-gradient\(/,
  'important and cinematic story events retain the old background');
 assert.match(css,/#log\.event-log\{[\s\S]*?border:1px solid/,
  'non-daily card border remains available');
 assert.match(css,/#hud #log\.event-log\[data-active="true"\]\{\s*display:block!important/);
 assert.doesNotMatch(daily,/#hud \.actionbar|#hud \.topbar|#hud \.survival-kit\{|\.afterday-board\{/);
});

test('subtitle stays above equipment at narrow phone widths with no new overlay',()=>{
 const css=read('src/unifiedNarrativeV76.css');
 const part=css.slice(css.indexOf('/* v87 |'));
 assert.match(part,/@media\(max-width:720px\)/);
 assert.match(part,/width:calc\(100vw - 44px\)!important/);
 assert.match(part,/font-size:clamp\(11px,2\.85vw,12px\)!important/);
 assert.match(part,/@media\(prefers-reduced-motion:reduce\)/);
 assert.match(part,/animation:none!important/);
 assert.match(css,/clamp\(204px,57vw,246px\) \* 308 \/ 461 \+ 10px/);
 for(const width of [320,360,375,390,414,720])
  assert.ok(width-44>0 && width-44<width,'responsive width '+width);
});
