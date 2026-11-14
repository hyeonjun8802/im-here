import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {defaults,sanitize} from '../src/simulation.js';
import {scavengeOdds} from '../src/scavengeDirector.js';
import {
 EXPLORATION_SITES,beginMapExpedition,advanceMapExpedition,
 resolveMapExpedition,sanitizeExplorationMap,
 advanceTowerStory,EXPLORATION_MIN_REAL_MS,EXPLORATION_TRAVEL_GAME_MS
} from '../src/explorationMapV78.js';
import {
 EXPLORATION_STORIES,explorationScene,explorationOutcomeStory,
 explorationTrail
} from '../src/explorationStoryV85.js';
import {survivalDailyBriefing,explorationChapterContext} from '../src/survivalBalance.js';

const start=Date.UTC(2026,10,14,12);
const real=start+5000;
const read=file=>readFileSync(new URL('../'+file,import.meta.url),'utf8');
const make=()=>defaults(start);

function encounter(s,site='ruined_house',choice='go'){
 const departed=beginMapExpedition(s,site,start,real);
 assert.equal(departed.good,true,departed.msg);
 const arrived=advanceMapExpedition(s,start+EXPLORATION_TRAVEL_GAME_MS,real+EXPLORATION_MIN_REAL_MS);
 assert.equal(arrived.kind,'arrived');
 const result=resolveMapExpedition(s,choice,start+EXPLORATION_TRAVEL_GAME_MS,real+EXPLORATION_MIN_REAL_MS);
 assert.equal(result.good,true,result.msg);
 return result;
}
function returning(s){
 return advanceMapExpedition(s,start+2*EXPLORATION_TRAVEL_GAME_MS,real+2*EXPLORATION_MIN_REAL_MS);
}

test('all 12 authored scenes have unique arrival, choice consequences and route observations',()=>{
 assert.deepEqual(Object.keys(EXPLORATION_STORIES),EXPLORATION_SITES.map(x=>x.id));
 const arrivals=new Set(),trails=new Set();
 for(const site of EXPLORATION_SITES){
  const plot=explorationScene(site.id);
  assert.equal(typeof plot.arrival,'string');
  assert.ok(plot.arrival.length>45,site.id+' needs more than a label');
  arrivals.add(plot.arrival);
  for(const step of ['go','scout','salvage','item','supplies','injury','sickness','empty','trail'])
   assert.ok(plot[step]?.length>15,site.id+':'+step);
  assert.match(explorationOutcomeStory(site.id,'scout','injury'),new RegExp(plot.injury.slice(0,12)));
  assert.match(explorationTrail(site.id),/./);
  trails.add(plot.trail);
 }
 assert.equal(arrivals.size,12);
 assert.equal(trails.size,12);
 assert.equal(explorationScene('invented'),null);
});

