import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {defaults,sanitize} from '../src/simulation.js';
import {
 EXPLORATION_SITES,newExplorationMap,sanitizeExplorationMap,
 mapExpeditionAvailability,advanceTowerStory,
 beginMapExpedition,advanceMapExpedition,resolveMapExpedition,
 EXPLORATION_MIN_REAL_MS,EXPLORATION_TRAVEL_GAME_MS
} from '../src/explorationMapV78.js';
import {explorationFogStage} from '../src/explorationFogStageV91.js';
import {selectAutoMapAction} from '../src/autoSurvivalV73.js';

const start=Date.UTC(2026,10,15,11);
const real=start+30000;
const near=EXPLORATION_SITES.filter(x=>x.zone==='near');
const far=EXPLORATION_SITES.filter(x=>x.zone==='far');
const availableIds=(map,zone)=>EXPLORATION_SITES.filter(s=>s.zone===zone&&
 map.sites[s.id].visibility==='rumored'&&!map.sites[s.id].completed).map(s=>s.id);
const markCompleted=(map,site)=>{
 map.sites[site.id]={...map.sites[site.id],visits:1,visibility:'completed',completed:true};
 return sanitizeExplorationMap(map);
};
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');

test('all 12 quest links form a single linear sequence without a fork or simultaneous unlock',()=>{
 assert.deepEqual(near.map(x=>x.id),
  ['ruined_house','convenience_store','pharmacy','flower_shop','water_station','communications_room']);
 assert.deepEqual(far.map(x=>x.id),
  ['hypermarket','underpass','hospital','substation','community_shelter','rooftop_helipad']);
 for(const route of [near,far]){
  for(let i=0;i<route.length;i++)
   assert.deepEqual(route[i].unlock,i===route.length-1?[]:[route[i+1].id],
    route[i].id+' must only point to the next quest');
 }
});

test('fresh Black Map reveals only the ruined house; successful completion opens precisely one next near site',()=>{
 let map=newExplorationMap();
 assert.deepEqual(availableIds(map,'near'),['ruined_house']);
 assert.deepEqual(availableIds(map,'far'),[]);
 for(let i=0;i<near.length;i++){
  assert.deepEqual(availableIds(map,'near'),[near[i].id],
   'exactly one active near stage before completion '+i);
  assert.equal(explorationFogStage(map,'near',EXPLORATION_SITES).stage,i);
  map=markCompleted(map,near[i]);
  assert.deepEqual(availableIds(map,'near'),i===near.length-1?[]:[near[i+1].id],
   'only its immediate successor unlocks');
  for(const future of near.slice(i+2))
   assert.equal(map.sites[future.id].visibility,'unknown','future stays concealed');
 }
 assert.equal(map.tower.phase,'discovered','tower story starts only after the communications room');
 assert.equal(explorationFogStage(map,'near',EXPLORATION_SITES).stage,6);
 assert.deepEqual(availableIds(map,'far'),[],'tower discovery is not radio connection');
});

test('radio 17 opens only the first far site; the remaining five are opened one by one',()=>{
 const s=defaults(start);
 s.explorationMap.sites.communications_room={...s.explorationMap.sites.communications_room,visits:1,completed:true,visibility:'completed'};
 s.explorationMap=sanitizeExplorationMap(s.explorationMap);
 s.supply.parts=4;s.kit.radio=true;
 for(const action of ['survey','prepare','restore','connect']){
  const r=advanceTowerStory(s,action);
  assert.equal(r.good,true,action+':'+r.msg);
 }
 assert.equal(s.explorationMap.tower.phase,'channel17');
 let map=s.explorationMap;
 assert.deepEqual(availableIds(map,'far'),['hypermarket']);
 assert.equal(explorationFogStage(map,'far',EXPLORATION_SITES).stage,0);
 for(let i=0;i<far.length;i++){
  assert.deepEqual(availableIds(map,'far'),[far[i].id]);
  assert.equal(explorationFogStage(map,'far',EXPLORATION_SITES).stage,i);
  map=markCompleted(map,far[i]);
  assert.deepEqual(availableIds(map,'far'),i===5?[]:[far[i+1].id],
   'the next far stage is revealed only after completion');
 }
 assert.equal(explorationFogStage(map,'far',EXPLORATION_SITES).alpha,0);
});

test('manually spoofing a rumored site does not bypass previous completion or 17-channel gating',()=>{
 const s=defaults(start),now=start+86400000;
 s.explorationMap.sites.pharmacy.visibility='rumored';
 let blocked=mapExpeditionAvailability(s,'pharmacy',now);
 assert.equal(blocked.ready,false);
 assert.match(blocked.reason,/편의점/);
 assert.equal(beginMapExpedition(s,'pharmacy',now,real).good,false);
 s.explorationMap.sites.hospital.visibility='rumored';
 blocked=mapExpeditionAvailability(s,'hospital',now);
 assert.equal(blocked.ready,false);
 assert.match(blocked.reason,/17번 채널/);
 s.explorationMap.tower.phase='channel17';
 blocked=mapExpeditionAvailability(s,'hospital',now);
 assert.equal(blocked.ready,false);
 assert.match(blocked.reason,/지하차도/);
 assert.equal(s.explorationMap.lastAttemptDay,0,'failed attempts do not spend a day');
});

