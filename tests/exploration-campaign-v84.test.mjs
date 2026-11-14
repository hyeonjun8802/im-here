import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {defaults,sanitize} from '../src/simulation.js';
import {
 EXPLORATION_SITES,TOWER_PHASES,newExplorationMap,sanitizeExplorationMap,
 mapExpeditionAvailability,beginMapExpedition,advanceMapExpedition,
 resolveMapExpedition,advanceTowerStory,mapFinaleAvailability,resolveMapFinale,
 EXPLORATION_MIN_REAL_MS,EXPLORATION_TRAVEL_GAME_MS
} from '../src/explorationMapV78.js';

const start=Date.UTC(2026,10,14,12);
const real=start+3000;
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const ids=['ruined_house','convenience_store','pharmacy','flower_shop',
 'water_station','communications_room','hypermarket','underpass',
 'hospital','substation','community_shelter','rooftop_helipad'];

test('twelve named scenarios form 6 near + 6 far sites without introducing a thirteenth region',()=>{
 assert.deepEqual(EXPLORATION_SITES.map(x=>x.id),ids);
 assert.deepEqual(EXPLORATION_SITES.filter(x=>x.zone==='near').map(x=>x.id),ids.slice(0,6));
 assert.deepEqual(EXPLORATION_SITES.filter(x=>x.zone==='far').map(x=>x.id),ids.slice(6));
 assert.equal(EXPLORATION_SITES.every(x=>x.scene&&x.reward&&x.risk&&x.description),true);
 assert.equal(new Set(EXPLORATION_SITES.map(x=>x.id)).size,12);
 assert.deepEqual(TOWER_PHASES,['unknown','discovered','surveyed','parts_ready','restored','channel17']);
});

test('old house/store save records migrate without losing any recorded visit or old day',()=>{
 const old=defaults(start);
 old.kit.tent=true;old.supply.parts=13;
 old.explorationMap={version:1,lastAttemptDay:17,sites:{
  ruined_house:{visibility:'completed',visits:4,completed:true,lastOutcome:'item'},
  convenience_store:{visibility:'visited',visits:2,completed:false,lastOutcome:'empty'}
 },mission:null};
 const upgraded=sanitize(old,start+18*86400000);
 assert.equal(upgraded.version,4,'main game save version remains unchanged');
 assert.equal(upgraded.explorationMap.version,2);
 assert.equal(upgraded.explorationMap.lastAttemptDay,17);
 assert.equal(upgraded.explorationMap.sites.ruined_house.visits,4);
 assert.equal(upgraded.explorationMap.sites.convenience_store.visits,2);
 assert.equal(upgraded.explorationMap.sites.pharmacy.visibility,'rumored');
 assert.equal(upgraded.explorationMap.sites.hypermarket.visibility,'unknown');
 assert.equal(upgraded.kit.tent,true);
 assert.equal(upgraded.supply.parts,13);
 assert.equal(upgraded.explorationMap.tower.phase,'unknown');
});

test('nearby plot unfolds from the original first two sites through communications room',()=>{
 const map=newExplorationMap();
 assert.equal(map.sites.convenience_store.visibility,'unknown');
 for(const id of ids.slice(0,5)){
  map.sites[id].visits=1;
  map.sites[id].visibility='visited';
  const next=sanitizeExplorationMap(map);
  Object.assign(map,next);
 }
 for(const id of ['convenience_store','pharmacy','flower_shop','water_station','communications_room'])
  assert.notEqual(map.sites[id].visibility,'unknown',id);
 assert.equal(map.tower.phase,'unknown');
 map.sites.communications_room.visits=1;
 map.sites.communications_room.completed=true;
 const unlocked=sanitizeExplorationMap(map);
 assert.equal(unlocked.tower.phase,'discovered');
 assert.equal(unlocked.sites.hypermarket.visibility,'unknown');
});

test('tower steps must happen in sequence and reserve parts exactly once',()=>{
 const s=defaults(start);
 s.explorationMap.sites.communications_room.visits=1;
 s.explorationMap.sites.communications_room.completed=true;
 s.explorationMap=sanitizeExplorationMap(s.explorationMap);
 s.supply.parts=5;
 assert.equal(s.explorationMap.tower.phase,'discovered');
 assert.equal(advanceTowerStory(s,'connect').good,false);
 assert.equal(advanceTowerStory(s,'survey').good,true);
 assert.equal(s.explorationMap.tower.phase,'surveyed');
 assert.equal(advanceTowerStory(s,'survey').good,false);
 assert.equal(advanceTowerStory(s,'prepare').good,true);
 assert.equal(s.supply.parts,1);
 assert.equal(advanceTowerStory(s,'prepare').good,false);
 assert.equal(s.supply.parts,1,'no repeat spending');
 assert.equal(advanceTowerStory(s,'restore').good,true);
 assert.equal(advanceTowerStory(s,'connect').good,false,'a real radio is mandatory');
 s.kit.radio=true;
 const connected=advanceTowerStory(s,'connect');
 assert.equal(connected.good,true);
 assert.equal(s.explorationMap.tower.phase,'channel17');
 assert.equal(s.supply.parts,1);
 for(const id of ids.slice(6))assert.equal(s.explorationMap.sites[id].visibility,'rumored',id);
 const saved=structuredClone(s);
 assert.equal(sanitize(saved,start).explorationMap.tower.phase,'channel17');
 assert.equal(advanceTowerStory(s,'connect').good,false,'no repeat distant unlock');
});

