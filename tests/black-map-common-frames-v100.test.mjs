import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=(path)=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const style=read('src/blackMapCommonFramesV100.css');
const html=read('index.html');
const atlas=read('src/commonUiAssetsV3.js');
const ui=read('src/explorationMapUiV78.js');

test('entire map reskin uses actual main-game extracted atlas frames (not recreated CSS gradient rectangles)',()=>{
 for(const name of ['equipment_panel','wide_panel_01','wide_panel_02','equipment_action_button','alert_amber','small_button_01']){
  assert.match(atlas,new RegExp("'"+name+"'"));
  assert.match(style,new RegExp('var\\(--afterday-v3-'+name+',none\\)'));
 }
 assert.match(style,/border-image-slice:/);
 assert.match(style,/border-image-repeat:stretch/);
 assert.match(html,/blackMapControlsV99\.css"\/><link rel="stylesheet" href="\.\/src\/blackMapCommonFramesV100\.css/);
});

test('all map UI sections are sourced from common frames, not plain rounded boxes',()=>{
 for(const name of [
  'exploration-map__panel','exploration-map__heading','exploration-map__mission-guide',
  'exploration-map__daily-ops','exploration-map__howto','exploration-map__map-wrap',
  'exploration-map__map','exploration-map__legend','exploration-map__card',
  'exploration-map__quest','exploration-map__stage','exploration-map__tower',
  'exploration-map__finale','exploration-map__prep','exploration-map__return-report',
  'exploration-map__journal','exploration-map__areas button'
 ]){
  assert.ok(style.includes(name),'missing frame for '+name);
 }
 assert.match(style,/border-radius:0!important/g);
});

test('passive labels have alert frame; real inputs preserve v99 functional states and markers',()=>{
 assert.match(style,/exploration-map__passive-state/);
 assert.match(style,/exploration-map__passive-state\[hidden\]/);
 assert.match(style,/button\.exploration-map__control/);
 assert.match(style,/\.exploration-map__areas button\[aria-pressed="true"\]/);
 assert.match(ui,/passive\.hidden=!disabled/);
 assert.match(ui,/button\.dataset\.goal/);
 assert.match(ui,/beginMapExpedition\(getState\(\),site\.id,getNow\(\),Date\.now\(\)\)/);
 assert.doesNotMatch(style,/\.exploration-map__marker\s*\{/);
});

test('mobile and desktop keep map aspect ratio, actual geometry and responsive panels untouched',()=>{
 assert.match(style,/@media\(max-width:720px\)/);
 assert.match(style,/@media\(max-width:350px\)/);
 assert.match(style,/grid-template-columns:minmax\(0,1fr\)/);
 assert.match(read('src/explorationMapCampaignV84.css'),/aspect-ratio:320 \/ 213/);
 assert.doesNotMatch(style,/#hud\s|\.actionbar\s|\.topbar\s|\.survival-kit\s/);
 assert.match(read('src/commonUiAssetsV3.js'),/document\.documentElement\.style\.setProperty\('--afterday-v3-'/);
});
