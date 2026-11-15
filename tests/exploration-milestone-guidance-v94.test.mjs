import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {defaults} from '../src/simulation.js';
import {
 EXPLORATION_SITES,sanitizeExplorationMap,advanceTowerStory,
 mapFinaleAvailability,resolveMapFinale,mapExpeditionAvailability
} from '../src/explorationMapV78.js';
import {resolveScavengeChoice} from '../src/scavengeDirector.js';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const ui=read('src/explorationMapUiV78.js');
const now=Date.UTC(2026,10,15,12);
const finishZone=(map,zone)=>{
 for(const site of EXPLORATION_SITES.filter(site=>site.zone===zone)){
  map.sites[site.id]={...map.sites[site.id],completed:true,visits:1,visibility:'completed'};
 }
 return sanitizeExplorationMap(map);
};

test('six completed near sites advance to the tower stage, not prematurely to the distant region',()=>{
 const s=defaults(now);
 s.explorationMap=finishZone(s.explorationMap,'near');
 assert.equal(s.explorationMap.tower.phase,'discovered');
 assert.equal(s.explorationMap.sites.hypermarket.visibility,'unknown');
 assert.equal(mapExpeditionAvailability(s,'hypermarket',now).ready,false);
 assert.match(ui,/if\(!next&&zone==='near'\)/);
 assert.match(ui,/통신탑 복구와 17번 채널 연결/);
 assert.match(ui,/makeButton\('통신탑 복구 단계 보기'/);
 assert.match(ui,/tower\.querySelector\('button:not\(:disabled\)'\)/);
});

test('once the real four-step tower sequence finishes, the UI points to the first far location',()=>{
 const s=defaults(now);
 s.explorationMap=finishZone(s.explorationMap,'near');
 s.supply.parts=4;
 s.kit.radio=true;
 for(const action of ['survey','prepare','restore','connect']){
  const outcome=advanceTowerStory(s,action);
  assert.equal(outcome.good,true,action+': '+outcome.msg);
 }
 assert.equal(s.explorationMap.tower.phase,'channel17');
 assert.equal(s.explorationMap.sites.hypermarket.visibility,'rumored');
 assert.equal(s.explorationMap.sites.underpass.visibility,'unknown');
 assert.match(ui,/if\(s\.explorationMap\?\.tower\?\.phase==='channel17'\)/);
 assert.match(ui,/makeButton\('원거리 첫 지역 보기',\(\)=>setZone\('far'\)/);
});

test('all 12 locations and radio connection are required before the finale CTA can lead to a choice',()=>{
 const s=defaults(now);
 s.explorationMap=finishZone(s.explorationMap,'near');
 s.explorationMap.tower.phase='channel17';
 s.explorationMap=finishZone(s.explorationMap,'far');
 assert.equal(mapFinaleAvailability(s).ready,true);
 assert.match(ui,/if\(!next&&zone==='far'&&!q\('#exploration-finale'\)\.hidden\)/);
 assert.match(ui,/모든 지역을 확인했습니다\. 마지막 생존 기록을 선택하세요/);
 assert.match(ui,/endingRecorded\?'완료된 기록 확인':'마지막 기록 선택하기'/);
 assert.match(ui,/finale\.querySelector\('button:not\(:disabled\)'\)/);
 assert.equal(resolveMapFinale(s,'signal',now).good,true);
 assert.equal(s.explorationMap.ending.type,'signal');
 assert.equal(mapFinaleAvailability(s).ready,false,'recorded finale cannot be repeated');
 assert.match(ui,/마지막 생존 기록을 남겼습니다\. 기록을 확인하세요/);
});

test('unaffordable scout choice is clearly disabled, with the other encounter choices preserved',()=>{
 assert.match(ui,/const missingWater=decision==='scout'&&\(s\.supply\?\.water\?\?0\)<1/);
 assert.match(ui,/missingWater\?caption\+' · 식수 부족 \(1개 필요\)':caption/);
 assert.match(ui,/\{disabled:missingWater\}/);
 assert.match(ui,/\['go',\(sceneActions\[0\]\|\|'깊이 수색'\)/);
 assert.match(ui,/\['scout',\(sceneActions\[1\]\|\|'안전 정찰'\)/);
 assert.match(ui,/\['salvage',\(sceneActions\[2\]\|\|'자재 회수'\)/);
 assert.match(ui,/\['stay','위험을 피하고 즉시 복귀 · 방문 기록 없음'\]/);
 const s=defaults(now);
 s.supply.water=0;
 s.scavenge.pending={id:'qa-water',day:1,title:'정찰',target:'cache'};
 const before=JSON.stringify(s.supply);
 const r=resolveScavengeChoice(s,'scout',{day:1});
 assert.equal(r.good,false);
 assert.match(r.msg,/식수 1개가 필요/);
 assert.equal(JSON.stringify(s.supply),before,'failed scout does not spend resources');
});

test('existing modal redraws only when water crosses the scout affordability threshold',()=>{
 assert.match(ui,/mission\.phase==='encounter'\?':scout-'\+String\(\(getState\(\)\.supply\?\.water\?\?0\)>=1\)/);
 assert.match(ui,/if\(identity!==lastMissionKey\)\{lastMissionKey=identity;render\(\);\}/);
 assert.match(ui,/stage\.textContent=result\.msg;return/);
});

test('milestone navigation is UI-only and never creates items, expeditions or additional save records',()=>{
 const start=ui.indexOf("if(!next&&zone==='near'){");
 const finish=ui.indexOf("}else{\n    stage.textContent=can.ready",start);
 assert.ok(start>0&&finish>start);
 const code=ui.slice(start,finish);
 assert.doesNotMatch(code,/beginMapExpedition\(|resolveMapExpedition\(|resolveMapFinale\(|advanceTowerStory\(|applyAction\(|save\(\)/);
 assert.match(code,/scrollIntoView\(\{block:'center'\}\)/);
 assert.match(code,/focus\(\{preventScroll:true\}\)/);
 const source=read('src/explorationMapV78.js');
 assert.match(source,/if\(previous&&!map\.sites\[previous\.id\]\?\.completed\)/);
 assert.match(source,/lastAttemptDay=currentExplorationDay\(s,now\)/);
});
