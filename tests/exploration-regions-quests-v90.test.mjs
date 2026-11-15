import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {defaults,sanitize} from '../src/simulation.js';
import {
 EXPLORATION_SITES,mapExpeditionAvailability,newExplorationMap,
 sanitizeExplorationMap
} from '../src/explorationMapV78.js';
import {
 EXPLORATION_REGIONS,EXPLORATION_DISTRICTS,EXPLORATION_QUESTS,
 EXPLORATION_MAP_PINS,explorationPinPosition,
 questBySite,explorationQuestProgress,explorationZoneProgress
} from '../src/explorationQuestRegionsV90.js';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const binary=path=>readFileSync(new URL('../'+path,import.meta.url));
const ids=EXPLORATION_SITES.map(s=>s.id);

test('two genuinely different map images are used for near and far zones',()=>{
 const paths=Object.values(EXPLORATION_REGIONS).map(z=>z.map);
 assert.deepEqual(Object.keys(EXPLORATION_REGIONS),['near','far']);
 assert.notEqual(paths[0],paths[1]);
 assert.match(paths[0],/near_neighborhood\.webp$/);
 assert.match(paths[1],/far_citywide\.webp$/);
 assert.match(EXPLORATION_REGIONS.far.scope,/강변.*도심.*산업지구/);
 assert.match(EXPLORATION_REGIONS.near.scope,/골목.*주택.*상가/);
});

test('all six new backgrounds are real, distinct WebP media and not vector placeholders',()=>{
 const paths=[...Object.values(EXPLORATION_REGIONS).map(x=>x.map),
  ...Object.values(EXPLORATION_DISTRICTS).map(x=>x.photo)];
 assert.equal(paths.length,6);
 assert.equal(new Set(paths).size,6);
 const hashes=new Set();
 for(const path of paths){
  const bytes=binary('public/assets/exploration/'+path);
  assert.equal(bytes.toString('ascii',0,4),'RIFF',path);
  assert.equal(bytes.toString('ascii',8,12),'WEBP',path);
  assert.ok(bytes.length>150000,path+' must be full-resolution photography');
  hashes.add(createHash('sha256').update(bytes).digest('hex'));
 }
 assert.equal(hashes.size,6,'all six scenes must be visually distinct assets');
});

test('exactly 12 previously planned sites become addressable regional quests with no invented IDs',()=>{
 assert.deepEqual(Object.keys(EXPLORATION_QUESTS),ids);
 assert.equal(new Set(Object.keys(EXPLORATION_QUESTS)).size,12);
 assert.equal(EXPLORATION_SITES.filter(x=>x.zone==='near').length,6);
 assert.equal(EXPLORATION_SITES.filter(x=>x.zone==='far').length,6);
 for(const site of EXPLORATION_SITES){
  const quest=questBySite(site.id);
  assert.ok(quest?.title.length>5);
  assert.ok(quest?.objective.length>15);
  assert.ok(quest?.lead.length>15);
  assert.equal(Boolean(quest.district),site.zone==='far');
  if(quest.district)assert.ok(EXPLORATION_DISTRICTS[quest.district]);
 }
 assert.equal(questBySite('imaginary_site'),null);
});

test('each of four landscape sectors is actually attached to a distant quest',()=>{
 const sectors=new Set(EXPLORATION_SITES.filter(x=>x.zone==='far')
  .map(x=>questBySite(x.id).district));
 assert.deepEqual([...sectors].sort(),Object.keys(EXPLORATION_DISTRICTS).sort());
 assert.equal(questBySite('underpass').district,'waterfront');
 assert.equal(questBySite('substation').district,'industrial');
 assert.equal(questBySite('hospital').district,'center');
 assert.equal(questBySite('community_shelter').district,'hillside');
});

test('each location marker, route and fog spot align with the chosen scene landmark',()=>{
 for(const zone of ['near','far']){
  const ids=EXPLORATION_SITES.filter(site=>site.zone===zone).map(x=>x.id);
  assert.deepEqual(Object.keys(EXPLORATION_MAP_PINS[zone]),ids,'pin IDs match their zone');
  const pos=ids.map(id=>explorationPinPosition(zone,id));
  for(const [i,point] of pos.entries()){
   assert.ok(point.x>.1&&point.x<.90,zone+' '+ids[i]+' x in safe frame');
   assert.ok(point.y>.1&&point.y<.90,zone+' '+ids[i]+' y in safe frame');
  }
  for(let i=0;i<pos.length;i++)for(let j=i+1;j<pos.length;j++){
   const dx=pos[i].x-pos[j].x,dy=pos[i].y-pos[j].y;
   assert.ok(Math.hypot(dx,dy)>.14,zone+' pins do not overlap: '+ids[i]+'/'+ids[j]);
  }
 }
 assert.deepEqual(explorationPinPosition('near','flower_shop'),{x:.17,y:.44});
 assert.deepEqual(explorationPinPosition('near','communications_room'),{x:.79,y:.14});
 assert.deepEqual(explorationPinPosition('far','underpass'),{x:.74,y:.79});
 assert.deepEqual(explorationPinPosition('far','substation'),{x:.14,y:.35});
 assert.equal(explorationPinPosition('far','ruined_house'),null);
 const ui=read('src/explorationMapUiV78.js');
 assert.match(ui,/explorationPinPosition\(zone,site\.id\)\|\|site/g);
 assert.equal((ui.match(/explorationPinPosition\(zone,site\.id\)\|\|site/g)||[]).length,3,
  'fog, route and pin should use the same spatial mapping');
});

