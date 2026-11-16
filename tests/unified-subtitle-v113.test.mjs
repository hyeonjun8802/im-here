import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {NarrativeQueueV76} from '../src/narrativeQueueV76.js';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const css=read('src/unifiedNarrativeV76.css');
const main=read('src/main.js');
const html=read('index.html');
const last=css.slice(css.indexOf('/* v113 |'));
const selector='#log.event-log[data-active="true"]:not([data-kind="daily"])';

test('cinematic/exploration and story narratives use the same box-free subtitle as DAY narration',()=>{
 assert.ok(last.includes(selector));
 const daily=css.slice(css.indexOf('/* v87 |'),css.indexOf('/* v113 |'));
 for(const value of [
  'border:0!important','border-left:0!important','border-radius:0!important',
  'background:transparent!important','backdrop-filter:none!important',
  '-webkit-backdrop-filter:none!important','box-shadow:none!important',
  'text-align:center!important','pointer-events:none!important',
  'font-size:clamp(11px,2.85vw,12px)!important',
  'text-shadow:0 1px 2px'
 ]){
  assert.ok(daily.includes(value),'DAY subtitle missing '+value);
  assert.ok(last.includes(value),'cinematic/story subtitle missing '+value);
 }
 assert.ok(last.includes('background-image:none!important'));
 assert.ok(last.includes('animation:afterday-daily-subtitle-in .24s ease-out both!important'));
});
test('mobile, narrow height and reduced motion stay equivalent to original daily subtitle',()=>{
 assert.match(last,/@media\(max-width:720px\)/);
 assert.match(last,/@media\(max-height:490px\)/);
 assert.match(last,/@media\(prefers-reduced-motion:reduce\)/);
 assert.match(last,/width:calc\(100vw - 44px\)!important/);
 assert.match(last,/animation:none!important/);
 assert.match(last,/overflow:hidden!important/);
});
test('only cosmetic CSS changed; one narrative channel, urgent cards still block speech',()=>{
 assert.equal((html.match(/id="log"/g)||[]).length,1);
 assert.match(main,/kind:'cinema',priority:2,durationMs:8500/);
 assert.match(main,/node\.dataset\.kind=active\?\.kind\|\|'none'/);
 assert.match(main,/narrativeQueue\.tick\(realNow,blocked\)/);
 assert.match(css,/#hud:has\(> \.afterday-board\.is-open\) #log\.event-log/);
 assert.match(css,/#hud:has\(\.survival-kit\.premium-equipment-open\) #log\.event-log/);
 assert.doesNotMatch(last,/\.actionbar\{|\.afterday-board\{|localStorage|document\.createElement|gameClock/);
 const q=new NarrativeQueueV76();
 q.enqueue({kind:'cinema',text:'오래된 정수실 · 다음 지역 발견: 통신실',durationMs:8500,priority:2});
 assert.equal(q.tick(0)?.kind,'cinema');
 assert.equal(q.tick(8500),null);
});