test('medical scenes can only yield medicine on an existing successful single roll',()=>{
 let win=null,lose=null;
 for(let seed=1;seed<1500;seed++){
  const s=defaults(start);s.scavenge.seed=seed;
  s.explorationMap.sites.pharmacy.visibility='rumored';
  const departed=beginMapExpedition(s,'pharmacy',start,real);
  assert.equal(departed.good,true,departed.msg);
  advanceMapExpedition(s,start+EXPLORATION_TRAVEL_GAME_MS,real+EXPLORATION_MIN_REAL_MS);
  const result=resolveMapExpedition(s,'go',start+EXPLORATION_TRAVEL_GAME_MS,real+EXPLORATION_MIN_REAL_MS);
  if(['item','supplies'].includes(result.outcome)&&!win)win={s,result};
  if(['injury','sickness','empty'].includes(result.outcome)&&!lose)lose={s,result};
  if(win&&lose)break;
 }
 assert.ok(win&&lose);
 assert.equal(win.s.supply.medicine,1);
 assert.equal(lose.s.supply.medicine,0);
 assert.equal(resolveMapExpedition(win.s,'go',start+EXPLORATION_TRAVEL_GAME_MS,real+EXPLORATION_MIN_REAL_MS).good,false);
 assert.equal(win.s.supply.medicine,1,'no duplicate medicine reward');
});

test('optional end record requires all 12 completed sites and channel 17, then commits only once',()=>{
 const s=defaults(start);
 s.explorationMap.tower.phase='channel17';
 s.explorationMap=sanitizeExplorationMap(s.explorationMap);
 assert.equal(mapFinaleAvailability(s).ready,false);
 for(const site of EXPLORATION_SITES){
  s.explorationMap.sites[site.id].visits=1;
  s.explorationMap.sites[site.id].visibility='completed';
  s.explorationMap.sites[site.id].completed=true;
 }
 assert.equal(mapFinaleAvailability(s).ready,true);
 const out=resolveMapFinale(s,'signal',start+30*86400000);
 assert.equal(out.good,true);
 assert.match(out.msg,/구조를 보장하지는 않으며/);
 assert.equal(s.explorationMap.ending.type,'signal');
 assert.equal(mapFinaleAvailability(s).ready,false);
 assert.equal(resolveMapFinale(s,'settle',start+31*86400000).good,false);
 const saved=sanitize(structuredClone(s),start+31*86400000);
 assert.equal(saved.explorationMap.ending.type,'signal');
 assert.equal(saved.survivalStatus,'alive');
});

test('unavailable regions and bad mission IDs cannot consume game resources',()=>{
 const s=defaults(start);
 assert.equal(mapExpeditionAvailability(s,'hospital',start).ready,false);
 assert.equal(beginMapExpedition(s,'hospital',start,real).good,false);
 const before=JSON.stringify(s.supply);
 const fake=sanitizeExplorationMap({mission:{siteId:'invented',phase:'outbound',dueAt:10},
  tower:{phase:'not-a-phase'},sites:{invented:{completed:true,visits:9}}});
 assert.equal(fake.mission,null);
 assert.equal(fake.sites.invented,undefined);
 assert.equal(fake.tower.phase,'unknown');
 assert.equal(JSON.stringify(s.supply),before);
});

test('12 location artworks are sharp real vector graphics, not the old 2KB embedded bitmap cards',()=>{
 const mapSvg=read('public/assets/exploration/map/overview_hd.svg');
 assert.match(mapSvg,/width="1536" height="1024"/);
 assert.match(mapSvg,/<path|<polygon/);
 assert.doesNotMatch(mapSvg,/data:image\/webp;base64/);
 for(const id of ids){
  const art=read('public/assets/exploration/locations/'+id+'_hd.svg');
  assert.match(art,/width="1600" height="900"/,id);
  assert.ok(art.length>20000,id+' should contain actual detailed vector scene');
  assert.doesNotMatch(art,/data:image\/webp;base64/,id);
  const marker=read('public/assets/exploration/markers/'+id+'.svg');
  assert.match(marker,/<svg[^>]*viewBox=/,id);
 }
});

test('region tabs, scripted tower stages, situational actions and retina fog are connected',()=>{
 const ui=read('src/explorationMapUiV78.js');
 const css=read('src/explorationMapCampaignV84.css');
 const main=read('src/main.js');
 assert.match(ui,/id="exploration-area-near"/);
 assert.match(ui,/id="exploration-area-far"/);
 assert.match(ui,/zone==='near'/);
 assert.match(ui,/id="exploration-tower"/);
 assert.match(ui,/id="exploration-finale"/);
 assert.match(ui,/SCENARIO_ACTIONS/);
 assert.match(ui,/advanceTowerStory\(getState\(\)/);
 assert.match(ui,/resolveMapFinale\(getState\(\)/);
 assert.match(ui,/devicePixelRatio/);
 assert.match(ui,/overview_hd\.svg/);
 assert.match(ui,/site\.id\+'_hd\.svg'/);
 assert.match(main,/onStory:result=>/);
 assert.doesNotMatch(main,/result\.siteId==='ruined_house'\?'무너진 주택':'편의점'/);
 assert.match(css,/@media\(max-width:350px\)/);
 assert.doesNotMatch(css,/\.actionbar\s*\{|afterday-v3-bottom_action_bar/);
});

test('dismissed mandatory story popup never blocks the optional large mobile touch sheet',()=>{
 const source=read('src/mobileExpandedActionsV83.js');
 assert.match(source,/#hud > \.afterday-board\.is-choice:not\(\[hidden\]\)/);
});
