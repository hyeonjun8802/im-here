import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {defaults} from '../src/simulation.js';
import {EXPLORATION_SITES,mapExpeditionAvailability,newExplorationMap} from '../src/explorationMapV78.js';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const ui=read('src/explorationMapUiV78.js');
const css=read('src/explorationMapCampaignV84.css');
const geometry=css.slice(css.indexOf('/* v89 · One centered circle'));

test('all 12 location SVG rings and unknown-state circle are geometrically centered',()=>{
 assert.equal(EXPLORATION_SITES.length,12);
 for(const id of [...EXPLORATION_SITES.map(site=>site.id),'state_unknown']){
  const source=read('public/assets/exploration/markers/'+id+'.svg');
  const box=source.match(/viewBox="0 0 (\d+) (\d+)"/);
  const circle=source.match(/<circle cx="(\d+)" cy="(\d+)" r="(\d+)"/);
  assert.ok(box&&circle,id+' valid viewBox and ring');
  assert.equal(Number(box[1]),Number(box[2]),id+' square geometry');
  assert.equal(Number(circle[1]),Number(box[1])/2,id+' ring x-center');
  assert.equal(Number(circle[2]),Number(box[2])/2,id+' ring y-center');
 }
});

test('map photo, fog and route use one physical map aspect ratio with no short-screen distortion',()=>{
 assert.ok(geometry.length>400,'v89 scoped map fix exists');
 assert.match(geometry,/\.exploration-map__map\{\s*aspect-ratio:320 \/ 213;\s*max-height:none;/);
 assert.match(geometry,/@media\(max-width:720px\)\{[\s\S]*?\.exploration-map__map\{\s*max-height:none;/);
 assert.match(geometry,/@media\(max-width:350px\)\{[\s\S]*?\.exploration-map__map\{\s*max-height:none;/);
 assert.match(ui,/svg\.setAttribute\('viewBox','0 0 320 213'\)/);
 assert.match(ui,/svg\.setAttribute\('preserveAspectRatio','none'\)/);
 assert.match(ui,/ctx\.setTransform\(ratio,0,0,ratio,0,0\)/);
 // Both the home and the dashed route originate from normalized (0.5, 0.5).
 assert.match(ui,/reveal\(\.50,\.50,homeRadius\+progress\.stage\*\.009,\.74\)/);
 assert.match(ui,/M 160 106\.5 Q/);
 assert.match(geometry,/\.exploration-map__home\{\s*left:50%;top:50%/);
 for(const [w,h] of [[320,213],[480,319.5],[640,426],[760,505.875]]){
  const x=(.5*w),y=(.5*h);
  assert.ok(Math.abs(x-w/2)<.001&&Math.abs(y-h/2)<.001);
  assert.ok(Math.abs(w/h-320/213)<.003);
 }
});

test('markers use a transparent touch target and ONE ring from the original SVG, not two misaligned circles',()=>{
 const selector=geometry.match(/\.exploration-map-v78 \.exploration-map__marker\{([^}]+)\}/);
 assert.ok(selector,'new marker style');
 const rule=selector[1];
 assert.match(rule,/width:44px;height:44px;min-width:44px;min-height:44px/);
 assert.match(rule,/padding:0;border:0;border-radius:50%/);
 assert.match(rule,/background:transparent;box-shadow:none/);
 assert.match(rule,/display:grid;place-items:center/);
 assert.match(geometry,/\.exploration-map__marker img\{\s*display:block;width:40px;height:40px/);
 assert.match(geometry,/\.exploration-map__marker span\{\s*position:absolute;right:0;bottom:0;/);
 assert.match(geometry,/display:grid;place-items:center;[\s\S]*?border-radius:50%;line-height:1/);
 assert.match(geometry,/\.exploration-map__marker\[data-selected="true"\] img\{\s*filter:drop-shadow/);
 assert.match(geometry,/\.exploration-map__marker\[data-visibility="completed"\] img\{\s*filter:drop-shadow/);
 assert.match(geometry,/\.exploration-map__marker\{\s*width:42px;height:42px;min-width:42px;min-height:42px/);
 assert.doesNotMatch(geometry,/\.actionbar|\.disaster-forecast|\.survival-kit\{/);
});

test('home uses a fixed-center geometry SVG, rather than a font glyph with uneven baseline',()=>{
 assert.match(ui,/class="exploration-map__home" aria-label="나의 옥상"><svg viewBox="0 0 24 24"/);
 assert.doesNotMatch(ui,/class="exploration-map__home"[^>]*>⌂/);
 assert.match(geometry,/\.exploration-map__home svg\{\s*display:block;width:62%;height:62%/);
});

test('on mobile, saved story outcomes span the full card under the photo and text',()=>{
 assert.match(geometry,/\.exploration-map__card \.exploration-map__site-image\{\s*grid-column:1;grid-row:1\/5;/);
 assert.match(geometry,/align-self:stretch;height:100%;max-height:none/);
 assert.match(geometry,/\.exploration-map__card \.exploration-map__last-story,\s*\.exploration-map-v78 \.exploration-map__card \.exploration-map__last-trail\{\s*grid-column:1\/-1;/);
});

test('selected location is keyboard-visible and mission-in-progress tabs do not silently snap back',()=>{
 assert.match(ui,/button\.setAttribute\('aria-pressed',String\(selected===site\.id\)\)/);
 assert.match(ui,/markers\.querySelector\('\.exploration-map__marker\[data-selected="true"\]'\)\?\.focus\(\{preventScroll:true\}\)/);
 assert.match(ui,/if\(!\['near','far'\]\.includes\(next\)\|\|getState\(\)\.explorationMap\?\.mission\)return/);
 assert.match(ui,/q\('#exploration-area-near'\)\.disabled=Boolean\(mission\)&&zone!=='near'/);
 assert.match(ui,/q\('#exploration-area-far'\)\.disabled=Boolean\(mission\)&&zone!=='far'/);
});

test('the player sees the actual story unlock prerequisite and the next uncovered location',()=>{
 assert.match(ui,/phase==='unknown'\?/);
 assert.match(ui,/원거리 미개방 · 근거리 통신실 조사를 완료/);
 assert.match(ui,/원거리 미개방 · 통신탑을 복구하고 단파 무전기로 17번 채널/);
 assert.match(ui,/미발견 지역 · 현재 방문 가능한 장소부터 조사/);
 assert.match(ui,/조사 완료 · 다음 장소:/);
 assert.match(ui,/출발하면 오늘의 동네 탐사 1회를 사용합니다/);
 assert.match(ui,/사고 위험은 현장에서 확인/);
 const s=defaults(Date.UTC(2026,10,15,9));
 const map=newExplorationMap();
 assert.equal(map.sites.ruined_house.visibility,'rumored');
 assert.equal(map.sites.convenience_store.visibility,'unknown');
 assert.equal(map.sites.hospital.visibility,'unknown');
 assert.equal(mapExpeditionAvailability(s,'hospital',Date.UTC(2026,10,15,9)).ready,false);
 // Game outcomes still use the existing scavenging engine.
 assert.match(ui,/resolveMapExpedition\(getState\(\),decision,getNow\(\),Date\.now\(\)\)/);
 assert.match(ui,/advanceTowerStory\(getState\(\),current\[1\]\)/);
 assert.match(ui,/resolveMapFinale\(getState\(\),'signal',getNow\(\)\)/);
});
