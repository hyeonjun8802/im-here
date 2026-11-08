import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=(p)=>readFileSync(new URL('../'+p,import.meta.url));
const html=read('index.html').toString();
const main=read('src/main.js').toString();
const css=['src/commonUiAssetsV3.css','src/commonUiLayoutV31.css','src/hudAlignmentV1300.css'].map(p=>read(p).toString()).join('\n');
const js=read('src/commonUiAssetsV3.js').toString();
const atlas=read('public/assets/ui/apocalypse-v3/spritesheet.webp');
const manifest=JSON.parse(read('public/assets/ui/apocalypse-v3/spritesheet.json').toString());

test('real original UI atlas is committed, decodable WEBP, and indexed',()=>{
 assert.equal(atlas.subarray(0,4).toString(),'RIFF');
 assert.equal(atlas.subarray(8,12).toString(),'WEBP');
 assert.ok(atlas.length>20_000);
 assert.deepEqual(manifest.size,{w:2048,h:1139});
 assert.equal(Object.keys(manifest.frames).length,48);
 for(const [name,f] of Object.entries(manifest.frames)){
  assert.ok(f.x>=0 && f.y>=0 && f.w>0 && f.h>0,name);
  assert.ok(f.x+f.w<=2048 && f.y+f.h<=1139,name);
  assert.deepEqual(f.pivot,[0.5,0.5],name);
 }
 for(const name of ['top_hud_full','bottom_action_bar_full','center_warning_banner',
  'equipment_panel','time_controls_panel','square_slot_selected',
  'icon_health','icon_food','icon_water','icon_medical','icon_tools'])
   assert.ok(manifest.frames[name],name);
 assert.equal(Object.keys(manifest.frames).filter(x=>x.startsWith('icon_')).length,16);
});

test('game wires real sprites after weather HUD, preserving live state',()=>{
 assert.match(html,/commonUiAssetsV3\.css/);
 assert.doesNotMatch(html,/commonUiV1200\.css/);
 assert.match(main,/installPremiumHudV1000\(\$\('#disaster-forecast'\)\)/);
 assert.match(main,/installCommonUiAssetsV3\(\)/);
 assert.ok(main.indexOf('installPremiumHudV1000(')<main.indexOf('installCommonUiAssetsV3();'));
 assert.match(main,/dayChip\.textContent='생존 '\+day\+'일차'/);
 assert.match(js,/crop\('top_hud_full'\)/);
 assert.match(js,/bottom_action_bar_full/);
 assert.match(js,/frameCount:48/);
 assert.match(js,/document\.body\.classList\.add\('afterday-real-ui-v3'\)/);
 assert.match(js,/fetch\(BASE\+'spritesheet\.json'/);
});

test('v3 aligns actual image frames and buttons without replacing click nodes',()=>{
 assert.match(css,/aspect-ratio:1647 \/ 300/);
 assert.match(css,/width:min\(1450px,calc\(100vw - 6px\)\)/);
 assert.match(css,/aspect-ratio:1148 \/ 172/);
 assert.match(css,/--afterday-v3-bottom_action_bar_full/);
 assert.match(css,/--afterday-v3-equipment_panel/);
 assert.match(css,/--afterday-v3-center_warning_banner/);
 assert.match(css,/@media\(max-width:720px\)/);
 assert.match(css,/safe-area-inset-bottom/);
 assert.doesNotMatch(js,/replaceWith\(/);
});
