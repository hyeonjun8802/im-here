import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const load=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('v970 HUD retains full width and halves PC/mobile heights',()=>{
 const css=load('src/style.css');
 assert.match(css,/AFTERDAY v9\.7/);
 assert.match(css,/aspect-ratio:1600 \/ 175/);
 assert.match(css,/aspect-ratio:1000 \/ 220/);
 assert.match(css,/top:env\(safe-area-inset-top\)/);
 const html=load('index.html');
 assert.match(html,/forecast_hud_frame_v970\.svg/);
 assert.match(html,/forecast_hud_mobile_v970\.svg/);
 for(const [file,viewbox,x] of [
 ['forecast_hud_frame_v970.svg','1600 175',401],
 ['forecast_hud_mobile_v970.svg','1000 220',250]
 ]){
  const svg=load('public/assets/ui/'+file);
  assert.ok(svg.includes('viewBox="0 0 '+viewbox+'"'));
  assert.ok(svg.includes('transform="scale(1 .5)"'));
  assert.ok(svg.includes('transform="translate('+x+' 0) scale(.5)"'));
  assert.equal((svg.match(/<svg\b/g)||[]).length,1);
  assert.equal((svg.match(/<\/svg>/g)||[]).length,1);
 }
});
