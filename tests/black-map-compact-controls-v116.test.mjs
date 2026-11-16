import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {BLACK_MAP_VISIBLE_BUTTON_LIMIT,blackMapCompactMode} from '../src/blackMapCompactActionsV116.js';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const js=read('src/explorationMapUiV78.js');
const css=read('src/blackMapCompactControlsV116.css');
const html=read('index.html');
test('mode priority never exposes more than three rectangular action buttons',()=>{
 assert.equal(BLACK_MAP_VISIBLE_BUTTON_LIMIT,3);
 const cases=[
  [{},'normal',3],[{missionPhase:'outbound'},'travel',1],
  [{missionPhase:'returning'},'travel',1],
  [{missionPhase:'encounter'},'encounter',2],
  [{preparing:true},'preparing',3],
  [{report:true},'return',2],
  [{finaleReady:true},'finale',3],
  [{report:true,finaleReady:true},'return',2],
  [{missionPhase:'encounter',finaleReady:true},'encounter',2]
 ];
 for(const [opts,expected,count] of cases){
  assert.equal(blackMapCompactMode(opts),expected);
  assert.ok(count<=BLACK_MAP_VISIBLE_BUTTON_LIMIT);
 }
});
test('the map now uses one zone-switch button and one delegated primary CTA',()=>{
 assert.match(js,/id="exploration-area-switch"/);
 assert.match(js,/id="exploration-map-primary-action"/);
 assert.match(js,/const compactPrimary=q\('#exploration-map-primary-action'\)/);
 assert.match(js,/const switchButton=q\('#exploration-area-switch'\)/);
 assert.match(js,/switchButton\.textContent=otherName\+' 지도 보기/);
 assert.match(js,/compactTarget=target/);
 assert.match(js,/compactTarget\.click\(\)/);
 for(const sel of ['#exploration-area-near','#exploration-area-far',
  '.exploration-map__daily-ops','.exploration-map__routine',
  '.exploration-map__mission-controls','.exploration-map__choices',
  '#exploration-tower-actions','#exploration-map-return-dismiss'])
  assert.ok(css.includes(sel),'must consolidate '+sel);
});
test('encounter preserves all four original real risk actions behind accessible select',()=>{
 assert.match(js,/id="exploration-map-choice-select"/);
 assert.match(js,/id="exploration-map-choice-picker"/);
 assert.match(js,/for\(const button of choices\.querySelectorAll\('button\[data-choice\]'\)\)/);
 assert.match(js,/option\.disabled=button\.disabled/);
 assert.match(js,/const previous=choiceSelect\.value/);
 assert.match(js,/compactPrimary\.disabled=!choiceSelect\.value/);
 assert.match(js,/choice\?\.click\(\)/);
 assert.match(js,/resolveMapExpedition\(getState\(\),decision,getNow\(\),Date\.now\(\)\)/);
 assert.match(css,/#exploration-map-choice-select:focus-visible/);
});
test('ready finale keeps exactly two validated choices and hides duplicate guide UI',()=>{
 assert.match(js,/mapFinaleAvailability\(s\)\.ready/);
 assert.match(js,/storyAction\('이 옥상에 정착한다'/);
 assert.match(js,/storyAction\('17번 채널에 구조 신호를 남긴다'/);
 assert.match(css,/\[data-simple-mode="finale"\] \.exploration-map__map-wrap/);
 assert.match(css,/\[data-simple-mode="finale"\] \.exploration-map__mission-guide/);
 assert.match(css,/\[data-simple-mode="finale"\] \.exploration-map__compact-actions/);
 assert.match(css,/\[data-simple-mode="finale"\] #exploration-finale-actions/);
 assert.match(js,/resolveMapFinale\(getState\(\),'settle',getNow\(\)\)/);
 assert.match(js,/resolveMapFinale\(getState\(\),'signal',getNow\(\)\)/);
});
test('mission, tower, preparation and return still use the old validated action handlers',()=>{
 assert.match(js,/if\(latestGuide\?\.kind==='tower'&&tower\)target=tower/);
 assert.match(js,/target=q\('#exploration-map-return-dismiss'\)/);
 assert.match(js,/q\('#exploration-map-prep-confirm'\)\.addEventListener/);
 assert.match(js,/q\('#exploration-map-prep-cancel'\)\.addEventListener/);
 assert.match(js,/beginMapExpedition\(getState\(\),site.id,getNow\(\),Date\.now\(\)\)/);
 assert.match(js,/advanceTowerStory\(getState\(\),current\[1\]\)/);
 assert.match(js,/syncCompactControls\(s,now,mission\)/);
});
test('compact CSS is last and affects only Black Map, never HUD or save',()=>{
 assert.ok(html.indexOf('blackMapCompactControlsV116.css')>html.indexOf('blackMapPremiumButtonsV111.css'));
 assert.ok(html.indexOf('blackMapCompactControlsV116.css')>html.indexOf('explorationHubV115.css'));
 assert.doesNotMatch(css,/\.actionbar\{|\.survival-kit\{|localStorage|gameClock|setTimeout/);
 assert.match(css,/#exploration-map-choice-picker\[hidden\]/);
 assert.match(css,/#exploration-map-primary-action\[hidden\]/);
 assert.match(css,/min-height:44px!important/);
});