test('one failed house visit records injury/scavenge but does not unlock or increase stage',()=>{
 let found=null;
 for(let seed=1;seed<1000;seed++){
  const s=defaults(start);s.scavenge.seed=seed;
  assert.equal(beginMapExpedition(s,'ruined_house',start,real).good,true);
  advanceMapExpedition(s,start+EXPLORATION_TRAVEL_GAME_MS,real+EXPLORATION_MIN_REAL_MS);
  const result=resolveMapExpedition(s,'go',start+EXPLORATION_TRAVEL_GAME_MS,real+EXPLORATION_MIN_REAL_MS);
  if(['injury','sickness','empty'].includes(result.outcome)){found={s,result};break;}
 }
 assert.ok(found,'deterministic seed must find a failed visit');
 const {s}=found;
 const returned=advanceMapExpedition(s,start+2*EXPLORATION_TRAVEL_GAME_MS,real+2*EXPLORATION_MIN_REAL_MS);
 assert.equal(returned.kind,'returned');
 assert.equal(returned.completed,false);
 assert.equal(returned.nextSite,null);
 assert.equal(s.explorationMap.sites.convenience_store.visibility,'unknown');
 assert.deepEqual(availableIds(s.explorationMap,'near'),[]);
 assert.equal(explorationFogStage(s.explorationMap,'near',EXPLORATION_SITES).stage,0);
 assert.equal(mapExpeditionAvailability(s,'ruined_house',start+86400000).ready,true,'retry same place next day');
});

test('legacy simultaneous discoveries are folded back to sequential pending stages while historical visits are preserved',()=>{
 const s=defaults(start);
 const map=s.explorationMap;
 map.tower.phase='channel17';
 for(const id of ['ruined_house','convenience_store'])map.sites[id]={...map.sites[id],completed:true,visits:2,visibility:'completed'};
 map.sites.pharmacy={...map.sites.pharmacy,visibility:'visited',visits:3,lastOutcome:'sickness'};
 map.sites.flower_shop.visibility='rumored';
 for(const site of far)map.sites[site.id].visibility='rumored';
 map.sites.underpass={...map.sites.underpass,visits:1,visibility:'visited',lastOutcome:'empty'};
 const supply=JSON.stringify(s.supply);
 const reloaded=sanitize(structuredClone(s),start+4*86400000);
 const saved=reloaded.explorationMap;
 assert.equal(saved.version,2);
 assert.equal(saved.tower.phase,'channel17');
 assert.equal(saved.sites.pharmacy.visits,3);
 assert.equal(saved.sites.pharmacy.visibility,'visited','previous visits are not wiped');
 assert.equal(saved.sites.flower_shop.visibility,'unknown','old future rumor is hidden');
 assert.deepEqual(availableIds(saved,'far'),['hypermarket'],'only first far stage stays available');
 assert.equal(saved.sites.underpass.visits,1,'old out-of-order visit remains stored');
 assert.equal(saved.sites.underpass.visibility,'visited');
 assert.equal(saved.sites.hospital.visibility,'unknown');
 assert.equal(JSON.stringify(reloaded.supply),supply);
 assert.equal(explorationFogStage(saved,'near',EXPLORATION_SITES).stage,2);
 assert.equal(mapExpeditionAvailability(reloaded,'underpass',start+5*86400000).ready,false,
  'legacy out-of-order visits cannot skip an unfinished prerequisite');
});

test('UI hides never-discovered pins and retains other zone, quest, map fog and status behavior',()=>{
 const ui=read('src/explorationMapUiV78.js');
 const main=read('src/main.js');
 const core=read('src/explorationMapV78.js');
 assert.match(ui,/if\(data\.visibility==='unknown'\)continue; \/\/ Future stages have no visible marker/);
 assert.match(ui,/const nextPlace=EXPLORATION_SITES\.find/);
 assert.match(ui,/다음: '\+nextPlace\.label/);
 assert.match(ui,/바로 이전 장소의 조사 완료/);
 assert.match(ui,/단계는 이전 장소의 조사 완료 후 한 곳씩/);
 assert.match(ui,/renderFog\(\);updateMarkers\(\);updateRoute\(\)/);
 assert.match(ui,/explorationQuestProgress\(s\.explorationMap,site\.id\)/);
 assert.match(ui,/id="exploration-map-fog-bars"/);
 assert.match(core,/nextSite=completed\?EXPLORATION_SITES\.find/);
 assert.match(main,/새 탐사 장소 발견:/);
 assert.doesNotMatch(core,/revealFollowing\(/);
});