test('quests mirror existing save state and return no extra reward or progress mutation',()=>{
 const map=newExplorationMap();
 const before=JSON.stringify(map);
 const locked=explorationQuestProgress(map,'underpass');
 assert.equal(locked.status,'locked');
 const available=explorationQuestProgress(map,'ruined_house');
 assert.equal(available.status,'available');
 assert.equal(available.attemptCount,0);
 map.sites.ruined_house.visits=1;
 map.sites.ruined_house.visibility='visited';
 assert.equal(explorationQuestProgress(map,'ruined_house').status,'retry');
 assert.equal(explorationQuestProgress(map,'ruined_house').attemptCount,1);
 map.sites.ruined_house.completed=true;
 map.sites.ruined_house.visibility='completed';
 assert.equal(explorationQuestProgress(map,'ruined_house').status,'done');
 assert.equal(explorationQuestProgress(map,'not_real'),null);
 const snapshot=JSON.stringify(map);
 explorationZoneProgress(map,'near',EXPLORATION_SITES);
 explorationQuestProgress(map,'ruined_house');
 assert.equal(JSON.stringify(map),snapshot);
 assert.notEqual(before,snapshot,'only test setup changes the map');
});

test('visits/completions survive existing saves without an extra quest save schema',()=>{
 const day=Date.UTC(2026,10,15,9);
 const s=defaults(day);
 s.explorationMap.sites.ruined_house={...s.explorationMap.sites.ruined_house,
  visibility:'completed',completed:true,visits:3,lastOutcome:'supplies'};
 const saved=sanitize(structuredClone(s),day);
 assert.equal(saved.explorationMap.version,2);
 assert.equal(explorationQuestProgress(saved.explorationMap,'ruined_house').status,'done');
 assert.equal(explorationZoneProgress(saved.explorationMap,'near',EXPLORATION_SITES).completed,1);
 assert.equal(explorationZoneProgress(saved.explorationMap,'far',EXPLORATION_SITES).completed,0);
 assert.equal(mapExpeditionAvailability(saved,'ruined_house',day).ready,false,'no re-looting completed quest');
 assert.equal(explorationQuestProgress(sanitizeExplorationMap(saved.explorationMap),'ruined_house').status,'done');
});

test('UI changes background at zone switch and connects quest cards and scaled map pins',()=>{
 const ui=read('src/explorationMapUiV78.js');
 const css=read('src/explorationMapRegionsV90.css');
 const html=read('index.html');
 assert.match(ui,/const region=EXPLORATION_REGIONS\[zone\]/);
 assert.match(ui,/cityImage\.setAttribute\('src',regionImage\)/);
 assert.match(ui,/q\('#exploration-map-zone-brief'\)\.textContent/);
 assert.match(ui,/const homeRadius=zone==='far'\?\.045:\.07/);
 assert.match(ui,/const radius=data\.completed\?/);
 assert.match(ui,/const progress=explorationFogStage\(/);
 assert.match(ui,/image\.src=locked\?ASSET\+region\.map/);
 assert.match(ui,/quest=explorationQuestProgress\(s\.explorationMap,site\.id\)/);
 assert.match(ui,/quest\.district\.photo/);
 assert.match(ui,/exploration-map__quest-status/);
 assert.match(css,/\.exploration-map__map\[data-zone="far"\] \.exploration-map__marker/);
 assert.match(css,/\.exploration-map__quest\{/);
 assert.match(css,/\.exploration-map__quest.*grid-column:1\/-1/s);
 assert.match(html,/src\/explorationMapRegionsV90\.css/);
 assert.doesNotMatch(css,/\.actionbar\s*\{|\.topbar\s*\{/);
});

test('available region quest does not bypass 17-channel and core travel system',()=>{
 const s=defaults(Date.UTC(2026,10,15,9));
 const site='underpass';
 const metadata=questBySite(site);
 assert.equal(metadata.district,'waterfront');
 assert.equal(mapExpeditionAvailability(s,site,Date.UTC(2026,10,15,9)).ready,false);
 assert.equal(s.explorationMap.sites[site].visibility,'unknown');
 s.explorationMap.tower.phase='channel17';
 s.explorationMap=sanitizeExplorationMap(s.explorationMap);
 assert.equal(mapExpeditionAvailability(s,site,Date.UTC(2026,10,15,9)).ready,true);
});
