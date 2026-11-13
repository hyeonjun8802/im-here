import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {NarrativeQueueV76,NARRATIVE_QUEUE_LIMIT,NARRATIVE_GAP_MS} from '../src/narrativeQueueV76.js';

const file=(p)=>readFileSync(new URL('../'+p,import.meta.url),'utf8');

test('one long narrative displays for its own duration then leaves a readable gap',()=>{
 const q=new NarrativeQueueV76();
 q.enqueue({key:'day:1',text:'첫날의 생존 이야기',kind:'daily',durationMs:6500});
 q.enqueue({key:'cinema:tent',text:'오늘 밤은 콘크리트가 아니다',kind:'cinema',priority:2,durationMs:6000});
 assert.equal(q.tick(0).key,'cinema:tent','cinematic should precede waiting ambient daily story');
 assert.equal(q.tick(5999).key,'cinema:tent');
 assert.equal(q.tick(6000),null);
 assert.equal(NARRATIVE_GAP_MS,400);
 assert.equal(q.tick(6399),null);
 assert.equal(q.tick(6400).text,'첫날의 생존 이야기');
 assert.equal(q.tick(12900),null);
});

test('important popup and mandatory decision pause an already visible story for as long as needed',()=>{
 const q=new NarrativeQueueV76();
 q.enqueue({key:'day:3',kind:'daily',text:'세 번째 날의 이야기',durationMs:6500});
 q.tick(0);
 q.tick(3000);
 assert.equal(q.active.remainingMs,3500);
 assert.equal(q.tick(4000,true),null);
 assert.equal(q.tick(21000,true),null);
 assert.equal(q.active.remainingMs,3500,'time must not elapse beneath a 17-second warning');
 assert.equal(q.tick(23000,false).text,'세 번째 날의 이야기');
 assert.equal(q.tick(26499).text,'세 번째 날의 이야기');
 assert.equal(q.tick(26500),null);
});

test('high-priority cinematic interrupts a daily story, then resumes the unspent story duration',()=>{
 const q=new NarrativeQueueV76();
 q.enqueue({key:'day:1',kind:'daily',text:'낮의 이야기',durationMs:6500});
 assert.equal(q.tick(0).kind,'daily');
 q.tick(1000);
 assert.equal(q.active.remainingMs,5500);
 q.enqueue({key:'injury:1',kind:'cinema',text:'아무것도 공짜로 얻을 수 없다',priority:2,durationMs:4600});
 assert.equal(q.tick(1000).text,'아무것도 공짜로 얻을 수 없다');
 assert.equal(q.tick(5600),null);
 assert.equal(q.tick(6000).text,'낮의 이야기');
 assert.equal(q.active.remainingMs,5500);
});

test('new game days at 50x replace stale daily narration instead of stacking 30 entries',()=>{
 const q=new NarrativeQueueV76();
 for(let day=1;day<=30;day++)
   q.enqueue({key:'day:'+day,kind:'daily',priority:1,text:'DAY '+day});
 assert.deepEqual(q.queue.map(x=>x.key),['day:30']);
 assert.equal(q.tick(0).text,'DAY 30');
 q.enqueue({key:'day:31',kind:'daily',text:'DAY 31'});
 assert.equal(q.tick(10).text,'DAY 31','stale active day is discarded as a newer day arrives');
 assert.equal(q.queue.length,0);
});

test('queue holds at most three waiting items, keeps urgent cinematics over stale ambience',()=>{
 const q=new NarrativeQueueV76();
 for(let i=0;i<9;i++)q.enqueue({key:'c:'+i,kind:'cinema',priority:2,text:'cinematic '+i});
 assert.equal(NARRATIVE_QUEUE_LIMIT,3);
 assert.equal(q.queue.length,3);
 assert.deepEqual(q.queue.map(x=>x.key),['c:6','c:7','c:8']);
 assert.equal(q.enqueue({key:'day:9',kind:'daily',text:'ambient'}),false,
  'ambient story must not evict important cinematic results');
 assert.equal(q.queue.length,3);
});

test('duplicate events and empty messages cannot fill or restart the queue',()=>{
 const q=new NarrativeQueueV76();
 assert.equal(q.enqueue({key:'story:1',text:'첫 메시지'}),true);
 assert.equal(q.enqueue({key:'story:1',text:'첫 메시지'}),false);
 assert.equal(q.enqueue({text:'  '}),false);
 assert.equal(q.queue.length,1);
 assert.equal(q.tick(0).key,'story:1');
 assert.equal(q.enqueue({key:'story:1',text:'첫 메시지'}),false);
});

