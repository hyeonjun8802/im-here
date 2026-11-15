import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {defaults} from '../src/simulation.js';
import {EXPLORATION_SITES,sanitizeExplorationMap} from '../src/explorationMapV78.js';
import {buildBlackMapGuide} from '../src/blackMapMissionGuideV97.js';
const now=Date.UTC(2026,10,15,12);
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const finish=(s,zone)=>{
 for(const item of EXPLORATION_SITES.filter(x=>x.zone===zone))
  Object.assign(s.explorationMap.sites[item.id],{completed:true,visits:1,visibility:'completed'});
 s.explorationMap=sanitizeExplorationMap(s.explorationMap);
};
test('fresh map highlights nearest unfinished location without modifying save',()=>{
 const s=defaults(now),before=JSON.stringify(s),g=buildBlackMapGuide(s);
 assert.equal(g.targetId,'ruined_house');assert.equal(g.zone,'near');
 assert.equal(g.total,0);assert.equal(JSON.stringify(s),before);
});
test('failed visit remains a clear retry goal',()=>{
 const s=defaults(now);
 Object.assign(s.explorationMap.sites.ruined_house,{visits:1,completed:false,visibility:'visited'});
 assert.match(buildBlackMapGuide(s).title,/재조사/);
});
test('near completion leads to actual tower repair, never early far unlock',()=>{
 const s=defaults(now);finish(s,'near');
 const g=buildBlackMapGuide(s);assert.equal(g.kind,'tower');
 assert.equal(g.total,6);assert.equal(g.chapter,'02');
 s.explorationMap.tower.phase='surveyed';s.supply.parts=2;
 assert.match(buildBlackMapGuide(s).title,/2\/4/);
});
test('eleven completed locations select unfinished far helipad',()=>{
 const s=defaults(now);finish(s,'near');s.explorationMap.tower.phase='channel17';
 for(const item of EXPLORATION_SITES.filter(x=>x.zone==='far'&&x.id!=='rooftop_helipad'))
  Object.assign(s.explorationMap.sites[item.id],{completed:true,visits:1,visibility:'completed'});
 s.explorationMap=sanitizeExplorationMap(s.explorationMap);
 const g=buildBlackMapGuide(s);
 assert.equal(g.total,11);assert.equal(g.chapter,'03');
 assert.equal(g.zone,'far');assert.equal(g.targetId,'rooftop_helipad');
});
test('twelve locations lead to final choice and recorded ending',()=>{
 const s=defaults(now);finish(s,'near');s.explorationMap.tower.phase='channel17';finish(s,'far');
 assert.equal(buildBlackMapGuide(s).kind,'finale');
 s.explorationMap.ending.type='signal';
 assert.equal(buildBlackMapGuide(s).kind,'done');
});
test('active arrival overrides other goals',()=>{
 const s=defaults(now);
 s.explorationMap.mission={siteId:'ruined_house',phase:'encounter'};
 const g=buildBlackMapGuide(s);
 assert.equal(g.kind,'mission');assert.match(g.description,/수색·정찰/);
});
test('guided action, goal marker, tactical choice and collapsible history are integrated',()=>{
 const ui=read('src/explorationMapUiV78.js'),css=read('src/blackMapMissionGuideV97.css');
 assert.match(ui,/id="exploration-map-guide-action"/);
 assert.match(ui,/buildBlackMapGuide\(s\)/);
 assert.match(ui,/button\.dataset\.goal/);
 assert.match(ui,/exploration-map__journal/);
 assert.match(css,/@media\(max-width:720px\)/);
 assert.match(read('index.html'),/blackMapMissionGuideV97\.css/);
});

test('reopening resets scroll to the mission goal and live readiness updates with game day or weather',()=>{
 const ui=read('src/explorationMapUiV78.js');
 assert.match(ui,/\.scrollTop=0/);
 assert.match(ui,/currentExplorationDay\(getState\(\),now\)/);
 assert.match(ui,/:weather-/);
 assert.match(ui,/exploration-map__howto/);
});
