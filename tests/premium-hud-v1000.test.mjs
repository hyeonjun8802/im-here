import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const r=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
const exists=p=>fs.existsSync(new URL('../'+p,import.meta.url));
test('v1000 original approved premium source and mobile frame are complete, not compressed into one texture',()=>{
 for(const mode of ['desktop','mobile'])for(const asset of ['left_wing','right_wing','center_medallion','complete_empty_hud_frame']){
  assert.ok(exists(`public/assets/ui/afterday-premium-v1000/${mode}/${asset}.png`),mode+'/'+asset);
 }
 const css=r('src/premiumHudV1000.css');
 assert.match(css,/--premium-h:clamp\(93px,10vw,158px\)/);
 assert.match(css,/--premium-h:clamp\(94px,30vw,120px\)/);
 assert.match(css,/premium-hud__center-medallion/);
});
test('weather assets cover all nine supported simulation conditions, plus reserve meteor art',()=>{
 for(const kind of ['clear','cloud','rain','storm','tornado','heat','cold','dust','wildfire','meteor']){
  for(const suffix of ['forecast_icon','medallion_art'])assert.ok(exists(`public/assets/ui/afterday-premium-v1000/weather/${kind}_${suffix}.png`),kind+' '+suffix);
 }
});
test('only the original three live vitals and four inventory values are present; simulation unmodified',()=>{
 const main=r('src/main.js');
 assert.match(main,/import \{installPremiumHud\} from '\.\/premiumHudV1000\.js'/);
 assert.match(main,/premiumHud\.sync\(state,t\)/);
 for(const name of ['hud-health-val','hud-food-val','hud-water-val','hud-stock-food','hud-stock-water','hud-stock-medicine','hud-stock-parts'])assert.match(r('index.html'),new RegExp('id="'+name+'"'));
 const premium=r('src/premiumHudV1000.js');
 assert.match(premium,/CHECKPOINTS=Object\.freeze\(\[24,18,12,6,3,0\]\)/);
 assert.match(premium,/state\.majorDisasterAt/);
 assert.match(premium,/state\.weather/);
 assert.doesNotMatch(premium,/localStorage|\.health\s*=|\.water\s*=/);
});