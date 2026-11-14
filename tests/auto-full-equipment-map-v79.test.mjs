import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {defaults,applyAction,DAY_MS} from '../src/simulation.js';
import {
 selectAutoCompanionAction,selectAutoMapAction,planAutoSurvivalAction
} from '../src/autoSurvivalV73.js';
import {
 beginMapExpedition,advanceMapExpedition,resolveMapExpedition,
 EXPLORATION_TRAVEL_GAME_MS,EXPLORATION_MIN_REAL_MS
} from '../src/explorationMapV78.js';

const started=Date.UTC(2026,10,14),real=started+200000;
const fresh=()=>defaults(started);
const file=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');

test('AUTO includes companion invitation only with available provisions',()=>{
 const s=fresh();s.companion.pending={id:'companion:1',radioNewsId:1,day:1};
 s.supply.food=4;s.supply.water=4;
 assert.equal(selectAutoCompanionAction(s),'companion_invite');
 assert.equal(applyAction(s,'companion_invite',started).good,true);
 assert.equal(s.companion.present,true);
 assert.equal(s.companion.pending,null);
 assert.equal(selectAutoCompanionAction(s),null);
});

test('understocked AUTO selects legitimate alternative companion decisions without free items',()=>{
 const s=fresh();s.companion.pending={id:'companion:2',radioNewsId:2,day:1};
 s.supply.food=2;s.supply.water=0;
 assert.equal(selectAutoCompanionAction(s),'companion_trade');
 assert.equal(applyAction(s,'companion_trade',started).good,true);
 assert.equal(s.companion.pending,null);
 assert.equal(s.supply.food,1);
 const aid=fresh();aid.companion.pending={id:'companion:3',radioNewsId:3,day:1};
 aid.supply.food=0;aid.supply.water=2;
 assert.equal(selectAutoCompanionAction(aid),'companion_aid');
 assert.equal(applyAction(aid,'companion_aid',started).good,true);
 assert.equal(aid.supply.water,1);
 const refuse=fresh();refuse.companion.pending={id:'companion:4',radioNewsId:4,day:1};
 refuse.supply.food=0;refuse.supply.water=0;
 assert.equal(selectAutoCompanionAction(refuse),'companion_decline');
 assert.equal(applyAction(refuse,'companion_decline',started).good,true);
 assert.equal(refuse.companion.present,false);
});

test('food ration decisions are automatic but use exact manual cost and morale impact',()=>{
 const s=fresh();s.companion.present=true;s.companion.health=65;
 s.companion.rationPending={day:4,id:'companion:rations:1'};
 s.supply.food=4;s.supply.water=4;
 assert.equal(selectAutoCompanionAction(s),'companion_rations_share');
 const a=applyAction(s,'companion_rations_share',started+3*DAY_MS);
 assert.equal(a.good,true);
 assert.equal(s.supply.food,3);assert.equal(s.supply.water,3);
 assert.equal(s.companion.rationPending,null);
 const thin=fresh();thin.companion.present=true;thin.companion.health=60;
 thin.companion.rationPending={day:4,id:'companion:rations:1'};
 thin.supply.food=0;thin.supply.water=1;
 assert.equal(selectAutoCompanionAction(thin),'companion_rations_conserve');
 assert.equal(applyAction(thin,'companion_rations_conserve',started+3*DAY_MS).good,true);
 assert.equal(thin.companion.health,44);
});

test('AUTO map follows visibility/visit/date limits and chooses the next new location',()=>{
 const s=fresh();
 assert.deepEqual(selectAutoMapAction(s,started),{kind:'depart',siteId:'ruined_house'});
 const depart=beginMapExpedition(s,'ruined_house',started,real);
 assert.equal(depart.good,true);
 assert.equal(selectAutoMapAction(s,started),null);
 assert.equal(advanceMapExpedition(s,started+EXPLORATION_TRAVEL_GAME_MS,real+EXPLORATION_MIN_REAL_MS).kind,'arrived');
 assert.equal(selectAutoMapAction(s,started+EXPLORATION_TRAVEL_GAME_MS).kind,'choice');
 s.supply.water=4;s.health=78;
 const choice=selectAutoMapAction(s,started+EXPLORATION_TRAVEL_GAME_MS);
 const result=resolveMapExpedition(s,choice.choice,started+EXPLORATION_TRAVEL_GAME_MS,real+EXPLORATION_MIN_REAL_MS);
 assert.equal(result.good,true);
 assert.equal(selectAutoMapAction(s,started+EXPLORATION_TRAVEL_GAME_MS),null);
 const before=JSON.stringify({kit:s.kit,supply:s.supply});
 assert.equal(resolveMapExpedition(s,choice.choice,started+EXPLORATION_TRAVEL_GAME_MS,real+EXPLORATION_MIN_REAL_MS).good,false);
 assert.equal(JSON.stringify({kit:s.kit,supply:s.supply}),before);
 const returned=advanceMapExpedition(s,started+2*EXPLORATION_TRAVEL_GAME_MS,real+2*EXPLORATION_MIN_REAL_MS);
 assert.equal(returned.kind,'returned');
 assert.equal(selectAutoMapAction(s,started),null,'one expedition per game day');
 assert.deepEqual(selectAutoMapAction(s,started+DAY_MS),{kind:'depart',siteId:s.explorationMap.sites.ruined_house.completed?'convenience_store':'ruined_house'});
});

