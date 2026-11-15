import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const ui=read('src/explorationMapUiV78.js');
const css=read('src/blackMapControlsV99.css');
const html=read('index.html');

test('Black Map reuses the existing original main UI atlas button and panel assets',()=>{
 const atlas=read('src/commonUiAssetsV3.js');
 assert.match(atlas,/equipment_action_button/);
 assert.match(atlas,/wide_panel_01/);
 assert.match(css,/var\(--afterday-v3-equipment_action_button,none\)/);
 assert.match(css,/var\(--afterday-v3-wide_panel_01,none\)/);
 assert.match(css,/border-image-slice:/);
 assert.match(html,/blackMapDailyOperationsV98\.css"\/><link rel="stylesheet" href="\.\/src\/blackMapControlsV99\.css/);
});

test('only actionable buttons use shared metal controls, not labels and information cards',()=>{
 assert.match(ui,/class="exploration-map__control exploration-map__control--primary" id="exploration-map-guide-action"/);
 assert.match(ui,/id="exploration-map-daily-shortcut"/);
 assert.match(ui,/class="exploration-map__control exploration-map__control--tab"/);
 assert.match(ui,/b\.classList\.add\('exploration-map__control'\)/);
 assert.match(css,/button\.exploration-map__control/);
 assert.doesNotMatch(css,/\.exploration-map__marker\s*\{\s*border-image/);
 assert.match(css,/\.exploration-map__howto summary::after/);
});

test('a blocked expedition or return in progress is plain passive information, not a false button',()=>{
 assert.match(ui,/id="exploration-map-guide-status" class="exploration-map__passive-state"/);
 assert.match(ui,/button\.hidden=disabled;/);
 assert.match(ui,/passive\.hidden=!disabled;/);
 assert.match(ui,/passive\.textContent=/);
 assert.match(css,/\.exploration-map__passive-state/);
 assert.match(css,/button\.exploration-map__control\[hidden\]/);
});

test('button CSS has visible pressed, disabled, keyboard and phone states without touching HUD',()=>{
 assert.match(css,/button\.exploration-map__control:not\(:disabled\):active/);
 assert.match(css,/button\.exploration-map__control:focus-visible/);
 assert.match(css,/button\.exploration-map__control:disabled/);
 assert.match(css,/@media\(max-width:720px\)/);
 assert.match(css,/min-height:44px/);
 assert.doesNotMatch(css,/#hud\s|\.actionbar\s|\.topbar\s|\.survival-kit\s/);
 const core=read('src/explorationMapV78.js');
 assert.match(core,/map\.lastAttemptDay=currentExplorationDay/);
 assert.match(ui,/beginMapExpedition\(getState\(\),site\.id,getNow\(\),Date\.now\(\)\)/);
});

test('dynamic primary buttons retain shared control artwork when specialized classes are added',()=>{
 assert.match(ui,/if\(cls\)b\.classList\.add\(\.\.\.cls\.split/);
 assert.doesNotMatch(ui,/if\(cls\)b\.className=cls/);
});
