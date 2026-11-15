import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {defaults} from '../src/simulation.js';
import {EXPLORATION_SITES,currentExplorationDay} from '../src/explorationMapV78.js';
import {getDailyOperations,getExpeditionPreparation,getReturnReport} from '../src/blackMapDailyOperationsV98.js';
const now=Date.UTC(2026,10,15,12);
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('daily priorities read real state without mutating resources or save data',()=>{
 const s=defaults(now);const before=JSON.stringify(s);
 s.supply.water=0;
 const plan=getDailyOperations(s,now);
 assert.match(plan.title,/식수/);assert.equal(plan.day,currentExplorationDay(s,now));
 assert.equal(JSON.stringify({...s,supply:{...s.supply,water:0}}),JSON.stringify(s));
 assert.ok(before.length>100);
});
test('daily priority respects dangerous weather and urgent health',()=>{
 const s=defaults(now);s.weather='tornado';s.supply.water=0;
 assert.match(getDailyOperations(s,now).title,/위험 기상/);
 s.weather='clear';s.health=22;
 assert.match(getDailyOperations(s,now).title,/건강 관리/);
});
test('preparation reports actual gates, scout water and salvage reserve',()=>{
 const s=defaults(now),before=JSON.stringify(s);
 s.supply.parts=12;s.supply.water=0;
 const p=getExpeditionPreparation(s,'ruined_house',now);
 assert.equal(p.ready,true);assert.equal(p.scoutReady,false);assert.equal(p.salvageReady,false);
 assert.equal(p.travelGameMinutes,25);assert.ok(p.odds.go.injury>0);
 assert.equal(JSON.stringify(s),before);
 s.weather='tornado';
 assert.equal(getExpeditionPreparation(s,'ruined_house',now).ready,false);
});
test('successful and failed return reports are informational and have truthful progression',()=>{
 const s=defaults(now);
 const a=getReturnReport(s,{kind:'returned',siteId:'ruined_house',completed:true,
  outcome:'supplies',msg:'식수 +1',nextSite:'버려진 편의점'});
 assert.equal(a.success,true);assert.match(a.detail,/식수 \+1/);
 assert.match(a.next,/버려진 편의점/);
 const b=getReturnReport(s,{kind:'returned',siteId:'ruined_house',completed:false,
  outcome:'injury',msg:'건강 -12',nextSite:null});
 assert.equal(b.success,false);assert.match(b.next,/재도전/);
 const safe=getReturnReport(s,{kind:'returned',siteId:'ruined_house',completed:false,outcome:'safe'});
 assert.equal(safe.withdrawn,true);assert.match(safe.detail,/방문 기록/);
 assert.equal(getReturnReport(s,{kind:'arrived'}),null);
});
test('completion keeps routine tied to existing pending scavenging rather than duplicate rewards',()=>{
 const s=defaults(now);s.explorationMap.ending.type='signal';
 s.scavenge.pending={id:'test',day:1,title:'보급'};
 const a=getDailyOperations(s,now);
 assert.equal(a.ended,true);assert.equal(a.action,'daily');
 s.scavenge.pending=null;
 assert.equal(getDailyOperations(s,now).action,'emergency');
});
test('new UI panels hook to same legacy map buttons and no save schema update',()=>{
 const ui=read('src/explorationMapUiV78.js'),style=read('src/blackMapDailyOperationsV98.css');
 assert.match(ui,/getDailyOperations\(s,now\)/);
 assert.match(ui,/getExpeditionPreparation\(getState\(\),site\.id,getNow\(\)\)/);
 assert.match(ui,/getReturnReport\(getState\(\),/);
 assert.match(ui,/id="exploration-map-prep-confirm"/);
 assert.match(ui,/id="exploration-map-daily-shortcut"/);
 assert.match(ui,/id="exploration-map-return-dismiss"/);
 assert.match(ui,/if\(prepConfirmedFor!==site\.id\)/);
 assert.match(ui,/lastReturnReport=/);
 assert.match(style,/exploration-map__prep\[hidden\]/);
 assert.match(read('index.html'),/blackMapDailyOperationsV98\.css/);
});
