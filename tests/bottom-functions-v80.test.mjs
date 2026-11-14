import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {completeHudGlyph} from '../src/hudActionGlyphsV1400.js';

const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const html=read('index.html');
const bar=html.match(/<nav class="actionbar">([\s\S]*?)<\/nav>/)?.[1];
const funcs=html.match(/<div class="survival-kit-controls">([\s\S]*?)<\/div>/)?.[1];

test('the original nine-slot footer is stable; the old weather simulator is replaced, not added',()=>{
 assert.ok(bar&&funcs);
 assert.match(bar,/id="functions-toggle"/);
 assert.doesNotMatch(bar,/id="weather-panel-toggle"/);
 assert.match(funcs,/id="weather-panel-toggle"/);
 assert.equal((html.match(/id="weather-panel-toggle"/g)||[]).length,1);
 assert.equal((html.match(/id="functions-toggle"/g)||[]).length,1);
 const ids=[...bar.matchAll(/<button[^>]+id="([^"]+)"[^>]*>/g)]
  .filter(x=>!x[0].includes(' hidden')).map(x=>x[1]);
 assert.deepEqual(ids,['drink','eat','repair','rest','medicine','explore','life-panel-toggle','functions-toggle']);
 assert.equal(ids.length+1,9,'the unfilled tank-repair well is already a passive reserve');
});

test('the bottom functions button reuses existing equipment popover and is ARIA synchronized',()=>{
 const main=read('src/main.js'),equipment=read('src/premiumEquipmentHudV1600.js');
 assert.match(html,/id="functions-toggle"[^>]*aria-controls="equipment-actions-menu"/);
 assert.match(main,/functionsButton\.addEventListener\('click',\(\)=>equipmentDisclosure\.click\(\)\)/);
 assert.match(main,/MutationObserver\(syncFunctions\)\.observe\(equipmentDisclosure/);
 assert.match(main,/functionsButton\.setAttribute\('aria-expanded',String\(opened\)\)/);
 assert.match(equipment,/kit\.classList\.toggle\('premium-equipment-open'\)/);
 assert.match(equipment,/event\.key==='Escape'/);
});

test('weather simulation and important equipment actions remain available under Functions',()=>{
 assert.match(funcs,/id="exploration-open"/);
 assert.match(funcs,/id="expedition-toggle"/);
 assert.match(funcs,/id="companion-toggle"/);
 assert.match(funcs,/id="radio-contact"/);
 assert.match(funcs,/id="weather-panel-toggle"/);
 const main=read('src/main.js');
 assert.match(main,/\$\('#weather-panel-toggle'\)\.addEventListener\('click'/);
 assert.match(main,/\$\('#companion-toggle'\)\.addEventListener\('click'/);
 assert.match(main,/\$\('#radio-contact'\)\.addEventListener\('click'/);
});

test('the ninth slot uses a newly drawn coherent icon inside the same original bitmap frame',()=>{
 const glyphs=read('src/hudActionGlyphsV1400.js');
 const ui=read('src/commonUiAssetsV3.js');
 assert.match(glyphs,/functions:'<rect x=/);
 assert.match(glyphs,/'functions-toggle':'functions'/);
 assert.match(ui,/'functions-toggle':'icon_functions'/);
 assert.doesNotMatch(ui,/'weather-panel-toggle':'icon_cloud'/);
 assert.ok(completeHudGlyph('functions-toggle').startsWith('data:image/svg+xml'));
 assert.match(ui,/installResponsiveActionSlots\(actionbar,reserve,repairTank\)/);
});

test('real map and location art is now embedded in three independent SVG assets, replacing placeholders',()=>{
 for(const p of [
  'public/assets/exploration/map/overview.svg',
  'public/assets/exploration/locations/ruined_house.svg',
  'public/assets/exploration/locations/convenience_store.svg'
 ]){
  const svg=read(p),match=svg.match(/data:image\/webp;base64,([A-Za-z0-9+/=]+)/);
  assert.ok(match,p+' must contain v2 original art');
  assert.ok(Buffer.from(match[1],'base64').subarray(0,4).equals(Buffer.from('RIFF')));
  assert.ok(Buffer.from(match[1],'base64').length>2000,p+' not empty');
  assert.match(svg,/preserveAspectRatio=/);
 }
});

test('AUTO still includes mapped expeditions and equipment functions without duplicating survival actions',()=>{
 const main=read('src/main.js');
 assert.match(main,/selectAutoMapAction\(state,gameNow\)/);
 assert.match(main,/selectAutoCompanionAction\(state\)/);
 assert.match(main,/explorationUI\.autoStep\(mapPlan,real\)/);
 assert.match(main,/real-lastAutoActionReal<AUTO_ACTION_INTERVAL_MS/);
 assert.match(main,/runSurvivalAction\(action,true\)/);
 assert.match(main,/let autoSurvivalEnabled=false/);
});