test('AUTO map pauses in critical storms and while injured, no unsafe fallback loops',()=>{
 const s=fresh();
 s.weather='tornado';assert.equal(selectAutoMapAction(s,started),null);
 s.weather='clear';s.health=20;assert.equal(selectAutoMapAction(s,started),null);
 s.health=60;
 assert.deepEqual(selectAutoMapAction(s,started),{kind:'depart',siteId:'ruined_house'});
});

test('AUTO map encounter safeguards resources and critical health',()=>{
 const s=fresh();s.explorationMap.mission={
  siteId:'ruined_house',phase:'encounter',dueAt:0,realReadyAt:0,result:'',message:''};
 s.health=43;s.supply.water=0;
 assert.deepEqual(selectAutoMapAction(s,started),{kind:'choice',choice:'stay'});
 s.supply.water=3;
 assert.deepEqual(selectAutoMapAction(s,started),{kind:'choice',choice:'scout'});
 s.health=70;s.supply.parts=0;
 assert.deepEqual(selectAutoMapAction(s,started),{kind:'choice',choice:'salvage'});
 s.supply.parts=4;
 assert.deepEqual(selectAutoMapAction(s,started),{kind:'choice',choice:'scout'});
 s.supply.water=0;
 assert.deepEqual(selectAutoMapAction(s,started),{kind:'choice',choice:'go'});
});

test('radio and daily expedition functions were already automated and remain so',()=>{
 const s=fresh();
 s.scavenge.pending={day:1,id:'scavenge:1:cache',target:'cache',title:'탐색',description:'폐허'};
 assert.equal(planAutoSurvivalAction(s,started),'scavenge_go');
 s.scavenge.pending=null;s.kit.radio=true;s.supply.food=4;s.supply.water=4;
 s.exploreCooldownAt=started+DAY_MS;
 assert.equal(planAutoSurvivalAction(s,started),'radio_contact');
 assert.equal(applyAction(s,'radio_contact',started).good,true);
 assert.notEqual(planAutoSurvivalAction(s,started),'radio_contact');
});

test('every AUTO action uses real existing action/expedition pathways and not direct resource increment',()=>{
 const p=file('src/autoSurvivalV73.js'),main=file('src/main.js'),ui=file('src/explorationMapUiV78.js');
 assert.match(main,/runSurvivalAction\(companion,true\)/);
 assert.match(main,/eventBoard\.activeKey==='expedition'\?selectAutoScavenge\(state\)/);
 assert.match(main,/explorationUI\.autoStep\(mapPlan,real\)/);
 assert.match(main,/isAutoEnabled:\(\)=>autoSurvivalEnabled/);
 assert.match(ui,/function autoStep\(plan,realNow=Date\.now\(\)\)/);
 assert.match(ui,/resolveMapExpedition\(getState\(\),plan\.choice,getNow\(\),realNow\)/);
 assert.match(ui,/beginMapExpedition\(getState\(\),plan\.siteId,getNow\(\),realNow\)/);
 assert.match(ui,/!isAutoEnabled\?\.\(\)/);
 assert.doesNotMatch(p,/Math\.random|s\.supply\.\w+\+\+|localStorage|setInterval/);
});

test('brass map redesign does not move the existing weather HUD or action slot sprites',()=>{
 const html=file('index.html'),css=file('src/explorationMapPolishV79.css');
 assert.match(html,/src\/explorationMapPolishV79\.css/);
 assert.match(css,/\.exploration-map-v78 \.exploration-map__panel/);
 assert.match(css,/@media\(max-width:720px\)/);
 assert.doesNotMatch(css,/#hud|\.actionbar|\.premium-hud-v1000|\.topbar|disaster-forecast/);
});
