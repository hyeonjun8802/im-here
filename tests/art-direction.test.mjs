import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {ART_DIRECTION,CITY_MODELS,ROOFTOP_PROPS,ABANDONED_VEHICLES,validateArtSelection} from '../src/artDirection.js';
const manifest=JSON.parse(fs.readFileSync('public/assets/manifest.json','utf8'));
const world=fs.readFileSync('src/world.js','utf8');
test('concept references included and locked',()=>{
 for(const p of ART_DIRECTION.references) assert.ok(fs.existsSync(p),p);
 assert.match(fs.readFileSync('AGENTS.md','utf8'),/CONCEPT_LOCK/);
});
test('all scene-selected SimCity models exist in original 83-model manifest',()=>{
 assert.deepEqual(validateArtSelection(manifest.models),[]);
});
test('visual scene uses concept whitelist for buildings, props and abandoned vehicles',()=>{
 assert.match(world,/const buildingModels=CITY_MODELS/);
 assert.match(world,/const props=ROOFTOP_PROPS/);
 assert.match(world,/ABANDONED_VEHICLES\[i%ABANDONED_VEHICLES.length\]/);
});
test('disallowed non-Seoul/bright city assets are not in active placements',()=>{
 const selected=[...CITY_MODELS,...ROOFTOP_PROPS.map(p=>p[0]),...ABANDONED_VEHICLES];
 for(const pattern of [/china/i,/(?:^|-)mall(?:-|$)/i,/casino/i,/police/i,/taxi/i,/ferris/i,/circus/i,/temple/i,/pagoda/i,/balloon/i])
   assert.ok(!selected.some(a=>pattern.test(a)),`disallowed: ${pattern}`);
});
test('no live traffic or city simulation mechanics introduced',()=>{
 assert.ok(!/trafficSystem|startCitySimulation|spawnPedestrian|cityBudget|buildingPlacement/.test(world));
});
