import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {defaults,DAY_MS,beginTornadoEncounter,resolveTornadoRoofImpact,getDay} from '../src/simulation.js';
import {majorNeonEffects} from '../src/neonStatusHud.js';

const startedAt=Date.UTC(2026,10,14,0,0,0);
const setup=()=>defaults(startedAt);
const show=(s,now=startedAt)=>majorNeonEffects(s,now,getDay(s.startedAt,now));

test('only three real story effects are supported; plain hunger and water bars do not duplicate',()=>{
 const s=setup();s.water=3;s.food=3;s.health=22;s.supply.parts=0;s.weather='storm';
 assert.deepEqual(show(s),[]);
 const js=readFileSync(new URL('../src/neonStatusHud.js',import.meta.url),'utf8');
 assert.match(js,/const ORDER=\['infection','cover','companion'\]/);
 assert.doesNotMatch(js,/rationUntilAt|fakeDuration|Math\.random\(/);
});

test('infection only shows a significant sustained illness; no deceptive time-to-cure',()=>{
 const s=setup();
 s.sickness=34.9;assert.deepEqual(show(s),[]);
 s.sickness=35;assert.equal(show(s)[0].id,'infection');
 assert.equal(show(s)[0].phase,'steady');
 assert.match(show(s)[0].detail,/종료 시간은 정해져 있지 않습니다/);
 s.sickness=51;
 assert.equal(show(s)[0].phase,'critical');
 assert.match(show(s)[0].detail,/건강이 지속 감소/);
 s.sickness=0;assert.deepEqual(show(s),[]);
});

test('healthy helper with actual working producer gets one steady cooperation glow',()=>{
 const s=setup();
 s.companion.present=true;s.companion.health=80;
 assert.deepEqual(show(s),[],'without equipment there is no misleading buff');
 s.kit.purifier=true;s.facilities.tank=39;
 assert.deepEqual(show(s),[],'broken water tank does not produce');
 s.facilities.tank=80;
 assert.deepEqual(show(s).map(x=>x.id),['companion']);
 assert.equal(show(s)[0].kind,'buff');
 assert.equal(show(s)[0].phase,'steady');
 assert.match(show(s)[0].label,/\+30%/);
 s.companion.health=20;
 assert.deepEqual(show(s),[],'exhausted helper is not actively working');
});

test('saved 3-day teamwork slowdown blinks faster as actual virtual expiry nears',()=>{
 const s=setup();
 s.companion.present=true;s.companion.health=80;
 s.kit.seeds=true;s.facilities.storage=90;
 s.companion.rationDecision='conserve';
 s.companion.rationResolvedDay=7;
 s.companion.strainedUntilDay=10;
 const endsAt=startedAt+(10-1)*DAY_MS;
 const early=startedAt+(7-1)*DAY_MS;
 assert.equal(show(s,early)[0].phase,'steady');
 assert.equal(show(s,early)[0].kind,'strained');
 assert.match(show(s,early)[0].label,/\+10%/);
 const lastTwelveHours=endsAt-12*3600000;
 assert.equal(show(s,lastTwelveHours)[0].phase,'near');
 assert.equal(show(s,endsAt-3*3600000)[0].phase,'imminent');
 assert.equal(show(s,endsAt)[0].phase,'steady');
 assert.match(show(s,endsAt)[0].label,/\+30%/);
 assert.equal(show(s,endsAt)[0].kind,'buff');
});

test('Tornado protection exists only for the active encounter and disappears on impact',()=>{
 const s=setup();
 s.weather='tornado';
 beginTornadoEncounter(s,startedAt);
 assert.equal(show(s).some(x=>x.id==='cover'),false);
 s.tornadoCoverActive=true;
 const cover=show(s).find(x=>x.id==='cover');
 assert.equal(cover.phase,'steady','no invented storm completion countdown');
 assert.match(cover.detail,/피해가 감소/);
 s.tornadoRoofImpactEncounter=s.tornadoEncounter;
 assert.equal(show(s).some(x=>x.id==='cover'),false);
 s.tornadoRoofImpactEncounter=0;
 s.tornadoPreview=true;
 assert.equal(show(s).some(x=>x.id==='cover'),false);
 s.tornadoPreview=false;s.tornadoEncounterActive=false;
 assert.equal(show(s).some(x=>x.id==='cover'),false);
});

test('serious sickness + active cover + teamwork show at most the three agreed signs',()=>{
 const s=setup();s.sickness=78;
 s.companion.present=true;s.companion.health=70;
 s.kit.seeds=true;
 s.weather='tornado';beginTornadoEncounter(s,startedAt);s.tornadoCoverActive=true;
 assert.deepEqual(show(s).map(x=>x.id),['infection','cover','companion']);
 s.survivalStatus='dead';
 assert.deepEqual(show(s),[]);
});

test('three small transparent SVG resources have consistent circle and one simple center glyph',()=>{
 for(const name of ['infection','companion','cover']){
   const svg=readFileSync(new URL('../public/assets/ui/neon-status/'+name+'.svg',import.meta.url),'utf8');
   assert.match(svg,/<svg[^>]+viewBox="0 0 64 64"/);
   assert.equal((svg.match(/<circle /g)||[]).length<=3,true);
   assert.doesNotMatch(svg,/<image|<foreignObject|<text|<filter|data:image|<animate|<linearGradient/);
   assert.ok(svg.length<1100,'lean, predictable static assets');
 }
});

test('display-only UI avoids new saves, rerolls, and bogus circular time gauges',()=>{
 const main=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
 const css=readFileSync(new URL('../src/neonStatusHud.css',import.meta.url),'utf8');
 const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
 assert.match(main,/syncNeonStatusHud\(\$\('#hud'\),state,t,day\)/);
 assert.match(html,/src\/neonStatusHud\.css/);
 assert.match(css,/@keyframes afterday-neon-near/);
 assert.match(css,/@keyframes afterday-neon-imminent/);
 assert.match(css,/animation:afterday-neon-imminent \.56s/);
 assert.match(css,/prefers-reduced-motion:reduce/);
 assert.doesNotMatch(css,/conic-gradient|stroke-dasharray|counter-reset|countdown/);
});

test('tablet and mobile positions clear the existing nine-slot bar and emergency tray',()=>{
 const css=readFileSync(new URL('../src/neonStatusHud.css',import.meta.url),'utf8');
 assert.match(css,/@media \(min-width:721px\) and \(max-width:1023px\)/);
 assert.match(css,/@media \(max-width:720px\)/);
 assert.match(css,/#hud:has\(> \.afterday-v3-urgent-actions\.has-urgent\) > \.neon-status-hud/);
 assert.match(css,/#hud:has\(#life-panel:not\(\.hidden\)\) > \.neon-status-hud/);
 assert.match(css,/#hud:has\(#weather-panel:not\(\.hidden\)\) > \.neon-status-hud/);
 assert.match(css,/#hud:has\(\.afterday-board\.is-open\) > \.neon-status-hud/);
});
