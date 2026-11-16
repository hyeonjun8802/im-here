import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {defaults,DAY_MS,applyAction} from '../src/simulation.js';
import {EXPLORATION_COMPANION_LOCK_TEXT,hasExplorationCompanion,canAccessExplorationMap} from '../src/explorationCompanionGateV117.js';
import {mapExpeditionAvailability,beginMapExpedition,advanceMapExpedition,
 EXPLORATION_TRAVEL_GAME_MS,EXPLORATION_MIN_REAL_MS} from '../src/explorationMapV78.js';
import {selectAutoMapAction,planAutoSurvivalAction} from '../src/autoSurvivalV73.js';
import {offerCompanionRescue} from '../src/supportCompanion.js';
import {resolveMapExpedition} from '../src/explorationMapV78.js';
const start=Date.UTC(2026,10,17),real=Date.UTC(2026,10,17,2);
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('a first-day lone survivor has NO regional map exploration but STILL has supply and recruitment',()=>{
 const s=defaults(start);
 assert.equal(hasExplorationCompanion(s),false);
 assert.equal(canAccessExplorationMap(s),false);
 assert.match(mapExpeditionAvailability(s,'ruined_house',start).reason,/동료/);
 assert.deepEqual(selectAutoMapAction(s,start),null);
 assert.equal(beginMapExpedition(s,'ruined_house',start,real).good,false);
 assert.equal(s.explorationMap.mission,null);
 assert.equal(s.explorationMap.lastAttemptDay,0);
 assert.match(EXPLORATION_COMPANION_LOCK_TEXT,/동료/);
 // Supply scavenging still has its own cooldown/reward economy.
 assert.match(read('src/main.js'),/runSurvivalAction\('explore'\);return;/);
 assert.match(read('src/autoSurvivalV73.js'),/if\(emergencyExploreAvailability\(s,now\)\.ready\)return 'explore'/);
});
test('accepting a genuine radio companion unlocks manual departure and AUTO',()=>{
 const s=defaults(start);
 s.kit.radio=true;s.scavenge.radioNewsId=5;s.scavenge.radioNewsDay=1;s.scavenge.radioNewsType='contact';
 assert.ok(offerCompanionRescue(s,1));
 s.supply.food=Math.max(2,s.supply.food);s.supply.water=Math.max(2,s.supply.water);
 const before=structuredClone(s.explorationMap);
 const result=applyAction(s,'companion_invite',start);
 assert.equal(result.good,true);
 assert.equal(result.outcome,'joined');
 assert.equal(hasExplorationCompanion(s),true);
 assert.equal(mapExpeditionAvailability(s,'ruined_house',start).ready,true);
 assert.deepEqual(selectAutoMapAction(s,start),{kind:'depart',siteId:'ruined_house'});
 assert.deepEqual(s.explorationMap,before,'recruiting alone did not reroll loot or change the map');
 assert.equal(beginMapExpedition(s,'ruined_house',start,real).good,true);
 assert.equal(s.explorationMap.mission.phase,'outbound');
});
test('lost companion disables new map starts but a saved ongoing expedition may finish',()=>{
 const s=defaults(start);
 s.companion.present=true;
 assert.equal(beginMapExpedition(s,'ruined_house',start,real).good,true);
 s.companion.present=false;s.companion.lost=true;
 assert.equal(hasExplorationCompanion(s),false);
 assert.equal(canAccessExplorationMap(s),true,'existing journey may be finished');
 const advanced=advanceMapExpedition(s,start+EXPLORATION_TRAVEL_GAME_MS,real+EXPLORATION_MIN_REAL_MS);
 assert.equal(advanced.kind,'arrived');
 assert.equal(selectAutoMapAction(s,start+EXPLORATION_TRAVEL_GAME_MS).kind,'choice');
 // Once the mission has been resolved, no fresh departure is possible.
 resolveMapExpedition(s,'stay',start+EXPLORATION_TRAVEL_GAME_MS,real+EXPLORATION_MIN_REAL_MS);
 advanceMapExpedition(s,start+EXPLORATION_TRAVEL_GAME_MS*2,real+EXPLORATION_MIN_REAL_MS*2);
 assert.equal(s.explorationMap.mission,null);
 assert.equal(canAccessExplorationMap(s),false);
 assert.equal(mapExpeditionAvailability(s,'ruined_house',start+DAY_MS).ready,false);
 assert.equal(selectAutoMapAction(s,start+DAY_MS),null);
});
test('all real routes are gated, including raw map opener, admin shortcut and autoplay',()=>{
 const map=read('src/explorationMapV78.js');
 const ui=read('src/explorationMapUiV78.js');
 const hub=read('src/explorationHubV115.js');
 const auto=read('src/autoSurvivalV73.js');
 assert.match(map,/if\(!hasExplorationCompanion\(s\)\)return \{ready:false/);
 assert.match(ui,/survivalStatus==='dead'\|\|!canAccessExplorationMap\(getState\(\)\)/);
 assert.match(ui,/if\(!canAccessExplorationMap\(getState\(\)\)\)return/);
 assert.match(hub,/toggle\.disabled=!unlocked/);
 assert.match(hub,/if\(!canAccessExplorationMap\(getState\(\)\)/);
 assert.match(auto,/if\(!hasExplorationCompanion\(s\)\)return null/);
 assert.match(read('index.html'),/data-admin-target="exploration-open"/);
});
test('companion alert promises unlock only upon invitation acceptance and confirms it when joined',()=>{
 const board=read('src/eventBoard.js'),main=read('src/main.js');
 assert.match(board,/companionInvite:\{[^]*?함께하기 선택 시 지역 탐사가 활성화됩니다/);
 assert.match(board,/companionJoined:\{[^]*?지역 탐사가 활성화되었습니다/);
 assert.match(main,/joined\?[\s\S]*?지역 탐사가 활성화되었습니다!/);
 assert.match(main,/하단 망원경 버튼에서 검은 지도를/);
 assert.match(read('src/explorationHubV115.css'),/#exploration-hub-toggle:disabled/);
});
test('solo gate is presence-based, not hunger-based; supports old saves',()=>{
 assert.equal(hasExplorationCompanion({companion:{present:true,health:0}}),true);
 assert.equal(hasExplorationCompanion({companion:{present:true,lost:true}}),false);
 assert.equal(hasExplorationCompanion({companion:{present:false,health:99}}),false);
 assert.equal(hasExplorationCompanion({}),false);
 assert.equal(canAccessExplorationMap({explorationMap:{mission:{siteId:'ruined_house'}}}),true);
});
