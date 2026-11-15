import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {EXPLORATION_SITES,newExplorationMap,sanitizeExplorationMap} from '../src/explorationMapV78.js';
import {explorationFogStage} from '../src/explorationFogStageV91.js';

const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const ui=read('src/explorationMapUiV78.js');
const mobile=read('src/explorationMapMobileQaV93.css');

test('reopening the Black Map starts at the current unlocked, unfinished location',()=>{
 assert.match(ui,/if\(!getState\(\)\.explorationMap\?\.mission\)\{/);
 assert.match(ui,/getSiteState\(site\.id\)\.visibility!=='unknown'&&!getSiteState\(site\.id\)\.completed/);
 assert.match(ui,/if\(active\)selected=active\.id/);
 assert.match(ui,/root\.hidden=false;\s*render\(\);/);
});

test('switching near/far selects the first actionable quest, never a finished first-stage location',()=>{
 assert.match(ui,/const local=EXPLORATION_SITES\.filter\(site=>site\.zone===zone\)/);
 assert.match(ui,/const next=local\.find\(site=>getSiteState\(site\.id\)\.visibility!=='unknown'&&!getSiteState\(site\.id\)\.completed\)/);
 assert.match(ui,/selected=next\?\.id\|\|visited\?\.id\|\|local\[0\]\.id/);
 const map=newExplorationMap();
 map.sites.ruined_house={...map.sites.ruined_house,visits:1,completed:true,visibility:'completed'};
 const upgraded=sanitizeExplorationMap(map);
 const next=EXPLORATION_SITES.find(site=>site.zone==='near'&&
  upgraded.sites[site.id].visibility!=='unknown'&&!upgraded.sites[site.id].completed);
 assert.equal(next.id,'convenience_store');
 assert.equal(explorationFogStage(upgraded,'near',EXPLORATION_SITES).stage,1);
});

test('completed site shows a direct next-location navigation button without auto-spending a day',()=>{
 assert.match(ui,/if\(next\)choices\.appendChild\(makeButton\('다음 지역 · '\+next\.label\+' 보기',\(\)=>\{/);
 assert.match(ui,/selected=next\.id;\s*render\(\);/);
 assert.match(ui,/markers\.querySelector\('\.exploration-map__marker\[data-selected="true"\]'\)\?\.focus\(\{preventScroll:true\}\)/);
 const start=ui.indexOf("if(next)choices.appendChild(makeButton('다음 지역");
 const end=ui.indexOf("}, {cls:",start);
 const handler=ui.slice(start,Math.max(end,start+280));
 assert.ok(start>=0);
 assert.doesNotMatch(handler,/beginMapExpedition|resolveMapExpedition|applyAction|save\(\)/);
});

test('mobile photo stays an intentional compact thumbnail, not vertically stretched through every story row',()=>{
 assert.match(mobile,/@media\(max-width:720px\)/);
 assert.match(mobile,/\.exploration-map__card>\.exploration-map__site-image\{/);
 assert.match(mobile,/grid-column:1;grid-row:1 \/ span 3/);
 assert.match(mobile,/height:clamp\(92px,26vw,120px\)/);
 assert.match(mobile,/max-height:120px;min-height:92px/);
 assert.match(mobile,/object-fit:cover;object-position:center;align-self:start/);
 assert.match(mobile,/@media\(max-width:350px\)/);
});

test('quest, discovered supply, last outcome and trail have full-width non-overlapping rows on iPhone',()=>{
 assert.match(mobile,/\.exploration-map__card>p:nth-of-type\(2\)\{\s*grid-column:1\/-1;grid-row:4/);
 assert.match(mobile,/\.exploration-map__card>\.exploration-map__quest\{\s*grid-column:1\/-1;grid-row:5/);
 assert.match(mobile,/\.exploration-map__card>\.exploration-map__last-story\{\s*grid-column:1\/-1;grid-row:6/);
 assert.match(mobile,/\.exploration-map__card>\.exploration-map__last-trail\{\s*grid-column:1\/-1;grid-row:7/);
 assert.match(mobile,/-webkit-overflow-scrolling:touch/);
 const html=read('index.html');
 assert.match(html,/src\/explorationMapFogStagesV91\.css"\/><link rel="stylesheet" href="\.\/src\/explorationMapMobileQaV93\.css/);
 assert.doesNotMatch(mobile,/\.actionbar\s*\{|\.topbar\s*\{|\.survival-kit\s*\{/);
});

test('mobile alignment changes remain isolated from quest reward, saves and original art',()=>{
 const core=read('src/explorationMapV78.js');
 assert.match(core,/if\(previous&&!map\.sites\[previous\.id\]\?\.completed\)/);
 assert.match(ui,/image\.src=locked\?ASSET\+'markers\/state_unknown\.svg'/);
 assert.match(ui,/renderFog\(\);updateMarkers\(\);updateRoute\(\)/);
 assert.match(ui,/const quest=explorationQuestProgress\(s\.explorationMap,site\.id\)/);
 assert.match(ui,/const fogProgress=explorationFogStage\(s\.explorationMap,zone,EXPLORATION_SITES\)/);
 assert.doesNotMatch(mobile,/background-image:url|image-rendering:pixelated/);
});
