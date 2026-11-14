import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {defaults,sanitize,DAY_MS,applyAction} from '../src/simulation.js';
import {
 newExplorationMap,sanitizeExplorationMap,mapExpeditionAvailability,
 beginMapExpedition,advanceMapExpedition,resolveMapExpedition,
 EXPLORATION_SITES,EXPLORATION_TRAVEL_GAME_MS,EXPLORATION_MIN_REAL_MS
} from '../src/explorationMapV78.js';

const start=Date.UTC(2026,10,14);
const state=()=>defaults(start);
const real=Date.UTC(2026,10,14,4,10);
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const depart=(s,id='ruined_house',now=start,actual=real)=>{
 const result=beginMapExpedition(s,id,now,actual);
 assert.equal(result.good,true,result.msg);
 assert.deepEqual(advanceMapExpedition(s,now+EXPLORATION_TRAVEL_GAME_MS,actual+EXPLORATION_MIN_REAL_MS).kind,'arrived');
};

test('first launch discovers only the nearby house and own roof; store is not available',()=>{
 const s=state();
 assert.deepEqual(EXPLORATION_SITES.map(site=>site.id),['ruined_house','convenience_store']);
 assert.equal(s.explorationMap.version,1);
 assert.equal(s.explorationMap.sites.ruined_house.visibility,'rumored');
 assert.equal(s.explorationMap.sites.convenience_store.visibility,'unknown');
 assert.equal(mapExpeditionAvailability(s,'ruined_house',start).ready,true);
 assert.equal(mapExpeditionAvailability(s,'convenience_store',start).ready,false);
});

test('existing DAY 43 equipment, supply, save schema and companion survive exploration migration',()=>{
 const raw=state();raw.kit.tent=true;raw.kit.radio=true;raw.supply.parts=81;
 raw.supply.food=17;raw.health=62;raw.companion.present=true;
 const now=start+42*DAY_MS;
 const loaded=sanitize(raw,now);
 assert.equal(loaded.version,4);
 assert.equal(loaded.kit.tent,true);
 assert.equal(loaded.kit.radio,true);
 assert.equal(loaded.supply.parts,81);
 assert.equal(loaded.supply.food,17);
 assert.equal(loaded.health,62);
 assert.equal(loaded.companion.present,true);
 assert.equal(loaded.explorationMap.sites.ruined_house.visibility,'rumored');
 const old=structuredClone(raw);delete old.explorationMap;
 assert.deepEqual(sanitize(old,now).explorationMap,newExplorationMap());
});

test('a mission is a real saveable phase, not an immediately repeated loot click',()=>{
 const s=state();
 assert.equal(beginMapExpedition(s,'ruined_house',start,real).good,true);
 assert.equal(s.explorationMap.mission.phase,'outbound');
 assert.equal(beginMapExpedition(s,'ruined_house',start,real).good,false);
 assert.equal(advanceMapExpedition(s,start+EXPLORATION_TRAVEL_GAME_MS,real+1500).changed,false);
 assert.equal(advanceMapExpedition(s,start+EXPLORATION_TRAVEL_GAME_MS-1,real+5000).changed,false);
 assert.equal(advanceMapExpedition(s,start+EXPLORATION_TRAVEL_GAME_MS,real+EXPLORATION_MIN_REAL_MS).kind,'arrived');
 assert.equal(advanceMapExpedition(s,start+EXPLORATION_TRAVEL_GAME_MS,real+5000).changed,false);
});

test('a single choice credits real scavenging reward only once and never alters original daily quest',()=>{
 const s=state(),dayPending={id:'scavenge:1:tent',day:1,title:'첫 탐색',description:'기존 사건',target:'tent'};
 s.scavenge.pending={...dayPending};
 const oldDirector=JSON.stringify(s.scavenge);
 depart(s);
 const chosen=resolveMapExpedition(s,'go',start+EXPLORATION_TRAVEL_GAME_MS,real+EXPLORATION_MIN_REAL_MS);
 assert.equal(chosen.good,true);
 assert.ok(['item','supplies','injury','sickness','empty'].includes(chosen.outcome));
 assert.equal(s.explorationMap.mission.phase,'returning');
 assert.equal(JSON.stringify(s.scavenge),oldDirector,'no daily quest was consumed or overwritten');
 const after=JSON.stringify({kit:s.kit,supply:s.supply,health:s.health,sickness:s.sickness});
 assert.equal(resolveMapExpedition(s,'go',start+EXPLORATION_TRAVEL_GAME_MS,real+EXPLORATION_MIN_REAL_MS).good,false);
 assert.equal(JSON.stringify({kit:s.kit,supply:s.supply,health:s.health,sickness:s.sickness}),after);
});