test('outcomes for every field action describe unique but already-existing consequences',()=>{
 const site='pharmacy';
 for(const choice of ['go','scout','salvage']){
  for(const outcome of ['item','supplies','injury','sickness','empty']){
   const story=explorationOutcomeStory(site,choice,outcome);
   assert.ok(story.includes(EXPLORATION_STORIES[site][choice]));
   assert.ok(story.includes(EXPLORATION_STORIES[site][outcome]));
  }
 }
 assert.match(explorationOutcomeStory(site,'stay','safe'),/방문 기록/);
 const source=read('src/explorationStoryV85.js');
 assert.doesNotMatch(source,/Math\.random|supply\.parts\s*[+\-=]|\.health\s*=|applyAction\(|resolveScavengeChoice\(/);
});

test('failed but real visits recall what happened and where the next route goes',()=>{
 let candidate;
 for(let seed=1;seed<200;seed++){
  const s=make();s.scavenge.seed=seed;
  const result=encounter(s);
  if(['injury','sickness','empty'].includes(result.outcome)){candidate={s,result};break;}
 }
 assert.ok(candidate,'seed search should find deterministic non-success');
 const {s,result}=candidate;
 assert.equal(s.explorationMap.mission.story,explorationOutcomeStory('ruined_house','go',result.outcome));
 const res=returning(s);
 assert.equal(res.kind,'returned');
 assert.equal(res.completed,false);
 assert.equal(res.story,explorationOutcomeStory('ruined_house','go',result.outcome));
 assert.equal(res.trail,explorationTrail('ruined_house'));
 assert.equal(s.explorationMap.sites.ruined_house.lastChoice,'go');
 assert.equal(s.explorationMap.sites.ruined_house.lastOutcome,result.outcome);
 assert.equal(s.explorationMap.sites.ruined_house.lastDay,1);
 assert.equal(s.explorationMap.sites.convenience_store.visibility,'rumored');
 assert.equal(s.explorationMap.sites.ruined_house.completed,false);
 assert.equal(returning(s).changed,false,'only one visit and no duplicate resources');
 const saved=sanitize(JSON.parse(JSON.stringify(s)),start+3*EXPLORATION_TRAVEL_GAME_MS);
 assert.equal(saved.explorationMap.sites.ruined_house.lastStory,res.story);
 assert.equal(saved.explorationMap.sites.ruined_house.lastTrail,res.trail);
 assert.equal(saved.explorationMap.sites.ruined_house.lastChoice,'go');
});

test('safe retreat is not a visit and cannot grant next location or discovery clue',()=>{
 const s=make(),before=JSON.stringify(s.supply);
 const result=encounter(s,'ruined_house','stay');
 assert.equal(result.outcome,'safe');
 const returned=returning(s);
 assert.equal(returned.story.length>5,true);
 assert.equal(returned.trail,'');
 assert.equal(s.explorationMap.sites.ruined_house.visits,0);
 assert.equal(s.explorationMap.sites.ruined_house.lastTrail,'');
 assert.equal(s.explorationMap.sites.convenience_store.visibility,'unknown');
 assert.equal(JSON.stringify(s.supply),before);
});

test('outbound and returning story survives save reload without repeating a reward',()=>{
 const s=make();s.scavenge.seed=8;
 encounter(s);
 const items=JSON.stringify(s.kit),supply=JSON.stringify(s.supply);
 const reloaded=sanitize(JSON.parse(JSON.stringify(s)),start+EXPLORATION_TRAVEL_GAME_MS);
 assert.ok(reloaded.explorationMap.mission.story.length>30);
 const returned=returning(reloaded);
 assert.equal(returned.kind,'returned');
 assert.equal(reloaded.explorationMap.mission,null);
 assert.equal(JSON.stringify(reloaded.kit),items);
 assert.equal(JSON.stringify(reloaded.supply),supply);
});

test('old v1 and v2 saves get optional memory fields without mutating legacy history',()=>{
 const migrated=sanitizeExplorationMap({version:1,lastAttemptDay:18,sites:{
  ruined_house:{visibility:'completed',visits:2,completed:true,lastOutcome:'item'},
  convenience_store:{visibility:'unknown',visits:0,completed:false}
 }});
 assert.equal(migrated.sites.ruined_house.visits,2);
 assert.equal(migrated.sites.ruined_house.lastChoice,'');
 assert.equal(migrated.sites.ruined_house.lastStory,'');
 assert.equal(migrated.sites.convenience_store.visibility,'rumored');
 assert.equal(migrated.lastAttemptDay,18);
 const invalid=sanitizeExplorationMap({sites:{
  ruined_house:{visibility:'visited',visits:1,lastChoice:'freeloot',lastDay:-5,lastStory:'x'.repeat(600)}
 }});
 assert.equal(invalid.sites.ruined_house.lastChoice,'');
 assert.equal(invalid.sites.ruined_house.lastDay,0);
 assert.equal(invalid.sites.ruined_house.lastStory.length,300);
});

test('tower steps remember every authenticated repair milestone and do not spend twice',()=>{
 const s=make();
 s.explorationMap.sites.communications_room={...s.explorationMap.sites.communications_room,completed:true,visits:1,visibility:'completed'};
 s.explorationMap=sanitizeExplorationMap(s.explorationMap);
 s.supply.parts=5;
 const one=advanceTowerStory(s,'survey');
 assert.equal(one.good,true);assert.match(one.msg,/도면/);
 const two=advanceTowerStory(s,'prepare');
 assert.equal(two.good,true);assert.equal(s.supply.parts,1);
 assert.equal(advanceTowerStory(s,'prepare').good,false);
 const three=advanceTowerStory(s,'restore');
 assert.equal(three.good,true);assert.equal(s.supply.parts,1);
 assert.match(s.explorationMap.tower.lastStory,/복구/);
 assert.equal(advanceTowerStory(s,'connect').good,false);
 s.kit.radio=true;
 const four=advanceTowerStory(s,'connect');
 assert.equal(four.good,true);assert.match(four.msg,/구조 응답이 확인된 것은 아니다/);
 assert.equal(sanitize(JSON.parse(JSON.stringify(s)),start).explorationMap.tower.lastStory,four.msg);
});

test('DAY 10/20/30 story depends on real exploration, radio, companion and chosen ending',()=>{
 const s=make(),before=JSON.stringify(s);
 assert.match(explorationChapterContext(10,s),/정수 장치/);
 s.explorationMap.sites.water_station.completed=true;
 const ten=survivalDailyBriefing(10,s);
 assert.match(ten.title,/물탱크의 금/);
 assert.match(ten.line,/정수실의 조사 기록/);
 const twentyEmpty=survivalDailyBriefing(20,s);
 assert.match(twentyEmpty.line,/아직 단파 무전기가 없다/);
 s.kit.radio=true;s.companion.present=true;
 const twentyRescue=survivalDailyBriefing(20,s);
 assert.match(twentyRescue.line,/같은 옥상/);
 assert.doesNotMatch(twentyRescue.line,/응답은 없지만/);
 s.explorationMap.tower.phase='channel17';
 assert.match(survivalDailyBriefing(20,s).line,/17번 채널/);
 const dayThirtyOpen=survivalDailyBriefing(30,s);
 assert.match(dayThirtyOpen.title,/서른 번째 일출/);
 s.explorationMap.ending.type='signal';
 const dayThirtySignal=survivalDailyBriefing(30,s);
 assert.match(dayThirtySignal.line,/생존 기록을 송신/);
 s.explorationMap.ending.type='settle';
 assert.match(survivalDailyBriefing(30,s).line,/정착하기로/);
 assert.notEqual(JSON.stringify(s),before,'only test preparation changed state');
 const snapshot=JSON.stringify(s);
 survivalDailyBriefing(30,s);survivalDailyBriefing(20,s);
 assert.equal(JSON.stringify(s),snapshot,'chapter text is read-only');
});

test('live UI explains actual per-choice injury and illness odds, without fictional location modifiers',()=>{
 const ui=read('src/explorationMapUiV78.js');
 const core=read('src/explorationMapV78.js');
 const main=read('src/main.js');
 const css=read('src/explorationMapCampaignV84.css');
 assert.match(ui,/scavengeOdds\(decision,s\.weather\)/);
 assert.match(ui,/Math\.round\(odds\.injury\*100\)/);
 assert.match(ui,/Math\.round\(odds\.sickness\*100\)/);
 assert.doesNotMatch(ui,/위험 '\+site\.risk/);
 assert.match(ui,/exploration-map__last-story/);
 assert.match(ui,/exploration-map__last-trail/);
 assert.match(ui,/explorationScene\(site\.id\)\?\.arrival/);
 assert.match(ui,/lastStory/);
 assert.match(main,/result\.story/);
 assert.match(main,/result\.trail/);
 assert.match(css,/\.exploration-map__last-story/);
 assert.equal(Math.round(scavengeOdds('go','clear').injury*100),29);
 assert.equal(Math.round(scavengeOdds('scout','clear').sickness*100),10);
 assert.match(core,/mission\.choice=choice/);
 assert.match(core,/mission\.story=explorationOutcomeStory/);
});
