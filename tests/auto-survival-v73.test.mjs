import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {defaults,applyAction,emergencyExploreAvailability,DAY_MS} from '../src/simulation.js';
import {offerDailyScavenge} from '../src/scavengeDirector.js';
import {AUTO_ACTION_INTERVAL_MS,planAutoSurvivalAction,selectAutoScavenge} from '../src/autoSurvivalV73.js';

const startedAt=Date.UTC(2026,10,14,0,0,0);
const fresh=()=>defaults(startedAt);
const plan=(s,time=startedAt)=>planAutoSurvivalAction(s,time);

test('AUTO is disabled by default in the UI and only runs on live visible frame ticks',()=>{
 const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
 const js=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
 assert.match(html,/<button id="speed-toggle"[^>]*>1×<\/button><button id="auto-toggle"[^>]*aria-pressed="false"[^>]*>AUTO<\/button>/);
 assert.match(js,/let autoSurvivalEnabled=false/);
 assert.match(js,/autoSurvivalEnabled=!autoSurvivalEnabled/);
 assert.match(js,/if\(foreground&&!gpuContextLost\)runAutoSurvival\(real,gameNow\)/);
 assert.match(js,/document\.visibilityState!=='visible'/);
 assert.match(js,/real-lastAutoActionReal<AUTO_ACTION_INTERVAL_MS/);
 assert.match(js,/runSurvivalAction\(action\)/);
 assert.equal(AUTO_ACTION_INTERVAL_MS,1250);
 assert.doesNotMatch(js,/localStorage\.setItem\(['"]auto|autoSurvivalEnabled:/);
});

test('AUTO respects true emergencies before attempting routine survival',()=>{
 const s=fresh();
 s.weather='tornado';s.tornadoEncounter=4;s.tornadoEncounterActive=true;
 assert.equal(plan(s),'take_cover');
 assert.equal(applyAction(s,'take_cover',startedAt).good,true);
 assert.equal(plan(s),'secure_supplies');
 assert.equal(applyAction(s,'secure_supplies',startedAt).good,true);
 assert.notEqual(plan(s),'take_cover');
 s.raiderAlert=true;s.supply.parts=1;
 assert.equal(plan(s),'secure_storage');
 assert.equal(applyAction(s,'secure_storage',startedAt).good,true);
 assert.equal(s.raiderAlert,false);
 s.survivalStatus='dead';
 assert.equal(plan(s),null);
});

test('food and water are consumed only when needed, exactly as manual buttons',()=>{
 const s=fresh();
 s.water=29;s.supply.water=2;
 assert.equal(plan(s),'drink');
 assert.equal(applyAction(s,'drink',startedAt).good,true);
 assert.equal(s.water,60);assert.equal(s.supply.water,1);
 assert.notEqual(plan(s),'drink');
 s.food=30;s.supply.food=2;
 assert.equal(plan(s),'eat');
 assert.equal(applyAction(s,'eat',startedAt).good,true);
 assert.equal(s.food,64);assert.equal(s.supply.food,1);
 s.food=20;s.supply.food=0;
 assert.notEqual(plan(s),'eat','no free food when stores are empty');
});

test('illness, treatment and repairs honor real resource gates',()=>{
 const s=fresh();
 s.sickness=47;s.supply.medicine=1;
 assert.equal(plan(s),'medicine');
 assert.equal(applyAction(s,'medicine',startedAt).good,true);
 assert.equal(s.supply.medicine,0);
 assert.equal(s.sickness,0);
 s.facilities.tank=33;s.supply.parts=2;
 assert.equal(plan(s),'repair_tank');
 assert.equal(applyAction(s,'repair_tank',startedAt).good,true);
 assert.equal(s.facilities.tank,71);assert.equal(s.supply.parts,0);
 assert.notEqual(plan(s),'repair_tank');
});

test('a pending scavenging mission is resolved once with real quest odds, not free loot',()=>{
 const s=fresh();
 offerDailyScavenge(s,1,{force:true});
 assert.ok(s.scavenge.pending);
 assert.equal(plan(s),'scavenge_go');
 assert.equal(selectAutoScavenge(s),'scavenge_go');
 assert.equal(applyAction(s,'scavenge_go',startedAt).good,true);
 assert.equal(s.scavenge.pending,null);
 assert.equal(applyAction(s,'scavenge_go',startedAt).good,false);
 assert.equal(selectAutoScavenge(s),null);
 const safer=fresh();safer.health=62;safer.supply.water=4;
 offerDailyScavenge(safer,1,{force:true});
 assert.equal(plan(safer),'scavenge_scout');
});

test('low supplies unlock existing emergency exploration only when the true gate permits',()=>{
 const s=fresh();
 s.supply.food=1;
 assert.equal(emergencyExploreAvailability(s,startedAt).ready,true);
 assert.equal(plan(s),'explore');
 assert.equal(applyAction(s,'explore',startedAt).good,true);
 assert.equal(emergencyExploreAvailability(s,startedAt).ready,false,'actual cooldown applies');
 assert.notEqual(plan(s),'explore','no repeated emergency loot during cooldown');
 const risky=fresh();risky.supply.food=1;risky.weather='tornado';
 assert.equal(emergencyExploreAvailability(risky,startedAt).ready,false);
 assert.notEqual(plan(risky),'explore','no extra supplies during disaster');
});

test('real radio gear gives at most one daily contact; later days may try again',()=>{
 const s=fresh();s.kit.radio=true;
 assert.equal(plan(s),'radio_contact');
 assert.equal(applyAction(s,'radio_contact',startedAt).good,true);
 assert.notEqual(plan(s),'radio_contact','daily radio cooldown is respected');
 // Day 2 can contact again; existing story pending choices are not auto-answered.
 assert.equal(plan(s,startedAt+DAY_MS),'radio_contact');
 assert.equal(applyAction(s,'radio_contact',startedAt+DAY_MS).good,true);
 assert.equal(s.scavenge.radioLastDay,2);
});

test('rain collection and rest never ignore cooldown, weather or tool costs',()=>{
 const s=fresh();
 s.weather='rain';s.supply.water=2;s.supply.parts=1;
 assert.equal(plan(s),null,'do not spend the final emergency part on improvised filtration');
 s.kit.purifier=true;
 assert.equal(plan(s),'collect_water');
 assert.equal(applyAction(s,'collect_water',startedAt).good,true);
 assert.notEqual(plan(s),'collect_water','collect water cooldown applies');
 const rest=fresh();rest.health=67;
 assert.equal(plan(rest),'rest');
 assert.equal(applyAction(rest,'rest',startedAt).good,true);
 assert.notEqual(plan(rest),'rest','rest cooldown applies');
 const ill=fresh();ill.health=60;ill.weather='rain';ill.kit.tent=false;
 assert.notEqual(plan(ill),'rest','rain sleeping without tent increases sickness');
});

test('routine repair preserves a two-part emergency reserve and manual actions stay available',()=>{
 const s=fresh();
 s.facilities.storage=39;s.supply.parts=2;
 assert.equal(plan(s),null);
 s.supply.parts=4;
 assert.equal(plan(s),'repair');
 assert.equal(applyAction(s,'repair',startedAt).good,true);
 assert.equal(s.supply.parts,2);
});

test('high-impact companion choices stay manual and their game clock can resume',()=>{
 const js=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
 assert.match(js,/eventBoard\.activeKey!=='expedition'/);
 assert.match(js,/eventBoard\.deferChoice\(\)/);
 assert.match(js,/selectAutoScavenge\(state\):planAutoSurvivalAction\(state,gameNow\)/);
 const planner=readFileSync(new URL('../src/autoSurvivalV73.js',import.meta.url),'utf8');
 assert.doesNotMatch(planner,/return ['"]companion_invite|return ['"]companion_rations_share/);
 assert.doesNotMatch(planner,/Math\.random|s\.supply\.\w+\+\+|localStorage|setInterval/);
});

test('PC/mobile AUTO button stays under speed without altering existing HUD frames',()=>{
 const css=readFileSync(new URL('../src/autoSurvivalV73.css',import.meta.url),'utf8');
 const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
 assert.match(html,/src\/autoSurvivalV73\.css/);
 assert.match(css,/#hud \.topbar \.top-right #auto-toggle/);
 assert.match(css,/#auto-toggle\[aria-pressed="true"\]/);
 assert.match(css,/@media\(max-width:720px\)/);
 assert.match(css,/width:48px!important/);
 assert.match(css,/touch-action:manipulation!important/);
 assert.doesNotMatch(css,/\.actionbar|\.premium-hud__frame|\.disaster-forecast|top:calc|bottom:/);
});