test('after return, failed sites remain visited and next region unlocks even without rare loot',()=>{
 let found=null;
 for(let seed=1;seed<1000;seed++){
  const s=state();s.scavenge.seed=seed;
  depart(s);const outcome=resolveMapExpedition(s,'go',start+EXPLORATION_TRAVEL_GAME_MS,real+EXPLORATION_MIN_REAL_MS);
  if(['injury','sickness','empty'].includes(outcome.outcome)){found={s,outcome};break;}
 }
 assert.ok(found);
 const {s,outcome}=found;
 const leaveAt=start+2*EXPLORATION_TRAVEL_GAME_MS;
 const leavingReal=real+2*EXPLORATION_MIN_REAL_MS;
 const returned=advanceMapExpedition(s,leaveAt,leavingReal);
 assert.equal(returned.kind,'returned');
 assert.equal(returned.completed,false);
 assert.equal(s.explorationMap.sites.ruined_house.visibility,'visited');
 assert.equal(s.explorationMap.sites.ruined_house.visits,1);
 assert.equal(s.explorationMap.sites.convenience_store.visibility,'rumored');
 assert.equal(advanceMapExpedition(s,leaveAt+DAY_MS,leavingReal+10000).changed,false);
 assert.equal(s.explorationMap.sites.ruined_house.visits,1);
 assert.ok(['injury','sickness','empty'].includes(outcome.outcome));
});

test('successful house expedition completes once, records survivor gear, and unlocks the store',()=>{
 let found;
 for(let seed=1;seed<500;seed++){
  const s=state();s.scavenge.seed=seed;
  depart(s);const outcome=resolveMapExpedition(s,'go',start+EXPLORATION_TRAVEL_GAME_MS,real+EXPLORATION_MIN_REAL_MS);
  if(['item','supplies'].includes(outcome.outcome)){found={s,outcome};break;}
 }
 assert.ok(found);
 const {s,outcome}=found;
 const itemBefore=s.kit.tent;
 const returned=advanceMapExpedition(s,start+2*EXPLORATION_TRAVEL_GAME_MS,real+EXPLORATION_MIN_REAL_MS*2);
 assert.equal(returned.kind,'returned');
 assert.equal(returned.completed,true);
 assert.equal(s.explorationMap.sites.ruined_house.visibility,'completed');
 assert.equal(s.explorationMap.sites.convenience_store.visibility,'rumored');
 assert.equal(mapExpeditionAvailability(s,'ruined_house',start+DAY_MS).ready,false);
 assert.equal(mapExpeditionAvailability(s,'convenience_store',start+DAY_MS).ready,true);
 assert.equal(s.kit.tent,itemBefore,'the map reveal must not issue duplicate tent items');
 assert.equal(s.explorationMap.sites.ruined_house.visits,1);
 assert.ok(outcome.good);
});

test('scouting spends exactly the normal single water and rejects a dry supply',()=>{
 const s=state();s.supply.water=0;
 depart(s);
 const fail=resolveMapExpedition(s,'scout',start+EXPLORATION_TRAVEL_GAME_MS,real+EXPLORATION_MIN_REAL_MS);
 assert.equal(fail.good,false);
 assert.equal(s.explorationMap.mission.phase,'encounter');
 assert.equal(s.supply.water,0);
 s.supply.water=3;
 const okay=resolveMapExpedition(s,'scout',start+EXPLORATION_TRAVEL_GAME_MS,real+EXPLORATION_MIN_REAL_MS);
 assert.equal(okay.good,true);
 assert.equal(s.supply.water>=2,true);
});

test('a safe retreat is not considered a visit or permanent region discovery',()=>{
 const s=state();depart(s);
 const result=resolveMapExpedition(s,'stay',start+EXPLORATION_TRAVEL_GAME_MS,real+EXPLORATION_MIN_REAL_MS);
 assert.equal(result.outcome,'safe');
 advanceMapExpedition(s,start+2*EXPLORATION_TRAVEL_GAME_MS,real+2*EXPLORATION_MIN_REAL_MS);
 assert.equal(s.explorationMap.sites.ruined_house.visits,0);
 assert.equal(s.explorationMap.sites.convenience_store.visibility,'unknown');
 assert.equal(s.explorationMap.lastAttemptDay,1);
});

test('one meaningful map expedition per in-game day, disaster and health limits apply',()=>{
 const s=state();
 s.weather='tornado';assert.equal(mapExpeditionAvailability(s,'ruined_house',start).ready,false);
 s.weather='clear';s.health=24;assert.equal(mapExpeditionAvailability(s,'ruined_house',start).ready,false);
 s.health=60;
 depart(s);
 const result=resolveMapExpedition(s,'stay',start+EXPLORATION_TRAVEL_GAME_MS,real+EXPLORATION_MIN_REAL_MS);
 assert.equal(result.good,true);
 advanceMapExpedition(s,start+2*EXPLORATION_TRAVEL_GAME_MS,real+2*EXPLORATION_MIN_REAL_MS);
 assert.equal(mapExpeditionAvailability(s,'ruined_house',start).ready,false);
 assert.equal(mapExpeditionAvailability(s,'ruined_house',start+DAY_MS).ready,true);
});

