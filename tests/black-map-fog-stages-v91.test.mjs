import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {defaults,sanitize} from '../src/simulation.js';
import {EXPLORATION_SITES,newExplorationMap} from '../src/explorationMapV78.js';
import {explorationFogStage,FOG_ALPHA_BY_STAGE,FOG_STAGE_NAMES} from '../src/explorationFogStageV91.js';

const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const near=EXPLORATION_SITES.filter(site=>site.zone==='near').map(site=>site.id);
const far=EXPLORATION_SITES.filter(site=>site.zone==='far').map(site=>site.id);
function complete(map,id){
 map.sites[id]={...map.sites[id],visibility:'completed',visits:1,completed:true};
}

test('virgin save starts with nearly completely dark near and distant region',()=>{
 const map=newExplorationMap();
 for(const zone of ['near','far']){
  const progress=explorationFogStage(map,zone,EXPLORATION_SITES);
  assert.equal(progress.stage,0);
  assert.equal(progress.total,6);
  assert.equal(progress.completed,0);
  assert.equal(progress.alpha,.985);
  assert.equal(progress.fullyRevealed,false);
  assert.equal(progress.name,'미탐사');
 }
});

test('near and distant maps brighten in exactly six completion-based stages',()=>{
 const map=newExplorationMap();
 assert.equal(FOG_ALPHA_BY_STAGE.length,7,'0 through 6 incl. black and clear');
 assert.equal(FOG_STAGE_NAMES.length,7);
 assert.deepEqual(FOG_ALPHA_BY_STAGE,[.985,.88,.76,.62,.46,.28,0]);
 for(let i=0;i<=6;i++){
  const step=explorationFogStage(map,'near',EXPLORATION_SITES);
  assert.equal(step.stage,i,'stage '+i);
  assert.equal(step.completed,i);
  assert.equal(step.alpha,FOG_ALPHA_BY_STAGE[i]);
  if(i<6){
   assert.ok(step.alpha>FOG_ALPHA_BY_STAGE[i+1]);
   complete(map,near[i]);
  }
 }
 assert.equal(explorationFogStage(map,'near',EXPLORATION_SITES).fullyRevealed,true);
 assert.equal(explorationFogStage(map,'far',EXPLORATION_SITES).stage,0);
});

test('a discovered location or failed expedition can illuminate only its neighborhood, not award a stage',()=>{
 const map=newExplorationMap();
 map.sites.ruined_house.visibility='visited';
 map.sites.ruined_house.visits=3;
 map.sites.ruined_house.lastOutcome='injury';
 map.sites.convenience_store.visibility='rumored';
 const progress=explorationFogStage(map,'near',EXPLORATION_SITES);
 assert.equal(progress.stage,0);
 assert.equal(progress.visited,1);
 assert.equal(progress.alpha,.985);
 complete(map,'ruined_house');
 assert.equal(explorationFogStage(map,'near',EXPLORATION_SITES).stage,1);
 assert.equal(explorationFogStage(map,'near',EXPLORATION_SITES).completed,1);
});

test('far map remains fully dark until its own sites are completed, even when radio opens locations',()=>{
 const map=newExplorationMap();
 near.forEach(id=>complete(map,id));
 map.tower.phase='channel17';
 far.forEach(id=>{map.sites[id].visibility='rumored';});
 const local=explorationFogStage(map,'near',EXPLORATION_SITES);
 const distant=explorationFogStage(map,'far',EXPLORATION_SITES);
 assert.equal(local.stage,6);
 assert.equal(local.alpha,0);
 assert.equal(distant.stage,0,'radio unlock does not reveal a city map');
 assert.equal(distant.alpha,.985);
 complete(map,far[0]);
 assert.equal(explorationFogStage(map,'far',EXPLORATION_SITES).stage,1);
 assert.equal(explorationFogStage(map,'near',EXPLORATION_SITES).stage,6);
});

test('old saves preserve brightness when loaded, without a new state key or inventory mutations',()=>{
 const time=Date.UTC(2026,10,15,13);
 const state=defaults(time);
 for(const id of near.slice(0,4))complete(state.explorationMap,id);
 const supply=JSON.stringify(state.supply);
 const raw=structuredClone(state);
 const reloaded=sanitize(raw,time);
 assert.equal(reloaded.explorationMap.version,2);
 assert.equal(explorationFogStage(reloaded.explorationMap,'near',EXPLORATION_SITES).stage,4);
 assert.equal(explorationFogStage(reloaded.explorationMap,'far',EXPLORATION_SITES).stage,0);
 assert.equal(JSON.stringify(reloaded.supply),supply);
 const stable=JSON.stringify(reloaded);
 explorationFogStage(reloaded.explorationMap,'near',EXPLORATION_SITES);
 assert.equal(JSON.stringify(reloaded),stable);
});

test('rendered map uses saved stage to paint fog, display six steps and animate only stage increases',()=>{
 const ui=read('src/explorationMapUiV78.js');
 const css=read('src/explorationMapFogStagesV91.css');
 const index=read('index.html');
 assert.match(ui,/explorationFogStage\(getState\(\)\.explorationMap,zone,EXPLORATION_SITES\)/);
 assert.match(ui,/explorationFogStage\(s\.explorationMap,zone,EXPLORATION_SITES\)/);
 assert.match(ui,/ctx\.fillStyle=|ctx\.fillStyle=/);
 assert.match(ui,/ctx\.fillRect\(0,0,320,213\)/);
 assert.match(ui,/if\(alpha<=\.001\)return/);
 assert.match(ui,/explorationPinPosition\(zone,site\.id\)\|\|site/);
 assert.match(ui,/const shouldAnimate=oldStage!==null&&progress\.stage>oldStage/);
 assert.match(ui,/window\.requestAnimationFrame\(animate\)/);
 assert.match(ui,/window\.cancelAnimationFrame\(fogFrame\)/);
 assert.match(ui,/prefers-reduced-motion: reduce/);
 assert.match(ui,/fogLastZone=null;fogLastStage=null;fogLastSignature=''/);
 assert.match(ui,/id="exploration-map-fog-stage"/);
 assert.match(ui,/id="exploration-map-fog-bars"/);
 assert.match(ui,/STAGE '\+fogProgress\.stage\+'\/6/);
 assert.equal((ui.match(/<span><\/span>/g)||[]).length,6);
 assert.match(css,/data-fog-stage="0"/);
 assert.match(css,/data-fog-stage="6"/);
 assert.match(css,/data-revealed="true"/);
 assert.match(index,/explorationMapFogStagesV91\.css/);
 assert.doesNotMatch(css,/\.actionbar\s*\{|\.topbar\s*\{|\.survival-kit\s*\{/);
});

test('final stage is unmasked but never bypasses the 12-site story or tower progression',()=>{
 const map=newExplorationMap();
 near.forEach(id=>complete(map,id));
 assert.equal(explorationFogStage(map,'near',EXPLORATION_SITES).alpha,0);
 assert.equal(map.tower.phase,'unknown');
 assert.ok(far.some(id=>!map.sites[id].completed));
 assert.equal(explorationFogStage(map,'far',EXPLORATION_SITES).alpha,.985);
});
