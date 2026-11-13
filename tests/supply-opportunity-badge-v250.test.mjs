import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {defaults,sanitize} from '../src/simulation.js';
import {offerDailyScavenge,resolveScavengeChoice} from '../src/scavengeDirector.js';
const read=file=>readFileSync(new URL('../'+file,import.meta.url),'utf8');
const html=read('index.html'),main=read('src/main.js'),css=read('src/hudAlignmentV1300.css');

test('supply badge belongs to the original bottom explore slot, not an extra cell',()=>{
 assert.ok(html.includes('<button id="explore" data-action="explore" aria-label="긴급 탐색" data-supply-ready="false">'));
 assert.ok(!html.includes('class="afterday-supply-badge"'),'legacy span is intentionally removed');
 assert.match(css,/#hud \.actionbar > button#explore\[data-supply-ready="true"\]::after/);
 assert.match(css,/content:"!"!important/);
 assert.match(css,/display:grid!important/);
 assert.match(css,/pointer-events:none!important/);
 assert.match(css,/@media\(max-width:720px\)/);
});
test('HUD badge appears for either a pending expedition or an eligible emergency supply run',()=>{
 assert.match(main,/const supplyAvailable=!dead&&\(Boolean\(open\)\|\|emergency.ready\)/);
 assert.match(main,/const supplyButton=\$\('#explore'\)/);
 assert.match(main,/supplyButton\.dataset\.supplyReady=String\(supplyAvailable\)/);
 assert.match(main,/supplyButton\.setAttribute\('aria-label',supplyHelp\)/);
 const initial=Date.UTC(2026,10,13,0);
 const state=defaults(initial);
 state.supply.food=0;state.supply.water=0;
 assert.equal(Boolean(state.scavenge?.pending),false,'low supplies alone is not an available quest');
 const quest=offerDailyScavenge(state,1);
 assert.ok(quest,'day 1 must offer an expedition');
 assert.equal(Boolean(state.scavenge?.pending),true);
 const restored=sanitize(JSON.parse(JSON.stringify(state)),initial+60000);
 assert.equal(Boolean(restored.scavenge.pending),true,'pending badge survives save reload');
 assert.equal(resolveScavengeChoice(restored,'stay').good,true);
 assert.equal(Boolean(restored.scavenge?.pending),false,'completed or declined quest removes badge');
});
