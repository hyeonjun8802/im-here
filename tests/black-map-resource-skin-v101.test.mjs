import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync, statSync, existsSync} from 'node:fs';

const get = (path) => readFileSync(new URL('../'+path,import.meta.url));
const css = get('src/blackMapResourceSkinV101.css').toString();
const index = get('index.html').toString();
const assetDir = 'public/assets/exploration/ui-v101/';
const assets = [
 'modal_shell','title_header','status_rail','map_panel','site_card',
 'primary_button','secondary_tab','active_tab','close_button'
];

test('all nine unique image-generated resources are real optimized WEBP files',()=>{
 for(const asset of assets){
  const path = assetDir+asset+'.webp';
  const bytes = get(path);
  assert.ok(bytes.length>2500,`${asset}: unexpectedly small`);
  assert.ok(bytes.length<140_000,`${asset}: exceeds mobile frame budget`);
  assert.equal(bytes.toString('ascii',0,4),'RIFF',`${asset} lacks RIFF header`);
  assert.equal(bytes.toString('ascii',8,12),'WEBP',`${asset} is not WebP`);
  assert.ok(css.includes(`ui-v101/${asset}.webp`),`missing CSS use: ${asset}`);
 }
});

test('the new resource stylesheet is loaded after v100 and keeps pre-existing controls',()=>{
 assert.match(index,/blackMapCommonFramesV100\.css"\/><link rel="stylesheet" href="\.\/src\/blackMapResourceSkinV101\.css/);
 assert.match(css,/border-image-source:var\(--blackmap-v101-shell\)/);
 assert.match(css,/border-image-source:var\(--blackmap-v101-detail\)/);
 assert.match(css,/border-image-source:var\(--blackmap-v101-map\)/);
 assert.match(css,/border-image-slice:/);
 assert.match(css,/button\.exploration-map__control/);
 assert.match(css,/#exploration-map-close/);
});

test('the new skin does not alter map marker geometry, gameplay or cloud/local saves',()=>{
 const ui = get('src/explorationMapUiV78.js').toString();
 assert.match(ui,/button\.style\.left=\(pin\.x\*100\)/);
 assert.match(ui,/beginMapExpedition\(getState\(\),site\.id,getNow\(\),Date\.now\(\)\)/);
 assert.doesNotMatch(css,/\.exploration-map__marker\s*\{/);
 assert.doesNotMatch(css,/#hud\s|\.actionbar\s|\.premium-hud-v1000/);
 assert.match(css,/@media\(max-width:720px\)/);
 assert.match(css,/@media\(max-width:360px\)/);
});

test('mission waiting states stay passive, current tap target stays visibly actionable',()=>{
 const ui=get('src/explorationMapUiV78.js').toString();
 assert.match(ui,/passive\.hidden=!disabled/);
 assert.match(ui,/button\.hidden=disabled/);
 assert.match(css,/\.exploration-map__passive-state\[hidden\]/);
 assert.match(css,/button\.exploration-map__control:focus-visible/);
 assert.match(css,/button\.exploration-map__control:disabled/);
});