test('reloaded outbound and returning expeditions resume without rerolling or duplicating rewards',()=>{
 const s=state();depart(s);
 resolveMapExpedition(s,'go',start+EXPLORATION_TRAVEL_GAME_MS,real+EXPLORATION_MIN_REAL_MS);
 const gear=JSON.stringify(s.kit),supplies=JSON.stringify(s.supply);
 const saved=JSON.parse(JSON.stringify(s));
 const restored=sanitize(saved,start+2*EXPLORATION_TRAVEL_GAME_MS);
 assert.equal(restored.explorationMap.mission.phase,'returning');
 const a=advanceMapExpedition(restored,start+2*EXPLORATION_TRAVEL_GAME_MS,real+2*EXPLORATION_MIN_REAL_MS);
 assert.equal(a.kind,'returned');
 assert.equal(advanceMapExpedition(restored,start+3*EXPLORATION_TRAVEL_GAME_MS,real+99999).changed,false);
 assert.equal(JSON.stringify(restored.kit),gear);
 assert.equal(JSON.stringify(restored.supply),supplies);
 assert.equal(restored.explorationMap.sites.ruined_house.visits,1);
});

test('map data sanitizer ignores corrupted unknown location IDs and untrusted mission phases',()=>{
 const dirty={lastAttemptDay:-4,sites:{
  ruined_house:{visibility:'unknown',visits:4,completed:true},
  convenience_store:{visibility:'completed',visits:0,completed:true},
  fraudulent_tower:{visibility:'completed',visits:50000}
 },mission:{siteId:'fraudulent_tower',phase:'loot',result:'item',message:'fake'}};
 const cleaned=sanitizeExplorationMap(dirty);
 assert.equal(cleaned.sites.ruined_house.visibility,'completed');
 assert.equal(cleaned.sites.convenience_store.completed,false);
 assert.equal(cleaned.sites.convenience_store.visibility,'rumored','an already visited house should still reveal the neighboring store');
 assert.equal(cleaned.lastAttemptDay,0);
 assert.equal(cleaned.mission,null);
 assert.equal(cleaned.sites.fraudulent_tower,undefined);
});

test('original emergency and daily loot loops remain independent of persistent map exploration',()=>{
 const s=state();const orig=JSON.stringify(s.scavenge);
 depart(s);resolveMapExpedition(s,'stay',start+EXPLORATION_TRAVEL_GAME_MS,real+EXPLORATION_MIN_REAL_MS);
 assert.equal(JSON.stringify(s.scavenge),orig);
 s.supply.food=0;s.supply.water=0;s.supply.parts=0;s.exploreCooldownAt=0;
 const emergency=applyAction(s,'explore',start);
 assert.equal(emergency.good,true);
});

test('new exploration art resources and fog UI are split, safe and phone-responsive',()=>{
 const html=read('index.html'),main=read('src/main.js'),css=read('src/explorationMapV78.css');
 const ui=read('src/explorationMapUiV78.js');
 assert.match(html,/id="exploration-open"/);
 assert.match(html,/src\/explorationMapV78\.css/);
 assert.match(main,/createExplorationMapV78/);
 assert.match(main,/explorationUI\?\.tick\(gameNow,real\)/);
 assert.match(main,/state\.explorationMap\?\.mission/);
 assert.match(main,/explorationUI\?\.needsChoice\(\)/);
 assert.match(ui,/<canvas id="exploration-fog" width="320" height="213"/);
 assert.match(ui,/globalCompositeOperation='destination-out'/);
 assert.match(css,/@media\(max-width:720px\)/);
 assert.match(css,/@media\(max-width:350px\)/);
 assert.match(css,/max-height:calc\(100dvh/);
 for(const path of [
  'public/assets/exploration/map/overview.svg',
  'public/assets/exploration/locations/ruined_house.svg',
  'public/assets/exploration/locations/convenience_store.svg',
  'public/assets/exploration/markers/ruined_house.svg',
  'public/assets/exploration/markers/convenience_store.svg',
  'public/assets/exploration/markers/state_unknown.svg'
 ])assert.match(read(path),/<svg[^>]*viewBox=/,path);
 assert.doesNotMatch(read('src/explorationMapV78.js'),/Math\.random\(|setTimeout\(|localStorage|window\./);
});
