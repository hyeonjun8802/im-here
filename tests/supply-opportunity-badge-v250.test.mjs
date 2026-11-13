import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {defaults,sanitize} from '../src/simulation.js';
import {offerDailyScavenge,resolveScavengeChoice} from '../src/scavengeDirector.js';
const read=file=>readFileSync(new URL('../'+file,import.meta.url),'utf8');
const html=read('index.html'),main=read('src/main.js'),css=read('src/hudAlignmentV1300.css');

test('supply badge belongs to the original bottom explore slot, not an extra cell',()=>{
 assert.match(html,/<button id="explore" data-action="explore" aria-label="긴급 탐색">[\\s\\S]*?<span class="afterday-supply-badge" aria-hidden="true" hidden>!<\\/span><\\/button>/);
 assert.equal((html.match(/class="afterday-supply-badge"/g)||[]).length,1);
 assert.match(css,/#hud \.actionbar #explore > \.afterday-supply-badge/);
 assert.match(css,/\.afterday-supply-badge\[hidden\] \{\s*display:none!important/);
 assert.match(css,/pointer-events:none!important/);
 assert.match(css,/@media\(max-width:720px\)/);
});
test('HUD uses actual pending expedition and not low food/water as badge state',()=>{
 assert.match(main,/const supplyAvailable=Boolean\(open\)&&!dead/);
 assert.match(main,/const supplyBadge=\$\('#explore \.afterday-supply-badge'\)/);
 assert.match(main,/if\(supplyBadge\)supplyBadge.hidden=!supplyAvailable/);
 assert.match(main,/setAttribute\('aria-label',supplyAvailable\?/);
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