test('no resources, saves, clock or DOM mutations are performed by the pure queue',()=>{
 const q=new NarrativeQueueV76();
 const state={health:63,supply:{food:2,water:3},kit:{tent:false}};
 const prior=JSON.stringify(state);
 q.enqueue({text:'테스트',kind:'cinema'});q.tick(0);q.tick(50,true);q.clear();
 assert.equal(JSON.stringify(state),prior);
 const js=file('src/narrativeQueueV76.js');
 assert.doesNotMatch(js,/applyAction|localStorage|save\(|window\.|document\.|setInterval\(|setTimeout\(|Date\.now\(/);
});

test('the existing bottom log is the ONLY visible long-form story surface',()=>{
 const html=file('index.html'),main=file('src/main.js'),css=file('src/unifiedNarrativeV76.css');
 assert.match(html,/id="log" class="event-log" role="status" aria-label="생존 메시지" aria-live="polite" aria-atomic="true" data-active="false"/);
 assert.match(html,/src\/unifiedNarrativeV76\.css/);
 assert.match(css,/#hud \.survival-kit > #survival-chapter,\s*body\.afterday-real-ui-v3 #app > \.afterday-cinema\{\s*display:none!important/);
 assert.match(css,/#log\.event-log\[data-active="true"\]\{\s*display:block!important/);
 assert.match(main,/const narrativeQueue=new NarrativeQueueV76\(\)/);
 assert.match(main,/kind:'daily',priority:1,durationMs:CHAPTER_CAPTION_MS/);
 assert.match(main,/syncNarrativeMessage\(Date\.now\(\),dead\)/);
 assert.match(main,/world\.onCinematicNarrative=\(type,m\)=>narrativeQueue\.enqueue/);
 assert.match(file('src/cinematicMomentV510.js'),/this\.world\.onCinematicNarrative\?\.\(type,m\)/);
});

test('alert/action popups and expanded equipment hide narrative immediately and pause its clock',()=>{
 const main=file('src/main.js'),css=file('src/unifiedNarrativeV76.css');
 assert.match(main,/Boolean\(eventBoard\?\.element&&!eventBoard\.element\.hidden\)/);
 assert.match(main,/Boolean\(eventBoard\?\.requiresChoice\(\)\)/);
 assert.match(main,/classList\.contains\('premium-equipment-open'\)/);
 assert.match(main,/!.*life-panel.*classList\.contains\('hidden'\)/);
 assert.match(main,/!.*weather-panel.*classList\.contains\('hidden'\)/);
 assert.match(main,/narrativeQueue\.tick\(realNow,blocked\)/);
 assert.match(css,/#hud:has\(> \.afterday-board\.is-open\) #log\.event-log/);
 assert.match(css,/#hud:has\(\.survival-kit\.premium-equipment-open\) #log\.event-log/);
 assert.match(css,/#hud:has\(#life-panel:not\(\.hidden\)\) #log\.event-log/);
 assert.match(css,/#hud:has\(#weather-panel:not\(\.hidden\)\) #log\.event-log/);
});

test('320px portrait, tablets and desktop place queue above physical bottom equipment without using top HUD',()=>{
 const css=file('src/unifiedNarrativeV76.css');
 assert.match(css,/@media\(max-width:720px\)/);
 assert.match(css,/clamp\(204px,57vw,246px\) \* 308 \/ 461 \+ 10px/);
 assert.match(css,/@media\(min-width:721px\) and \(max-width:1023px\)/);
 assert.match(css,/bottom:calc\(154px \+ env\(safe-area-inset-bottom\)\)!important/);
 assert.match(css,/width:calc\(100vw - 24px\)!important/);
 assert.match(css,/pointer-events:auto!important/);
 assert.match(css,/touch-action:pan-y!important/);
 assert.match(css,/overscroll-behavior:contain!important/);
 assert.match(css,/max-height:min\(22dvh,126px\)!important/);
 for(const w of [320,360,375,390,414,480,720]){
  const rail=Math.max(75,(w-8)*172/1148+19);
  const kitH=Math.min(246,Math.max(204,w*.57))*308/461;
  const panelBottom=rail+kitH+10;
  assert.ok(panelBottom-kitH>=rail+9.9,'clear bottom equipment at '+w);
  assert.ok(panelBottom<w,'reasonable lower screen band at '+w);
  assert.ok(w-24>=296 || w>320,'320px log does not overflow sideways');
 }
});

test('cinematic camera remains immediate while only the text waits for the lower channel',()=>{
 const cinematic=file('src/cinematicMomentV510.js');
 assert.match(cinematic,/this\.active=type;this\.age=0;this\.shots\+\+/);
 assert.match(cinematic,/this\.light\.color\.set\(m\.color\)/);
 assert.match(cinematic,/this\.world\.onCinematicNarrative\?\.\(type,m\)/);
 assert.match(cinematic,/this\.light\.intensity=m\.light\*blend/);
});
