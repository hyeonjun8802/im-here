import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const load=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('v980 vector HUD uses native responsive coordinates with no baked labels or shadows',()=>{
 const css=load('src/style.css'),html=load('index.html');
 assert.match(css,/AFTERDAY v9\.8/);
 assert.match(css,/aspect-ratio:1600 \/ 175/);
 assert.match(css,/aspect-ratio:1000 \/ 220/);
 assert.match(html,/forecast_hud_desktop_v980\.svg/);
 assert.match(html,/forecast_hud_mobile_v980\.svg/);
 assert.match(html,/class="disaster-forecast__time-markers"/);
 for(const tick of ['6H','12H','18H','24H'])assert.ok(html.includes('<span>'+tick+'</span>'));
 for(const [file,vb,cx,cy] of [
 ['forecast_hud_desktop_v980.svg','1600 175','800','87'],
 ['forecast_hud_mobile_v980.svg','1000 220','500','107']
 ]){const svg=load('public/assets/ui/'+file);
   assert.ok(svg.includes('viewBox="0 0 '+vb+'"'));
   assert.ok(svg.includes('cx="'+cx+'" cy="'+cy+'"'));
   assert.doesNotMatch(svg,/<text\b|<foreignObject\b|feDropShadow|filter=|scale\(1 \.5\)/);
   assert.equal((svg.match(/<svg\b/g)||[]).length,1);
   assert.equal((svg.match(/<\/svg>/g)||[]).length,1);
 }
});
